import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, backendLogout, pickSessionToken } from '@/lib/auth/verify-session';

/**
 * POST /api/auth/logout
 * F-02: end the session on the backend (the JWT is invalidated there through
 * token_version), then clear the token cookie (and the legacy unsigned
 * `session` cookie). The token comes from the bearer header or, for
 * same-origin requests only, the `auth_token` cookie.
 */
export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = pickSessionToken({
            authorization: request.headers.get('authorization'),
            cookieToken: cookieStore.get(AUTH_COOKIE)?.value ?? null,
            secFetchSite: request.headers.get('sec-fetch-site'),
        });
        const backendLoggedOut = await backendLogout(token);

        cookieStore.delete(AUTH_COOKIE);
        cookieStore.delete('session');

        return NextResponse.json({
            success: true,
            backendLoggedOut,
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
