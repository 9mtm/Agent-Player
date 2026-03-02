/**
 * Memory Importance Score API - Frontend proxy
 * Update importance score for a memory
 */

import { getSessionUser } from '@/lib/session';
import { config } from '@/lib/config';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BACKEND_URL = config.backendUrl;

async function getUserId(): Promise<string | null> {
    const user = await getSessionUser();
    if (!user) return null;
    return (user as any).id || user.email;
}

/** POST /api/memory/layers/importance - Update importance score */
export async function POST(req: Request) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    try {
        const res = await fetch(`${BACKEND_URL}/api/memory/layers/importance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, userId }),
        });
        const data = await res.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
    }
}
