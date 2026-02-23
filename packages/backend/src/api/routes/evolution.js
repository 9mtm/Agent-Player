/**
 * Evolution Management API
 *
 * REST endpoints for managing agent self-evolution
 * Exposes performance analysis, evolution cycles, insights, and configuration
 */

import { Router } from 'express';
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

const router = Router();

/**
 * GET /api/evolution/:agentId/status
 * Get evolution status and latest insights for an agent
 */
router.get('/:agentId/status', async (req, res) => {
  try {
    const { agentId } = req.params;
    const db = getDatabase();

    // Get evolution config
    const config = db.prepare('SELECT * FROM agent_evolution_config WHERE agent_id = ?').get(agentId);

    if (!config) {
      return res.status(404).json({ error: 'Agent not found or evolution not configured' });
    }

    // Get latest performance summary
    const performance = await getAgentPerformanceSummary(agentId);

    // Get recent insights (last 10, unapplied only)
    const insights = await getAgentInsights(agentId, { applied: false, limit: 10 });

    // Get recent evolution history (last 5)
    const history = getEvolutionHistory(agentId, { limit: 5 });

    res.json({
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
  } catch (error) {
    console.error('[Evolution API] Error getting status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/evolution/:agentId/analyze
 * Trigger performance analysis for an agent
 */
router.post('/:agentId/analyze', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { periodDays = 7 } = req.body;

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (periodDays * 24 * 60 * 60 * 1000));

    const performanceData = await analyzeAgentPerformance(agentId, startDate, endDate);

    res.json({
      success: true,
      agentId,
      performanceData,
      analyzed: true,
    });
  } catch (error) {
    console.error('[Evolution API] Error analyzing performance:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/evolution/:agentId/evolve
 * Trigger evolution cycle for an agent
 */
router.post('/:agentId/evolve', async (req, res) => {
  try {
    const { agentId } = req.params;

    const result = await evolveAgent(agentId);

    res.json({
      success: !result.error,
      ...result,
    });
  } catch (error) {
    console.error('[Evolution API] Error evolving agent:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/evolution/evolve-all
 * Trigger evolution cycle for all enabled agents (batch)
 */
router.post('/evolve-all', async (req, res) => {
  try {
    const results = await evolveAllAgents();

    const summary = {
      total: results.length,
      evolved: results.filter(r => r.evolved).length,
      skipped: results.filter(r => r.skipped).length,
      errors: results.filter(r => r.error).length,
    };

    res.json({
      success: true,
      summary,
      results,
    });
  } catch (error) {
    console.error('[Evolution API] Error evolving all agents:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/evolution/:agentId/history
 * Get evolution history for an agent
 */
router.get('/:agentId/history', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status, type, limit } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (limit) filters.limit = parseInt(limit, 10);

    const history = getEvolutionHistory(agentId, filters);

    res.json({
      agentId,
      history,
      total: history.length,
    });
  } catch (error) {
    console.error('[Evolution API] Error getting history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/evolution/:agentId/rollback/:evolutionId
 * Manually rollback a specific evolution
 */
router.post('/:agentId/rollback/:evolutionId', async (req, res) => {
  try {
    const { agentId, evolutionId } = req.params;
    const db = getDatabase();

    // Verify evolution belongs to this agent
    const evolution = db.prepare('SELECT * FROM agent_evolution_history WHERE id = ? AND agent_id = ?')
      .get(evolutionId, agentId);

    if (!evolution) {
      return res.status(404).json({ error: 'Evolution not found for this agent' });
    }

    if (evolution.status === 'rolled_back') {
      return res.status(400).json({ error: 'Evolution already rolled back' });
    }

    // Restore previous value
    if (evolution.evolution_type === 'prompt_update') {
      db.prepare('UPDATE agents_config SET system_prompt = ?, updated_at = ? WHERE id = ?')
        .run(evolution.before_value, new Date().toISOString(), agentId);
    } else if (evolution.evolution_type === 'capability_added' || evolution.evolution_type === 'capability_removed') {
      db.prepare('UPDATE agents_config SET capabilities = ?, updated_at = ? WHERE id = ?')
        .run(evolution.before_value, new Date().toISOString(), agentId);
    }

    // Mark as rolled back
    db.prepare('UPDATE agent_evolution_history SET status = ?, rolled_back_at = ? WHERE id = ?')
      .run('rolled_back', new Date().toISOString(), evolutionId);

    res.json({
      success: true,
      evolutionId,
      rolledBack: true,
      message: 'Evolution rolled back successfully',
    });
  } catch (error) {
    console.error('[Evolution API] Error rolling back evolution:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/evolution/:agentId/insights
 * Get learning insights for an agent
 */
router.get('/:agentId/insights', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { applied, type, minConfidence, limit } = req.query;

    const filters = {};
    if (applied !== undefined) filters.applied = applied === 'true';
    if (type) filters.type = type;
    if (minConfidence) filters.minConfidence = parseFloat(minConfidence);
    if (limit) filters.limit = parseInt(limit, 10);

    const insights = await getAgentInsights(agentId, filters);

    res.json({
      agentId,
      insights,
      total: insights.length,
    });
  } catch (error) {
    console.error('[Evolution API] Error getting insights:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/evolution/:agentId/config
 * Update evolution configuration for an agent
 */
router.put('/:agentId/config', async (req, res) => {
  try {
    const { agentId } = req.params;
    const {
      enabled,
      min_confidence_threshold,
      min_sample_size,
      evolution_frequency,
      allowed_evolutions,
      max_evolutions_per_cycle,
      rollback_on_degradation,
      degradation_threshold,
    } = req.body;

    const db = getDatabase();

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (enabled !== undefined) {
      updates.push('enabled = ?');
      params.push(enabled);
    }
    if (min_confidence_threshold !== undefined) {
      updates.push('min_confidence_threshold = ?');
      params.push(min_confidence_threshold);
    }
    if (min_sample_size !== undefined) {
      updates.push('min_sample_size = ?');
      params.push(min_sample_size);
    }
    if (evolution_frequency !== undefined) {
      updates.push('evolution_frequency = ?');
      params.push(evolution_frequency);
    }
    if (allowed_evolutions !== undefined) {
      updates.push('allowed_evolutions = ?');
      params.push(JSON.stringify(allowed_evolutions));
    }
    if (max_evolutions_per_cycle !== undefined) {
      updates.push('max_evolutions_per_cycle = ?');
      params.push(max_evolutions_per_cycle);
    }
    if (rollback_on_degradation !== undefined) {
      updates.push('rollback_on_degradation = ?');
      params.push(rollback_on_degradation);
    }
    if (degradation_threshold !== undefined) {
      updates.push('degradation_threshold = ?');
      params.push(degradation_threshold);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No configuration fields provided' });
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(agentId);

    const sql = `UPDATE agent_evolution_config SET ${updates.join(', ')} WHERE agent_id = ?`;
    db.prepare(sql).run(...params);

    // Get updated config
    const updatedConfig = db.prepare('SELECT * FROM agent_evolution_config WHERE agent_id = ?').get(agentId);

    // Auto-sync scheduler if enabled or frequency changed
    if (enabled !== undefined || evolution_frequency !== undefined) {
      try {
        await updateEvolutionSchedule(
          agentId,
          updatedConfig.enabled,
          updatedConfig.evolution_frequency
        );
        console.log(`[Evolution API] 🔄 Scheduler synced for agent ${agentId}`);
      } catch (schedError) {
        console.error(`[Evolution API] ⚠️ Failed to sync scheduler:`, schedError);
        // Non-fatal - config was updated, scheduler sync failed
      }
    }

    res.json({
      success: true,
      agentId,
      config: {
        ...updatedConfig,
        allowed_evolutions: JSON.parse(updatedConfig.allowed_evolutions),
      },
    });
  } catch (error) {
    console.error('[Evolution API] Error updating config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/evolution/:agentId/measure/:evolutionId
 * Measure impact of a specific evolution
 */
router.post('/:agentId/measure/:evolutionId', async (req, res) => {
  try {
    const { agentId, evolutionId } = req.params;
    const db = getDatabase();

    // Verify evolution belongs to this agent
    const evolution = db.prepare('SELECT * FROM agent_evolution_history WHERE id = ? AND agent_id = ?')
      .get(evolutionId, agentId);

    if (!evolution) {
      return res.status(404).json({ error: 'Evolution not found for this agent' });
    }

    const result = await measureEvolutionImpact(evolutionId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Evolution API] Error measuring impact:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
