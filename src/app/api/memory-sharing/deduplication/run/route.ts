import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { config } from '@/lib/config';

const BACKEND_URL = config.backendUrl;

async function getUserId(): Promise<string | null> {
    const user = await getSessionUser();
    if (!user) return null;
    return (user as any).id || user.email;
}

export async function POST(req: Request) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        body.userId = userId;

        const res = await fetch(`${BACKEND_URL}/api/memory-sharing/deduplication/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Failed to run deduplication', message: error.message },
            { status: 500 }
        );
    }
}
