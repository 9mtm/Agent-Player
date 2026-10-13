/**
 * Which files under the repo `public/` folder the backend serves without a
 * token (S0-A.7).
 *
 * Decision: runtime data the app writes under `public/storage/` is NOT
 * served statically from these zones:
 *   - storage/cache/      screenshots, TTS audio, web cache, avatar GLB cache
 *   - storage/cdn/        uploaded files, images, data, worlds, recordings
 *   - storage/extensions/ per-extension files
 * Those files are reachable only through `/api/storage/:id` (random UUID
 * ids). Display assets that pages load with <img> or the 3D loaders stay
 * public: storage/avatars, storage/backgrounds, storage/logos,
 * storage/profiles, storage/animations, and everything outside storage/.
 *
 * Paths are decoded and normalized and compared case-insensitively (the
 * macOS file system is case-insensitive), so encodings cannot slip past.
 */

import path from 'node:path';

export const PRIVATE_STATIC_PREFIXES: readonly string[] = [
  'storage/cache/',
  'storage/cdn/',
  'storage/extensions/',
];

export function isPublicStaticPath(pathName: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathName);
  } catch {
    return false;
  }
  if (decoded.includes('\0')) return false;
  const normalized = path.posix
    .normalize(decoded.replace(/\\/g, '/'))
    .replace(/^\/+/, '')
    .toLowerCase();
  const withSlash = normalized.endsWith('/') ? normalized : `${normalized}/`;
  return !PRIVATE_STATIC_PREFIXES.some((prefix) => withSlash.startsWith(prefix));
}
