/**
 * Route guards backed by the real JWT check and the users table.
 *
 * Use these instead of matching `request.url` with a regex: the URL string a
 * regex sees and the route Fastify actually dispatches to can differ
 * (percent-encoding, duplicate slashes, query strings), which lets a request
 * skip a URL-based check while still reaching the handler.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import { getUserIdFromRequest } from './jwt.js';
import { getDatabase } from '../db/index.js';

export type UserRole = 'owner' | 'admin' | 'user' | 'guest';

export const OWNER_OR_ADMIN: readonly UserRole[] = ['owner', 'admin'];

/**
 * Check the bearer token and the user's role/status.
 * Returns the user id, or sends 401/403 and returns null.
 */
export function authorizeActiveRole(
  request: FastifyRequest,
  reply: FastifyReply,
  roles: readonly UserRole[]
): string | null {
  let userId: string;
  try {
    userId = getUserIdFromRequest(request);
  } catch {
    reply.code(401).send({ error: 'Authentication required' });
    return null;
  }
  const user = getDatabase()
    .prepare('SELECT role, status FROM users WHERE id = ?')
    .get(userId) as { role: string; status: string } | undefined;
  if (!user || user.status !== 'active' || !roles.includes(user.role as UserRole)) {
    reply.code(403).send({ error: 'This action requires an active owner or admin account' });
    return null;
  }
  return userId;
}

/** Fastify hook factory: require an active user with one of `roles`. */
export function requireActiveRole(roles: readonly UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = authorizeActiveRole(request, reply, roles);
    if (userId === null) return reply;
    (request as any).authUserId = userId;
  };
}
