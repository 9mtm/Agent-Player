/**
 * Evolution Insights API - Frontend proxy
 * Get learning insights for an agent
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

/** GET /api/evolution/:agentId/insights - Get insights */
export async function GET(
    req: Request,
    { params }: { params: { agentId: string } }
) {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { agentId } = params;
    const url = new URL(req.url);
    const applied = url.searchParams.get('applied');
    const limit = url.searchParams.get('limit') || '20';

    try {
        let queryUrl = `${BACKEND_URL}/api/evolution/${agentId}/insights?limit=${limit}`;
        if (applied !== null) queryUrl += `&applied=${applied}`;

        const res = await fetch(queryUrl);
        const data = await res.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 });
    }
}
