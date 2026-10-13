/**
 * Memory learning API (CORE-05). Owner only (auth gate owner tier for
 * /api/memory/weekly-summary*, route access 'owner', handler role check).
 * The user always comes from the token.
 *
 *   GET  /api/memory/weekly-summary        latest stored summary (or a fresh,
 *                                          unstored digest when none exists yet)
 *   POST /api/memory/weekly-summary/run    build + store this week's summary now
 *
 * Learning proposals (important learned items) are reviewed through the
 * CORE-04 proposal routes: GET /api/memory/proposals, POST .../:id/approve|reject.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { logAudit } from '../../services/audit-logger.js';
import { buildWeeklyDigest, latestWeeklySummary, listWeeklySummaries, renderDigest, runWeeklySummary } from '../../memory/weekly-summary.js';

function ownerOf(request: FastifyRequest, reply: FastifyReply): string | null {
  const user = request.authUser;
  if (!user) { reply.code(401).send({ error: 'Authentication required' }); return null; }
  if (user.role !== 'owner') { reply.code(403).send({ error: 'This action requires the owner account' }); return null; }
  return user.id;
}

export async function memoryLearningRoutes(fastify: FastifyInstance) {
  const config = { access: 'owner' as const };

  fastify.get('/api/memory/weekly-summary', { config }, async (request, reply) => {
    const ownerId = ownerOf(request, reply);
    if (ownerId === null) return reply;
    const latest = latestWeeklySummary(ownerId);
    const history = listWeeklySummaries(ownerId).map((r) => ({ id: r.id, periodStart: r.periodStart, periodEnd: r.periodEnd, totals: r.digest.totals }));
    if (latest) return { stored: true, summary: latest, history };
    const digest = buildWeeklyDigest(ownerId);
    return { stored: false, summary: { digest, text: renderDigest(digest), modelText: null, model: null }, history };
  });

  fastify.post('/api/memory/weekly-summary/run', { config }, async (request, reply) => {
    const ownerId = ownerOf(request, reply);
    if (ownerId === null) return reply;
    const summary = await runWeeklySummary(ownerId, { actor: ownerId });
    logAudit({
      event_type: 'data.create', event_category: 'data_modification', severity: 'info',
      user_id: ownerId, ip_address: request.ip, user_agent: request.headers['user-agent'],
      request_method: request.method, request_path: request.routeOptions?.url ?? undefined,
      resource_type: 'memory_weekly_summary', resource_id: summary.id, action: 'memory_summary.run', success: true,
      metadata: { totals: summary.digest.totals, model: summary.model },
    });
    return reply.code(201).send({ summary });
  });
}
