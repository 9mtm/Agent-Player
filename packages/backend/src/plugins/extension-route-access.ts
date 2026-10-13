/**
 * Deny-by-default access for extension routes under /api/ext/<id>.
 *
 * SECURITY (S0-Q.18): an extension's routes need an active owner/admin token
 * unless its manifest says otherwise:
 *   "routeAccess": "owner-admin"   (default) active owner or admin
 *                  "authenticated" any active signed-in user
 *                  "public"        no check here; the extension authorizes itself
 *   "publicRoutes": ["/webhook"]   route patterns (relative to /api/ext/<id>)
 *                                  that skip the check, e.g. provider webhooks
 *
 * Public routes are matched against the route pattern Fastify dispatched to
 * (request.routeOptions.url), never against the raw URL string.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import { authenticateActiveUser, authorizeActiveRole, OWNER_OR_ADMIN } from '../auth/route-guards.js';

export type ExtensionRouteAccess = 'owner-admin' | 'authenticated' | 'public';

const ACCESS_LEVELS: readonly ExtensionRouteAccess[] = ['owner-admin', 'authenticated', 'public'];

/** Read the access level from a manifest; unknown or missing values mean owner-admin. */
export function getExtensionRouteAccess(manifest: { routeAccess?: unknown }): ExtensionRouteAccess {
  const value = manifest?.routeAccess;
  return ACCESS_LEVELS.includes(value as ExtensionRouteAccess) ? (value as ExtensionRouteAccess) : 'owner-admin';
}

/**
 * onRequest hook for one extension's route scope, or null when the manifest
 * declares the whole extension public.
 */
export function createExtensionRouteGuard(
  manifest: { routeAccess?: unknown; publicRoutes?: unknown },
  extensionPrefix: string
) {
  const access = getExtensionRouteAccess(manifest);
  if (access === 'public') return null;

  const publicPatterns = new Set(
    (Array.isArray(manifest.publicRoutes) ? manifest.publicRoutes : [])
      .filter((r): r is string => typeof r === 'string' && r.startsWith('/'))
      .map((r) => `${extensionPrefix}${r}`)
  );

  return async function extensionRouteGuard(request: FastifyRequest, reply: FastifyReply) {
    const pattern = request.routeOptions?.url;
    if (pattern && publicPatterns.has(pattern)) return;

    if (access === 'authenticated') {
      const user = authenticateActiveUser(request);
      if (!user) return reply.code(401).send({ error: 'Authentication required' });
      (request as any).authUserId = user.id;
      return;
    }

    const userId = authorizeActiveRole(request, reply, OWNER_OR_ADMIN);
    if (userId === null) return reply;
    (request as any).authUserId = userId;
  };
}
