/**
 * Evolution Management API
 *
 * REST endpoints for managing agent self-evolution
 * Exposes performance analysis, evolution cycles, insights, and configuration
 *
 * SECURITY (S0-Q.23): every route that changes state is owner-only (gate
 * tier + the owner rule in the handler); reads are admin. An evolve cycle
 * never changes an agent: it files evolution proposals that the owner
 * approves, rejects or cancels under /api/evolution/:agentId/proposals.
 *
 * B2.2c: the route's own queries run on the process driver (sql-steps).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { one, run, sql, type SqlParam } from '../../repositories/sql-steps.js';
import { analyzeAgentPerformance, getAgentPerformanceSummary } from '../../services/agent-performance-analyzer.js';
import { extractLearningInsights, getAgentInsights } from '../../services/agent-learning-engine.js';
import {
  evolveAgent,
  evolveAllAgents,
  measureEvolutionImpact,
  getEvolutionHistory
} from '../../services/agent-evolution-orchestrator.js';
import { updateEvolutionSchedule } from '../../services/agent-evolution-scheduler.js';
import { actorOf } from '../../auth/auth-gate.js';
import { sendInternalError } from '../error-handler.js';
import { safeErrorFields } from '../../services/safe-error-log.js';
import { actorOrReply, requireOwner } from '../../repositories/scope.js';
import { proposeDriftFromOutcomes } from '../../services/personality-evolution.js';
import {
  EVOLUTION_PROPOSAL_STATUSES,
  EvolutionProposalError,
  approveEvolutionProposal,
  cancelEvolutionProposal,
  getEvolutionProposal,
  listEvolutionProposals,
  rejectEvolutionProposal,
  rollbackEvolutionHistory,
  type EvolutionProposalStatus,
} from '../../services/evolution-proposals.js';

const AGENT_ID = /^[A-Za-z0-9_.:-]{1,128}$/;
const PROPOSAL_ID = /^[0-9a-f-]{36}$/;
const OWNER = { config: { access: 'owner' } } as const;

/** Owner actor's user id, or null after the reply was sent (403/401). */
function ownerOrReply(request: FastifyRequest, reply: FastifyReply): string | null {
  const actor = actorOrReply(reply, actorOf(request), requireOwner);
  if (!actor) return null;
  return actor.userId ?? 'owner';
}

function bodyOf(request: FastifyRequest): Record<string, unknown> {
  const b = request.body;
  return b && typeof b === 'object' && !Array.isArray(b) ? b as Record<string, unknown> : {};
}

/** Typed proposal errors keep their 4xx code; anything else is a generic 500 (FU-03). */
function sendProposalError(reply: FastifyReply, err: unknown, route: string) {
  if (err instanceof EvolutionProposalError) return reply.status(err.status).send({ error: err.message, code: err.code });
  return sendInternalError(reply, route, err);
}

