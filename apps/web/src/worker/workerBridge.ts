import { MsiBuilderProject, BuildResult, BuildProgress } from '../types/models';

export interface BuildResponse {
  result: BuildResult;
  blob: Blob;
}

export class WorkerBridge {
  private worker: Worker | null = null;

  public async build(
    project: MsiBuilderProject,
    onProgress?: (progress: BuildProgress) => void
  ): Promise<BuildResponse> {
    return new Promise((resolve, reject) => {
      // Spawn new worker for clean memory state
      const worker = new Worker(
        new URL('./compiler.worker.ts', import.meta.url),
        { type: 'module' }
      );
      this.worker = worker;

      worker.onmessage = (e: MessageEvent) => {
        const { type, progress, result, blob, error } = e.data;

        if (type === 'PROGRESS') {
          onProgress?.(progress);
        } else if (type === 'SUCCESS') {
          worker.terminate();
          this.worker = null;
          resolve({ result, blob });
        } else if (type === 'ERROR') {
          worker.terminate();
          this.worker = null;
          let msg = error?.message || 'Build failed with unknown error';
          if (error?.details && Array.isArray(error.details) && error.details.length > 0) {
            const formatted = error.details
              .map((d: any) => {
                if (typeof d === 'string') return d;
                const prefix = d.code ? `[${d.code}] ` : '';
                const mainMsg = d.message || JSON.stringify(d);
                const detail = d.detail ? ` (${d.detail})` : '';
                return `${prefix}${mainMsg}${detail}`;
              })
              .join('\n• ');
            msg = `${msg}:\n• ${formatted}`;
          }
          reject(new Error(msg));
        }
      };

      worker.onerror = (err) => {
        worker.terminate();
        this.worker = null;
        reject(new Error(err.message || 'Worker runtime error occurred'));
      };

      worker.postMessage({
        type: 'BUILD',
        payload: { project },
      });
    });
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
