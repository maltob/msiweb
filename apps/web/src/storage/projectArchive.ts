import JSZip from 'jszip';
import { MsiBuilderProject } from '../types/models';
import { PayloadRepository } from './payloadRepository';
import { MsiBuilderProjectSchema } from '../validation/schema';

export class ProjectArchive {
  /**
   * Exports an MsiBuilderProject and its referenced payload files to a .msibuilder ZIP archive.
   */
  public static async exportArchive(
    project: MsiBuilderProject,
    onProgress?: (percent: number, message: string) => void
  ): Promise<Blob> {
    const zip = new JSZip();

    // 1. Add manifest
    onProgress?.(5, 'Adding project manifest...');
    zip.file('manifest.json', JSON.stringify(project, null, 2));

    // 2. Add payloads
    const payloadsFolder = zip.folder('payloads')!;
    const uniqueRefs = Array.from(new Set(project.files.map((f) => f.source_ref)));
    const total = uniqueRefs.length;

    for (let i = 0; i < total; i++) {
      const ref = uniqueRefs[i];
      onProgress?.(
        10 + Math.floor((i / total) * 70),
        `Packaging payload ${i + 1}/${total}: ${ref.slice(0, 8)}...`
      );

      try {
        const bytes = await PayloadRepository.getFileBytes(ref);
        payloadsFolder.file(ref, bytes);
      } catch (err) {
        console.warn(`Failed reading payload ${ref} for export:`, err);
      }
    }

    onProgress?.(85, 'Compressing archive...');
    const blob = await zip.generateAsync(
      {
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      },
      (metadata) => {
        onProgress?.(85 + Math.floor(metadata.percent * 0.15), 'Writing archive bytes...');
      }
    );

    onProgress?.(100, 'Export complete!');
    return blob;
  }

  /**
   * Imports a .msibuilder ZIP archive, ingests all payloads into OPFS, and parses the project.
   */
  public static async importArchive(
    file: File | Blob,
    onProgress?: (percent: number, message: string) => void
  ): Promise<MsiBuilderProject> {
    onProgress?.(10, 'Reading archive...');
    const zip = await JSZip.loadAsync(file);

    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      throw new Error('Invalid .msibuilder archive: manifest.json not found in root.');
    }

    onProgress?.(30, 'Parsing manifest...');
    const manifestJson = await manifestFile.async('string');
    const parsed = JSON.parse(manifestJson);
    const validatedProject = MsiBuilderProjectSchema.parse(parsed) as MsiBuilderProject;

    // Ingest payload files into OPFS
    const payloadFiles = Object.keys(zip.files).filter(
      (path) => path.startsWith('payloads/') && !zip.files[path].dir
    );

    const total = payloadFiles.length;
    for (let i = 0; i < total; i++) {
      const pPath = payloadFiles[i];
      const entry = zip.file(pPath);
      if (!entry) continue;

      const filename = pPath.replace('payloads/', '');
      onProgress?.(
        40 + Math.floor((i / total) * 50),
        `Restoring payload ${i + 1}/${total}...`
      );

      const arrayBuffer = await entry.async('arraybuffer');
      const blob = new Blob([arrayBuffer]);
      await PayloadRepository.ingestFile(blob, filename);
    }

    onProgress?.(100, 'Import complete!');
    return validatedProject;
  }
}
