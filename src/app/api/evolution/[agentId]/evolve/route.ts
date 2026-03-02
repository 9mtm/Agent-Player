/**
 * Evolution Evolve API - Frontend proxy
 * Trigger evolution cycle for an agent
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

/** POST /api/evolution/:agentId/evolve - Trigger evolution */
export async function POST(
    req: Request,
    { params }: { params: { agentId: string } }
) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { agentId } = params;

    try {
        const res = await fetch(`${BACKEND_URL}/api/evolution/${agentId}/evolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
    }
}
