import { NextResponse } from 'next/server';
import { backendFetch, getSessionUser } from '@/lib/session';
import { config } from '@/lib/config';

const BACKEND_URL = config.backendUrl;

async function getUserId(): Promise<string | null> {
    const user = await getSessionUser();
    if (!user) return null;
    return (user as any).id || user.email;
}

export async function GET() {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const res = await backendFetch(`${BACKEND_URL}/api/evaluation/overview`);

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Failed to load overview', message: error.message },
            { status: 500 }
        );
    }
}
