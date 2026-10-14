/**
 * Evolution Management API
 *
 * REST endpoints for managing agent self-evolution
 * Exposes performance analysis, evolution cycles, insights, and configuration
 */

import type { FastifyInstance } from 'fastify';
import { getDatabase } from '../../db/index.js';
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
import { actorOrReply, requireOwner } from '../../repositories/scope.js';
import { proposeDriftFromOutcomes } from '../../services/personality-evolution.js';

const AGENT_ID = /^[A-Za-z0-9_.:-]{1,128}$/;

export default async function evolutionRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/evolution/:agentId/status
   */
  fastify.get('/api/evolution/:agentId/status', async (request, reply) => {
    try {
      const { agentId } = request.params as { agentId: string };
      const db = getDatabase();

      const config = db.prepare('SELECT * FROM agent_evolution_config WHERE agent_id = ?').get(agentId) as any;

      if (!config) {
        return reply.status(404).send({ error: 'Agent not found or evolution not configured' });
      }

      const performance = await getAgentPerformanceSummary(agentId);
      const insights = await getAgentInsights(agentId, { applied: false, limit: 10 });
      const history = getEvolutionHistory(agentId, { limit: 5 });

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
    } catch (error: any) {
      console.error('[Evolution API] Error getting status:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  /**
   * POST /api/evolution/:agentId/analyze
   */
  fastify.post('/api/evolution/:agentId/analyze', async (request, reply) => {
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
    } catch (error: any) {
      console.error('[Evolution API] Error analyzing performance:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  /**
   * POST /api/evolution/:agentId/evolve
   */
  fastify.post('/api/evolution/:agentId/evolve', async (request, reply) => {
    try {
      const { agentId } = request.params as { agentId: string };
      const result = await evolveAgent(agentId);

      return reply.send({
        success: !(result as any).error,
        ...result,
      });
    } catch (error: any) {
      console.error('[Evolution API] Error evolving agent:', error);
      return reply.status(500).send({ error: error.message });
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
    const outcome = await proposeDriftFromOutcomes(agentId, { windowDays: body.windowDays });
    if (outcome.status === 'skipped' && outcome.reason === 'agent_not_found') return reply.status(404).send({ error: 'Agent not found' });
    return reply.status(outcome.status === 'proposed' ? 201 : 200).send(outcome);
  });

  /**
   * POST /api/evolution/evolve-all
   */
  fastify.post('/api/evolution/evolve-all', async (request, reply) => {
    try {
      const results = await evolveAllAgents();

      const summary = {
        total: results.length,
        evolved: results.filter((r: any) => r.evolved).length,
        skipped: results.filter((r: any) => r.skipped).length,
        errors: results.filter((r: any) => r.error).length,
      };

      return reply.send({ success: true, summary, results });
    } catch (error: any) {
      console.error('[Evolution API] Error evolving all agents:', error);
      return reply.status(500).send({ error: error.message });
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

      const history = getEvolutionHistory(agentId, filters);

      return reply.send({ agentId, history, total: history.length });
    } catch (error: any) {
      console.error('[Evolution API] Error getting history:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  /**
   * POST /api/evolution/:agentId/rollback/:evolutionId
   */
  fastify.post('/api/evolution/:agentId/rollback/:evolutionId', async (request, reply) => {
    try {
      const { agentId, evolutionId } = request.params as { agentId: string; evolutionId: string };
      const db = getDatabase();

      const evolution = db.prepare('SELECT * FROM agent_evolution_history WHERE id = ? AND agent_id = ?')
        .get(evolutionId, agentId) as any;

      if (!evolution) {
        return reply.status(404).send({ error: 'Evolution not found for this agent' });
      }
      if (evolution.status === 'rolled_back') {
        return reply.status(400).send({ error: 'Evolution already rolled back' });
      }

      if (evolution.evolution_type === 'prompt_update') {
        db.prepare('UPDATE agents_config SET system_prompt = ?, updated_at = ? WHERE id = ?')
          .run(evolution.before_value, new Date().toISOString(), agentId);
      } else if (evolution.evolution_type === 'capability_added' || evolution.evolution_type === 'capability_removed') {
        db.prepare('UPDATE agents_config SET capabilities = ?, updated_at = ? WHERE id = ?')
          .run(evolution.before_value, new Date().toISOString(), agentId);
      }

      db.prepare('UPDATE agent_evolution_history SET status = ?, rolled_back_at = ? WHERE id = ?')
        .run('rolled_back', new Date().toISOString(), evolutionId);

      return reply.send({ success: true, evolutionId, rolledBack: true, message: 'Evolution rolled back successfully' });
    } catch (error: any) {
      console.error('[Evolution API] Error rolling back evolution:', error);
      return reply.status(500).send({ error: error.message });
    }
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
    } catch (error: any) {
      console.error('[Evolution API] Error getting insights:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  /**
   * PUT /api/evolution/:agentId/config
   */
  fastify.put('/api/evolution/:agentId/config', async (request, reply) => {
    try {
      const { agentId } = request.params as { agentId: string };
      const {
        enabled, min_confidence_threshold, min_sample_size, evolution_frequency,
        allowed_evolutions, max_evolutions_per_cycle, rollback_on_degradation, degradation_threshold,
      } = request.body as any;

      const db = getDatabase();
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

      db.prepare(`UPDATE agent_evolution_config SET ${updates.join(', ')} WHERE agent_id = ?`).run(...params);

      const updatedConfig = db.prepare('SELECT * FROM agent_evolution_config WHERE agent_id = ?').get(agentId) as any;

      if (enabled !== undefined || evolution_frequency !== undefined) {
        try {
          await updateEvolutionSchedule(agentId, updatedConfig.enabled, updatedConfig.evolution_frequency);
        } catch (schedError) {
          console.error('[Evolution API] Failed to sync scheduler:', schedError);
        }
      }

      return reply.send({
        success: true,
        agentId,
        config: { ...updatedConfig, allowed_evolutions: JSON.parse(updatedConfig.allowed_evolutions) },
      });
    } catch (error: any) {
      console.error('[Evolution API] Error updating config:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  /**
   * POST /api/evolution/:agentId/measure/:evolutionId
   */
  fastify.post('/api/evolution/:agentId/measure/:evolutionId', async (request, reply) => {
    try {
      const { agentId, evolutionId } = request.params as { agentId: string; evolutionId: string };
      const db = getDatabase();

      const evolution = db.prepare('SELECT * FROM agent_evolution_history WHERE id = ? AND agent_id = ?')
        .get(evolutionId, agentId) as any;

      if (!evolution) {
        return reply.status(404).send({ error: 'Evolution not found for this agent' });
      }

      const result = await measureEvolutionImpact(evolutionId);

      return reply.send({ success: true, ...result });
    } catch (error: any) {
      console.error('[Evolution API] Error measuring impact:', error);
      return reply.status(500).send({ error: error.message });
    }
  });
}
