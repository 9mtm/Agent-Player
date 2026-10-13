/**
 * Server-side session verification for Next.js API routes (S0-Q.9).
 *
 * The only accepted credential is the backend JWT (the same token the browser
 * keeps as `auth_token`). It is checked by the backend itself through
 * GET /api/auth/me (signature, expiry, token_version, active account), so the
 * Next.js process never needs the JWT secret. No unsigned cookies, no
 * development auto-login.
 *
 * Kept free of `next/*` imports so it can be unit-tested with a stubbed fetch.
 */

export interface SessionUser {
    userId: string;
    email: string;
    role: string;
    name?: string;
}

export const AUTH_COOKIE = 'auth_token';

const DEFAULT_BACKEND_PORT = '41522';

/** Backend base URL used for token checks: loopback unless BACKEND_INTERNAL_URL is set. */
export function internalBackendUrl(env: Record<string, string | undefined> = process.env): string {
    if (env.BACKEND_INTERNAL_URL) return env.BACKEND_INTERNAL_URL.replace(/\/+$/, '');
    let port = DEFAULT_BACKEND_PORT;
    try {
        if (env.NEXT_PUBLIC_BACKEND_URL) port = new URL(env.NEXT_PUBLIC_BACKEND_URL).port || port;
    } catch { /* keep default */ }
    return `http://127.0.0.1:${port}`;
}

/**
 * Pick the token for this request.
 * - `Authorization: Bearer <jwt>` header first.
 * - The `auth_token` cookie only for same-origin browser requests (or non-browser
 *   clients that send no Sec-Fetch-Site): a cross-site page cannot ride on it.
 */
export function pickSessionToken(input: {
    authorization?: string | null;
    cookieToken?: string | null;
    secFetchSite?: string | null;
}): string | null {
    const auth = input.authorization?.trim();
    if (auth) {
        const match = /^Bearer\s+(\S+)$/i.exec(auth);
        return match ? match[1] : null;
    }
    const cookie = input.cookieToken?.trim();
    if (!cookie) return null;
    const site = input.secFetchSite?.trim().toLowerCase();
    if (site && site !== 'same-origin') return null;
    return cookie;
}

/** Ask the backend who this token belongs to. Returns null for any failure. */
export async function verifyBackendToken(
    token: string | null,
    opts: { backendUrl?: string; fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<SessionUser | null> {
    if (!token || token.length > 4096 || !/^[A-Za-z0-9._-]+$/.test(token)) return null;
    const fetchImpl = opts.fetchImpl || fetch;
    const base = opts.backendUrl || internalBackendUrl();
    try {
        const res = await fetchImpl(`${base}/api/auth/me`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
            signal: AbortSignal.timeout(opts.timeoutMs ?? 5000),
        });
        if (!res.ok) return null;
        const data = await res.json().catch(() => null);
        const user = data?.user;
        if (!user || typeof user.id !== 'string' || !user.id) return null;
        if (user.status !== undefined && user.status !== 'active') return null;
        return {
            userId: user.id,
            email: typeof user.email === 'string' ? user.email : '',
            role: typeof user.role === 'string' ? user.role : 'user',
            name: user.full_name || user.username || undefined,
        };
    } catch {
        return null;
    }
}
