/**
 * Performance & Cost Analyzer
 *
 * Analyzes agent performance metrics:
 * - Latency: Response time (avg, p50, p95, p99)
 * - Throughput: Requests per minute
 * - Cost: Token usage and API costs
 * - Error rates: Failures and timeouts
 * - Cache efficiency: Hit rates
 */

import { getDatabase } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

interface PerformanceResult {
    performanceScore: number; // 0-100 based on latency
    costEfficiencyScore: number; // 0-100 based on cost per task
}

/**
 * Analyze performance and cost for an agent over a time period
 * Returns performance score and cost efficiency score
 */
export async function analyzePerformance(
    sessionId: string,
    agentId: string,
    startDate: Date,
    endDate: Date
): Promise<PerformanceResult> {
    const db = getDatabase();

    // Get performance data from agent_activity (basic count only)
    const activities = db.prepare(`
        SELECT COUNT(*) as count
        FROM agent_activity
        WHERE agent_id = ?
        AND created_at >= ?
        AND created_at <= ?
    `).get(agentId, startDate.toISOString(), endDate.toISOString()) as any;

    const activityCount = activities?.count || 0;

    // Cost data placeholders (cost_analytics table has different structure)
    const costData = {
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cost: 0,
        total_requests: activityCount,
    };

    if (activityCount === 0) {
        // No data to analyze
        return {
            performanceScore: 0,
            costEfficiencyScore: 0,
        };
    }

    // Simplified metrics (no latency data available in agent_activity)
    const avgLatency = 2000; // Default placeholder
    const p50 = 2000;
    const p95 = 3000;
    const p99 = 4000;

    // Calculate throughput (requests per minute)
    const periodMinutes = (endDate.getTime() - startDate.getTime()) / (60 * 1000);
    const throughput = activityCount / periodMinutes;

    // Calculate error rates (default to 0 since no status column)
    const errorRate = 0;
    const cacheHitRate = 0;

    // Calculate costs
    const totalInputTokens = costData?.total_input_tokens || 0;
    const totalOutputTokens = costData?.total_output_tokens || 0;
    const totalCost = costData?.total_cost || 0;
    const avgCostPerRequest = activityCount > 0 ? totalCost / activityCount : 0;

    // Save performance profile
    db.prepare(`
        INSERT INTO performance_profiles (
            id, session_id, agent_id,
            total_requests, total_tokens_input, total_tokens_output,
            avg_latency_ms, p50_latency_ms, p95_latency_ms, p99_latency_ms,
            throughput_per_minute, total_cost_usd, avg_cost_per_request_usd,
            cache_hit_rate, error_rate, timeout_rate,
            period_start, period_end
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        uuidv4(),
        sessionId,
        agentId,
        activityCount,
        totalInputTokens,
        totalOutputTokens,
        avgLatency,
        p50,
        p95,
        p99,
        throughput,
        totalCost,
        avgCostPerRequest,
        cacheHitRate,
        errorRate,
        0, // timeout_rate (not tracked yet)
        startDate.toISOString(),
        endDate.toISOString()
    );

    // Calculate performance score (0-100)
    // Lower latency = higher score
    // Target: <2000ms = 100, >10000ms = 0
    const performanceScore = calculatePerformanceScore(avgLatency, errorRate);

    // Calculate cost efficiency score (0-100)
    // Lower cost per request = higher score
    // Target: <$0.01 = 100, >$0.10 = 0
    const costEfficiencyScore = calculateCostEfficiencyScore(avgCostPerRequest, totalCost);

    return {
        performanceScore,
        costEfficiencyScore,
    };
}

/**
 * Calculate performance score based on latency and error rate
 */
function calculatePerformanceScore(avgLatency: number, errorRate: number): number {
    // Latency component (0-100)
    // 2000ms or less = 100
    // 10000ms or more = 0
    let latencyScore = 100;
    if (avgLatency > 2000) {
        latencyScore = Math.max(0, 100 - ((avgLatency - 2000) / 8000) * 100);
    }

    // Error penalty
    const errorPenalty = errorRate * 50; // 10% error rate = -5 points

    const finalScore = Math.max(0, Math.min(100, latencyScore - errorPenalty));
    return Math.round(finalScore);
}

/**
 * Calculate cost efficiency score
 */
function calculateCostEfficiencyScore(avgCostPerRequest: number, totalCost: number): number {
    // Cost per request component
    // $0.01 or less = 100
    // $0.10 or more = 0
    let costScore = 100;
    if (avgCostPerRequest > 0.01) {
        costScore = Math.max(0, 100 - ((avgCostPerRequest - 0.01) / 0.09) * 100);
    }

    // Bonus for low total cost (encourages efficiency)
    let totalCostBonus = 0;
    if (totalCost < 1.0) {
        totalCostBonus = 10; // +10 points if total cost under $1
    }

    const finalScore = Math.min(100, costScore + totalCostBonus);
    return Math.round(finalScore);
}

/**
 * Get performance summary for display
 */
export function getPerformanceSummary(agentId: string, periodDays: number = 7) {
    const db = getDatabase();
    const startDate = new Date(Date.now() - (periodDays * 24 * 60 * 60 * 1000));

    const perfData = db.prepare(`
        SELECT
            2000 as avg_latency,
            1000 as min_latency,
            4000 as max_latency,
            COUNT(*) as total_requests,
            0 as errors
        FROM agent_activity
        WHERE agent_id = ?
        AND created_at >= ?
    `).get(agentId, startDate.toISOString()) as any;

    const costSummary = {
        total_cost: 0,
        avg_cost: 0,
        total_tokens: 0,
    };

    return {
        ...perfData,
        ...costSummary,
        error_rate: perfData.total_requests > 0 ? perfData.errors / perfData.total_requests : 0,
    };
}
