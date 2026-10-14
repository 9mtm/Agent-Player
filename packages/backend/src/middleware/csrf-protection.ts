/**
 * CSRF Protection Middleware
 * SECURITY: Prevents Cross-Site Request Forgery attacks (M-01)
 *
 * For JWT-based APIs, CSRF protection is achieved through:
 * 1. JWT tokens in Authorization header (not auto-sent by browsers)
 * 2. Origin/Referer header validation for state-changing requests
 * 3. CORS configuration limiting allowed origins
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Get allowed origins from environment
 */
function getAllowedOrigins(): string[] {
    return (process.env.ALLOWED_ORIGINS || 'http://localhost:41521')
        .split(',')
        .map(o => o.trim());
}

/**
 * Validate Origin or Referer header matches allowed origins
 * SECURITY: Prevents CSRF by ensuring requests come from trusted origins (M-01)
 */
export async function csrfProtection(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    // Only check state-changing methods
    const stateMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    if (!stateMethods.includes(request.method)) {
        return; // GET/HEAD/OPTIONS are safe
    }

    // Get Origin or Referer header
    const origin = request.headers.origin || request.headers.referer;

    // SECURITY: Allow server-to-server requests from localhost (Next.js API routes)
    // These are internal API calls from the frontend server, not from browsers
    const hostname = request.hostname;
    const remoteAddress = request.ip;
    if (!origin && (hostname === 'localhost' || hostname === '127.0.0.1') &&
        (remoteAddress === '127.0.0.1' || remoteAddress === '::1' || remoteAddress === '::ffff:127.0.0.1')) {
        return;
    }

    if (!origin) {
        // SECURITY: Reject requests without Origin/Referer for state-changing operations
        reject(request, reply, 'Missing origin or referer header');
        return;
    }

    // Extract hostname from origin/referer
    let requestOrigin: string;
    try {
        const url = new URL(origin);
        requestOrigin = `${url.protocol}//${url.host}`;
    } catch {
        reject(request, reply, 'Invalid origin or referer header');
        return;
    }

    // Check if origin is in allowed list
    const allowedOrigins = getAllowedOrigins();
    const isAllowed = allowedOrigins.some(allowed => {
        // Exact match
        if (requestOrigin === allowed) return true;

        // Wildcard match (e.g., http://*.example.com)
        if (allowed.includes('*')) return wildcardOriginMatches(allowed, requestOrigin);

        return false;
    });

    if (!isAllowed) {
        // SECURITY: Reject requests from untrusted origins
        reject(request, reply, 'Origin not allowed');
        return;
    }

    // Origin is valid, continue processing
}

/**
 * Match an origin against an allowed pattern with a wildcard (CHAT-01).
 * Everything except `*` is literal (regex metacharacters are escaped, so
 * `.` matches only a dot). `*` stands for exactly one host label
 * (`[A-Za-z0-9-]+`) and is allowed only as the whole leftmost label of the
 * host, e.g. `http://*.example.com` or `http://*.example.com:3000`. Any
 * other use of `*` (scheme, port, partial or inner label) never matches.
 */
export function wildcardOriginMatches(pattern: string, origin: string): boolean {
    const m = /^([a-z][a-z0-9+.-]*:\/\/)([^/:]+)(:\d+)?$/i.exec(pattern);
    if (!m) return false;
    const [, scheme, host, port = ''] = m;
    const labels = host.split('.');
    // Only the leftmost label may be `*`, as a whole label, with a literal rest.
    if (labels.length < 2 || labels[0] !== '*' || labels.slice(1).some((l) => l.includes('*') || !l)) return false;
    const escape = (x: string) => x.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
    const hostRe = labels.map((l) => (l === '*' ? '[A-Za-z0-9-]+' : escape(l))).join('\\.');
    return new RegExp(`^${escape(scheme)}${hostRe}${escape(port)}$`, 'i').test(origin);
}

/**
 * Send the 403 with a machine-readable code (BE-UI-02) and log one warning.
 * The log line has the method and path only: no query string, no headers.
 */
function reject(request: FastifyRequest, reply: FastifyReply, message: string): void {
    const path = String(request.url || '').split('?')[0];
    console.warn(`[CSRF] Blocked ${request.method} ${path}: ${message}`);
    reply.code(403).send({
        error: 'Forbidden',
        code: 'origin_not_allowed',
        message
    });
}

/**
 * Register CSRF protection as Fastify hook
 * @param fastify Fastify instance
 */
export function registerCsrfProtection(fastify: any): void {
    fastify.addHook('onRequest', csrfProtection);
}
