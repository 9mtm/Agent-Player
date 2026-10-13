import { NextResponse } from 'next/server';
import { backendFetch, getSessionUser } from '@/lib/session';
import { config } from '@/lib/config';

const BACKEND_URL = config.backendUrl;

async function getUserId(): Promise<string | null> {
    const user = await getSessionUser();
    if (!user) return null;
    return (user as any).id || user.email;
}

export async function GET(req: Request) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(req.url);
        const params = new URLSearchParams(url.searchParams);
        params.delete('userId'); // backend takes the user from the token (S0-Q.17)

        const res = await backendFetch(`${BACKEND_URL}/api/memory-sharing/shared?${params}`);
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Failed to load shared memories', message: error.message },
            { status: 500 }
        );
    }
}
