/**
 * Route guards backed by the real JWT check and the users table.
 *
 * Use these instead of matching `request.url` with a regex: the URL string a
 * regex sees and the route Fastify actually dispatches to can differ
 * (percent-encoding, duplicate slashes, query strings), which lets a request
 * skip a URL-based check while still reaching the handler.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyRequestToken, verifyRequestTokenAsync, AuthTokenError, type TokenUser } from './jwt.js';
import { getDatabase } from '../db/index.js';
import { dbDriver } from '../db/pg/config.js';

export type UserRole = 'owner' | 'admin' | 'user' | 'guest';

export const OWNER_OR_ADMIN: readonly UserRole[] = ['owner', 'admin'];

const ROLE_REFUSAL = 'This action requires an active owner or admin account';

function gateUser(request: FastifyRequest): { id: string; role: UserRole } | null {
  const u = (request as any).authUser;
  return u && typeof u.id === 'string' && u.id ? { id: u.id, role: u.role as UserRole } : null;
}

/**
 * Verify the bearer token (signature, expiry, token_version) and load the
 * user, on the configured driver (B2.2b). Resolves the active user's id and
 * role, or null for any refusal (no/bad/expired/invalidated token, unknown or
 * inactive user). A database error rejects (the caller's hook fails and the
 * global error handler answers the generic 500): it never passes.
 */
export async function authenticateActiveUserAsync(
  request: FastifyRequest
): Promise<{ id: string; role: UserRole } | null> {
  let checked: { userId: string; user: TokenUser };
  try {
    checked = await verifyRequestTokenAsync(request, { requireActive: false });
  } catch (err) {
    if (err instanceof AuthTokenError) return null;
    throw err;
  }
  if (checked.user.status !== 'active') return null;
  return { id: checked.userId, role: checked.user.role as UserRole };
}

/**
 * Async form of authorizeActiveRole (B2.2b): resolves the user id, or sends
 * 401/403 (same bodies and codes) and resolves null. Database errors reject.
 */
export async function authorizeActiveRoleAsync(
  request: FastifyRequest,
  reply: FastifyReply,
  roles: readonly UserRole[]
): Promise<string | null> {
  let checked: { userId: string; user: TokenUser };
  try {
    checked = await verifyRequestTokenAsync(request, { requireActive: false });
  } catch (err) {
    if (!(err instanceof AuthTokenError)) throw err;
    reply.code(401).send({ error: 'Authentication required', code: 'unauthenticated' });
    return null;
  }
  return roleDecision(checked.userId, checked.user, reply, roles);
}

function roleDecision(
  userId: string,
  user: { role: string; status?: string | null } | undefined,
  reply: FastifyReply,
  roles: readonly UserRole[]
): string | null {
  if (!user || user.status !== 'active' || !roles.includes(user.role as UserRole)) {
    // BE-UI-02: same message; the code tells a disabled account from a missing role.
    const code = !user || user.status !== 'active' ? 'inactive_user' : 'forbidden';
    reply.code(403).send({ error: ROLE_REFUSAL, code });
    return null;
  }
  return userId;
}

/**
 * Synchronous form for route handlers. Reuses the auth gate's verified user
 * (request.authUser) when there is one; otherwise checks here on SQLite. On
 * PostgreSQL without the gate it refuses (verifyRequestToken fails closed).
 * Hooks should use authenticateActiveUserAsync.
 */
export function authenticateActiveUser(
  request: FastifyRequest
): { id: string; role: UserRole } | null {
  const verified = gateUser(request);
  if (verified) return verified;
  let userId: string;
  try {
    userId = verifyRequestToken(request, { requireActive: false });
  } catch {
    return null;
  }
  const user = sqliteUserRow(userId);
  if (!user || user.status !== 'active') return null;
  return { id: userId, role: user.role as UserRole };
}

/**
 * The user's role/status row for the synchronous fallback (no gate user).
 * SQLite only: on PostgreSQL there is no synchronous read, so it fails closed
 * (no user -> refused); the auth gate and requireActiveRole do the async check.
 */
function sqliteUserRow(userId: string): { role: string; status: string } | undefined {
  if (dbDriver() === 'postgres') return undefined;
  return getDatabase()
    .prepare('SELECT role, status FROM users WHERE id = ?')
    .get(userId) as { role: string; status: string } | undefined;
}

/**
 * Check the bearer token and the user's role/status (synchronous form, see
 * authenticateActiveUser). Returns the user id, or sends 401/403 and returns null.
 */
export function authorizeActiveRole(
  request: FastifyRequest,
  reply: FastifyReply,
  roles: readonly UserRole[]
): string | null {
  const verified = gateUser(request);
  if (verified) return roleDecision(verified.id, { role: verified.role, status: 'active' }, reply, roles);
  let userId: string;
  try {
    userId = verifyRequestToken(request, { requireActive: false });
  } catch {
    reply.code(401).send({ error: 'Authentication required', code: 'unauthenticated' });
    return null;
  }
  const user = sqliteUserRow(userId);
  return roleDecision(userId, user, reply, roles);
}

/** Fastify hook factory: require an active user with one of `roles` (async check, B2.2b). */
export function requireActiveRole(roles: readonly UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = await authorizeActiveRoleAsync(request, reply, roles);
    if (userId === null) return reply;
    (request as any).authUserId = userId;
  };
}
