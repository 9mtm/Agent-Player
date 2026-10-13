import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE } from '@/lib/auth/verify-session';

/**
 * POST /api/auth/logout
 * Clear the token cookie (and the legacy unsigned `session` cookie).
 */
export async function POST() {
    try {
        const cookieStore = await cookies();
        cookieStore.delete(AUTH_COOKIE);
        cookieStore.delete('session');

        return NextResponse.json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
