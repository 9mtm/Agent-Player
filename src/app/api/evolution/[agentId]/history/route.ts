/**
 * Evolution History API - Frontend proxy
 * Get evolution history for an agent
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

/** GET /api/evolution/:agentId/history - Get evolution history */
export async function GET(
    req: Request,
    { params }: { params: { agentId: string } }
) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { agentId } = params;
    const url = new URL(req.url);
    const limit = url.searchParams.get('limit') || '20';

    try {
        const res = await fetch(`${BACKEND_URL}/api/evolution/${agentId}/history?limit=${limit}`);
        const data = await res.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
    }
}
