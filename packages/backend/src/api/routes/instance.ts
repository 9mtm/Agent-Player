/**
 * GET /api/instance?nonce=<16-128 url-safe chars>  (public, MCP-01b)
 *   -> { id, proof, version: 1 }
 * Lets local clients prove this is the install's backend before they send a
 * token (see services/instance-identity.ts). The secret is never returned.
 */

import type { FastifyInstance } from 'fastify';
import { NONCE_PATTERN, getInstanceIdentity, instanceProof } from '../../services/instance-identity.js';

export async function instanceRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { nonce?: string } }>('/api/instance', {
    config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const nonce = request.query?.nonce;
    if (typeof nonce !== 'string' || !NONCE_PATTERN.test(nonce)) {
      return reply.code(400).send({ error: 'nonce must be 16-128 characters (A-Z, a-z, 0-9, _ or -)' });
    }
    const ident = getInstanceIdentity();
    reply.header('Cache-Control', 'no-store');
    return { id: ident.id, proof: instanceProof(ident.secret, ident.id, nonce), version: 1 };
  });
}
