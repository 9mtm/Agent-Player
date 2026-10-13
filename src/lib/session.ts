import { cookies, headers } from 'next/headers';
import {
    AUTH_COOKIE,
    pickSessionToken,
    verifyBackendToken,
    type SessionUser,
} from '@/lib/auth/verify-session';

export type { SessionUser };

/**
 * The backend JWT sent with this request (Authorization header, or the
 * same-origin `auth_token` cookie). Not verified - use getSessionUser().
 */
export async function getSessionToken(): Promise<string | null> {
    try {
        const headerStore = await headers();
        const cookieStore = await cookies();
        return pickSessionToken({
            authorization: headerStore.get('authorization'),
            cookieToken: cookieStore.get(AUTH_COOKIE)?.value,
            secFetchSite: headerStore.get('sec-fetch-site'),
        });
    } catch {
        return null;
    }
}

/**
 * Current user, verified by the backend (SECURITY S0-Q.9).
 * There is no development auto-login and no unsigned `session` cookie:
 * without a valid backend token this returns null.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
    return verifyBackendToken(await getSessionToken());
}

/** Authorization header to forward the caller's token to the backend. */
export async function backendAuthHeaders(): Promise<Record<string, string>> {
    const token = await getSessionToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Check if user is authenticated
 */
export async function requireAuth(): Promise<SessionUser> {
    const user = await getSessionUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    return user;
}

/**
 * Guard for Next.js routes that act on this machine (write/run skills,
 * enable extensions, ...): an active owner/admin verified by the backend.
 * Returns the user, or a 401/403 response to return as-is.
 */
export async function requireSessionRole(
    roles: readonly string[] = ['owner', 'admin']
): Promise<SessionUser | Response> {
    const user = await getSessionUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!roles.includes(user.role)) {
        return Response.json({ error: 'This action requires an owner or admin account' }, { status: 403 });
    }
    return user;
}
