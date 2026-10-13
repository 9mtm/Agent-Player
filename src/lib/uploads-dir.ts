/**
 * Runtime upload folder for the Next.js process (CL-05). Same root as the
 * backend's src/services/uploads.ts: `<repo>/.data/uploads` (override:
 * UPLOADS_DIR). Never under `public/`, which Next.js serves to anyone.
 */
import path from 'path';

export function uploadsRoot(): string {
  return process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.join(process.cwd(), '.data', 'uploads');
}

/** Cache for public Ready Player Me models/previews; readable by any signed-in user. */
export function avatarModelCacheDir(): string {
  return path.join(uploadsRoot(), 'cache', 'avatar-models');
}

/** Browser URL for a file in the avatar model cache (served by app/storage/[...path]). */
export function avatarModelCacheUrl(filename: string): string {
  return `/storage/cache/avatar-models/${filename}`;
}
