/**
 * Agent Evolution Orchestrator
 *
 * Applies learning insights to evolve agents autonomously
 * Manages the complete evolution lifecycle: analyze → learn → evolve → measure
 */

import { getDatabase } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { analyzeAgentPerformance } from './agent-performance-analyzer.js';
import { extractLearningInsights, getAgentInsights, markInsightAsApplied } from './agent-learning-engine.js';
import { writePersonality, readPersonality } from './agent-files.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Run evolution cycle for an agent
 * @param {string} agentId - Agent ID to evolve
 * @returns {Promise<Object>} Evolution result
 */
export async function evolveAgent(agentId) {
  const db = getDatabase();

  // Check if evolution is enabled for this agent
  const config = db.prepare('SELECT * FROM agent_evolution_config WHERE agent_id = ?').get(agentId);

  if (!config || !config.enabled) {
    return {
      agentId,
      skipped: true,
      reason: 'Evolution disabled for this agent',
    };
  }

  console.log(`[Evolution] Starting evolution cycle for agent: ${agentId}`);

  try {
    // Step 1: Analyze performance
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000)); // Last 7 days

    const performanceData = await analyzeAgentPerformance(agentId, startDate, endDate);

    if (performanceData.sampleSize < config.min_sample_size) {
      return {
        agentId,
        skipped: true,
        reason: `Insufficient data (${performanceData.sampleSize} < ${config.min_sample_size} required)`,
      };
    }

    // Step 2: Extract learning insights
    const insights = await extractLearningInsights(agentId, performanceData);

    // Step 3: Filter insights by confidence threshold
    const actionableInsights = insights.filter(i => i.confidence >= config.min_confidence_threshold);

    if (actionableInsights.length === 0) {
      return {
        agentId,
        analyzed: true,
        insightsFound: insights.length,
        actionableInsights: 0,
        evolved: false,
        reason: 'No actionable insights met confidence threshold',
      };
    }

    // Step 4: Apply evolutions (up to max_evolutions_per_cycle)
    const allowedEvolutions = JSON.parse(config.allowed_evolutions);
    const maxEvolutions = config.max_evolutions_per_cycle;

    const applicableInsights = actionableInsights
      .filter(i => canApplyInsight(i, allowedEvolutions))
      .slice(0, maxEvolutions);

    if (applicableInsights.length === 0) {
      return {
        agentId,
        analyzed: true,
        insightsFound: insights.length,
        actionableInsights: actionableInsights.length,
        evolved: false,
        reason: 'No insights matched allowed evolution types',
      };
    }

    // Capture baseline performance before evolution
    const baselinePerformance = captureBaselineMetric(performanceData);

    // Apply each insight
    const appliedEvolutions = [];
    for (const insight of applicableInsights) {
      try {
        const evolution = await applyInsight(agentId, insight, config);
        appliedEvolutions.push(evolution);

        // Mark insight as applied
        await markInsightAsApplied(insight.id || uuidv4());
      } catch (error) {
        console.error(`[Evolution] Failed to apply insight:`, error);
        appliedEvolutions.push({
          insight: insight.title,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      agentId,
      analyzed: true,
      insightsFound: insights.length,
      actionableInsights: actionableInsights.length,
      evolved: true,
      evolutions: appliedEvolutions,
      baselinePerformance,
      sampleSize: performanceData.sampleSize,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    };
  } catch (error) {
    console.error(`[Evolution] Error evolving agent ${agentId}:`, error);
    return {
      agentId,
      error: error.message,
      stack: error.stack,
    };
  }
}

/**
 * Check if an insight can be applied given allowed evolution types
 */
function canApplyInsight(insight, allowedEvolutions) {
  const typeMapping = {
    success_pattern: 'prompt_update',
    failure_pattern: 'prompt_update',
    optimization: 'prompt_update',
    new_capability: 'capability_added',
  };

  const evolutionType = typeMapping[insight.type];
  return allowedEvolutions.includes(evolutionType);
}

/**
 * Capture baseline performance metric
 */
function captureBaselineMetric(performanceData) {
  // Use composite score: task success rate (50%) + tool efficiency (30%) + error rate inverted (20%)
  const metrics = performanceData.metrics;

  const taskSuccess = metrics.taskSuccessRate?.rate || 0;
  const toolEff = metrics.toolEfficiency?.overall || 0;
  const errorPenalty = 1 - (metrics.errorRate?.rate || 0);

  const composite = (taskSuccess * 0.5) + (toolEff * 0.3) + (errorPenalty * 0.2);

  return {
    composite,
    taskSuccessRate: taskSuccess,
    toolEfficiency: toolEff,
    errorRate: metrics.errorRate?.rate || 0,
  };
}

/**
 * Apply an insight (evolve the agent)
 */
async function applyInsight(agentId, insight, config) {
  const db = getDatabase();

  // Get current agent configuration
  const agent = db.prepare('SELECT * FROM agents_config WHERE id = ?').get(agentId);

  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  let evolutionType;
  let beforeValue;
  let afterValue;
  let changeDescription;

  // Apply based on insight type
  if (insight.type === 'success_pattern') {
    // Reinforce successful patterns in system prompt
    evolutionType = 'prompt_update';
    beforeValue = agent.system_prompt;

    const enhancement = `\n\n## Learned Success Pattern\n${insight.description}\n\nWhen applicable, prioritize approaches similar to this successful pattern.`;
    afterValue = agent.system_prompt + enhancement;

    db.prepare('UPDATE agents_config SET system_prompt = ?, updated_at = ? WHERE id = ?')
      .run(afterValue, new Date().toISOString(), agentId);

    changeDescription = `Reinforced success pattern: ${insight.title}`;

    // Also update PERSONALITY.md
    await updatePersonalityFile(agentId, 'add_success_pattern', insight);
  } else if (insight.type === 'failure_pattern') {
    // Add warning about failure patterns
    evolutionType = 'prompt_update';
    beforeValue = agent.system_prompt;

    const warning = `\n\n## Known Failure Pattern (Avoid)\n${insight.description}\n\nBe cautious and implement robust error handling when encountering similar situations.`;
    afterValue = agent.system_prompt + warning;

    db.prepare('UPDATE agents_config SET system_prompt = ?, updated_at = ? WHERE id = ?')
      .run(afterValue, new Date().toISOString(), agentId);

    changeDescription = `Added failure pattern warning: ${insight.title}`;

    await updatePersonalityFile(agentId, 'add_failure_warning', insight);
  } else if (insight.type === 'optimization') {
    // Apply optimization recommendation
    evolutionType = 'prompt_update';
    beforeValue = agent.system_prompt;

    const optimization = `\n\n## Performance Optimization\n${insight.description}`;
    afterValue = agent.system_prompt + optimization;

    db.prepare('UPDATE agents_config SET system_prompt = ?, updated_at = ? WHERE id = ?')
      .run(afterValue, new Date().toISOString(), agentId);

    changeDescription = `Applied optimization: ${insight.title}`;

    await updatePersonalityFile(agentId, 'add_optimization', insight);
  } else if (insight.type === 'new_capability') {
    // Enable a new capability
    evolutionType = 'capability_added';

    const capabilities = JSON.parse(agent.capabilities);
    beforeValue = JSON.stringify(capabilities);

    // Extract capability name from insight description
    const capabilityName = extractCapabilityName(insight);

    if (capabilityName && !capabilities[capabilityName]) {
      capabilities[capabilityName] = true;
      afterValue = JSON.stringify(capabilities);

      db.prepare('UPDATE agents_config SET capabilities = ?, updated_at = ? WHERE id = ?')
        .run(afterValue, new Date().toISOString(), agentId);

      changeDescription = `Enabled capability: ${capabilityName}`;
    } else {
      throw new Error(`Could not extract capability name from insight: ${insight.title}`);
    }
  }

  // Record evolution in history
  const evolutionId = uuidv4();
  db.prepare(`
    INSERT INTO agent_evolution_history (id, agent_id, evolution_type, change_description, before_value, after_value, trigger_reason, insight_ids, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `).run(
    evolutionId,
    agentId,
    evolutionType,
    changeDescription,
    beforeValue,
    afterValue,
    insight.description,
    JSON.stringify([insight.id || uuidv4()])
  );

  return {
    evolutionId,
    type: evolutionType,
    description: changeDescription,
    insight: insight.title,
    success: true,
  };
}

/**
 * Extract capability name from insight
 */
function extractCapabilityName(insight) {
  const title = insight.title.toLowerCase();

  if (title.includes('file')) return 'fileOperations';
  if (title.includes('search')) return 'webSearch';
  if (title.includes('memory')) return 'memory';
  if (title.includes('command')) return 'executeCommands';

  return null;
}

/**
 * Update PERSONALITY.md file with learning
 */
async function updatePersonalityFile(agentId, updateType, insight) {
  try {
    const agentDir = path.join(process.cwd(), '.data', 'agents', agentId);
    const personalityPath = path.join(agentDir, 'PERSONALITY.md');

    let content;
    try {
      content = await fs.readFile(personalityPath, 'utf-8');
    } catch {
      // File doesn't exist, create it
      content = `# Agent Personality\n\nThis agent learns and evolves autonomously.\n\n`;
    }

    // Add section based on update type
    let section;
    if (updateType === 'add_success_pattern') {
      section = `\n## ✅ Success Pattern (Learned ${new Date().toLocaleDateString()})\n\n**${insight.title}**\n\n${insight.description}\n\nConfidence: ${(insight.confidence * 100).toFixed(0)}%\n`;
    } else if (updateType === 'add_failure_warning') {
      section = `\n## ⚠️ Failure Pattern (Learned ${new Date().toLocaleDateString()})\n\n**${insight.title}**\n\n${insight.description}\n\nConfidence: ${(insight.confidence * 100).toFixed(0)}%\n`;
    } else if (updateType === 'add_optimization') {
      section = `\n## 🚀 Optimization (Applied ${new Date().toLocaleDateString()})\n\n**${insight.title}**\n\n${insight.description}\n\nConfidence: ${(insight.confidence * 100).toFixed(0)}%\n`;
    }

    if (section) {
      content += section;
      await fs.writeFile(personalityPath, content, 'utf-8');
    }
  } catch (error) {
    console.error(`[Evolution] Failed to update PERSONALITY.md for ${agentId}:`, error);
    // Don't throw - personality file update is optional
  }
}

/**
 * Measure evolution impact (should be run after some time has passed)
 * @param {string} evolutionId - Evolution history ID
 * @returns {Promise<Object>}
 */
export async function measureEvolutionImpact(evolutionId) {
  const db = getDatabase();

  const evolution = db.prepare('SELECT * FROM agent_evolution_history WHERE id = ?').get(evolutionId);

  if (!evolution) {
    throw new Error(`Evolution ${evolutionId} not found`);
  }

  // Analyze performance after evolution
  const endDate = new Date();
  const startDate = new Date(evolution.created_at);

  const performanceData = await analyzeAgentPerformance(evolution.agent_id, startDate, endDate);

  if (performanceData.sampleSize < 10) {
    return {
      evolutionId,
      measured: false,
      reason: 'Insufficient data after evolution (need at least 10 activities)',
    };
  }

  const currentPerformance = captureBaselineMetric(performanceData);

  // Compare with baseline
  const config = db.prepare('SELECT * FROM agent_evolution_config WHERE agent_id = ?').get(evolution.agent_id);

  const performanceDelta = currentPerformance.composite - (evolution.performance_before || 0);

  // Check if performance degraded
  if (config.rollback_on_degradation && performanceDelta < -config.degradation_threshold) {
    // Rollback evolution
    await rollbackEvolution(evolutionId);

    return {
      evolutionId,
      measured: true,
      performanceDelta,
      degraded: true,
      rolledBack: true,
      before: evolution.performance_before,
      after: currentPerformance.composite,
    };
  }

  // Update evolution history with performance data
  db.prepare(`
    UPDATE agent_evolution_history
    SET performance_before = ?, performance_after = ?
    WHERE id = ?
  `).run(evolution.performance_before || currentPerformance.composite, currentPerformance.composite, evolutionId);

  return {
    evolutionId,
    measured: true,
    performanceDelta,
    degraded: false,
    before: evolution.performance_before,
    after: currentPerformance.composite,
    improvement: performanceDelta > 0,
  };
}

/**
 * Rollback an evolution
 * @param {string} evolutionId
 */
async function rollbackEvolution(evolutionId) {
  const db = getDatabase();

  const evolution = db.prepare('SELECT * FROM agent_evolution_history WHERE id = ?').get(evolutionId);

  if (!evolution) {
    throw new Error(`Evolution ${evolutionId} not found`);
  }

  // Restore previous value
  if (evolution.evolution_type === 'prompt_update') {
    db.prepare('UPDATE agents_config SET system_prompt = ?, updated_at = ? WHERE id = ?')
      .run(evolution.before_value, new Date().toISOString(), evolution.agent_id);
  } else if (evolution.evolution_type === 'capability_added' || evolution.evolution_type === 'capability_removed') {
    db.prepare('UPDATE agents_config SET capabilities = ?, updated_at = ? WHERE id = ?')
      .run(evolution.before_value, new Date().toISOString(), evolution.agent_id);
  }

  // Mark as rolled back
  db.prepare('UPDATE agent_evolution_history SET status = ?, rolled_back_at = ? WHERE id = ?')
    .run('rolled_back', new Date().toISOString(), evolutionId);

  console.log(`[Evolution] Rolled back evolution ${evolutionId} due to performance degradation`);
}

/**
 * Get evolution history for an agent
 * @param {string} agentId
 * @param {Object} filters - {status, type, limit}
 * @returns {Array}
 */
export function getEvolutionHistory(agentId, filters = {}) {
  const db = getDatabase();

  let sql = 'SELECT * FROM agent_evolution_history WHERE agent_id = ?';
  const params = [agentId];

  if (filters.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters.type) {
    sql += ' AND evolution_type = ?';
    params.push(filters.type);
  }

  sql += ' ORDER BY created_at DESC';

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }

  const history = db.prepare(sql).all(...params);

  return history.map(h => ({
    ...h,
    insight_ids: h.insight_ids ? JSON.parse(h.insight_ids) : [],
  }));
}

/**
 * Evolve all agents (batch evolution)
 * @returns {Promise<Array>}
 */
export async function evolveAllAgents() {
  const db = getDatabase();

  // Get all agents with evolution enabled
  const configs = db.prepare(`
    SELECT agent_id FROM agent_evolution_config WHERE enabled = TRUE
  `).all();

  const results = [];
  for (const config of configs) {
    try {
      const result = await evolveAgent(config.agent_id);
      results.push(result);
    } catch (error) {
      console.error(`[Evolution] Failed to evolve agent ${config.agent_id}:`, error);
      results.push({
        agentId: config.agent_id,
        error: error.message,
      });
    }
  }

  return results;
}
