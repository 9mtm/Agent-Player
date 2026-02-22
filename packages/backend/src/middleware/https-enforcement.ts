/**
 * HTTPS Enforcement Middleware
 * SECURITY: Enforces HTTPS in production environments (L-01)
 *
 * In development (NODE_ENV=development), HTTP is allowed.
 * In production (NODE_ENV=production), all HTTP requests are redirected to HTTPS.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * HTTPS enforcement middleware
 * SECURITY: Redirects HTTP to HTTPS in production (L-01)
 */
export async function httpsEnforcement(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    // Skip in development mode
    if (process.env.NODE_ENV !== 'production') {
        return;
    }

    // Skip for localhost/127.0.0.1 (local development)
    const hostname = request.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        return;
    }

    // Check if request is already HTTPS
    const isHttps =
        request.protocol === 'https' ||
        request.headers['x-forwarded-proto'] === 'https';

    if (!isHttps) {
        // SECURITY: Redirect HTTP to HTTPS in production
        const httpsUrl = `https://${request.hostname}${request.url}`;

        reply.code(301).redirect(httpsUrl);
        return;
    }
}

/**
 * Register HTTPS enforcement as Fastify hook
 * @param fastify Fastify instance
 */
export function registerHttpsEnforcement(fastify: any): void {
    fastify.addHook('onRequest', httpsEnforcement);
}
