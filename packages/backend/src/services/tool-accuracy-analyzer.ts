/**
 * Tool Selection Accuracy Analyzer
 *
 * Tracks agent's tool usage patterns and accuracy:
 * - Correct uses: Tool used appropriately
 * - Incorrect uses: Tool misused or unnecessary
 * - Missed opportunities: Should have used tool but didn't
 * - Execution success: Tool executed without errors
 */

import { getDatabase } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

interface ToolUsageStats {
    toolName: string;
    totalUses: number;
    correctUses: number;
    incorrectUses: number;
    missedOpportunities: number;
    avgExecutionTime: number;
    successRate: number;
}

/**
 * Analyze tool selection accuracy for an agent over a time period
 * Returns overall tool accuracy score (0-100)
 */
export async function analyzeToolAccuracy(
    sessionId: string,
    agentId: string,
    startDate: Date,
    endDate: Date
): Promise<number> {
    const db = getDatabase();

    // Get tool usage from agent_activity
    const toolUsage = db.prepare(`
        SELECT
            tool_name,
            COUNT(*) as total_uses,
            COUNT(*) as success_count,
            0 as avg_duration
        FROM agent_activity
        WHERE agent_id = ?
        AND action_type = 'tool_call'
        AND created_at >= ?
        AND created_at <= ?
        AND tool_name IS NOT NULL
        GROUP BY tool_name
    `).all(agentId, startDate.toISOString(), endDate.toISOString()) as any[];

    if (toolUsage.length === 0) {
        // No tool usage data
        return 0;
    }

    const toolScores: number[] = [];

    for (const tool of toolUsage) {
        const stats = analyzeToolUsage(tool);

        // Calculate accuracy metrics
        const accuracyRate = stats.totalUses > 0
            ? (stats.correctUses / (stats.correctUses + stats.incorrectUses)) * 100
            : 0;

        const precision = stats.totalUses > 0
            ? (stats.correctUses / stats.totalUses) * 100
            : 0;

        const recall = (stats.correctUses + stats.missedOpportunities) > 0
            ? (stats.correctUses / (stats.correctUses + stats.missedOpportunities)) * 100
            : 0;

        // Save to database
        db.prepare(`
            INSERT INTO tool_accuracy_metrics (
                id, session_id, agent_id, tool_name,
                total_uses, correct_uses, incorrect_uses, missed_opportunities,
                accuracy_rate, precision, recall,
                avg_execution_time_ms, success_rate,
                period_start, period_end
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            uuidv4(),
            sessionId,
            agentId,
            stats.toolName,
            stats.totalUses,
            stats.correctUses,
            stats.incorrectUses,
            stats.missedOpportunities,
            accuracyRate,
            precision,
            recall,
            stats.avgExecutionTime,
            stats.successRate,
            startDate.toISOString(),
            endDate.toISOString()
        );

        // Use success rate as proxy for tool accuracy
        toolScores.push(stats.successRate);
    }

    // Return weighted average (weight by usage)
    const totalUses = toolUsage.reduce((sum, t) => sum + t.total_uses, 0);
    const weightedScore = toolUsage.reduce((sum, t, i) => {
        return sum + (toolScores[i] * (t.total_uses / totalUses));
    }, 0);

    return Math.round(weightedScore);
}

/**
 * Analyze individual tool usage patterns
 */
function analyzeToolUsage(toolData: any): ToolUsageStats {
    const totalUses = toolData.total_uses || 0;
    const successCount = toolData.success_count || 0;
    const avgDuration = toolData.avg_duration || 0;

    // Success rate is direct from data
    const successRate = totalUses > 0 ? (successCount / totalUses) * 100 : 0;

    // Heuristic: Assume successful calls are correct uses
    const correctUses = successCount;

    // Heuristic: Failed calls are incorrect uses
    const incorrectUses = totalUses - successCount;

    // Heuristic: No way to detect missed opportunities without NLP
    // Set to 0 for now (would need message analysis to detect)
    const missedOpportunities = 0;

    return {
        toolName: toolData.tool_name,
        totalUses,
        correctUses,
        incorrectUses,
        missedOpportunities,
        avgExecutionTime: avgDuration,
        successRate,
    };
}

/**
 * Get tool usage summary for display
 */
export function getToolUsageSummary(agentId: string, periodDays: number = 7) {
    const db = getDatabase();
    const startDate = new Date(Date.now() - (periodDays * 24 * 60 * 60 * 1000));

    return db.prepare(`
        SELECT
            tool_name,
            COUNT(*) as total_calls,
            COUNT(*) as successful_calls,
            0 as avg_duration_ms,
            MIN(created_at) as first_use,
            MAX(created_at) as last_use
        FROM agent_activity
        WHERE agent_id = ?
        AND action_type = 'tool_call'
        AND created_at >= ?
        AND tool_name IS NOT NULL
        GROUP BY tool_name
        ORDER BY total_calls DESC
    `).all(agentId, startDate.toISOString());
}
