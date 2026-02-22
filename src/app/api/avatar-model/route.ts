/**
 * Avatar Model Proxy & Cache
 *
 * Downloads a Ready Player Me GLB from its CDN URL, caches it in
 * /public/avatar-cache/<hash>.glb, and returns a local URL.
 * On subsequent requests for the same URL, returns the cached version immediately.
 *
 * Query param: ?url=<encoded-glb-url>
 */

import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export const runtime = 'nodejs';

const CACHE_DIR = path.join(process.cwd(), 'public', 'avatar-cache');

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
  const { searchParams } = new URL(req.url);
  const glbUrl = searchParams.get('url');
  if (!glbUrl) return NextResponse.json({ error: 'Missing url param' }, { status: 400 });

  await ensureCacheDir();
  const filename = urlToFilename(glbUrl);
  const cachePath = path.join(CACHE_DIR, filename);
  const localUrl = `/avatar-cache/${filename}`;

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
 */
export async function POST(req: Request) {
  const { glbUrl } = await req.json().catch(() => ({ glbUrl: null }));
  if (!glbUrl) return NextResponse.json({ error: 'Missing glbUrl' }, { status: 400 });

  await ensureCacheDir();
  const filename = urlToFilename(glbUrl);
  const cachePath = path.join(CACHE_DIR, filename);
  const localUrl = `/avatar-cache/${filename}`;

  // Already cached
  try { await fs.access(cachePath); return NextResponse.json({ localUrl }); } catch { /* continue */ }

  // Download and save
  try {
    console.log(`[Avatar Cache] Downloading: ${glbUrl}`);
    const response = await fetch(glbUrl, { headers: { 'User-Agent': 'AgentPlayer/1.0' } });
    if (!response.ok) return NextResponse.json({ error: `CDN error: ${response.status}` }, { status: 502 });
    const buffer = await response.arrayBuffer();
    const sizeKB = Math.round(buffer.byteLength / 1024);
    await fs.writeFile(cachePath, Buffer.from(buffer));
    console.log(`[Avatar Cache] ✅ Saved: ${filename} (${sizeKB} KB) → ${localUrl}`);
    return NextResponse.json({ localUrl });
  } catch (err: any) {
    console.error(`[Avatar Cache] ❌ Failed to download: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
