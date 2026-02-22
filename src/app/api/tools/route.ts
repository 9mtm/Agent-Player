import { NextResponse } from 'next/server';
import { toolsAPI } from '@/lib/backend';

/**
 * GET /api/tools
 * List all available tools from Backend API
 */
export async function GET() {
    try {
        const tools = await toolsAPI.list();
        return NextResponse.json({
            success: true,
            tools,
            count: tools.length,
        });
    } catch (error) {
        console.error('Error fetching tools:', error);
        return NextResponse.json({
            error: 'Failed to fetch tools',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
