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
 *
 * B1.6: data access goes through the memory repository (owner-only rule in
 * repositories/memory-owner.ts); the owner pre-check here stays as defence
 * in depth and keeps 401/403 before 400.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { actorOf } from '../../auth/auth-gate.js';
import { repositories } from '../../repositories/index.js';
import type { Actor } from '../../repositories/actor.js';
import { requestMeta } from '../../repositories/audit.js';
import { actorOrReply, requireOwner } from '../../repositories/scope.js';
import { DrawerInputError, parseDrawerId } from '../../memory/drawers.js';
import { RetentionInputError } from '../../memory/retention.js';

function body(request: FastifyRequest): Record<string, unknown> {
  const b = request.body;
  return b && typeof b === 'object' && !Array.isArray(b) ? b as Record<string, unknown> : {};
}

/** The owner account's actor (central rule), else 401/403 sent and null. */
function ownerOf(request: FastifyRequest, reply: FastifyReply): Actor | null {
  return actorOrReply(reply, actorOf(request), requireOwner);
}

const memory = () => repositories.memory;

export async function memoryLearningRoutes(fastify: FastifyInstance) {
  const config = { access: 'owner' as const };

  fastify.get('/api/memory/weekly-summary', { config }, async (request, reply) => {
    const owner = ownerOf(request, reply);
    if (owner === null) return reply;
    return memory().weeklySummary(owner);
  });

  fastify.post('/api/memory/weekly-summary/run', { config }, async (request, reply) => {
    const owner = ownerOf(request, reply);
    if (owner === null) return reply;
    const summary = await memory().runWeeklySummary(owner);
    void repositories.audit.record(owner, {
      event_type: 'data.create', event_category: 'data_modification', severity: 'info',
      resource_type: 'memory_weekly_summary', resource_id: summary.id, action: 'memory_summary.run', success: true,
      metadata: { totals: summary.digest.totals, model: summary.model },
    }, requestMeta(request));
    return reply.code(201).send({ summary });
  });

  const audit = (request: FastifyRequest, owner: Actor, action: string, resourceType: string, resourceId: string, metadata: Record<string, unknown>) =>
    void repositories.audit.record(owner, {
      event_type: action === 'memory_retention.config' ? 'data.update' : 'data.delete', event_category: 'data_modification', severity: 'info',
      resource_type: resourceType, resource_id: resourceId, action, success: true, metadata,
    }, requestMeta(request));

  fastify.get('/api/memory/embeddings', { config }, async (request, reply) => {
    const owner = ownerOf(request, reply);
    if (owner === null) return reply;
    return memory().embeddingStatus(owner);
  });

  fastify.post('/api/memory/embeddings/reembed', { config }, async (request, reply) => {
    const owner = ownerOf(request, reply);
    if (owner === null) return reply;
    const result = await memory().reembed(owner, Number(body(request).limit) || undefined);
    audit(request, owner, 'memory.reembed', 'memory', '*', { model: result.targetModel, reembedded: result.reembedded, remaining: result.remaining });
    return { success: !result.error, ...result };
  });

  fastify.post('/api/memory/forget-all', { config }, async (request, reply) => {
    const owner = ownerOf(request, reply);
    if (owner === null) return reply;
    const b = body(request);
    if (b.confirm !== 'FORGET') return reply.code(400).send({ error: 'Send confirm: "FORGET" to erase memory completely' });
    let drawer = null;
    if (b.drawer !== undefined && b.drawer !== null && b.drawer !== '') {
      try { drawer = parseDrawerId(b.drawer); } catch (err) {
        if (err instanceof DrawerInputError) return reply.code(400).send({ error: err.message });
        throw err;
      }
    }
    const result = await memory().forgetAll(owner, drawer);
    audit(request, owner, 'memory.forget_all', 'memory', drawer ? String(b.drawer) : '*', { forgotten: result.forgotten });
    return { success: true, forgotten: result.forgotten, memoryIds: result.results.map((r) => r.memoryId) };
  });

  fastify.get('/api/memory/retention', { config }, async (request, reply) => {
    const owner = ownerOf(request, reply);
    if (owner === null) return reply;
    return memory().retention(owner);
  });

  fastify.put('/api/memory/retention', { config }, async (request, reply) => {
    const owner = ownerOf(request, reply);
    if (owner === null) return reply;
    try {
      const next = await memory().setRetention(owner, body(request));
      audit(request, owner, 'memory_retention.config', 'memory_retention', owner.userId!, { ...next });
      return { config: next };
    } catch (err) {
      if (err instanceof RetentionInputError) return reply.code(400).send({ error: err.message });
      throw err;
    }
  });

  fastify.post('/api/memory/retention/run', { config }, async (request, reply) => {
    const owner = ownerOf(request, reply);
    if (owner === null) return reply;
    const dryRun = body(request).dryRun === true;
    const result = await memory().runRetention(owner, dryRun);
    audit(request, owner, 'memory_retention.run', 'memory_retention', result.id, { dryRun, forgotten: result.forgotten, actions: result.actions.length });
    return result;
  });
}
