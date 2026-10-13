import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { backendFetch, getSessionUser } from '@/lib/session';

const BACKEND_URL = config.backendUrl;

/**
 * GET /api/agents
 * List all configured agents from agents_config.
 * SECURITY (S0-A.8): signed-in users only; the caller's token is forwarded.
 */
export async function GET() {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ agents: [], error: 'Unauthorized' }, { status: 401 });
    try {
        const res = await backendFetch(`${BACKEND_URL}/api/agents`, { cache: 'no-store' });
        if (!res.ok) {
            return NextResponse.json({ agents: [] }, { status: res.status });
        }
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('[API/agents] Error:', error);
        return NextResponse.json({ agents: [], error: 'Failed to fetch agents' }, { status: 500 });
    }
}
