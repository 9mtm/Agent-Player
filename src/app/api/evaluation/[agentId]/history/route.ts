import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { config } from '@/lib/config';

const BACKEND_URL = config.backendUrl;

async function getUserId(): Promise<string | null> {
    const user = await getSessionUser();
    if (!user) return null;
    return (user as any).id || user.email;
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ agentId: string }> }
) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { agentId } = await params;
        const url = new URL(req.url);
        const limit = url.searchParams.get('limit') || '10';

        const res = await fetch(
            `${BACKEND_URL}/api/evaluation/${agentId}/history?limit=${limit}`
        );

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Failed to load history', message: error.message },
            { status: 500 }
        );
    }
}
