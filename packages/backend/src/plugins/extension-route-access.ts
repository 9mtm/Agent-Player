/**
 * Deny-by-default access for extension routes under /api/ext/<id>.
 *
 * SECURITY (S0-Q.18): an extension's routes need an active owner/admin token
 * unless its manifest says otherwise:
 *   "routeAccess": "owner-admin"   (default) active owner or admin
 *                  "authenticated" any active signed-in user
 *                  (no whole-extension "public" level; any other value
 *                  means owner-admin)
 *   "publicRoutes": ["/webhook"]   route patterns (relative to /api/ext/<id>)
 *                                  that skip the check, e.g. provider webhooks;
 *                                  each must verify the provider itself
 *                                  (signature / OAuth state)
 *   "queryTokenRoutes": ["/stream"] GET route patterns that may carry the token
 *                                  as ?token= (EventSource cannot send headers);
 *                                  the token is verified exactly like a header
 *
 * Public routes are matched against the route pattern Fastify dispatched to
 * (request.routeOptions.url), never against the raw URL string.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import { authenticateActiveUser, authorizeActiveRole, OWNER_OR_ADMIN } from '../auth/route-guards.js';

export type ExtensionRouteAccess = 'owner-admin' | 'authenticated';

const ACCESS_LEVELS: readonly ExtensionRouteAccess[] = ['owner-admin', 'authenticated'];

/** Read the access level from a manifest; unknown or missing values mean owner-admin. */
export function getExtensionRouteAccess(manifest: { routeAccess?: unknown }): ExtensionRouteAccess {
  const value = manifest?.routeAccess;
  return ACCESS_LEVELS.includes(value as ExtensionRouteAccess) ? (value as ExtensionRouteAccess) : 'owner-admin';
}

function routePatterns(list: unknown, extensionPrefix: string): Set<string> {
  return new Set(
    (Array.isArray(list) ? list : [])
      .filter((r): r is string => typeof r === 'string' && r.startsWith('/'))
      .map((r) => `${extensionPrefix}${r}`)
  );
}

/** onRequest hook for one extension's route scope. */
export function createExtensionRouteGuard(
  manifest: { routeAccess?: unknown; publicRoutes?: unknown; queryTokenRoutes?: unknown },
  extensionPrefix: string
) {
  const access = getExtensionRouteAccess(manifest);

  const publicPatterns = routePatterns(manifest.publicRoutes, extensionPrefix);
  const queryTokenPatterns = routePatterns(manifest.queryTokenRoutes, extensionPrefix);

  return async function extensionRouteGuard(request: FastifyRequest, reply: FastifyReply) {
    const pattern = request.routeOptions?.url;
    if (pattern && publicPatterns.has(pattern)) return;

    if (pattern && queryTokenPatterns.has(pattern) && request.method === 'GET' && !request.headers.authorization) {
      const queryToken = (request.query as Record<string, unknown> | undefined)?.token;
      if (typeof queryToken === 'string' && queryToken) {
        request.headers.authorization = `Bearer ${queryToken}`;
      }
    }

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
