/**
 * Rate-limit settings for the auth routes (S0-Q.22).
 *
 * No trustProxy: behind the same-origin bridge every caller is 127.0.0.1, so
 * a limit keyed only by request.ip is one shared bucket for everybody. The
 * auth limits therefore use other keys:
 *
 * - login: only a generous per-IP flood guard (CPU protection). Requests that
 *   carry a valid device token for the email are exempt. The real sign-in
 *   protection is the per-source throttle in auth/account-lockout.ts.
 * - register: per normalized target email.
 * - change-password: per authenticated account.
 *
 * Every 429 has the same body shape ({ error, code: 'rate_limited', message })
 * and a Retry-After header (added by @fastify/rate-limit).
 */

import type { FastifyRequest } from 'fastify';
import { actorOf } from '../auth/auth-gate.js';
import { hasValidDevice, parseDeviceToken } from '../auth/account-lockout.js';

/** Plugin options used by buildServer (exported so tests use the same). */
export const RATE_LIMIT_PLUGIN_OPTIONS = {
  global: false, // only routes with config.rateLimit are limited
  max: 100,
  timeWindow: '1 minute',
} as const;

/** Sign-in flood guard: requests per IP per window. */
export const LOGIN_FLOOD_MAX = 300;
export const LOGIN_FLOOD_WINDOW = '1 minute';
/** Register / change-password: attempts per key per window. */
export const ACCOUNT_LIMIT_MAX = 5;
export const ACCOUNT_LIMIT_WINDOW = '15 minutes';

/** The parsed JSON body as a plain object, or {} (it may be absent or invalid). */
function bodyOf(request: FastifyRequest): Record<string, unknown> {
  const body = request.body;
  return body !== null && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

/** Normalized email from the body, or null when missing or not a sane string. */
function bodyEmail(request: FastifyRequest): string | null {
  const email = bodyOf(request).email;
  if (typeof email !== 'string') return null;
  const norm = email.trim().toLowerCase();
  return norm.length > 0 && norm.length <= 320 ? norm : null;
}

function rateLimitedBody(ttlSeconds: number, what: string) {
  const minutes = Math.max(1, Math.ceil(ttlSeconds / 60));
  return {
    statusCode: 429,
    error: 'Too many attempts',
    code: 'rate_limited',
    message: `Too many ${what}. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
  };
}

function errorBuilder(what: string) {
  return (_request: unknown, context: { statusCode: number; ttl: number }) => ({
    ...rateLimitedBody(Math.ceil((context.ttl ?? 0) / 1000), what),
    statusCode: context.statusCode,
  });
}

/**
 * POST /api/auth/login: per-IP flood guard only. Runs in preHandler so the
 * body is parsed; a valid device token for the email skips it, so a known
 * device still gets in while someone floods from the same address.
 */
export const loginRateLimit = {
  max: LOGIN_FLOOD_MAX,
  timeWindow: LOGIN_FLOOD_WINDOW,
  hook: 'preHandler' as const,
  keyGenerator: (request: FastifyRequest) => `login-ip:${request.ip || 'unknown'}`,
  allowList: (request: FastifyRequest) => {
    const email = bodyEmail(request);
    const token = parseDeviceToken(bodyOf(request).deviceToken);
    if (!email || !token) return false;
    try {
      return hasValidDevice(email, token);
    } catch {
      return false;
    }
  },
  errorResponseBuilder: errorBuilder('sign-in requests'),
};

/**
 * POST /api/auth/register: per normalized target email. Bodies without a
 * usable email share one bucket; they are refused by the route anyway.
 */
export const registerRateLimit = {
  max: ACCOUNT_LIMIT_MAX,
  timeWindow: ACCOUNT_LIMIT_WINDOW,
  hook: 'preHandler' as const,
  keyGenerator: (request: FastifyRequest) => {
    const email = bodyEmail(request);
    return email ? `register-email:${email}` : 'register-email:none';
  },
  errorResponseBuilder: errorBuilder('account creation attempts'),
};

/**
 * POST /api/auth/change-password: per authenticated account. Requests
 * without a valid session share one bucket; the route answers them 401.
 */
export const changePasswordRateLimit = {
  max: ACCOUNT_LIMIT_MAX,
  timeWindow: ACCOUNT_LIMIT_WINDOW,
  hook: 'preHandler' as const,
  keyGenerator: (request: FastifyRequest) => {
    let userId: string | null = null;
    try {
      userId = actorOf(request)?.userId ?? null;
    } catch {
      userId = null;
    }
    return userId ? `change-password-user:${userId}` : 'change-password-user:none';
  },
  errorResponseBuilder: errorBuilder('password change attempts'),
};