export default async function evolutionRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/evolution/:agentId/status
   */
  fastify.get('/api/evolution/:agentId/status', async (request, reply) => {
    try {
      const { agentId } = request.params as { agentId: string };
      const config = await sql().read(one<any>('SELECT * FROM agent_evolution_config WHERE agent_id = ?', agentId));

      if (!config) {
        return reply.status(404).send({ error: 'Agent not found or evolution not configured' });
      }

      const performance = await getAgentPerformanceSummary(agentId);
      const insights = await getAgentInsights(agentId, { applied: false, limit: 10 });
      const history = await getEvolutionHistory(agentId, { limit: 5 });

      return reply.send({
        agentId,
        config: {
          ...config,
          allowed_evolutions: JSON.parse(config.allowed_evolutions),
        },
        performance,
        insights,
        recentEvolutions: history,
        status: config.enabled ? 'active' : 'disabled',
      });
    } catch (error: unknown) {
      return sendInternalError(reply, '[Evolution API] GET /api/evolution/:agentId/status', error);
    }
  });

  /**
   * POST /api/evolution/:agentId/analyze
   */
  fastify.post('/api/evolution/:agentId/analyze', OWNER, async (request, reply) => {
    if (ownerOrReply(request, reply) === null) return reply;
    try {
      const { agentId } = request.params as { agentId: string };
      const { periodDays = 7 } = request.body as { periodDays?: number };

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (periodDays * 24 * 60 * 60 * 1000));

      const performanceData = await analyzeAgentPerformance(agentId, startDate, endDate);

      return reply.send({
        success: true,
        agentId,
        performanceData,
        analyzed: true,
      });
    } catch (error: unknown) {
      return sendInternalError(reply, '[Evolution API] POST /api/evolution/:agentId/analyze', error);
    }
  });

  /**
   * POST /api/evolution/:agentId/evolve   owner (S0-Q.23)
   * Runs one cycle. Changes nothing: files pending proposals (`proposals`),
   * returns capability ideas as `suggestedCapabilities` (informational).
   */
  fastify.post('/api/evolution/:agentId/evolve', OWNER, async (request, reply) => {
    if (ownerOrReply(request, reply) === null) return reply;
    try {
      const { agentId } = request.params as { agentId: string };
      const result = await evolveAgent(agentId);

      return reply.send({
        success: !(result as any).error,
        ...result,
      });
    } catch (error: unknown) {
      return sendInternalError(reply, '[Evolution API] POST /api/evolution/:agentId/evolve', error);
    }
  });

  /**
   * POST /api/evolution/:agentId/personality-proposal   owner (CORE-01d)
   * body { windowDays? 1..90, default 30 }
   * Runs the Evolution personality rule now (also part of every evolve
   * cycle): verified task-run outcomes may file ONE pending drift proposal
   * (source 'evolution'). Never approves and never writes a version; the
   * owner decides it under /api/agents/:id/personality/proposals.
   * -> 201 { status: 'proposed', proposal, stats }
   * -> 200 { status: 'skipped', reason: no_signal | pending_exists |
   *          personality_locked | no_change | too_many_pending, proposalId?, stats? }
   * -> 404 agent not found
   */
  fastify.post('/api/evolution/:agentId/personality-proposal', { config: { access: 'owner' } }, async (request, reply) => {
    if (!actorOrReply(reply, actorOf(request), requireOwner)) return reply;
    const { agentId } = request.params as { agentId: string };
    if (!AGENT_ID.test(agentId)) return reply.status(400).send({ error: 'Invalid agent id' });
    const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body) ? request.body as Record<string, unknown> : {};
    if (body.windowDays !== undefined && (typeof body.windowDays !== 'number' || !Number.isInteger(body.windowDays) || body.windowDays < 1 || body.windowDays > 90)) {
      return reply.status(400).send({ error: 'windowDays must be an integer from 1 to 90' });
    }
    try {
      const outcome = await proposeDriftFromOutcomes(agentId, { windowDays: body.windowDays });
      if (outcome.status === 'skipped' && outcome.reason === 'agent_not_found') return reply.status(404).send({ error: 'Agent not found' });
      return reply.status(outcome.status === 'proposed' ? 201 : 200).send(outcome);
    } catch (error: unknown) {
      return sendInternalError(reply, '[Evolution API] POST /api/evolution/:agentId/personality-proposal', error);
    }
  });

  /**
   * POST /api/evolution/evolve-all
   */
  fastify.post('/api/evolution/evolve-all', OWNER, async (request, reply) => {
    if (ownerOrReply(request, reply) === null) return reply;
    try {
      const results = await evolveAllAgents();

      const summary = {
        total: results.length,
        evolved: results.filter((r: any) => r.evolved).length,
        proposed: results.reduce((n: number, r: any) => n + (r.proposed || 0), 0),
        skipped: results.filter((r: any) => r.skipped).length,
        errors: results.filter((r: any) => r.error).length,
      };

      return reply.send({ success: true, summary, results });
    } catch (error: unknown) {
      return sendInternalError(reply, '[Evolution API] POST /api/evolution/evolve-all', error);
    }
  });

  /**
   * GET /api/evolution/:agentId/history
   */
  fastify.get('/api/evolution/:agentId/history', async (request, reply) => {
    try {
      const { agentId } = request.params as { agentId: string };
      const { status, type, limit } = request.query as { status?: string; type?: string; limit?: string };

      const filters: any = {};
      if (status) filters.status = status;
      if (type) filters.type = type;
      if (limit) filters.limit = parseInt(limit, 10);

      const history = await getEvolutionHistory(agentId, filters);

      return reply.send({ agentId, history, total: history.length });
    } catch (error: unknown) {
      return sendInternalError(reply, '[Evolution API] GET /api/evolution/:agentId/history', error);
    }
  });

  /**
   * POST /api/evolution/:agentId/rollback/:evolutionId   owner (S0-Q.23)
   * Restores a prompt / PERSONALITY.md change only while the content is still
   * exactly what that evolution wrote (else 409 `stale`). Old capability rows:
   * 409 `rollback_unsupported`. Already rolled back: 409 `already_rolled_back`.
   */
  fastify.post('/api/evolution/:agentId/rollback/:evolutionId', OWNER, async (request, reply) => {
    if (ownerOrReply(request, reply) === null) return reply;
    const { agentId, evolutionId } = request.params as { agentId: string; evolutionId: string };
    try {
      await rollbackEvolutionHistory(agentId, evolutionId);
      return reply.send({ success: true, evolutionId, rolledBack: true, message: 'Evolution rolled back successfully' });
    } catch (error: unknown) {
      return sendProposalError(reply, error, '[Evolution API] POST /api/evolution/:agentId/rollback/:evolutionId');
    }
  });

  /**
   * GET /api/evolution/:agentId/proposals?status=   admin (read)
   * -> 200 { agentId, proposals: EvolutionProposal[], total }; 404 unknown agent
   */
  fastify.get('/api/evolution/:agentId/proposals', async (request, reply) => {
    const { agentId } = request.params as { agentId: string };
    if (!AGENT_ID.test(agentId)) return reply.status(400).send({ error: 'Invalid agent id' });
    const { status } = (request.query ?? {}) as { status?: string };
    if (status !== undefined && !(EVOLUTION_PROPOSAL_STATUSES as readonly string[]).includes(status)) {
      return reply.status(400).send({ error: 'Unknown status' });
    }
    try {
      const proposals = await listEvolutionProposals(agentId, status as EvolutionProposalStatus | undefined);
      if (!proposals) return reply.status(404).send({ error: 'Agent not found' });
      return reply.send({ agentId, proposals, total: proposals.length });
    } catch (error: unknown) {
      return sendInternalError(reply, '[Evolution API] GET /api/evolution/:agentId/proposals', error);
    }
  });

  /** GET /api/evolution/:agentId/proposals/:proposalId   admin (read) */
  fastify.get('/api/evolution/:agentId/proposals/:proposalId', async (request, reply) => {
    const { agentId, proposalId } = request.params as { agentId: string; proposalId: string };
    if (!AGENT_ID.test(agentId) || !PROPOSAL_ID.test(proposalId)) return reply.status(404).send({ error: 'Proposal not found', code: 'not_found' });
    try {
      const proposal = await getEvolutionProposal(agentId, proposalId);
      if (!proposal) return reply.status(404).send({ error: 'Proposal not found', code: 'not_found' });
      return reply.send({ proposal });
    } catch (error: unknown) {
      return sendInternalError(reply, '[Evolution API] GET /api/evolution/:agentId/proposals/:proposalId', error);
    }
  });

  /**
   * POST /api/evolution/:agentId/proposals/:proposalId/approve   owner
   * body { expectedReviewHash }
   * -> 200 { proposal, historyId }
   * -> 400 review_hash_required | 404 not_found
   * -> 409 already_decided | review_changed | stale (target changed; row marked stale)
   */
  fastify.post('/api/evolution/:agentId/proposals/:proposalId/approve', OWNER, async (request, reply) => {
    const owner = ownerOrReply(request, reply);
    if (owner === null) return reply;
    const { agentId, proposalId } = request.params as { agentId: string; proposalId: string };
    try {
      const out = await approveEvolutionProposal(agentId, proposalId, owner, bodyOf(request).expectedReviewHash);
      return reply.send(out);
    } catch (err) { return sendProposalError(reply, err, '[Evolution API] POST /api/evolution/:agentId/proposals/:proposalId/approve'); }
  });

  /** POST .../proposals/:proposalId/reject   owner   body { expectedReviewHash, note? ≤500 } -> 200 { proposal } */
  fastify.post('/api/evolution/:agentId/proposals/:proposalId/reject', OWNER, async (request, reply) => {
    const owner = ownerOrReply(request, reply);
    if (owner === null) return reply;
    const { agentId, proposalId } = request.params as { agentId: string; proposalId: string };
    const body = bodyOf(request);
    try {
      return reply.send({ proposal: await rejectEvolutionProposal(agentId, proposalId, owner, body.expectedReviewHash, body.note) });
    } catch (err) { return sendProposalError(reply, err, '[Evolution API] POST /api/evolution/:agentId/proposals/:proposalId/reject'); }
  });

  /** POST .../proposals/:proposalId/cancel   owner   body { expectedReviewHash } -> 200 { proposal } */
  fastify.post('/api/evolution/:agentId/proposals/:proposalId/cancel', OWNER, async (request, reply) => {
    const owner = ownerOrReply(request, reply);
    if (owner === null) return reply;
    const { agentId, proposalId } = request.params as { agentId: string; proposalId: string };
    try {
      return reply.send({ proposal: await cancelEvolutionProposal(agentId, proposalId, owner, bodyOf(request).expectedReviewHash) });
    } catch (err) { return sendProposalError(reply, err, '[Evolution API] POST /api/evolution/:agentId/proposals/:proposalId/cancel'); }
  });

  /**
   * GET /api/evolution/:agentId/insights
   */
  fastify.get('/api/evolution/:agentId/insights', async (request, reply) => {
    try {
      const { agentId } = request.params as { agentId: string };
      const { applied, type, minConfidence, limit } = request.query as {
        applied?: string; type?: string; minConfidence?: string; limit?: string;
      };

      const filters: any = {};
      if (applied !== undefined) filters.applied = applied === 'true';
      if (type) filters.type = type;
      if (minConfidence) filters.minConfidence = parseFloat(minConfidence);
      if (limit) filters.limit = parseInt(limit, 10);

      const insights = await getAgentInsights(agentId, filters);

      return reply.send({ agentId, insights, total: insights.length });
    } catch (error: unknown) {
      return sendInternalError(reply, '[Evolution API] GET /api/evolution/:agentId/insights', error);
    }
  });

  /**
   * PUT /api/evolution/:agentId/config
   */
  fastify.put('/api/evolution/:agentId/config', OWNER, async (request, reply) => {
    if (ownerOrReply(request, reply) === null) return reply;
    try {
      const { agentId } = request.params as { agentId: string };
      const {
        enabled, min_confidence_threshold, min_sample_size, evolution_frequency,
        allowed_evolutions, max_evolutions_per_cycle, rollback_on_degradation, degradation_threshold,
      } = request.body as any;

      const updates: string[] = [];
      const params: any[] = [];

      if (enabled !== undefined) { updates.push('enabled = ?'); params.push(enabled); }
      if (min_confidence_threshold !== undefined) { updates.push('min_confidence_threshold = ?'); params.push(min_confidence_threshold); }
      if (min_sample_size !== undefined) { updates.push('min_sample_size = ?'); params.push(min_sample_size); }
      if (evolution_frequency !== undefined) { updates.push('evolution_frequency = ?'); params.push(evolution_frequency); }
      if (allowed_evolutions !== undefined) { updates.push('allowed_evolutions = ?'); params.push(JSON.stringify(allowed_evolutions)); }
      if (max_evolutions_per_cycle !== undefined) { updates.push('max_evolutions_per_cycle = ?'); params.push(max_evolutions_per_cycle); }
      if (rollback_on_degradation !== undefined) { updates.push('rollback_on_degradation = ?'); params.push(rollback_on_degradation); }
      if (degradation_threshold !== undefined) { updates.push('degradation_threshold = ?'); params.push(degradation_threshold); }

      if (updates.length === 0) {
        return reply.status(400).send({ error: 'No configuration fields provided' });
      }

      updates.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(agentId);

      // The update and the read of the row it wrote are one transaction.
      const updatedConfig = await sql().tx(function* () {
        yield* run(`UPDATE agent_evolution_config SET ${updates.join(', ')} WHERE agent_id = ?`, ...(params as SqlParam[]));
        return yield* one<any>('SELECT * FROM agent_evolution_config WHERE agent_id = ?', agentId);
      });

      if (enabled !== undefined || evolution_frequency !== undefined) {
        try {
          await updateEvolutionSchedule(agentId, updatedConfig.enabled, updatedConfig.evolution_frequency);
        } catch (schedError) {
          console.error('[Evolution API] Failed to sync scheduler', safeErrorFields(schedError));
        }
      }

      return reply.send({
        success: true,
        agentId,
        config: { ...updatedConfig, allowed_evolutions: JSON.parse(updatedConfig.allowed_evolutions) },
      });
    } catch (error: unknown) {
      return sendInternalError(reply, '[Evolution API] PUT /api/evolution/:agentId/config', error);
    }
  });

  /**
   * POST /api/evolution/:agentId/measure/:evolutionId
   */
  fastify.post('/api/evolution/:agentId/measure/:evolutionId', OWNER, async (request, reply) => {
    if (ownerOrReply(request, reply) === null) return reply;
    try {
      const { agentId, evolutionId } = request.params as { agentId: string; evolutionId: string };
      const evolution = await sql().read(one<any>('SELECT * FROM agent_evolution_history WHERE id = ? AND agent_id = ?', evolutionId, agentId));

      if (!evolution) {
        return reply.status(404).send({ error: 'Evolution not found for this agent' });
      }

      const result = await measureEvolutionImpact(evolutionId);

      return reply.send({ success: true, ...result });
    } catch (error: unknown) {
      return sendInternalError(reply, '[Evolution API] POST /api/evolution/:agentId/measure/:evolutionId', error);
    }
  });
}
