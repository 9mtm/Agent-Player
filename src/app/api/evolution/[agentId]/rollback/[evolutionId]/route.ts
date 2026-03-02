/**
 * Evolution Rollback API - Frontend proxy
 * Rollback a specific evolution
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

/** POST /api/evolution/:agentId/rollback/:evolutionId - Rollback evolution */
export async function POST(
    req: Request,
    { params }: { params: { agentId: string; evolutionId: string } }
) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { agentId, evolutionId } = params;

    try {
        const res = await fetch(`${BACKEND_URL}/api/evolution/${agentId}/rollback/${evolutionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
    }
}
