import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE } from '@/lib/auth/verify-session';
import { pageGate } from '@/lib/auth/page-gate';

/**
 * Page sign-in gate (S0-Q.12): a page request without a well-formed
 * `auth_token` cookie goes to /login. Public pages (/login, /setup,
 * /avatar-lab) and static files pass; API routes are excluded by the matcher
 * and keep their own checks. The token itself is verified by the backend.
 */
export function middleware(request: NextRequest) {
    let cookieToken = request.cookies.get(AUTH_COOKIE)?.value;
    try {
        if (cookieToken) cookieToken = decodeURIComponent(cookieToken);
    } catch {
        cookieToken = undefined;
    }
    const decision = pageGate(request.nextUrl.pathname, cookieToken);
    if (decision.action === 'redirect') {
        const url = request.nextUrl.clone();
        url.pathname = decision.location;
        url.search = '';
        return NextResponse.redirect(url);
    }
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
