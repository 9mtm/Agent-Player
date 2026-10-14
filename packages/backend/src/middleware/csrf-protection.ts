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

        // Wildcard match (e.g., *.example.com)
        if (allowed.includes('*')) {
            const pattern = allowed.replace(/\*/g, '.*');
            return new RegExp(`^${pattern}$`).test(requestOrigin);
        }

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
