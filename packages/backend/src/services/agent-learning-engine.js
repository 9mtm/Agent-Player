/**
 * Agent Learning Engine
 *
 * Extracts insights from performance metrics and activity patterns
 * Generates actionable recommendations for agent improvement
 * Uses Multi-Tier Memory System for long-term learning
 */

import { getDatabase } from '../db/index.js';
import { getMemoryStorage } from '../memory/storage.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Extract learning insights for an agent
 * @param {string} agentId - Agent ID to analyze
 * @param {Object} performanceData - Performance metrics from analyzer
 * @returns {Promise<Array>} Array of learning insights
 */
export async function extractLearningInsights(agentId, performanceData) {
  const insights = [];

  // 1. Identify success patterns
  const successPatterns = await identifySuccessPatterns(agentId, performanceData);
  insights.push(...successPatterns);

  // 2. Identify failure patterns
  const failurePatterns = await identifyFailurePatterns(agentId, performanceData);
  insights.push(...failurePatterns);

  // 3. Discover optimization opportunities
  const optimizations = await discoverOptimizations(agentId, performanceData);
  insights.push(...optimizations);

  // 4. Detect new capability opportunities
  const newCapabilities = await detectNewCapabilityNeeds(agentId, performanceData);
  insights.push(...newCapabilities);

  // Save insights to database
  await saveInsights(agentId, insights);

  // Store high-confidence insights in Multi-Tier Memory
  await storeInsightsInMemory(agentId, insights);

  return insights;
}

/**
 * Identify patterns that lead to success
 */
async function identifySuccessPatterns(agentId, performanceData) {
  const db = getDatabase();
  const insights = [];

  // Find activities with successful outcomes
  const successfulActivities = db.prepare(`
    SELECT * FROM agent_activity
    WHERE agent_id = ?
      AND (action_type = 'task_completed' OR (action_type = 'tool_call' AND metadata NOT LIKE '%"error"%'))
    ORDER BY created_at DESC
    LIMIT 100
  `).all(agentId);

  if (successfulActivities.length === 0) return insights;

  // Analyze tool usage in successful tasks
  const toolFrequency = {};
  successfulActivities.forEach(activity => {
    if (activity.tool_name) {
      toolFrequency[activity.tool_name] = (toolFrequency[activity.tool_name] || 0) + 1;
    }
  });

  // If certain tools are consistently used successfully, that's a pattern
  Object.entries(toolFrequency).forEach(([tool, count]) => {
    const frequency = count / successfulActivities.length;

    if (frequency > 0.3 && count > 5) {
      // Tool used in >30% of successful activities
      insights.push({
        type: 'success_pattern',
        title: `High success rate with ${tool} tool`,
        description: `The ${tool} tool was successfully used in ${(frequency * 100).toFixed(1)}% of successful activities (${count}/${successfulActivities.length}). Consider prioritizing this tool for similar tasks.`,
        confidence: Math.min(0.9, 0.5 + frequency * 0.4), // 0.5 to 0.9 range
        evidence: successfulActivities
          .filter(a => a.tool_name === tool)
          .slice(0, 5)
          .map(a => ({
            activity_id: a.id,
            timestamp: a.created_at,
            outcome: 'success',
          })),
      });
    }
  });

  // Check if task success rate is high
  if (performanceData.metrics.taskSuccessRate?.rate > 0.8) {
    insights.push({
      type: 'success_pattern',
      title: 'Excellent task completion rate',
      description: `Agent is completing ${(performanceData.metrics.taskSuccessRate.rate * 100).toFixed(1)}% of tasks successfully. Current approach and capabilities are well-suited for assigned tasks.`,
      confidence: 0.85,
      evidence: [{
        metric: 'task_success_rate',
        value: performanceData.metrics.taskSuccessRate.rate,
        sample_size: performanceData.metrics.taskSuccessRate.total,
      }],
    });
  }

  return insights;
}

/**
 * Identify patterns that lead to failure
 */
