/**
 * Cost budget API (R2, D-BUDGET). Owner only (gate tier 'owner' + handler check).
 *
 *   GET /api/budget   today's autonomous paid model spend (UTC day), the daily
 *                     cap (DAILY_PAID_CAP_CENTS, default 0 = no autonomous paid
 *                     calls), spend per provider and the price table in use.
 *
 * Interactive chat with the owner is not metered or blocked by this cap.
 */

import type { FastifyInstance } from 'fastify';
import { budgetView } from '../../services/cost-budget.js';

export async function budgetRoutes(fastify: FastifyInstance) {
  fastify.get('/api/budget', { config: { access: 'owner' as const } }, async (request, reply) => {
    const user = request.authUser;
    if (!user) return reply.code(401).send({ error: 'Authentication required' });
    if (user.role !== 'owner') return reply.code(403).send({ error: 'This action requires the owner account' });
    return { budget: await budgetView() };
  });
}
