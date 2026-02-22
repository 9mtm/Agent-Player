/**
 * LocalStorageProvider — stores files on the local filesystem.
 * Default provider when STORAGE_PROVIDER=local (or not set).
 * Files are served by the backend via GET /api/storage/:id
 */

import fs from 'fs';
import path from 'path';
import type { Readable } from 'stream';
import type { StorageProvider } from './types.js';

export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local';
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  private resolvePath(key: string): string {
    return path.join(this.baseDir, key);
  }

  async put(key: string, data: Buffer, _mimeType?: string): Promise<void> {
    const filepath = this.resolvePath(key);
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    fs.writeFileSync(filepath, data);
  }

  async get(key: string): Promise<Buffer | null> {
    const filepath = this.resolvePath(key);
    if (!fs.existsSync(filepath)) return null;
    return fs.readFileSync(filepath);
  }

  getReadStream(key: string): Readable | null {
    const filepath = this.resolvePath(key);
    if (!fs.existsSync(filepath)) return null;
    return fs.createReadStream(filepath);
  }

  async remove(key: string): Promise<void> {
    const filepath = this.resolvePath(key);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  }

  /** Local files are served by backend — no direct URL */
  getDirectUrl(_key: string): string | null {
    return null;
  }

  /** Full absolute path for a given key (used by indexExistingFile) */
  absolutePath(key: string): string {
    return this.resolvePath(key);
  }
}
