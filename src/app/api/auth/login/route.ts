import { NextResponse } from 'next/server';

/**
 * POST /api/auth/login (Next.js) - disabled.
 *
 * SECURITY (S0-Q.9): this route used to create an unsigned `session` cookie
 * that other Next.js routes trusted (any role could be forged). Sign-in is
 * handled only by the backend (`POST {backend}/api/auth/login`), which returns
 * the JWT the app sends as a bearer token.
 */
export async function POST() {
    return NextResponse.json(
        { error: 'Sign in through the backend /api/auth/login' },
        { status: 410 }
    );
}
