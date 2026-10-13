/**
 * Global deny-by-default authentication gate (S0-A.1).
 *
 * One root `onRequest` hook decides, for every matched route, who may call
 * it. It looks only at the route Fastify actually dispatched to
 * (`request.routeOptions.url` + method), never at the raw URL string.
 *
 * Access levels:
 *  - 'public'   no token needed. Only routes in PUBLIC_ROUTES (or, in
 *               development, the Swagger UI) can be public.
 *  - 'optional' anonymous allowed; a sent token must be valid (active user)
 *               and is attached as request.authUser. Only OPTIONAL_ROUTES.
 *  - 'service'  POST /api/chat: a live server-created channel-turn token, or
 *               an active signed-in user.
 *  - 'user'     an active user with role owner, admin or user (default).
 *  - 'admin'    an active owner or admin.
 *  - 'owner'    the active owner.
 *
 * The level comes from the central tables below; a route may raise it with
 * `config: { access: 'admin' | 'owner' }` but can never make itself public or
 * optional - only the allow-lists here can. Unknown values fail closed
 * ('owner'). Extension routes (`/api/ext/*`) are skipped: their own scope
 * guard (S0-Q.18, extension-route-access.ts) is already deny-by-default.
 *
 * `guest` accounts and users whose status is not 'active' are refused on
 * every non-public route except, for guests, GUEST_ROUTES (see who they are,
 * sign out) and GUEST_PUBLIC_CHAT_ROUTES (public rooms only, Q-13).
 *
 * Existing per-route guards stay in place as a second line.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authenticateActiveUser, type UserRole } from './route-guards.js';
import { CHANNEL_TURN_HEADER, channelTurnFromHeaders } from '../tools/channel-policy.js';

export type RouteAccess = 'public' | 'optional' | 'service' | 'user' | 'admin' | 'owner';

export interface AuthUser {
  id: string;
  role: UserRole;
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by the auth gate for every authenticated request. */
    authUser: AuthUser | null;
  }
  interface FastifyContextConfig {
    /** Raise a route's access level (read by the gate; can never lower it). */
    access?: RouteAccess;
  }
}

const key = (method: string, url: string) => `${method.toUpperCase()} ${url}`;

/** Routes that need no token at all. Keep this list short and reviewed. */
export const PUBLIC_ROUTES: ReadonlySet<string> = new Set([
  key('GET', '/health'),
  key('GET', '/'),
  key('GET', '/api/setup/status'),
  // Setup-only routes: setup.ts locks them once setup is complete (S0-Q.2).
  key('GET', '/api/setup/check'),
  key('POST', '/api/setup/database'),
  key('POST', '/api/setup/admin'),
  key('POST', '/api/setup/complete'),
  key('POST', '/api/setup/python'),
  key('POST', '/api/auth/login'),
  // @fastify/static wildcard for the repo `public/` folder (see S0-A.7).
  key('GET', '/*'),
  // Login page translations.
  key('GET', '/api/extensions/:extensionId/i18n/:locale'),
  // Provider callbacks: each verifies the provider signature itself and
  // fails closed (S0-A.5): Twilio X-Twilio-Signature (telephony/webhook-auth.ts)
  // and HMAC-SHA256 X-Webhook-Signature for inbound webhooks (webhooks/verify.ts).
  key('POST', '/api/telephony/voice-webhook'),
  key('POST', '/api/telephony/outbound-twiml'),
  key('POST', '/api/telephony/process-speech'),
  key('POST', '/api/telephony/process-ivr'),
  key('POST', '/api/telephony/status-webhook'),
  key('POST', '/api/telephony/recording-webhook'),
  key('POST', '/webhook/*'),
]);

