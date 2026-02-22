/**
 * Avatar Preview Proxy
 *
 * Fetches the 2D portrait image from ReadyPlayerMe's render service
 * and caches it locally. Returns the image directly (as PNG).
 *
 * Query param: ?id=<avatarId>
 *
 * RPM render URL: https://models.readyplayer.me/{id}.png
 */

import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

const CACHE_DIR = path.join(process.cwd(), 'public', 'avatar-cache');

async function ensureCacheDir() {
  try { await fs.mkdir(CACHE_DIR, { recursive: true }); } catch { /* exists */ }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const avatarId = searchParams.get('id');
  if (!avatarId || !/^[a-f0-9]+$/i.test(avatarId)) {
    return NextResponse.json({ error: 'Invalid avatar ID' }, { status: 400 });
  }

  await ensureCacheDir();
  const filename = `preview_${avatarId}.png`;
  const cachePath = path.join(CACHE_DIR, filename);

  // Return cached image if it exists
  try {
    await fs.access(cachePath);
    const data = await fs.readFile(cachePath);
    return new Response(data, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' } });
  } catch { /* not cached yet */ }

  // Fetch from RPM
  const rpmUrl = `https://models.readyplayer.me/${avatarId}.png?scene=fullbody-portrait-v1`;
  try {
    console.log(`[Avatar Preview] Fetching: ${rpmUrl}`);
    const res = await fetch(rpmUrl, { headers: { 'User-Agent': 'AgentPlayer/1.0' } });
    if (!res.ok) {
      console.warn(`[Avatar Preview] RPM returned ${res.status} for ${avatarId}`);
      return NextResponse.json({ error: `RPM error: ${res.status}` }, { status: 502 });
    }
    const buffer = await res.arrayBuffer();
    await fs.writeFile(cachePath, Buffer.from(buffer));
    console.log(`[Avatar Preview] ✅ Cached: ${filename}`);
    return new Response(buffer, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' } });
  } catch (err: any) {
    console.error(`[Avatar Preview] ❌ Fetch failed: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
