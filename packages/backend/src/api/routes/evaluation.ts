/**
 * Evaluation Framework API Routes
 *
 * Endpoints for comprehensive agent evaluation:
 * - Run full evaluations
 * - View evaluation history
 * - Get detailed scores and metrics
 * - Analyze specific dimensions (reasoning, tools, safety, performance)
 */

import { FastifyInstance } from 'fastify';
import { evaluateAgent, getEvaluationHistory, getLatestEvaluation } from '../../services/evaluation-framework.js';
import { getToolUsageSummary } from '../../services/tool-accuracy-analyzer.js';
import { getSafetyIssuesSummary } from '../../services/safety-analyzer.js';
import { getPerformanceSummary } from '../../services/performance-analyzer.js';
import { getDatabase } from '../../db/index.js';

export default async function evaluationRoutes(fastify: FastifyInstance) {
    const db = getDatabase();

    /**
     * POST /api/evaluation/:agentId/evaluate
     * Run comprehensive evaluation for an agent
     */
    fastify.post<{
        Params: { agentId: string };
        Body: {
            periodDays?: number;
            includeReasoningAnalysis?: boolean;
            includeToolAccuracy?: boolean;
            includeSafetyChecks?: boolean;
            includePerformanceProfile?: boolean;
        };
    }>('/api/evaluation/:agentId/evaluate', async (request, reply) => {
        const { agentId } = request.params;
        const config = request.body;

        try {
            const result = await evaluateAgent(agentId, config);
            return reply.send(result);
        } catch (error: any) {
            return reply.status(500).send({
                error: 'Evaluation failed',
                message: error.message,
            });
        }
    });

    /**
     * GET /api/evaluation/:agentId/history
     * Get evaluation history for an agent
     */
    fastify.get<{
        Params: { agentId: string };
        Querystring: { limit?: string };
    }>('/api/evaluation/:agentId/history', async (request, reply) => {
        const { agentId } = request.params;
        const limit = parseInt(request.query.limit || '10');

        try {
            const history = getEvaluationHistory(agentId, limit);
            return reply.send({ history });
        } catch (error: any) {
            return reply.status(500).send({
                error: 'Failed to fetch history',
                message: error.message,
            });
        }
    });

    /**
     * GET /api/evaluation/:agentId/latest
     * Get latest evaluation for an agent
     */
    fastify.get<{
        Params: { agentId: string };
    }>('/api/evaluation/:agentId/latest', async (request, reply) => {
        const { agentId } = request.params;

        try {
            const latest = getLatestEvaluation(agentId);
            if (!latest) {
                return reply.status(404).send({
                    error: 'No evaluation found',
                    message: 'No completed evaluations for this agent',
                });
            }
            return reply.send(latest);
        } catch (error: any) {
            return reply.status(500).send({
                error: 'Failed to fetch evaluation',
                message: error.message,
            });
        }
    });

    /**
     * GET /api/evaluation/:agentId/scores
     * Get all evaluation scores for an agent
     */
    fastify.get<{
        Params: { agentId: string };
    }>('/api/evaluation/:agentId/scores', async (request, reply) => {
        const { agentId } = request.params;

        try {
            const scores = db.prepare(`
                SELECT *
                FROM evaluation_scores
                WHERE agent_id = ?
                ORDER BY created_at DESC
                LIMIT 20
            `).all(agentId);

            return reply.send({ scores });
        } catch (error: any) {
            return reply.status(500).send({
                error: 'Failed to fetch scores',
                message: error.message,
            });
        }
    });

    /**
     * GET /api/evaluation/:agentId/sessions
     * Get all evaluation sessions for an agent
     */
    fastify.get<{
        Params: { agentId: string };
    }>('/api/evaluation/:agentId/sessions', async (request, reply) => {
        const { agentId } = request.params;

        try {
            const sessions = db.prepare(`
                SELECT *
                FROM evaluation_sessions
                WHERE agent_id = ?
                ORDER BY created_at DESC
                LIMIT 20
            `).all(agentId);

            return reply.send({ sessions });
        } catch (error: any) {
            return reply.status(500).send({
                error: 'Failed to fetch sessions',
                message: error.message,
            });
        }
    });

    /**
     * GET /api/evaluation/:agentId/reasoning
     * Get reasoning analysis scores
     */
    fastify.get<{
        Params: { agentId: string };
        Querystring: { limit?: string };
    }>('/api/evaluation/:agentId/reasoning', async (request, reply) => {
        const { agentId } = request.params;
        const limit = parseInt(request.query.limit || '20');

        try {
            const scores = db.prepare(`
                SELECT *
                FROM reasoning_scores
                WHERE agent_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            `).all(agentId, limit);

            return reply.send({ scores });
        } catch (error: any) {
            return reply.status(500).send({
                error: 'Failed to fetch reasoning scores',
                message: error.message,
            });
        }
    });

    /**
     * GET /api/evaluation/:agentId/tool-accuracy
     * Get tool accuracy metrics
     */
    fastify.get<{
        Params: { agentId: string };
        Querystring: { periodDays?: string };
    }>('/api/evaluation/:agentId/tool-accuracy', async (request, reply) => {
        const { agentId } = request.params;
        const periodDays = parseInt(request.query.periodDays || '7');

        try {
            const summary = getToolUsageSummary(agentId, periodDays);
            return reply.send({ summary });
        } catch (error: any) {
            return reply.status(500).send({
                error: 'Failed to fetch tool accuracy',
                message: error.message,
            });
        }
    });

    /**
     * GET /api/evaluation/:agentId/safety
     * Get safety issues summary
     */
    fastify.get<{
        Params: { agentId: string };
        Querystring: { periodDays?: string };
    }>('/api/evaluation/:agentId/safety', async (request, reply) => {
        const { agentId } = request.params;
        const periodDays = parseInt(request.query.periodDays || '7');

        try {
            const summary = getSafetyIssuesSummary(agentId, periodDays);
            return reply.send({ summary });
        } catch (error: any) {
            return reply.status(500).send({
                error: 'Failed to fetch safety summary',
                message: error.message,
            });
        }
    });

    /**
     * GET /api/evaluation/:agentId/performance
     * Get performance summary
     */
    fastify.get<{
        Params: { agentId: string };
        Querystring: { periodDays?: string };
    }>('/api/evaluation/:agentId/performance', async (request, reply) => {
        const { agentId } = request.params;
        const periodDays = parseInt(request.query.periodDays || '7');

        try {
            const summary = getPerformanceSummary(agentId, periodDays);
            return reply.send({ summary });
        } catch (error: any) {
            return reply.status(500).send({
                error: 'Failed to fetch performance summary',
                message: error.message,
            });
        }
    });

    /**
     * GET /api/evaluation/:agentId/dashboard
     * Get comprehensive dashboard data (all metrics)
     */
    fastify.get<{
        Params: { agentId: string };
        Querystring: { periodDays?: string };
    }>('/api/evaluation/:agentId/dashboard', async (request, reply) => {
        const { agentId } = request.params;
        const periodDays = parseInt(request.query.periodDays || '7');

        try {
            const [latest, toolAccuracy, safety, performance] = await Promise.all([
                getLatestEvaluation(agentId),
                getToolUsageSummary(agentId, periodDays),
                getSafetyIssuesSummary(agentId, periodDays),
                getPerformanceSummary(agentId, periodDays),
            ]);

            return reply.send({
                latestEvaluation: latest,
                toolAccuracy,
                safety,
                performance,
            });
        } catch (error: any) {
            return reply.status(500).send({
                error: 'Failed to fetch dashboard data',
                message: error.message,
            });
        }
    });

    /**
     * GET /api/evaluation/overview
     * Get evaluation overview for all agents
     */
    fastify.get('/api/evaluation/overview', async (request, reply) => {
        try {
            // Get all agents
            const agents = db.prepare(`
                SELECT id, name
                FROM agents_config
            `).all() as any[];

            // Get latest evaluation for each agent
            const overview = agents.map(agent => {
                const latestEval = db.prepare(`
                    SELECT overall_score, grade, created_at
                    FROM evaluation_scores
                    WHERE agent_id = ?
                    ORDER BY created_at DESC
                    LIMIT 1
                `).get(agent.id) as any;

                return {
                    agent_id: agent.id,
                    agent_name: agent.name,
                    overall_score: latestEval?.overall_score || null,
                    grade: latestEval?.grade || null,
                    last_evaluated: latestEval?.created_at || null,
                };
            });

            // Sort by score (nulls last)
            overview.sort((a, b) => {
                if (a.overall_score === null) return 1;
                if (b.overall_score === null) return -1;
                return b.overall_score - a.overall_score;
            });

            return reply.send({ overview });
        } catch (error: any) {
            return reply.status(500).send({
                error: 'Failed to fetch overview',
                message: error.message,
            });
        }
    });
}