async function identifyFailurePatterns(agentId, performanceData) {
  const db = getDatabase();
  const insights = [];

  // Find activities with failures
  const failedActivities = db.prepare(`
    SELECT * FROM agent_activity
    WHERE agent_id = ?
      AND (action_type = 'task_failed' OR metadata LIKE '%"error"%')
    ORDER BY created_at DESC
    LIMIT 100
  `).all(agentId);

  if (failedActivities.length === 0) return insights;

  // Analyze error patterns
  const errorTypes = {};
  failedActivities.forEach(activity => {
    try {
      const metadata = activity.metadata ? JSON.parse(activity.metadata) : {};
      const errorType = metadata.error?.type || metadata.error || 'unknown';

      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    } catch (e) {
      // Skip invalid metadata
    }
  });

  // Identify recurring errors
  Object.entries(errorTypes).forEach(([errorType, count]) => {
    const frequency = count / failedActivities.length;

    if (frequency > 0.2 && count > 3) {
      // Error occurs in >20% of failures
      insights.push({
        type: 'failure_pattern',
        title: `Recurring ${errorType} errors`,
        description: `The agent encounters '${errorType}' errors in ${(frequency * 100).toFixed(1)}% of failed activities (${count}/${failedActivities.length}). This suggests a systemic issue that needs addressing.`,
        confidence: Math.min(0.9, 0.5 + frequency * 0.4),
        evidence: failedActivities
          .filter(a => {
            try {
              const metadata = JSON.parse(a.metadata || '{}');
              return (metadata.error?.type || metadata.error) === errorType;
            } catch {
              return false;
            }
          })
          .slice(0, 5)
          .map(a => ({
            activity_id: a.id,
            timestamp: a.created_at,
            outcome: 'failure',
            error: errorType,
          })),
      });
    }
  });

  // Check if certain tools have low efficiency
  if (performanceData.metrics.toolEfficiency?.byTool) {
    Object.entries(performanceData.metrics.toolEfficiency.byTool).forEach(([tool, stats]) => {
      if (stats.efficiency < 0.5 && stats.total > 10) {
        // Tool fails >50% of the time
        insights.push({
          type: 'failure_pattern',
          title: `Low success rate with ${tool} tool`,
          description: `The ${tool} tool has a ${(stats.efficiency * 100).toFixed(1)}% success rate (${stats.successful}/${stats.total} calls). Consider: 1) Reviewing how this tool is being used, 2) Improving error handling, or 3) Finding alternative approaches.`,
          confidence: 0.75,
          evidence: [{
            tool: tool,
            efficiency: stats.efficiency,
            total_calls: stats.total,
            successful: stats.successful,
          }],
        });
      }
    });
  }

  return insights;
}

/**
 * Discover optimization opportunities
 */
