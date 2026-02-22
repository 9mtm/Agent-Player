/**
 * Storage Provider Factory
 * Reads STORAGE_PROVIDER from .env and returns the correct provider.
 *
 * STORAGE_PROVIDER=local   → LocalStorageProvider (default)
 * STORAGE_PROVIDER=s3      → S3StorageProvider (AWS S3)
 * STORAGE_PROVIDER=r2      → S3StorageProvider (Cloudflare R2)
 */

import path from 'path';
import type { StorageProvider } from './types.js';
import { LocalStorageProvider } from './local.provider.js';
import { createS3ProviderFromEnv, createR2ProviderFromEnv } from './s3.provider.js';

export type { StorageProvider } from './types.js';
export { LocalStorageProvider } from './local.provider.js';
export { S3StorageProvider } from './s3.provider.js';

let providerInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (providerInstance) return providerInstance;

  const type = (process.env.STORAGE_PROVIDER ?? 'local').toLowerCase();

  switch (type) {
    case 's3': {
      console.log('[StorageProvider] ☁️  Using AWS S3');
      providerInstance = createS3ProviderFromEnv();
      break;
    }
    case 'r2': {
      console.log('[StorageProvider] ☁️  Using Cloudflare R2');
      providerInstance = createR2ProviderFromEnv();
      break;
    }
    default: {
      const baseDir = process.env.STORAGE_BASE_DIR
        ? path.resolve(process.env.STORAGE_BASE_DIR)
        : path.join(process.cwd(), '.data', 'storage');
      console.log(`[StorageProvider] 💾 Using local storage: ${baseDir}`);
      providerInstance = new LocalStorageProvider(baseDir);
      break;
    }
  }

  return providerInstance;
}
