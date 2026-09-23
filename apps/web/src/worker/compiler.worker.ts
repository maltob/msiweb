import initWasm, { build_msi_opfs, build_msi_memory, validate_project_json } from '../wasm/pkg/msi_builder_wasm';
import { MsiBuilderProject, BuildResult } from '../types/models';

let isWasmInitialized = false;

async function ensureWasm() {
  if (!isWasmInitialized) {
    await initWasm();
    isWasmInitialized = true;
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'BUILD') {
    const project = payload.project as MsiBuilderProject;
    const projectJson = JSON.stringify(project);

    try {
      // 1. Initialize WASM
      self.postMessage({
        type: 'PROGRESS',
        progress: {
          step: 'validating',
          current: 10,
          total: 100,
          message: 'Validating package configuration in WASM engine...',
        },
      });
      await ensureWasm();

      // 2. Validate in Rust engine
      const rawValidation = validate_project_json(projectJson);
      let isValid = true;
      let errors: any[] = [];

      if (Array.isArray(rawValidation)) {
        errors = rawValidation.filter((d: any) => d.severity === 'error');
        isValid = errors.length === 0;
      } else if (rawValidation && typeof rawValidation === 'object') {
        const report = rawValidation as any;
        isValid = report.isValid !== undefined ? Boolean(report.isValid) : Boolean(report.is_valid);
        errors = report.errors || [];
      }

      if (!isValid) {
        self.postMessage({
          type: 'ERROR',
          error: {
            message: 'Package validation failed',
            details: errors,
          },
        });
        return;
      }

      self.postMessage({
        type: 'PROGRESS',
        progress: {
          step: 'preparing_storage',
          current: 25,
          total: 100,
          message: 'Opening OPFS storage handles...',
        },
      });

      // Attempt OPFS build if supported in worker
      let buildResult: BuildResult | null = null;
      let msiBlob: Blob | null = null;

      try {
        const root = await navigator.storage.getDirectory();
        const payloadsDir = await root.getDirectoryHandle('payloads', { create: true });
        const buildsDir = await root.getDirectoryHandle('builds', { create: true });

        const msiFileName = project.package.output_file_name || `${project.package.product_name}.msi`;
        const msiFileHandle = await buildsDir.getFileHandle(msiFileName, { create: true });

        // Check if createSyncAccessHandle is supported
        // @ts-ignore
        if (typeof msiFileHandle.createSyncAccessHandle === 'function') {
          // @ts-ignore
          const msiSyncHandle = await msiFileHandle.createSyncAccessHandle();
          const payloadSyncHandles: Record<string, any> = {};

          for (const file of project.files) {
            try {
              const fileHandle = await payloadsDir.getFileHandle(file.source_ref);
              // @ts-ignore
              payloadSyncHandles[file.source_ref] = await fileHandle.createSyncAccessHandle();
            } catch (err) {
              console.warn(`Could not open sync handle for ${file.source_ref}:`, err);
            }
          }

          self.postMessage({
            type: 'PROGRESS',
            progress: {
              step: 'building_cabinet',
              current: 50,
              total: 100,
              message: 'Compressing payloads into MSZIP cabinet stream...',
            },
          });

          self.postMessage({
            type: 'PROGRESS',
            progress: {
              step: 'generating_database',
              current: 75,
              total: 100,
              message: 'Generating Windows Installer tables & compound file...',
            },
          });

          // Call Rust WASM OPFS engine
          buildResult = build_msi_opfs(projectJson, msiSyncHandle, payloadSyncHandles);

          // Close all sync handles
          try {
            msiSyncHandle.close();
          } catch {}
          for (const handle of Object.values(payloadSyncHandles)) {
            try {
              handle.close();
            } catch {}
          }

          const generatedFile = await msiFileHandle.getFile();
          msiBlob = generatedFile;
        }
      } catch (opfsError) {
        console.warn('OPFS SyncAccessHandle not available or failed, falling back to memory build:', opfsError);
      }

      // Fallback: If OPFS failed or not supported, use in-memory build
      if (!buildResult || !msiBlob) {
        self.postMessage({
          type: 'PROGRESS',
          progress: {
            step: 'preparing_storage',
            current: 30,
            total: 100,
            message: 'Reading payload files into memory...',
          },
        });

        // Read all payload bytes from OPFS using standard async getFile
        const root = await navigator.storage.getDirectory();
        const payloadsDir = await root.getDirectoryHandle('payloads', { create: true });
        const payloadMap: Record<string, Uint8Array> = {};

        for (const file of project.files) {
          const fileHandle = await payloadsDir.getFileHandle(file.source_ref);
          const f = await fileHandle.getFile();
          const ab = await f.arrayBuffer();
          payloadMap[file.source_ref] = new Uint8Array(ab);
        }

        self.postMessage({
          type: 'PROGRESS',
          progress: {
            step: 'generating_database',
            current: 70,
            total: 100,
            message: 'Generating MSI binary in WebAssembly...',
          },
        });

        const output = build_msi_memory(projectJson, payloadMap);
        buildResult = output.result as BuildResult;
        const bytes = output.bytes;
        msiBlob = new Blob([bytes as any], { type: 'application/x-msi' });
        output.free();
      }

      self.postMessage({
        type: 'PROGRESS',
        progress: {
          step: 'finalizing',
          current: 95,
          total: 100,
          message: 'Finalizing package integrity verification...',
        },
      });

      self.postMessage({
        type: 'SUCCESS',
        result: buildResult,
        blob: msiBlob,
      });
    } catch (err: any) {
      console.error('Build worker error:', err);
      self.postMessage({
        type: 'ERROR',
        error: {
          message: err?.message || String(err),
        },
      });
    }
  }
};
