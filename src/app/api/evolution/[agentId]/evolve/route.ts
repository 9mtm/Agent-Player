/**
 * Evolution Evolve API - Frontend proxy
 * Trigger evolution cycle for an agent
 */

import { backendFetch, getSessionUser } from '@/lib/session';
import { config } from '@/lib/config';
import { NextResponse } from 'next/server';
import { isAgentId } from '@/lib/evolution/proposal-review';

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
    { params }: { params: Promise<{ agentId: string }> }
) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Next 16: params is a Promise. The id is checked and encoded (FU-01).
    const { agentId } = await params;
    if (!isAgentId(agentId)) return NextResponse.json({ error: 'Invalid agent id' }, { status: 400 });

    try {
        const res = await backendFetch(`${BACKEND_URL}/api/evolution/${encodeURIComponent(agentId)}/evolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        // Keep the status: the page shows "Owner only" on 403 (FU-01).
        return NextResponse.json(data, { status: res.status });
    } catch {
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
    }
}
