/**
 * Memory Consolidation API - Frontend proxy
 * Manually trigger memory consolidation
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

/** POST /api/memory/layers/consolidate - Manually trigger consolidation */
export async function POST() {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const res = await fetch(`${BACKEND_URL}/api/memory/layers/consolidate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        const data = await res.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
    }
}