/** Anonymous allowed; a sent token must be valid. */
export const OPTIONAL_ROUTES: ReadonlySet<string> = new Set([
  // UUID capability URLs used in <img>/<audio> tags.
  key('GET', '/api/storage/:id'),
  key('GET', '/api/storage/:id/info'),
  key('GET', '/api/audio/download/:id'),      // UUID ids, played via <audio src>
  key('GET', '/api/avatar/logo/:filename'),   // same files as .data/uploads/logos (CL-05)
  // Static asset lists.
  key('GET', '/api/avatars/system'),
  key('GET', '/api/multiverse/system'),
  // Public worlds (the handler hides private ones from anonymous callers).
  key('GET', '/api/multiverse/:id'),
  // Public chat rooms (the handlers only allow anonymous access to public rooms).
  key('GET', '/api/public-chat/rooms/:id'),
  key('GET', '/api/public-chat/rooms/:id/messages'),
  key('GET', '/api/public-chat/rooms/:id/participants'),
  key('POST', '/api/public-chat/rooms/:id/messages'),
  key('POST', '/api/public-chat/rooms/:id/join'),
  key('POST', '/api/public-chat/rooms/:id/leave'),
]);

/** Server-internal identity: channel/phone turns started by server code. */
export const SERVICE_ROUTES: ReadonlySet<string> = new Set([
  key('POST', '/api/chat'),
]);

/** Routes a `guest` account may still use. */
export const GUEST_ROUTES: ReadonlySet<string> = new Set([
  key('GET', '/api/auth/me'),
  key('POST', '/api/auth/logout'),
]);

/**
 * Public-room routes a `guest` account may use (Q-13, CL-06). The handlers
 * additionally limit guests to rooms marked public.
 */
export const GUEST_PUBLIC_CHAT_ROUTES: ReadonlySet<string> = new Set([
  key('GET', '/api/public-chat/rooms'),
  key('GET', '/api/public-chat/rooms/:id'),
  key('GET', '/api/public-chat/rooms/:id/messages'),
  key('GET', '/api/public-chat/rooms/:id/participants'),
  key('POST', '/api/public-chat/rooms/:id/messages'),
  key('POST', '/api/public-chat/rooms/:id/join'),
  key('POST', '/api/public-chat/rooms/:id/leave'),
]);

/** True when a guest account may use this route (method + route pattern). */
export function guestMayUse(method: string, url: string): boolean {
  const m = method === 'HEAD' ? 'GET' : method.toUpperCase();
  return GUEST_ROUTES.has(key(m, url)) || GUEST_PUBLIC_CHAT_ROUTES.has(key(m, url));
}

const READ_METHODS = new Set(['GET', 'HEAD']);

type Rule = { methods: '*' | 'write' | readonly string[]; prefix?: string; exact?: string; pattern?: RegExp; access: 'admin' | 'owner' };

/**
 * Role tiers (S0-A.2). First matching rule wins. 'write' = any method other
 * than GET/HEAD. Paths are route patterns as registered (`:param` kept).
 */
