/**
 * Avatar model download policy (S0-A.13): the backend may fetch avatar GLB
 * files only from Ready Player Me hosts, through the SSRF guard in
 * ./safe-fetch.ts. Mirrors src/lib/net/avatar-download.ts in the frontend.
 */

import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { safeDownload, SafeFetchError, type SafeFetchOptions } from './safe-fetch.js';

export const AVATAR_MODEL_HOSTS = ['models.readyplayer.me', 'readyplayerme-assets.s3.amazonaws.com'] as const;

/** 30 MB: Ready Player Me GLBs are typically 1-10 MB. */
export const AVATAR_MODEL_MAX_BYTES = 30 * 1024 * 1024;
export const AVATAR_PREVIEW_MAX_BYTES = 5 * 1024 * 1024;

export const AVATAR_MODEL_CONTENT_TYPES = [
  'model/gltf-binary',
  'application/octet-stream',
  'binary/octet-stream',
] as const;

export const AVATAR_PREVIEW_CONTENT_TYPES = ['image/png'] as const;

export type AvatarFetchDeps = Pick<SafeFetchOptions, 'lookup' | 'transport'>;

// Test hook only: lets the unit test stub DNS and the transport (no network).
let depsOverride: AvatarFetchDeps = {};
export function setAvatarFetchDepsForTests(deps: AvatarFetchDeps): void {
  depsOverride = deps || {};
}

/** A binary glTF file starts with the ASCII magic "glTF" (12-byte header). */
export function isGlb(body: Buffer): boolean {
  return body.length >= 12 && body.subarray(0, 4).toString('latin1') === 'glTF';
}

/** PNG signature. */
export function isPng(body: Buffer): boolean {
  return body.length >= 8 && body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

export async function downloadAvatarModel(url: string, deps: AvatarFetchDeps = depsOverride): Promise<Buffer> {
  const { body } = await safeDownload(url, {
    allowedHosts: AVATAR_MODEL_HOSTS,
    maxBytes: AVATAR_MODEL_MAX_BYTES,
    allowedContentTypes: AVATAR_MODEL_CONTENT_TYPES,
    timeoutMs: 30000,
    maxRedirects: 3,
    ...deps,
  });
  if (!isGlb(body)) throw new SafeFetchError('Downloaded file is not a GLB model', 'not_glb');
  return body;
}

/** Ready Player Me preview image for a models.readyplayer.me GLB URL, or null. */
export async function downloadAvatarPreview(glbUrl: string, deps: AvatarFetchDeps = depsOverride): Promise<Buffer | null> {
  let parsed: URL;
  try { parsed = new URL(glbUrl); } catch { return null; }
  if (parsed.hostname.toLowerCase() !== 'models.readyplayer.me') return null;
  const m = parsed.pathname.match(/^\/([a-f0-9]+)\.glb$/i);
  if (!m) return null;
  try {
    const { body } = await safeDownload(`https://models.readyplayer.me/${m[1]}.png`, {
      allowedHosts: ['models.readyplayer.me'],
      maxBytes: AVATAR_PREVIEW_MAX_BYTES,
      allowedContentTypes: AVATAR_PREVIEW_CONTENT_TYPES,
      timeoutMs: 15000,
      maxRedirects: 3,
      ...deps,
    });
    return isPng(body) ? body : null;
  } catch {
    return null; // the preview is optional
  }
}

/** Write via a temp file in the same directory, then rename (no half-written file). */
export function writeFileAtomic(filePath: string, data: Buffer): void {
  const tmp = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${randomBytes(6).toString('hex')}.tmp`);
  try {
    fs.writeFileSync(tmp, data, { flag: 'wx' });
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try { fs.rmSync(tmp, { force: true }); } catch { /* ignore */ }
    throw err;
  }
}

/** Status code for a refused download: 400 for a bad/blocked URL or file, 502 for upstream trouble. */
export function avatarDownloadErrorStatus(err: unknown): number | null {
  if (!(err instanceof SafeFetchError)) return null;
  return ['status', 'timeout', 'dns'].includes(err.code) ? 502 : 400;
}