async function discoverOptimizations(agentId, performanceData) {
  const insights = [];

  // Check if error rate is high
  if (performanceData.metrics.errorRate?.rate > 0.2) {
    insights.push({
      type: 'optimization',
      title: 'High error rate detected',
      description: `Agent has a ${(performanceData.metrics.errorRate.rate * 100).toFixed(1)}% error rate. Recommended actions: 1) Review and improve error handling, 2) Add validation checks before risky operations, 3) Update system prompt to be more cautious.`,
      confidence: 0.8,
      evidence: [{
        metric: 'error_rate',
        value: performanceData.metrics.errorRate.rate,
        errors: performanceData.metrics.errorRate.errors,
        total: performanceData.metrics.errorRate.total,
      }],
    });
  }

  // Check if tool efficiency can be improved
  if (performanceData.metrics.toolEfficiency?.overall < 0.7) {
    insights.push({
      type: 'optimization',
      title: 'Tool efficiency can be improved',
      description: `Overall tool efficiency is ${(performanceData.metrics.toolEfficiency.overall * 100).toFixed(1)}%. Consider: 1) Better tool selection logic, 2) Improved parameter handling, 3) More robust error recovery.`,
      confidence: 0.75,
      evidence: [{
        metric: 'tool_efficiency',
        value: performanceData.metrics.toolEfficiency.overall,
        total_calls: performanceData.metrics.toolEfficiency.total,
      }],
    });
  }

  // Check for unused capabilities
  const db = getDatabase();
  const agent = db.prepare('SELECT capabilities FROM agents_config WHERE id = ?').get(agentId);

  if (agent) {
    try {
      const capabilities = JSON.parse(agent.capabilities);
      const enabledCapabilities = Object.entries(capabilities).filter(([_, enabled]) => enabled);

      const usageStats = db.prepare(`
        SELECT capability_name, usage_count FROM agent_capability_usage
        WHERE agent_id = ?
      `).all(agentId);

      const usageMap = {};
      usageStats.forEach(stat => {
        usageMap[stat.capability_name] = stat.usage_count;
      });

      enabledCapabilities.forEach(([capName, _]) => {
        const usage = usageMap[capName] || 0;

        if (usage === 0 && performanceData.sampleSize > 50) {
          insights.push({
            type: 'optimization',
            title: `Unused capability: ${capName}`,
            description: `The '${capName}' capability is enabled but has never been used in ${performanceData.sampleSize} activities. Consider disabling it to reduce complexity, or investigate why it's not being utilized.`,
            confidence: 0.7,
            evidence: [{
              capability: capName,
              usage_count: 0,
              sample_size: performanceData.sampleSize,
            }],
          });
        }
      });
    } catch (e) {
      // Skip if capabilities can't be parsed
    }
  }

  return insights;
}

/**
 * Detect opportunities for new capabilities
 */
async function detectNewCapabilityNeeds(agentId, performanceData) {
  const db = getDatabase();
  const insights = [];

  // Check if agent frequently fails at tasks that might need a new capability
  const recentFailures = db.prepare(`
    SELECT summary, metadata FROM agent_activity
    WHERE agent_id = ? AND action_type = 'task_failed'
    ORDER BY created_at DESC
    LIMIT 20
  `).all(agentId);

  if (recentFailures.length === 0) return insights;

  // Analyze failure summaries for patterns
  const summaries = recentFailures.map(f => (f.summary || '').toLowerCase());

  // Check for file operation failures
  const fileKeywords = ['file', 'read', 'write', 'save', 'load', 'directory'];
  const fileFailures = summaries.filter(s => fileKeywords.some(kw => s.includes(kw))).length;

  if (fileFailures > 5) {
    const agent = db.prepare('SELECT capabilities FROM agents_config WHERE id = ?').get(agentId);
    const capabilities = agent ? JSON.parse(agent.capabilities) : {};

    if (!capabilities.fileOperations) {
      insights.push({
        type: 'new_capability',
        title: 'Enable file operations capability',
        description: `Agent has failed ${fileFailures} tasks involving file operations. Enabling the 'fileOperations' capability could improve success rate for file-related tasks.`,
        confidence: 0.8,
        evidence: recentFailures
          .filter(f => fileKeywords.some(kw => (f.summary || '').toLowerCase().includes(kw)))
          .slice(0, 5)
          .map(f => ({
            activity_id: f.id,
            summary: f.summary,
            outcome: 'failure',
          })),
      });
    }
  }

  // Check for web search failures
  const searchKeywords = ['search', 'find', 'lookup', 'query', 'research'];
  const searchFailures = summaries.filter(s => searchKeywords.some(kw => s.includes(kw))).length;

  if (searchFailures > 5) {
    const agent = db.prepare('SELECT capabilities FROM agents_config WHERE id = ?').get(agentId);
    const capabilities = agent ? JSON.parse(agent.capabilities) : {};

    if (!capabilities.webSearch) {
      insights.push({
        type: 'new_capability',
        title: 'Enable web search capability',
        description: `Agent has failed ${searchFailures} tasks involving search/research. Enabling the 'webSearch' capability could help agent find information more effectively.`,
        confidence: 0.8,
        evidence: recentFailures
          .filter(f => searchKeywords.some(kw => (f.summary || '').toLowerCase().includes(kw)))
          .slice(0, 5)
          .map(f => ({
            activity_id: f.id,
            summary: f.summary,
            outcome: 'failure',
          })),
      });
    }
  }

  return insights;
}

