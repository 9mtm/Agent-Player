/**
 * Cost Analytics API Routes
 * View model usage and cost optimization statistics
 */

import type { FastifyInstance } from 'fastify';
import { handleError } from '../error-handler.js';
import { CostTracker } from '../../services/cost-tracker.js';
import { getUserIdFromRequest } from '../../auth/jwt.js';

export async function registerCostAnalyticsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/cost-analytics/stats
   * Get cost statistics for current user
   */
  fastify.get('/api/cost-analytics/stats', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { days = '30' } = request.query as { days?: string };
      const daysBack = parseInt(days, 10) || 30;

      const stats = await CostTracker.getStats(userId, daysBack);

      return reply.send({
        stats,
        period: {
          days: daysBack,
          from: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      return handleError(reply, error, 'internal', '[CostAnalytics] Failed to get stats');
    }
  });

  /**
   * GET /api/cost-analytics/entries
   * Get recent cost tracking entries for debugging
   */
  fastify.get('/api/cost-analytics/entries', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { limit = '50' } = request.query as { limit?: string };
      const limitNum = parseInt(limit, 10) || 50;

      const entries = await CostTracker.getRecentEntries(userId, limitNum);

      return reply.send({
        entries,
        count: entries.length,
      });
    } catch (error: any) {
      return handleError(reply, error, 'internal', '[CostAnalytics] Failed to get entries');
    }
  });

  /**
   * POST /api/cost-analytics/cleanup
   * Clean up old entries (admin only - can be enhanced with role check)
   */
  fastify.post('/api/cost-analytics/cleanup', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { days = '90' } = request.body as { days?: string };
      const daysToKeep = parseInt(days, 10) || 90;

      const deletedCount = await CostTracker.cleanup(daysToKeep);

      return reply.send({
        success: true,
        deletedCount,
        keptDays: daysToKeep,
      });
    } catch (error: any) {
      return handleError(reply, error, 'internal', '[CostAnalytics] Failed to cleanup');
    }
  });
}
