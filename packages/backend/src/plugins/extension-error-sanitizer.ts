/**
 * F-08: extension routes must not echo internal error text to the client.
 *
 * Many extension handlers answer `reply.code(500).send({ error: error.message })`
 * and thrown errors reach Fastify's default handler, which also returns the
 * message. This onSend hook (added to every extension route scope) replaces
 * the body of any 5xx JSON response with a generic message plus an error id,
 * and logs the original body server-side under that id.
 */

import { randomUUID } from 'crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

export const GENERIC_EXTENSION_ERROR = 'Internal server error';

export function createExtensionErrorSanitizer(extensionId: string) {
  return async (request: FastifyRequest, reply: FastifyReply, payload: unknown) => {
    if (reply.statusCode < 500) return payload;
    // Streams (e.g. SSE) and binary bodies are passed through untouched.
    if (payload !== null && payload !== undefined && typeof payload !== 'string' && !Buffer.isBuffer(payload)) {
      return payload;
    }
    const contentType = String(reply.getHeader('content-type') || '');
    if (payload && !contentType.includes('json')) return payload;

    const errorId = randomUUID();
    const original = payload ? String(payload) : '';
    console.error(
      `[Extension:${extensionId}] ${request.method} ${request.routeOptions?.url || request.url} ` +
      `-> ${reply.statusCode} [${errorId}]: ${original.slice(0, 2000)}`
    );
    reply.header('content-type', 'application/json; charset=utf-8');
    return JSON.stringify({ success: false, error: GENERIC_EXTENSION_ERROR, errorId });
  };
}