export const TIER_RULES: readonly Rule[] = [
  // --- owner: host takeover, code execution, whole-database and key access ---
  { methods: '*', prefix: '/api/database', access: 'owner' },        // raw SQL, restore, wipe, backups
  { methods: '*', prefix: '/api/sandbox', access: 'owner' },         // command execution (native fallback)
  { methods: '*', prefix: '/api/system', access: 'owner' },          // restart / shutdown
  { methods: '*', prefix: '/api/browser', access: 'owner' },         // headless browser: JS eval, file:// and SSRF
  { methods: '*', prefix: '/api/claude-local', access: 'owner' },    // reads the OS user's ~/.claude
  { methods: '*', prefix: '/api/encryption', access: 'owner' },      // key rotation
  { methods: '*', prefix: '/api/vault', access: 'owner' },           // vault create/update/delete/re-encrypt
  { methods: '*', prefix: '/api/gateway', access: 'owner' },         // agent turn as any userId; any user's history
  { methods: ['POST'], exact: '/api/ai-tools/:id/install', access: 'owner' }, // npm/pip install on the host
  { methods: 'write', prefix: '/api/scheduler', access: 'owner' },   // persistent jobs: api-call (SSRF), skills
  { methods: 'write', prefix: '/api/workflows', access: 'owner' },   // workflows run as the first (owner) user
  { methods: ['PUT', 'POST'], exact: '/api/audit/config', access: 'owner' },
  { methods: ['POST'], exact: '/api/audit/cleanup', access: 'owner' }, // erases the audit trail
  { methods: '*', prefix: '/api/approvals', access: 'owner' },      // runs held agent tool calls (S1.3)
  { methods: '*', exact: '/api/agents/:id/tool-grants', access: 'owner' }, // agent permissions (S1.4)

  // --- owner or admin: configuration, outbound requests, money, other users' data ---
  { methods: '*', prefix: '/api/ai-tools', access: 'admin' },        // scans the home directory
  { methods: '*', prefix: '/api/scheduler', access: 'admin' },
  { methods: '*', prefix: '/api/workflows', access: 'admin' },
  { methods: '*', prefix: '/api/audit', access: 'admin' },           // whole security audit log
  { methods: '*', prefix: '/api/webhooks', access: 'admin' },        // outbound webhooks to any URL (SSRF)
  { methods: '*', prefix: '/api/telephony', access: 'admin' },       // numbers, calls, call points, transcripts
  { methods: 'write', prefix: '/api/channels', access: 'admin' },    // connect, configure, send as the owner
  { methods: ['GET'], exact: '/api/channels/whatsapp/qr', access: 'admin' }, // pairing QR = account takeover
  { methods: 'write', prefix: '/api/plugins', access: 'admin' },
  { methods: ['POST'], exact: '/api/marketplace/install', access: 'admin' },
  { methods: ['POST'], exact: '/api/marketplace/uninstall', access: 'admin' },
  { methods: ['POST'], exact: '/api/marketplace/queue-update', access: 'admin' },
  { methods: ['POST'], exact: '/api/marketplace/process-update/:id', access: 'admin' },
  { methods: ['DELETE'], exact: '/api/marketplace/cancel-update/:id', access: 'admin' },
  { methods: ['POST'], exact: '/api/marketplace/auto-queue-updates', access: 'admin' },
  // Agent configuration and the agent's PERSONALITY/MEMORY/knowledge files
  // (prompt of every chat, incl. channel turns).
  { methods: 'write', prefix: '/api/agents', access: 'admin' },
  { methods: ['GET'], pattern: /^\/api\/agents\/:id\/(memory|knowledge|knowledge\/\*|files)$/, access: 'admin' },
  { methods: 'write', prefix: '/api/multi-agent', access: 'admin' },
  { methods: 'write', prefix: '/api/evolution', access: 'admin' },    // LLM cost, rewrites agent config
  { methods: 'write', prefix: '/api/heartbeat', access: 'admin' },
  { methods: ['POST'], exact: '/api/cost-analytics/cleanup', access: 'admin' }, // deletes every user's rows
  { methods: ['POST'], exact: '/api/inbox/cleanup', access: 'admin' },
  { methods: ['GET'], exact: '/api/dashboard/widgets/team-members', access: 'admin' }, // names + emails
  { methods: ['GET'], exact: '/api/agents/status', access: 'admin' }, // probes providers with stored keys
];

const LEVEL: Record<RouteAccess, number> = { public: 0, optional: 1, service: 2, user: 3, admin: 4, owner: 5 };
const VALID_ACCESS = new Set<string>(Object.keys(LEVEL));

