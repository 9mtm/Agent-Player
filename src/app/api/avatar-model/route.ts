/**
 * Avatar Model Proxy & Cache
 *
 * Downloads a Ready Player Me GLB from its CDN URL (allow-listed hosts only), caches it in
 * /public/avatar-cache/<hash>.glb, and returns a local URL.
 * On subsequent requests for the same URL, returns the cached version immediately.
 *
 * Query param: ?url=<encoded-glb-url>
 */

import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getSessionUser } from '@/lib/session';
import { checkUrl, SafeFetchError } from '@/lib/net/safe-fetch';
import { AVATAR_MODEL_HOSTS, downloadAvatarModel } from '@/lib/net/avatar-download';

export const runtime = 'nodejs';

const CACHE_DIR = path.join(process.cwd(), 'public', 'storage', 'cache');

async function ensureCacheDir() {
  try { await fs.mkdir(CACHE_DIR, { recursive: true }); } catch { /* exists */ }
}

function urlToFilename(url: string): string {
  const hash = crypto.createHash('md5').update(url).digest('hex');
  // Preserve query params in filename (morphTargets etc.)
  return `${hash}.glb`;
}

/**
 * GET — Fast cache check only (does NOT download).
 * Returns { localUrl } if cached, { localUrl: null } if not.
 * Client should then POST to trigger background download.
 */
export async function GET(req: Request) {
  // SECURITY (S0-A.8): signed-in users only, like POST.
  if (!(await getSessionUser())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const glbUrl = searchParams.get('url');
  if (!glbUrl) return NextResponse.json({ error: 'Missing url param' }, { status: 400 });

  await ensureCacheDir();
  const filename = urlToFilename(glbUrl);
  const cachePath = path.join(CACHE_DIR, filename);
  const localUrl = `/storage/cache/${filename}`;

  try {
    await fs.access(cachePath);
    return NextResponse.json({ localUrl });
  } catch {
    return NextResponse.json({ localUrl: null });
  }
}

/**
 * POST — Download + cache avatar GLB (may take seconds on first call).
 * Returns { localUrl } when done, or { error } on failure.
 *
 * SECURITY (S0-Q.12): signed-in users only; the URL must be https on an
 * allow-listed avatar host, every DNS answer must be a public address (the
 * connection is pinned to it), redirects stay on the same host, and size,
 * content type and GLB magic are checked before anything is written.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { glbUrl } = await req.json().catch(() => ({ glbUrl: null }));
  if (!glbUrl || typeof glbUrl !== 'string' || glbUrl.length > 2048) {
    return NextResponse.json({ error: 'Missing glbUrl' }, { status: 400 });
  }
  try {
    checkUrl(glbUrl, AVATAR_MODEL_HOSTS);
  } catch (err) {
    return NextResponse.json({ error: err instanceof SafeFetchError ? err.message : 'Invalid URL' }, { status: 400 });
  }

  await ensureCacheDir();
  const filename = urlToFilename(glbUrl);
  const cachePath = path.join(CACHE_DIR, filename);
  const localUrl = `/storage/cache/${filename}`;

  // Already cached
  try { await fs.access(cachePath); return NextResponse.json({ localUrl }); } catch { /* continue */ }

  // Download and save
  try {
    const buffer = await downloadAvatarModel(glbUrl);
    const tmpPath = `${cachePath}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    await fs.writeFile(tmpPath, buffer);
    await fs.rename(tmpPath, cachePath);
    console.log(`[Avatar Cache] Saved ${filename} (${Math.round(buffer.byteLength / 1024)} KB)`);
    return NextResponse.json({ localUrl });
  } catch (err) {
    const message = err instanceof SafeFetchError ? err.message : 'Download failed';
    console.error(`[Avatar Cache] Download refused/failed: ${message}`);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
