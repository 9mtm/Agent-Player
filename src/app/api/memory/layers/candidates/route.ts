/**
 * Memory Promotion Candidates API - Frontend proxy
 * Get memories that are candidates for promotion
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

/** GET /api/memory/layers/candidates - Get promotion candidates */
export async function GET() {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const res = await fetch(`${BACKEND_URL}/api/memory/layers/candidates?userId=${userId}`);
        const data = await res.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
    }
}
