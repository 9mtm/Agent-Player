/**
 * Page sign-in gate used by src/middleware.ts (S0-Q.12), kept pure so it can
 * be unit-tested.
 *
 * The middleware cannot verify the JWT (the Next.js process has no JWT secret;
 * Next API routes ask the backend through verify-session.ts). It only makes
 * sure a page request carries a well-formed `auth_token` cookie and otherwise
 * sends the browser to /login. Real checks stay where data is served: the
 * backend and the Next API routes. API routes are not gated here.
 */

import { isPublicPath, LOGIN_PATH } from './first-run';

export type PageGateDecision = { action: 'next' } | { action: 'redirect'; location: string };

/** Static files served from /public (e.g. /icons/x.svg, /storage/cache/a.glb). */
function isStaticAsset(pathname: string): boolean {
    const last = pathname.split('/').pop() || '';
    return /\.[A-Za-z0-9]{1,8}$/.test(last);
}

/** Shape check only (three base64url parts); the backend verifies the signature. */
export function looksLikeJwt(token: string | null | undefined): boolean {
    if (!token || token.length > 4096) return false;
    return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
}

export function pageGate(pathname: string, cookieToken: string | null | undefined): PageGateDecision {
    if (pathname === '/api' || pathname.startsWith('/api/')) return { action: 'next' };
    if (pathname.startsWith('/_next/')) return { action: 'next' };
    if (isPublicPath(pathname) || isStaticAsset(pathname)) return { action: 'next' };
    if (looksLikeJwt(cookieToken)) return { action: 'next' };
    return { action: 'redirect', location: LOGIN_PATH };
}
