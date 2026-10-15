/**
 * Evaluation Framework Orchestrator
 *
 * Main service that coordinates comprehensive agent evaluation
 * Computes 6 key metrics and generates overall quality scores
 */

import { q } from '../repositories/sql-steps.js';
import { v4 as uuidv4 } from 'uuid';
import { analyzeReasoning } from './reasoning-analyzer.js';
import { analyzeToolAccuracy } from './tool-accuracy-analyzer.js';
import { analyzeSafety } from './safety-analyzer.js';
import { analyzePerformance } from './performance-analyzer.js';

interface EvaluationConfig {
    periodDays?: number;
    includeReasoningAnalysis?: boolean;
    includeToolAccuracy?: boolean;
    includeSafetyChecks?: boolean;
    includePerformanceProfile?: boolean;
}

interface EvaluationResult {
    sessionId: string;
    agentId: string;
    overallScore: number;
    grade: string;
    metrics: {
        reasoning?: number;
        toolAccuracy?: number;
        performance?: number;
        costEfficiency?: number;
        safety?: number;
        successRate?: number;
    };
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
}

/**
 * Run comprehensive evaluation for an agent
 */
export async function evaluateAgent(
    agentId: string,
    config: EvaluationConfig = {}
): Promise<EvaluationResult> {
    const sessionId = uuidv4();

    // Default config
    const {
        periodDays = 7,
        includeReasoningAnalysis = true,
        includeToolAccuracy = true,
        includeSafetyChecks = true,
        includePerformanceProfile = true,
    } = config;

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (periodDays * 24 * 60 * 60 * 1000));

    // Create evaluation session
    await q.run(`
        INSERT INTO evaluation_sessions (id, agent_id, evaluator_type, start_time, period_start, period_end, status)
        VALUES (?, ?, 'manual', CURRENT_TIMESTAMP, ?, ?, 'running')`,
        sessionId, agentId, startDate.toISOString(), endDate.toISOString());

    try {
        const metrics: any = {};

        // 1. Analyze Reasoning Coherence
        if (includeReasoningAnalysis) {
            metrics.reasoning = await analyzeReasoning(sessionId, agentId, startDate, endDate);
        }

        // 2. Analyze Tool Selection Accuracy
        if (includeToolAccuracy) {
            metrics.toolAccuracy = await analyzeToolAccuracy(sessionId, agentId, startDate, endDate);
        }

        // 3. Analyze Safety & Bias
        if (includeSafetyChecks) {
            metrics.safety = await analyzeSafety(sessionId, agentId, startDate, endDate);
        }

        // 4. Analyze Performance (Latency, Throughput, Cost)
        if (includePerformanceProfile) {
            const perfResult = await analyzePerformance(sessionId, agentId, startDate, endDate);
            metrics.performance = perfResult.performanceScore;
            metrics.costEfficiency = perfResult.costEfficiencyScore;
        }

        // 5. Get Success Rate from existing metrics
        metrics.successRate = await getSuccessRate(agentId, startDate, endDate);

        // Calculate overall score (weighted average)
        const overallScore = calculateOverallScore(metrics);
        const grade = calculateGrade(overallScore);

        // Analyze strengths, weaknesses, recommendations
        const analysis = analyzeMetrics(metrics);

        // Save composite evaluation score
        await q.run(`
            INSERT INTO evaluation_scores (
                id, session_id, agent_id, overall_score, reasoning_score, tool_accuracy_score,
                performance_score, cost_efficiency_score, safety_score, success_rate,
                grade, strengths, weaknesses, recommendations, period_start, period_end
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            uuidv4(),
            sessionId,
            agentId,
            overallScore,
            metrics.reasoning || null,
            metrics.toolAccuracy || null,
            metrics.performance || null,
            metrics.costEfficiency || null,
            metrics.safety || null,
            metrics.successRate || null,
            grade,
            JSON.stringify(analysis.strengths),
            JSON.stringify(analysis.weaknesses),
            JSON.stringify(analysis.recommendations),
            startDate.toISOString(),
            endDate.toISOString()
        );

        // Mark session as completed
        await q.run(`
            UPDATE evaluation_sessions
            SET status = 'completed', end_time = CURRENT_TIMESTAMP, overall_score = ?
            WHERE id = ?`,
            overallScore, sessionId);

        return {
            sessionId,
            agentId,
            overallScore,
            grade,
            metrics,
            ...analysis,
        };

    } catch (error: any) {
        // Mark session as failed
        await q.run(`
            UPDATE evaluation_sessions
            SET status = 'failed', end_time = CURRENT_TIMESTAMP, metadata = ?
            WHERE id = ?`,
            JSON.stringify({ error: error.message }), sessionId);

        throw error;
    }
}

/**
 * Get evaluation history for an agent
 */
export function getEvaluationHistory(agentId: string, limit: number = 10) {
    return q.all(`
        SELECT es.*, ev.*
        FROM evaluation_sessions es
        LEFT JOIN evaluation_scores ev ON es.id = ev.session_id
        WHERE es.agent_id = ?
        ORDER BY es.created_at DESC
        LIMIT ?`,
        agentId, limit);
}

/**
 * Get latest evaluation for an agent
 */
export function getLatestEvaluation(agentId: string) {
    return q.one(`
        SELECT es.*, ev.*
        FROM evaluation_sessions es
        LEFT JOIN evaluation_scores ev ON es.id = ev.session_id
        WHERE es.agent_id = ? AND es.status = 'completed'
        ORDER BY es.created_at DESC
        LIMIT 1`,
        agentId);
}

// Helper functions

async function getSuccessRate(agentId: string, startDate: Date, endDate: Date): Promise<number> {
    // period_* hold the ISO text they were written with on SQLite (compared
    // as text, as before); timestamptz on PostgreSQL.
    const bound = q.dialect === 'postgres' ? '(?)::timestamptz' : '?';
    const result = await q.one<{ value: number }>(`
        SELECT value FROM agent_performance_metrics
        WHERE agent_id = ? AND metric_type = 'task_success_rate'
        AND period_start >= ${bound} AND period_end <= ${bound}
        ORDER BY created_at DESC
        LIMIT 1`,
        agentId, startDate.toISOString(), endDate.toISOString());

    return result ? result.value * 100 : 0;
}

function calculateOverallScore(metrics: any): number {
    const weights = {
        reasoning: 0.25,
        toolAccuracy: 0.20,
        performance: 0.15,
        costEfficiency: 0.10,
        safety: 0.20,
        successRate: 0.10,
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([key, weight]) => {
        if (metrics[key] !== undefined && metrics[key] !== null) {
            totalScore += metrics[key] * weight;
            totalWeight += weight;
        }
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
}

function calculateGrade(score: number): string {
    if (score >= 97) return 'A+';
    if (score >= 93) return 'A';
    if (score >= 87) return 'B+';
    if (score >= 83) return 'B';
    if (score >= 77) return 'C+';
    if (score >= 73) return 'C';
    if (score >= 60) return 'D';
    return 'F';
}

function analyzeMetrics(metrics: any) {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    // Analyze each metric
    if (metrics.reasoning >= 80) strengths.push('Excellent reasoning coherence');
    else if (metrics.reasoning < 60) {
        weaknesses.push('Poor reasoning quality');
        recommendations.push('Improve system prompt clarity and context handling');
    }

    if (metrics.toolAccuracy >= 85) strengths.push('High tool selection accuracy');
    else if (metrics.toolAccuracy < 70) {
        weaknesses.push('Suboptimal tool usage');
        recommendations.push('Review tool descriptions and add more examples');
    }

    if (metrics.performance >= 80) strengths.push('Excellent response times');
    else if (metrics.performance < 60) {
        weaknesses.push('High latency');
        recommendations.push('Optimize tool execution and consider caching');
    }

    if (metrics.costEfficiency >= 80) strengths.push('Cost-effective operations');
    else if (metrics.costEfficiency < 60) {
        weaknesses.push('High operational costs');
        recommendations.push('Use model routing and implement caching');
    }

    if (metrics.safety >= 95) strengths.push('No safety or bias issues detected');
    else if (metrics.safety < 80) {
        weaknesses.push('Safety concerns detected');
        recommendations.push('Review and update content filtering and safety guardrails');
    }

    if (metrics.successRate >= 90) strengths.push('Very high success rate');
    else if (metrics.successRate < 70) {
        weaknesses.push('Low task completion rate');
        recommendations.push('Analyze failure patterns and improve error handling');
    }

    return { strengths, weaknesses, recommendations };
}
