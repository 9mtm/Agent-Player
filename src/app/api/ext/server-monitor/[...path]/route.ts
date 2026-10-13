/**
 * Server Monitor extension proxy: /api/ext/server-monitor/* -> backend.
 *
 * SECURITY (S0-Q.12): the extension manages remote servers (SSH/WHM
 * credentials, commands), so every method needs a signed-in owner/admin
 * verified by the backend. Only the caller's bearer token is forwarded (no
 * cookies, Host or other client headers), and the path is rebuilt from
 * validated segments so it cannot climb out of /api/ext/server-monitor/.
 */

import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { backendFetch, requireSessionRole } from '@/lib/session';

const BACKEND_URL = config.backendUrl;
const SEGMENT = /^[A-Za-z0-9_.:@-]{1,200}$/;

type Ctx = { params: Promise<{ path: string[] }> };

/** Backend URL for these segments, or null when a segment is not allowed. */
function targetUrl(segments: string[], search = ''): string | null {
  if (!segments.length || segments.length > 20) return null;
  for (const s of segments) {
    if (!SEGMENT.test(s) || s === '.' || s === '..') return null;
  }
  return `${BACKEND_URL}/api/ext/server-monitor/${segments.map(encodeURIComponent).join('/')}${search}`;
}

async function proxy(request: NextRequest, ctx: Ctx, method: 'GET' | 'POST' | 'PUT' | 'DELETE') {
  const auth = await requireSessionRole(['owner', 'admin']);
  if (auth instanceof Response) return auth;

  try {
    const { path } = await ctx.params;
    const url = targetUrl(path, method === 'GET' ? request.nextUrl.search : '');
    if (!url) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });

    const init: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
    if (method === 'POST' || method === 'PUT') {
      const body = await request.json().catch(() => undefined);
      init.body = JSON.stringify(body ?? {});
    }

    const response = await backendFetch(url, init);
    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: `Backend returned ${response.status}` };
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Server Monitor Proxy] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Failed to proxy request to backend' }, { status: 502 });
  }
}

export const GET = (request: NextRequest, ctx: Ctx) => proxy(request, ctx, 'GET');
export const POST = (request: NextRequest, ctx: Ctx) => proxy(request, ctx, 'POST');
export const PUT = (request: NextRequest, ctx: Ctx) => proxy(request, ctx, 'PUT');
export const DELETE = (request: NextRequest, ctx: Ctx) => proxy(request, ctx, 'DELETE');