function underPrefix(url: string, prefix: string): boolean {
  return url === prefix || url.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`);
}

function ruleMatches(rule: Rule, method: string, url: string): boolean {
  if (rule.methods === 'write') {
    if (READ_METHODS.has(method)) return false;
  } else if (rule.methods !== '*' && !rule.methods.includes(method)) {
    return false;
  }
  if (rule.exact !== undefined) return url === rule.exact;
  if (rule.prefix !== undefined) return underPrefix(url, rule.prefix);
  if (rule.pattern) return rule.pattern.test(url);
  return false;
}

export function isDocsRoute(url: string): boolean {
  return underPrefix(url, '/docs');
}

export function isExtensionRoute(url: string): boolean {
  return url.startsWith('/api/ext/');
}

/**
 * Access level for a route pattern. `declared` is the route's own
 * `config.access`; it can only raise the level.
 */
export function resolveRouteAccess(method: string, url: string, declared?: unknown): RouteAccess {
  const m = method.toUpperCase() === 'HEAD' ? 'GET' : method.toUpperCase();
  const k = key(m, url);

  let base: RouteAccess;
  if (PUBLIC_ROUTES.has(k)) base = 'public';
  else if (isDocsRoute(url)) base = process.env.NODE_ENV === 'development' ? 'public' : 'admin';
  else if (OPTIONAL_ROUTES.has(k)) base = 'optional';
  else if (SERVICE_ROUTES.has(k)) base = 'service';
  else {
    base = 'user';
    for (const rule of TIER_RULES) {
      if (ruleMatches(rule, m, url)) { base = rule.access; break; }
    }
  }

  if (declared === undefined || declared === null) return base;
  // A route may only raise its level; unknown values fail closed.
  const wanted: RouteAccess = typeof declared === 'string' && VALID_ACCESS.has(declared)
    ? declared as RouteAccess
    : 'owner';
  return LEVEL[wanted] > LEVEL[base] ? wanted : base;
}

export interface GateRouteEntry {
  method: string;
  url: string;
  access: RouteAccess | 'extension';
}

function deny(reply: FastifyReply, code: 401 | 403, error: string) {
  return reply.code(code).send({ error });
}

function roleAllowed(access: RouteAccess, role: UserRole): boolean {
  if (access === 'owner') return role === 'owner';
  if (access === 'admin') return role === 'owner' || role === 'admin';
  return role === 'owner' || role === 'admin' || role === 'user';
}

/** The onRequest hook. Exported for tests. */
export async function authGate(request: FastifyRequest, reply: FastifyReply) {
  request.authUser = null;
  const url = request.routeOptions?.url;
  // Unmatched route: let Fastify answer 404.
  if (!url) return;
  // CORS preflight is answered by @fastify/cors.
  if (request.method === 'OPTIONS') return;
  // Extension routes keep their own deny-by-default scope guard.
  if (isExtensionRoute(url)) return;

  const access = resolveRouteAccess(request.method, url, (request.routeOptions.config as any)?.access);
  if (access === 'public') return;

  const hasBearer = typeof request.headers.authorization === 'string' && request.headers.authorization.length > 0;

  if (access === 'optional') {
    if (!hasBearer) return;
    const user = authenticateActiveUser(request);
    if (!user) return deny(reply, 401, 'Authentication required');
    if (user.role === 'guest' && !guestMayUse(request.method, url)) {
      return deny(reply, 403, 'Guest accounts can only use public rooms');
    }
    request.authUser = user;
    return;
  }

  if (access === 'service' && request.headers[CHANNEL_TURN_HEADER] !== undefined) {
    // Server-created channel/phone turn: the token must be live; the route
    // takes the user bound to the turn (S0-Q.9).
    const turn = channelTurnFromHeaders(request.headers);
    if (!turn) return deny(reply, 401, 'Authentication required');
    return;
  }

  const user = hasBearer ? authenticateActiveUser(request) : null;
  if (!user) return deny(reply, 401, 'Authentication required');

  if (user.role === 'guest') {
    // Guests only reach who-am-I, logout and the public-room routes (Q-13).
    if (!guestMayUse(request.method, url) || access !== 'user') {
      return deny(reply, 403, 'Guest accounts can only use public rooms');
    }
  } else if (!roleAllowed(access, user.role)) {
    return deny(reply, 403, access === 'owner'
      ? 'This action requires the owner account'
      : 'This action requires an owner or admin account');
  }
  request.authUser = user;
}

/**
 * Register the gate on the root instance. Must run before any route plugin
 * is registered so the hook covers every route. Also records every route
 * with its resolved access level (`fastify.routeAccessTable`) for tests.
 */
export function registerAuthGate(fastify: FastifyInstance): void {
  const table: GateRouteEntry[] = [];
  fastify.decorate('routeAccessTable', table);
  fastify.decorateRequest('authUser', null);
  fastify.addHook('onRoute', (route) => {
    const methods = Array.isArray(route.method) ? route.method : [route.method];
    for (const method of methods) {
      const url = route.url;
      table.push({
        method: String(method).toUpperCase(),
        url,
        access: isExtensionRoute(url) ? 'extension' : resolveRouteAccess(String(method), url, (route.config as any)?.access),
      });
    }
  });
  fastify.addHook('onRequest', authGate);
}
