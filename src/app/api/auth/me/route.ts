import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/me
 * Get current user session
 */
export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session');

        if (!sessionCookie) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const session = JSON.parse(sessionCookie.value);

        return NextResponse.json({
            success: true,
            user: session,
        });
    } catch (error) {
        console.error('Session error:', error);
        return NextResponse.json(
            { error: 'Invalid session' },
            { status: 401 }
        );
    }
}
