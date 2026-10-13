import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { backendFetch, getSessionUser } from '@/lib/session';

const BACKEND_URL = config.backendUrl;

/**
 * GET /api/tools
 * List all available tools from Backend API.
 * SECURITY (S0-A.8): signed-in users only; the caller's token is forwarded.
 */
export async function GET() {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const res = await backendFetch(`${BACKEND_URL}/api/tools`, { cache: 'no-store' });
        if (!res.ok) {
            return NextResponse.json({ error: 'Failed to fetch tools' }, { status: res.status });
        }
        const data = await res.json();
        const tools = Array.isArray(data?.tools) ? data.tools : [];
        return NextResponse.json({
            success: true,
            tools,
            count: tools.length,
        });
    } catch (error) {
        console.error('Error fetching tools:', error);
        return NextResponse.json({
            error: 'Failed to fetch tools',
        }, { status: 500 });
    }
}
