import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

const BACKEND_URL = config.backendUrl;

/**
 * GET /api/agents
 * List all configured agents from agents_config
 */
export async function GET() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/agents`, { cache: 'no-store' });
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
