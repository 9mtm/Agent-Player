/**
 * Memory learning + forgetting API (CORE-05/07). Owner only (auth gate owner
 * tier for /api/memory/weekly-summary*, /api/memory/retention*,
 * POST /api/memory/forget-all; route access 'owner'; handler role check).
 * The user always comes from the token; everything acts on the owner's own
 * memory.
 *
 *   GET  /api/memory/weekly-summary        latest stored summary (or a fresh,
 *                                          unstored digest when none exists yet)
 *   POST /api/memory/weekly-summary/run    build + store this week's summary now
 *   POST /api/memory/forget-all            { confirm: "FORGET", drawer? } forget one
 *                                          drawer, or all own memory, completely
 *   GET  /api/memory/retention             retention settings + recent runs
 *   PUT  /api/memory/retention             { enabled?, taskTtlDays?, experienceAfterDays?, experienceMinGroup? }
 *   POST /api/memory/retention/run         { dryRun? } run the rules now (recorded)
 *   GET  /api/memory/embeddings            preferred embedding model + vectors per model (CORE-06)
 *   POST /api/memory/embeddings/reembed    { limit? } re-embed vectors of another model now
 *
 * Forgetting one memory is POST /api/memory/:id/forget (any account, own memory).
 *
 * Learning proposals (important learned items) are reviewed through the
 * CORE-04 proposal routes: GET /api/memory/proposals, POST .../:id/approve|reject.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { logAudit } from '../../services/audit-logger.js';
import { buildWeeklyDigest, latestWeeklySummary, listWeeklySummaries, renderDigest, runWeeklySummary } from '../../memory/weekly-summary.js';
import { forgetAll } from '../../memory/forget.js';
import { DrawerInputError, parseDrawerId } from '../../memory/drawers.js';
import { embeddingStatus, reembedUserMemories } from '../../memory/reembed.js';
import { RetentionInputError, getRetentionConfig, listRetentionRuns, runRetention, setRetentionConfig } from '../../memory/retention.js';

function body(request: FastifyRequest): Record<string, unknown> {
  const b = request.body;
  return b && typeof b === 'object' && !Array.isArray(b) ? b as Record<string, unknown> : {};
}

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

  const audit = (request: FastifyRequest, ownerId: string, action: string, resourceType: string, resourceId: string, metadata: Record<string, unknown>) =>
    logAudit({
      event_type: action === 'memory_retention.config' ? 'data.update' : 'data.delete', event_category: 'data_modification', severity: 'info',
      user_id: ownerId, ip_address: request.ip, user_agent: request.headers['user-agent'],
      request_method: request.method, request_path: request.routeOptions?.url ?? undefined,
      resource_type: resourceType, resource_id: resourceId, action, success: true, metadata,
    });

  fastify.get('/api/memory/embeddings', { config }, async (request, reply) => {
    const ownerId = ownerOf(request, reply);
    if (ownerId === null) return reply;
    return embeddingStatus(ownerId);
  });

  fastify.post('/api/memory/embeddings/reembed', { config }, async (request, reply) => {
    const ownerId = ownerOf(request, reply);
    if (ownerId === null) return reply;
    const result = await reembedUserMemories(ownerId, { limit: Number(body(request).limit) || undefined });
    audit(request, ownerId, 'memory.reembed', 'memory', '*', { model: result.targetModel, reembedded: result.reembedded, remaining: result.remaining });
    return { success: !result.error, ...result };
  });

  fastify.post('/api/memory/forget-all', { config }, async (request, reply) => {
    const ownerId = ownerOf(request, reply);
    if (ownerId === null) return reply;
    const b = body(request);
    if (b.confirm !== 'FORGET') return reply.code(400).send({ error: 'Send confirm: "FORGET" to erase memory completely' });
    let drawer = null;
    if (b.drawer !== undefined && b.drawer !== null && b.drawer !== '') {
      try { drawer = parseDrawerId(b.drawer); } catch (err) {
        if (err instanceof DrawerInputError) return reply.code(400).send({ error: err.message });
        throw err;
      }
    }
    const result = await forgetAll(ownerId, ownerId, drawer);
    audit(request, ownerId, 'memory.forget_all', 'memory', drawer ? String(b.drawer) : '*', { forgotten: result.forgotten });
    return { success: true, forgotten: result.forgotten, memoryIds: result.results.map((r) => r.memoryId) };
  });

  fastify.get('/api/memory/retention', { config }, async (request, reply) => {
    const ownerId = ownerOf(request, reply);
    if (ownerId === null) return reply;
    return { config: getRetentionConfig(ownerId), runs: listRetentionRuns(ownerId) };
  });

  fastify.put('/api/memory/retention', { config }, async (request, reply) => {
    const ownerId = ownerOf(request, reply);
    if (ownerId === null) return reply;
    try {
      const next = setRetentionConfig(ownerId, body(request), ownerId);
      audit(request, ownerId, 'memory_retention.config', 'memory_retention', ownerId, { ...next });
      return { config: next };
    } catch (err) {
      if (err instanceof RetentionInputError) return reply.code(400).send({ error: err.message });
      throw err;
    }
  });

  fastify.post('/api/memory/retention/run', { config }, async (request, reply) => {
    const ownerId = ownerOf(request, reply);
    if (ownerId === null) return reply;
    const dryRun = body(request).dryRun === true;
    const result = await runRetention(ownerId, { dryRun, actor: ownerId });
    audit(request, ownerId, 'memory_retention.run', 'memory_retention', result.id, { dryRun, forgotten: result.forgotten, actions: result.actions.length });
    return result;
  });
}
