/**
 * Agent Performance Analyzer
 *
 * Analyzes agent activity logs to compute performance metrics
 * Feeds data into the learning engine for autonomous improvement
 *
 * B2.2c: every query runs on the process driver (repositories/sql-steps.ts),
 * SQLite SQL and row shapes unchanged. A cycle's metrics and capability
 * usage are written in one transaction; the usage counters are one upsert
 * per tool (no lost increment when two analyses run at the same time).
 */

import { all, run, sql } from '../repositories/sql-steps.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Analyze agent performance over a time period
 * @param {string} agentId - Agent ID to analyze
 * @param {Date} periodStart - Start of analysis period
 * @param {Date} periodEnd - End of analysis period
 * @returns {Promise<Object>} Performance metrics
 */
export async function analyzeAgentPerformance(agentId, periodStart, periodEnd) {
  // Get all activity for this agent in the period
  const activities = await sql().read(all(`
    SELECT * FROM agent_activity
    WHERE agent_id = ? AND created_at BETWEEN ? AND ?
    ORDER BY created_at ASC, id
  `, agentId, periodStart.toISOString(), periodEnd.toISOString()));

  if (activities.length === 0) {
    return {
      agentId,
      periodStart,
      periodEnd,
      sampleSize: 0,
      metrics: {},
    };
  }

  // Parse metadata for each activity
  const parsedActivities = activities.map(a => ({
    ...a,
    metadata: a.metadata ? JSON.parse(a.metadata) : {},
  }));

  // Compute metrics
  const metrics = {
    taskSuccessRate: computeTaskSuccessRate(parsedActivities),
    toolEfficiency: computeToolEfficiency(parsedActivities),
    errorRate: computeErrorRate(parsedActivities),
    responseQuality: computeResponseQuality(parsedActivities),
    toolUsagePatterns: computeToolUsagePatterns(parsedActivities),
    averageTaskDuration: computeAverageTaskDuration(parsedActivities),
  };

  // Save metrics to database
  await saveMetrics(agentId, metrics, periodStart, periodEnd, activities.length);

  return {
    agentId,
    periodStart,
    periodEnd,
    sampleSize: activities.length,
    metrics,
  };
}

/**
 * Compute task success rate (completed vs failed tasks)
 */
function computeTaskSuccessRate(activities) {
  const taskActivities = activities.filter(a => a.action_type === 'task_completed' || a.action_type === 'task_failed');

  if (taskActivities.length === 0) return null;

  const completed = taskActivities.filter(a => a.action_type === 'task_completed').length;
  const total = taskActivities.length;

  return {
    rate: completed / total,
    completed,
    failed: total - completed,
    total,
  };
}

/**
 * Compute tool efficiency (successful tool calls / total tool calls)
 */
function computeToolEfficiency(activities) {
  const toolCalls = activities.filter(a => a.action_type === 'tool_call');

  if (toolCalls.length === 0) return null;

  const successful = toolCalls.filter(a => !a.metadata.error).length;
  const total = toolCalls.length;

  // Group by tool name
  const byTool = {};
  toolCalls.forEach(call => {
    const toolName = call.tool_name || 'unknown';
    if (!byTool[toolName]) {
      byTool[toolName] = { total: 0, successful: 0 };
    }
    byTool[toolName].total++;
    if (!call.metadata.error) {
      byTool[toolName].successful++;
    }
  });

  // Compute efficiency per tool
  Object.keys(byTool).forEach(toolName => {
    byTool[toolName].efficiency = byTool[toolName].successful / byTool[toolName].total;
  });

  return {
    overall: successful / total,
    total,
    successful,
    failed: total - successful,
    byTool,
  };
}

/**
 * Compute error rate
 */
function computeErrorRate(activities) {
  const total = activities.length;
  if (total === 0) return null;

  const errors = activities.filter(a => a.metadata.error || a.action_type.includes('error') || a.action_type.includes('failed')).length;

  return {
    rate: errors / total,
    errors,
    total,
  };
}

/**
 * Compute response quality (based on user feedback if available)
 */
function computeResponseQuality(activities) {
  const responses = activities.filter(a => a.metadata.userFeedback !== undefined);

  if (responses.length === 0) return null;

  const positive = responses.filter(a => a.metadata.userFeedback === 'positive').length;
  const negative = responses.filter(a => a.metadata.userFeedback === 'negative').length;
  const neutral = responses.length - positive - negative;

  return {
    score: (positive - negative) / responses.length, // -1 to 1
    positive,
    negative,
    neutral,
    total: responses.length,
  };
}

/**
 * Compute tool usage patterns
 */
function computeToolUsagePatterns(activities) {
  const toolCalls = activities.filter(a => a.action_type === 'tool_call');

  const patterns = {};
  toolCalls.forEach(call => {
    const toolName = call.tool_name || 'unknown';
    if (!patterns[toolName]) {
      patterns[toolName] = 0;
    }
    patterns[toolName]++;
  });

  // Sort by usage count
  const sorted = Object.entries(patterns)
    .sort((a, b) => b[1] - a[1])
    .map(([tool, count]) => ({ tool, count, percentage: count / toolCalls.length }));

  return {
    mostUsed: sorted.slice(0, 5),
    total: toolCalls.length,
    uniqueTools: Object.keys(patterns).length,
  };
}