/**
 * Save insights to database
 */
async function saveInsights(agentId, insights) {
  const db = getDatabase();

  const stmt = db.prepare(`
    INSERT INTO agent_learning_insights (id, agent_id, insight_type, title, description, confidence, evidence)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insights.forEach(insight => {
    stmt.run(
      uuidv4(),
      agentId,
      insight.type,
      insight.title,
      insight.description,
      insight.confidence,
      JSON.stringify(insight.evidence)
    );
  });
}

/**
 * Store high-confidence insights in Multi-Tier Memory for long-term learning
 */
async function storeInsightsInMemory(agentId, insights) {
  const memoryStorage = getMemoryStorage();

  // Only store insights with confidence >= 0.75
  const highConfidenceInsights = insights.filter(i => i.confidence >= 0.75);

  for (const insight of highConfidenceInsights) {
    // Determine memory layer based on insight type and confidence
    let memoryLayer = 'experiential'; // Default to experiential (90 days)
    let importance = 7; // Medium-high importance

    if (insight.type === 'success_pattern' && insight.confidence >= 0.85) {
      // High-confidence success patterns → factual memory (permanent)
      memoryLayer = 'factual';
      importance = 9;
    } else if (insight.type === 'failure_pattern' && insight.confidence >= 0.8) {
      // Critical failure patterns → experiential memory for 90 days
      memoryLayer = 'experiential';
      importance = 8;
    }

    const memory = {
      id: uuidv4(),
      userId: agentId, // Use agentId as userId for agent-specific memories
      type: 'insight',
      content: `${insight.title}: ${insight.description}`,
      importance,
      importanceScore: importance / 10,
      memoryLayer,
      consolidationStatus: 'pending',
      expiryTimestamp: memoryLayer === 'factual' ? null : Date.now() + (90 * 24 * 60 * 60 * 1000),
      metadata: {
        insightType: insight.type,
        confidence: insight.confidence,
        evidence: insight.evidence,
        source: 'learning_engine',
        extractedAt: new Date().toISOString(),
      },
      status: 'active',
      createdAt: new Date(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
    };

    await memoryStorage.save(memory);
  }
}

/**
 * Get all insights for an agent
 * @param {string} agentId
 * @param {Object} filters - {applied, type, minConfidence}
 * @returns {Promise<Array>}
 */
export async function getAgentInsights(agentId, filters = {}) {
  const db = getDatabase();

  let sql = 'SELECT * FROM agent_learning_insights WHERE agent_id = ?';
  const params = [agentId];

  if (filters.applied !== undefined) {
    sql += ' AND applied = ?';
    params.push(filters.applied ? 1 : 0);
  }

  if (filters.type) {
    sql += ' AND insight_type = ?';
    params.push(filters.type);
  }

  if (filters.minConfidence) {
    sql += ' AND confidence >= ?';
    params.push(filters.minConfidence);
  }

  sql += ' ORDER BY confidence DESC, created_at DESC';

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }

  const insights = db.prepare(sql).all(...params);

  return insights.map(i => ({
    ...i,
    evidence: i.evidence ? JSON.parse(i.evidence) : null,
  }));
}

/**
 * Mark an insight as applied
 * @param {string} insightId
 * @param {number} impactScore - Measured improvement (0-1)
 */
export async function markInsightAsApplied(insightId, impactScore = null) {
  const db = getDatabase();

  db.prepare(`
    UPDATE agent_learning_insights
    SET applied = TRUE, applied_at = ?, impact_score = ?
    WHERE id = ?
  `).run(new Date().toISOString(), impactScore, insightId);
}
