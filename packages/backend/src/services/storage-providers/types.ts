/**
 * StorageProvider — abstraction layer for file storage backends.
 *
 * Implementations:
 *   LocalProvider    → .data/storage/ on disk (default)
 *   S3Provider       → AWS S3 + optional CloudFront
 *   R2Provider       → Cloudflare R2 (S3-compatible)
 */

import type { Readable } from 'stream';

export interface StorageProvider {
  /** Provider name for logging */
  readonly name: string;

  /**
   * Save buffer to storage under a relative key.
   * Key format: "{zone}/{category}/{filename}" e.g. "cache/audio/uuid.mp3"
   */
  put(key: string, data: Buffer, mimeType?: string): Promise<void>;

  /** Read file content */
  get(key: string): Promise<Buffer | null>;

  /**
   * Get a readable stream for the file.
   * Returns null for cloud providers (use getDirectUrl instead).
   */
  getReadStream(key: string): Readable | null;

  /** Delete file */
  remove(key: string): Promise<void>;

  /**
   * Get a direct public URL for the file (cloud only).
   * Returns null for LocalProvider — backend serves via /api/storage/:id
   */
  getDirectUrl(key: string): string | null;
}
