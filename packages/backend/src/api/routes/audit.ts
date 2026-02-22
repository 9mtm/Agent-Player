/**
 * Audit API Routes
 * Endpoints for security audit logs and monitoring
 */

import type { FastifyInstance } from 'fastify';
import {
  getAuditLogger,
  getAuditStorage,
  getAuditStatus,
  type AuditQuery,
  type AuditConfig,
} from '../../audit/index.js';
import { handleError } from '../error-handler.js';

export async function auditRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/audit/status
   * Get audit system status and stats
   */
  fastify.get('/api/audit/status', async (request, reply) => {
    try {
      const status = getAuditStatus();
      return status;
    } catch (error: any) {
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
      const storage = getAuditStorage();
      const stats = storage.getStats();
      return stats;
    } catch (error: any) {
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
      const storage = getAuditStorage();

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

      const events = storage.query(filters);

      return {
        events,
        count: events.length,
        filters,
      };
    } catch (error: any) {
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
      const storage = getAuditStorage();
      const limit = query.limit ? parseInt(query.limit) : 50;

      const events = storage.getRecent(limit);

      return {
        events,
        count: events.length,
      };
    } catch (error: any) {
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
      const storage = getAuditStorage();

      const event = storage.getById(id);

      if (!event) {
        return reply.status(404).send({
          error: 'Event not found',
        });
      }

      return event;
    } catch (error: any) {
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
      const logger = getAuditLogger();
      return logger.getConfig();
    } catch (error: any) {
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
      const logger = getAuditLogger();

      logger.updateConfig(body);

      // Log the config change
      logger.logConfigChange(
        { type: 'api', id: 'admin' },
        { type: 'config', id: 'audit', name: 'Audit Configuration' },
        { after: body }
      );

      return {
        success: true,
        config: logger.getConfig(),
      };
    } catch (error: any) {
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
      const storage = getAuditStorage();
      const deleted = storage.cleanup();

      return {
        success: true,
        deletedEvents: deleted,
      };
    } catch (error: any) {
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
      const storage = getAuditStorage();

      const filters: AuditQuery = {};
      if (query.startDate) filters.startDate = new Date(query.startDate);
      if (query.endDate) filters.endDate = new Date(query.endDate);
      if (query.category) filters.category = query.category.split(',') as any;
      if (query.severity) filters.severity = query.severity.split(',') as any;

      const json = storage.exportToJson(filters);

      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', `attachment; filename="audit-export-${Date.now()}.json"`);

      return json;
    } catch (error: any) {
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
      const storage = getAuditStorage();

      // Get critical and high severity events from last 24h
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const alerts = storage.query({
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
      const storage = getAuditStorage();

      const days = query.days ? parseInt(query.days) : 7;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const events = storage.query({
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
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Audit] Get activity failed');
    }
  });
}
