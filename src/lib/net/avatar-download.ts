/**
 * Avatar model download policy (S0-Q.12): which hosts the server may fetch
 * avatar GLB files from, and the limits applied. Same hosts as the
 * `images.remotePatterns` in next.config.ts (Ready Player Me).
 */

import { safeDownload, type SafeFetchOptions } from './safe-fetch';

export const AVATAR_MODEL_HOSTS = ['models.readyplayer.me', 'readyplayerme-assets.s3.amazonaws.com'] as const;

/** 30 MB: Ready Player Me GLBs are typically 1-10 MB. */
export const AVATAR_MODEL_MAX_BYTES = 30 * 1024 * 1024;

export const AVATAR_MODEL_CONTENT_TYPES = [
    'model/gltf-binary',
    'application/octet-stream',
    'binary/octet-stream',
] as const;

/** A binary glTF file starts with the ASCII magic "glTF". */
export function isGlb(body: Buffer): boolean {
    return body.length >= 12 && body.subarray(0, 4).toString('latin1') === 'glTF';
}

export async function downloadAvatarModel(
    url: string,
    overrides: Pick<SafeFetchOptions, 'lookup' | 'transport'> = {}
): Promise<Buffer> {
    const { body } = await safeDownload(url, {
        allowedHosts: AVATAR_MODEL_HOSTS,
        maxBytes: AVATAR_MODEL_MAX_BYTES,
        allowedContentTypes: AVATAR_MODEL_CONTENT_TYPES,
        timeoutMs: 30000,
        maxRedirects: 3,
        ...overrides,
    });
    if (!isGlb(body)) throw new Error('Downloaded file is not a GLB model');
    return body;
}
