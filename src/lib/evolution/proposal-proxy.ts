/**
 * Server-side proxy for the proposal review routes (FU-01). Same pattern as
 * the other /api/evolution proxies: signed-in users only, the caller's token
 * is forwarded with backendFetch (no cookies), and only the documented JSON
 * fields are sent. Unlike the older proxies, the backend status code is kept
 * so the page can tell 403 (owner only) and 409 (changed) apart.
 */

import { NextResponse } from 'next/server';
import { backendFetch, getSessionUser } from '@/lib/session';
import { config } from '@/lib/config';

const BACKEND_URL = config.backendUrl;

/** Request body as JSON, or {} when there is none or it is not JSON. */
export async function readJsonBody(req: Request): Promise<unknown> {
    try {
        return await req.json();
    } catch {
        return {};
    }
}

/** Forward to `path` on the backend; `body` is sent as JSON when given. */
export async function proxyProposalRequest(
    path: string,
    init: { method?: 'GET' | 'POST'; body?: Record<string, unknown> } = {},
): Promise<NextResponse> {
    if (!(await getSessionUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const res = await backendFetch(`${BACKEND_URL}${path}`, {
            method: init.method ?? 'GET',
            ...(init.body !== undefined
                ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(init.body) }
                : {}),
        });
        let data: unknown = {};
        try { data = await res.json(); } catch { data = {}; }
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
    }
}

export function invalidId(): NextResponse {
    return NextResponse.json({ error: 'Proposal not found', code: 'not_found' }, { status: 404 });
}
