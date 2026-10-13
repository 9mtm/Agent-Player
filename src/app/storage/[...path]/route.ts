/**
 * GET /storage/<path> — uploaded files (CL-05).
 *
 * Runtime uploads no longer live in `public/storage` (Next.js would serve
 * them to anyone). Stored URLs keep the `/storage/...` form; this route
 * forwards the signed-in user's token to the backend `GET /api/uploads/*`,
 * which decides access (own files, shared profile pictures/logos, owner/admin
 * for the rest). Without a session the answer is 401.
 */
import { config } from '@/lib/config';
import { getSessionToken } from '@/lib/session';
import { backendUploadUrl, FORWARDED_HEADERS } from '@/lib/storage-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const url = backendUploadUrl(config.backendUrl, path);
    if (!url) return new Response('Not found', { status: 404 });
    const token = await getSessionToken();
    if (!token) return new Response('Unauthorized', { status: 401 });

    let res: Response;
    try {
        res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', redirect: 'manual' });
    } catch {
        return new Response('Bad gateway', { status: 502 });
    }
    if (!res.ok) return new Response(res.status === 401 ? 'Unauthorized' : 'Not found', { status: res.status === 401 ? 401 : 404 });

    const headers = new Headers();
    for (const name of FORWARDED_HEADERS) {
        const value = res.headers.get(name);
        if (value) headers.set(name, value);
    }
    return new Response(res.body, { status: 200, headers });
}
