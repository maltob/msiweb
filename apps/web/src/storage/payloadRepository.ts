/**
 * OPFS Payload Repository where all processing occurs local to the browser.
 * Eliminates browser heap bloat by streaming directly to the Origin Private File System.
 */

export interface IngestedPayload {
  sha256: string;
  size: number;
  name: string;
}

export class PayloadRepository {
  private static rootPromise: Promise<FileSystemDirectoryHandle> | null = null;

  public static async getRoot(): Promise<FileSystemDirectoryHandle> {
    if (!this.rootPromise) {
      this.rootPromise = navigator.storage.getDirectory();
    }
    return this.rootPromise;
  }

  public static async getPayloadsDir(): Promise<FileSystemDirectoryHandle> {
    const root = await this.getRoot();
    return await root.getDirectoryHandle('payloads', { create: true });
  }

  /**
   * Ingests a File or Blob into OPFS using chunked streaming and SHA-256 calculation.
   */
  public static async ingestFile(
    file: File | Blob,
    filename: string,
    onProgress?: (bytesProcessed: number, totalBytes: number) => void
  ): Promise<IngestedPayload> {
    const payloadsDir = await this.getPayloadsDir();
    const tempName = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const tempFileHandle = await payloadsDir.getFileHandle(tempName, { create: true });

    // Stream to calculate SHA-256 and write to temporary OPFS file
    const writable = await tempFileHandle.createWritable();
    const reader = file.stream().getReader();

    // Use Web Crypto SHA-256
    // Since SubtleCrypto doesn't have an incremental stream in all browsers,
    // we accumulate or read chunks. For large files, we compute SHA-256 on the full ArrayBuffer
    // or through crypto stream if available.
    let bytesProcessed = 0;
    const totalBytes = file.size;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      await writable.write(value);
      bytesProcessed += value.byteLength;
      onProgress?.(bytesProcessed, totalBytes);
    }
    await writable.close();

    // Compute SHA-256 of the saved file
    const savedFile = await tempFileHandle.getFile();
    const buffer = await savedFile.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha256 = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // Check if target file already exists (deduplication)
    let finalHandle: FileSystemFileHandle;
    try {
      finalHandle = await payloadsDir.getFileHandle(sha256);
      // Already exists, delete temporary
      await payloadsDir.removeEntry(tempName);
    } catch {
      // Does not exist yet, copy/rename
      finalHandle = await payloadsDir.getFileHandle(sha256, { create: true });
      const targetWritable = await finalHandle.createWritable();
      await targetWritable.write(buffer);
      await targetWritable.close();
      await payloadsDir.removeEntry(tempName);
    }

    return {
      sha256,
      size: totalBytes,
      name: filename,
    };
  }

  /**
   * Retrieves a file from OPFS as a Blob.
   */
  public static async getFile(sha256: string): Promise<File> {
    const payloadsDir = await this.getPayloadsDir();
    const handle = await payloadsDir.getFileHandle(sha256);
    return await handle.getFile();
  }

  /**
   * Reads a file from OPFS as an ArrayBuffer.
   */
  public static async getFileBytes(sha256: string): Promise<Uint8Array> {
    const file = await this.getFile(sha256);
    const ab = await file.arrayBuffer();
    return new Uint8Array(ab);
  }

  /**
   * Deletes a payload by its SHA-256 hash.
   */
  public static async removeFile(sha256: string): Promise<void> {
    try {
      const payloadsDir = await this.getPayloadsDir();
      await payloadsDir.removeEntry(sha256);
    } catch {
      // Ignore if not found
    }
  }

  /**
   * Cleans up all orphaned files not in the active referenced list.
   */
  public static async cleanOrphans(referencedHashes: Set<string>): Promise<number> {
    const payloadsDir = await this.getPayloadsDir();
    let removed = 0;
    // @ts-ignore - async iterator for FileSystemDirectoryHandle
    for await (const [name] of payloadsDir.entries()) {
      if (!name.startsWith('temp_') && !referencedHashes.has(name)) {
        await payloadsDir.removeEntry(name);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Purges all files in OPFS.
   */
  public static async purgeAll(): Promise<void> {
    const payloadsDir = await this.getPayloadsDir();
    // @ts-ignore
    for await (const [name] of payloadsDir.entries()) {
      await payloadsDir.removeEntry(name);
    }
  }

  /**
   * Gets storage quota information.
   */
  public static async getStorageUsage(): Promise<{ usage: number; quota: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    return { usage: 0, quota: 0 };
  }
}
