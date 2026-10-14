/**
 * Audit API Routes
 * Endpoints for security audit logs and monitoring
 */

import { actorOf } from '../../auth/auth-gate.js';
import type { FastifyInstance } from 'fastify';
import type { AuditQuery, AuditConfig } from '../../audit/index.js';
import { handleError } from '../error-handler.js';
import { repositories } from '../../repositories/index.js';
import { requestMeta } from '../../repositories/audit.js';
import { ScopeError, sendScopeError } from '../../repositories/scope.js';

// B1-core: scope (admin read, owner config/cleanup) is enforced by the audit
// repository (repositories/audit.ts) with the request's actor; the auth gate
// tiers (/api/audit admin, config write + cleanup owner) stay in front.

export async function auditRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/audit/status
   * Get audit system status and stats
   */
  fastify.get('/api/audit/status', async (request, reply) => {
    try {
      const status = await repositories.audit.status(actorOf(request));
      return status;
    } catch (error: any) {
      if (error instanceof ScopeError) return sendScopeError(reply, error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Audit] Get status failed');
    }
  });

  /**
   * GET /api/audit/stats
   * Get audit statistics
   */
  fastify.get('/api/audit/stats', async (request, reply) => {
    try {
      const stats = await repositories.audit.stats(actorOf(request));
      return stats;
    } catch (error: any) {
      if (error instanceof ScopeError) return sendScopeError(reply, error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Audit] Get stats failed');
    }
  });

  /**
   * GET /api/audit/events
   * Query audit events with filters
   */
  fastify.get('/api/audit/events', async (request, reply) => {
    try {
      const query = request.query as Record<string, string>;

      const filters: AuditQuery = {
        limit: query.limit ? parseInt(query.limit) : 50,
        offset: query.offset ? parseInt(query.offset) : 0,
        orderBy: (query.orderBy as 'timestamp' | 'severity') || 'timestamp',
        orderDir: (query.orderDir as 'asc' | 'desc') || 'desc',
      };

      // Parse filters
      if (query.startDate) filters.startDate = new Date(query.startDate);
      if (query.endDate) filters.endDate = new Date(query.endDate);
      if (query.category) filters.category = query.category.split(',') as any;
      if (query.action) filters.action = query.action.split(',') as any;
      if (query.severity) filters.severity = query.severity.split(',') as any;
      if (query.actorId) filters.actorId = query.actorId;
      if (query.result) filters.result = query.result as any;
      if (query.search) filters.search = query.search;

      const events = await repositories.audit.query(actorOf(request), filters);

      return {
        events,
        count: events.length,
        filters,
      };
    } catch (error: any) {
      if (error instanceof ScopeError) return sendScopeError(reply, error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Audit] Query events failed');
    }
  });

  /**
   * GET /api/audit/events/recent
   * Get recent audit events
   */
  fastify.get('/api/audit/events/recent', async (request, reply) => {
    try {
      const query = request.query as { limit?: string };
      const limit = query.limit ? parseInt(query.limit) : 50;

      const events = await repositories.audit.recent(actorOf(request), limit);

      return {
        events,
        count: events.length,
      };
    } catch (error: any) {
      if (error instanceof ScopeError) return sendScopeError(reply, error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Audit] Get recent events failed');
    }
  });

  /**
   * GET /api/audit/events/:id
   * Get a specific audit event
   */
  fastify.get('/api/audit/events/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const event = await repositories.audit.get(actorOf(request), id);

      if (!event) {
        return reply.status(404).send({
          error: 'Event not found',
        });
      }

      return event;
    } catch (error: any) {
      if (error instanceof ScopeError) return sendScopeError(reply, error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Audit] Get event failed');
    }
  });

  /**
   * GET /api/audit/config
   * Get audit configuration
   */
  fastify.get('/api/audit/config', async (request, reply) => {
    try {
      return await repositories.audit.config(actorOf(request));
    } catch (error: any) {
      if (error instanceof ScopeError) return sendScopeError(reply, error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Audit] Get config failed');
    }
  });

  /**
   * PUT /api/audit/config
   * Update audit configuration
   */
  fastify.put('/api/audit/config', async (request, reply) => {
    try {
      const body = request.body as Partial<AuditConfig>;
      const config = await repositories.audit.updateConfig(actorOf(request), body, requestMeta(request));

      return {
        success: true,
        config,
      };
    } catch (error: any) {
      if (error instanceof ScopeError) return sendScopeError(reply, error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Audit] Update config failed');
    }
  });

  /**
   * POST /api/audit/cleanup
   * Cleanup old audit events
   */
  fastify.post('/api/audit/cleanup', async (request, reply) => {
    try {
      const deleted = await repositories.audit.cleanup(actorOf(request));

      return {
        success: true,
        deletedEvents: deleted,
      };
    } catch (error: any) {
      if (error instanceof ScopeError) return sendScopeError(reply, error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Audit] Cleanup failed');
    }
  });

  /**
   * GET /api/audit/export
   * Export audit events as JSON
   */
  fastify.get('/api/audit/export', async (request, reply) => {
    try {
      const query = request.query as Record<string, string>;

      const filters: AuditQuery = {};
      if (query.startDate) filters.startDate = new Date(query.startDate);
      if (query.endDate) filters.endDate = new Date(query.endDate);
      if (query.category) filters.category = query.category.split(',') as any;
      if (query.severity) filters.severity = query.severity.split(',') as any;

      const json = await repositories.audit.exportJson(actorOf(request), filters);

      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', `attachment; filename="audit-export-${Date.now()}.json"`);

      return json;
    } catch (error: any) {
      if (error instanceof ScopeError) return sendScopeError(reply, error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Audit] Export failed');
    }
  });

  /**
   * GET /api/audit/alerts
   * Get security alerts (critical events)
   */
  fastify.get('/api/audit/alerts', async (request, reply) => {
    try {
      // Get critical and high severity events from last 24h
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const alerts = await repositories.audit.query(actorOf(request), {
        startDate: oneDayAgo,
        severity: ['critical', 'high'],
        orderBy: 'timestamp',
        orderDir: 'desc',
        limit: 100,
      });

      // Group by type
      const grouped = {
        critical: alerts.filter((e) => e.severity === 'critical'),
        high: alerts.filter((e) => e.severity === 'high'),
      };

      return {
        alerts,
        count: alerts.length,
        grouped,
        period: '24h',
      };
    } catch (error: any) {
      if (error instanceof ScopeError) return sendScopeError(reply, error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Audit] Get alerts failed');
    }
  });

  /**
   * GET /api/audit/activity/:actorId
   * Get activity for a specific actor
   */
  fastify.get('/api/audit/activity/:actorId', async (request, reply) => {
    try {
      const { actorId } = request.params as { actorId: string };
      const query = request.query as { limit?: string; days?: string };

      const days = query.days ? parseInt(query.days) : 7;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const events = await repositories.audit.query(actorOf(request), {
        actorId,
        startDate,
        limit: query.limit ? parseInt(query.limit) : 100,
        orderBy: 'timestamp',
        orderDir: 'desc',
      });

      return {
        actorId,
        events,
        count: events.length,
        period: `${days} days`,
      };
    } catch (error: any) {
      if (error instanceof ScopeError) return sendScopeError(reply, error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Audit] Get activity failed');
    }
  });
}
