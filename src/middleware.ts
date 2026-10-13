import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isPublicPath } from '@/lib/auth/first-run';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public pages (/login, /setup, /avatar-lab); no open /register page.
    if (isPublicPath(pathname)) {
        return NextResponse.next();
    }

    // Check for auth token
    const token = request.cookies.get('auth_token')?.value;

    // If no token, redirect to login
    if (!token) {
        // For client-side, check localStorage token
        // But middleware runs on server, so we'll handle this differently
        // For now, allow through and let client-side auth handle it
        return NextResponse.next();
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
