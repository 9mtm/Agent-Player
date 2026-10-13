import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';

/**
 * GET /api/auth/me
 * Current user, verified by the backend JWT check (S0-Q.9).
 */
export async function GET() {
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.json({ success: true, user });
}