/**
 * Compute average task duration
 */
function computeAverageTaskDuration(activities) {
  // Find task start/complete pairs
  const taskStarts = {};
  const durations = [];

  activities.forEach(a => {
    if (a.action_type === 'task_started' && a.task_id) {
      taskStarts[a.task_id] = new Date(a.created_at).getTime();
    } else if ((a.action_type === 'task_completed' || a.action_type === 'task_failed') && a.task_id) {
      const startTime = taskStarts[a.task_id];
      if (startTime) {
        const endTime = new Date(a.created_at).getTime();
        durations.push(endTime - startTime);
      }
    }
  });

  if (durations.length === 0) return null;

  const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const min = Math.min(...durations);
  const max = Math.max(...durations);

  return {
    average: avg,
    min,
    max,
    count: durations.length,
  };
}

/**
 * Save metrics to database
 */
async function saveMetrics(agentId, metrics, periodStart, periodEnd, sampleSize) {
  const metricsToSave = [
    {
      type: 'task_success_rate',
      value: metrics.taskSuccessRate?.rate || 0,
      metadata: metrics.taskSuccessRate,
    },
    {
      type: 'tool_efficiency',
      value: metrics.toolEfficiency?.overall || 0,
      metadata: metrics.toolEfficiency,
    },
    {
      type: 'error_rate',
      value: metrics.errorRate?.rate || 0,
      metadata: metrics.errorRate,
    },
    {
      type: 'response_quality',
      value: metrics.responseQuality?.score || 0,
      metadata: metrics.responseQuality,
    },
  ];

  const byTool = metrics.toolEfficiency?.byTool;
  await sql().tx(function* () {
    for (const metric of metricsToSave) {
      if (!metric.metadata) continue;
      yield* run(`
        INSERT INTO agent_performance_metrics (id, agent_id, metric_type, value, sample_size, period_start, period_end, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      uuidv4(),
      agentId,
      metric.type,
      metric.value,
      sampleSize,
      periodStart.toISOString(),
      periodEnd.toISOString(),
      JSON.stringify(metric.metadata));
    }

    // Update capability usage
    if (byTool) yield* updateCapabilityUsageStep(agentId, byTool);
  });
}

/**
 * Update capability usage statistics
 */
function* updateCapabilityUsageStep(agentId, toolStats) {
  for (const [toolName, stats] of Object.entries(toolStats)) {
    // The counters are qualified with the table name: PostgreSQL refuses an
    // unqualified column that is also in `excluded`; SQLite reads it the same.
    yield* run(`
      INSERT INTO agent_capability_usage (id, agent_id, capability_name, usage_count, success_count, failure_count, last_used_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(agent_id, capability_name) DO UPDATE SET
        usage_count = agent_capability_usage.usage_count + excluded.usage_count,
        success_count = agent_capability_usage.success_count + excluded.success_count,
        failure_count = agent_capability_usage.failure_count + excluded.failure_count,
        last_used_at = excluded.last_used_at
    `,
    uuidv4(),
    agentId,
    toolName,
    stats.total,
    stats.successful,
    stats.total - stats.successful,
    new Date().toISOString());
  }
}

/**
 * Get agent performance summary (latest metrics)
 * @param {string} agentId
 * @returns {Promise<Object>}
 */
export async function getAgentPerformanceSummary(agentId) {
  // Get latest metrics for each type
  const latestMetrics = await sql().read(all(`
    SELECT metric_type, value, sample_size, metadata, created_at
    FROM agent_performance_metrics
    WHERE agent_id = ?
      AND created_at = (
        SELECT MAX(created_at) FROM agent_performance_metrics AS m2
        WHERE m2.agent_id = agent_performance_metrics.agent_id
          AND m2.metric_type = agent_performance_metrics.metric_type
      )
    ORDER BY created_at DESC
  `, agentId));

  const summary = {
    agentId,
    metrics: {},
    lastAnalyzed: null,
  };

  latestMetrics.forEach(m => {
    summary.metrics[m.metric_type] = {
      value: m.value,
      sampleSize: m.sample_size,
      metadata: m.metadata ? JSON.parse(m.metadata) : null,
      timestamp: m.created_at,
    };

    if (!summary.lastAnalyzed || new Date(m.created_at) > new Date(summary.lastAnalyzed)) {
      summary.lastAnalyzed = m.created_at;
    }
  });

  // Get capability usage
  const capabilities = await sql().read(all(`
    SELECT * FROM agent_capability_usage WHERE agent_id = ?
    ORDER BY usage_count DESC, capability_name
  `, agentId));

  summary.capabilities = capabilities;

  return summary;
}

/**
 * Analyze all agents (batch analysis)
 * @param {Date} periodStart
 * @param {Date} periodEnd
 * @returns {Promise<Array>}
 */
export async function analyzeAllAgents(periodStart, periodEnd) {
  // Get all agents
  const agents = await sql().read(all('SELECT id FROM agents_config'));

  const results = [];
  for (const agent of agents) {
    try {
      const result = await analyzeAgentPerformance(agent.id, periodStart, periodEnd);
      results.push(result);
    } catch (error) {
      console.error(`[PerformanceAnalyzer] Failed to analyze agent ${agent.id}:`, error);
      results.push({
        agentId: agent.id,
        error: error.message,
      });
    }
  }

  return results;
}
