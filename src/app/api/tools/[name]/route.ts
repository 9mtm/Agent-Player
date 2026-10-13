import { NextRequest, NextResponse } from 'next/server';
import { toolsAPI } from '@/lib/backend';
import { requireSessionRole } from '@/lib/session';

/**
 * POST /api/tools/[name]
 * Execute a tool via Backend API
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ name: string }> }
) {
    // SECURITY (S0-Q.9): owner/admin only, verified by the backend JWT check
    const auth = await requireSessionRole();
    if (auth instanceof Response) return auth;

    try {
        const { name } = await params;
        const body = await request.json();

        const result = await toolsAPI.execute(name, body);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error executing tool:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to execute tool'
        }, { status: 500 });
    }
}
