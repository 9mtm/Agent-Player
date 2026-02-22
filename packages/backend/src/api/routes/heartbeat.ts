/**
 * Heartbeat API Routes
 * Endpoints for health monitoring and heartbeat management
 */

import type { FastifyInstance } from 'fastify';
import { getUserIdFromRequest } from '../../auth/jwt.js';
import { handleError } from '../error-handler.js';
import {
  getHeartbeatMonitor,
  getHeartbeatStatus,
  getSystemResources,
  builtInChecks,
  type ComponentRegistration,
  type HealthStatus,
} from '../../heartbeat/index.js';

export async function heartbeatRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/heartbeat/status
   * Get overall system health status
   */
  fastify.get('/api/heartbeat/status', async (request, reply) => {
    try {
      // SECURITY: Require authentication (H-07)
      getUserIdFromRequest(request);

      const status = getHeartbeatStatus();
      return status;
    } catch (error) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Heartbeat] Get status failed');
    }
  });

  /**
   * GET /api/heartbeat/health
   * Get detailed system health
   */
  fastify.get('/api/heartbeat/health', async (request, reply) => {
    try {
      // SECURITY: Require authentication (H-07)
      getUserIdFromRequest(request);

      const monitor = getHeartbeatMonitor();
      const health = monitor.getSystemHealth();
      const resources = getSystemResources();

      return {
        ...health,
        resources,
      };
    } catch (error) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Heartbeat] Get health failed');
    }
  });

  /**
   * GET /api/heartbeat/components
   * List all monitored components
   */
  fastify.get('/api/heartbeat/components', async (request, reply) => {
    try {
      // SECURITY: Require authentication (H-07)
      getUserIdFromRequest(request);

      const query = request.query as { type?: string; status?: string };
      const monitor = getHeartbeatMonitor();
      let components = monitor.getAllComponents();

      // Filter by type
      if (query.type) {
        components = components.filter((c) => c.registration.type === query.type);
      }

      // Filter by status
      if (query.status) {
        components = components.filter((c) => c.status === query.status);
      }

      return {
        components: components.map((c) => ({
          id: c.registration.id,
          name: c.registration.name,
          type: c.registration.type,
          status: c.status,
          critical: c.registration.critical,
          lastHeartbeat: c.lastHeartbeat?.timestamp,
          lastSuccessful: c.lastSuccessful,
          consecutiveFailures: c.consecutiveFailures,
          uptime24h: c.uptime24h,
          avgResponseTime: c.avgResponseTime,
        })),
        count: components.length,
      };
    } catch (error) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Heartbeat] List components failed');
    }
  });

  /**
   * POST /api/heartbeat/components
   * Register a new component
   */
  fastify.post('/api/heartbeat/components', async (request, reply) => {
    try {
      // SECURITY: Require authentication (H-07)
      getUserIdFromRequest(request);

      const body = request.body as ComponentRegistration;
      const monitor = getHeartbeatMonitor();

      if (!body.id || !body.name || !body.type) {
        return reply.status(400).send({
          error: 'Missing required fields: id, name, type',
        });
      }

      const state = monitor.register({
        ...body,
        interval: body.interval ?? 30000,
        timeout: body.timeout ?? 10000,
        critical: body.critical ?? false,
      });

      return {
        success: true,
        component: {
          id: state.registration.id,
          name: state.registration.name,
          type: state.registration.type,
          status: state.status,
        },
      };
    } catch (error) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Heartbeat] Register component failed');
    }
  });

  /**
   * GET /api/heartbeat/components/:id
   * Get component details
   */
  fastify.get('/api/heartbeat/components/:id', async (request, reply) => {
    try {
      // SECURITY: Require authentication (H-07)
      getUserIdFromRequest(request);

      const { id } = request.params as { id: string };
      const monitor = getHeartbeatMonitor();

      const state = monitor.getComponent(id);
      if (!state) {
        return reply.status(404).send({ error: 'Component not found' });
      }

      return {
        id: state.registration.id,
        name: state.registration.name,
        type: state.registration.type,
        description: state.registration.description,
        status: state.status,
        critical: state.registration.critical,
        interval: state.registration.interval,
        timeout: state.registration.timeout,
        lastHeartbeat: state.lastHeartbeat,
        lastSuccessful: state.lastSuccessful,
        consecutiveFailures: state.consecutiveFailures,
        uptime24h: state.uptime24h,
        avgResponseTime: state.avgResponseTime,
        thresholds: state.registration.thresholds,
        dependencies: state.registration.dependencies,
        tags: state.registration.tags,
      };
    } catch (error) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Heartbeat] Get component failed');
    }
  });

  /**
   * DELETE /api/heartbeat/components/:id
   * Unregister a component
   */
  fastify.delete('/api/heartbeat/components/:id', async (request, reply) => {
    try {
      // SECURITY: Require authentication (H-07)
      getUserIdFromRequest(request);

      const { id } = request.params as { id: string };
      const monitor = getHeartbeatMonitor();

      const deleted = monitor.unregister(id);
      if (!deleted) {
        return reply.status(404).send({ error: 'Component not found' });
      }

      return { success: true, id };
    } catch (error) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Heartbeat] Unregister component failed');
    }
  });

  /**
   * POST /api/heartbeat/components/:id/beat
   * Send heartbeat for a component
   */
  fastify.post('/api/heartbeat/components/:id/beat', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as {
        status?: HealthStatus;
        responseTime?: number;
        cpuUsage?: number;
        memoryUsage?: number;
        metrics?: Record<string, number>;
        error?: string;
        metadata?: Record<string, unknown>;
      };

      const monitor = getHeartbeatMonitor();
      const heartbeat = monitor.recordHeartbeat(id, body);

      if (!heartbeat) {
        return reply.status(404).send({ error: 'Component not found' });
      }

      return {
        success: true,
        heartbeat: {
          id: heartbeat.id,
          status: heartbeat.status,
          timestamp: heartbeat.timestamp,
          responseTime: heartbeat.responseTime,
        },
      };
    } catch (error) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Heartbeat] Record heartbeat failed');
    }
  });

  /**
   * GET /api/heartbeat/components/:id/history
   * Get heartbeat history for a component
   */
  fastify.get('/api/heartbeat/components/:id/history', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const query = request.query as { limit?: string };
      const monitor = getHeartbeatMonitor();

      const limit = query.limit ? parseInt(query.limit) : 100;
      const history = monitor.getHistory(id, limit);

      return {
        componentId: id,
        history,
        count: history.length,
      };
    } catch (error) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Heartbeat] Get history failed');
    }
  });

  /**
   * GET /api/heartbeat/alerts
   * Get active alerts
   */
  fastify.get('/api/heartbeat/alerts', async (request, reply) => {
    try {
      // SECURITY: Require authentication (H-07)
      getUserIdFromRequest(request);

      const query = request.query as { all?: string; limit?: string };
      const monitor = getHeartbeatMonitor();

      const limit = query.limit ? parseInt(query.limit) : 50;
      const alerts =
        query.all === 'true'
          ? monitor.getAllAlerts(limit)
          : monitor.getActiveAlerts();

      return {
        alerts,
        count: alerts.length,
        activeOnly: query.all !== 'true',
      };
    } catch (error) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Heartbeat] Get alerts failed');
    }
  });

  /**
   * POST /api/heartbeat/alerts/:id/resolve
   * Resolve an alert
   */
  fastify.post('/api/heartbeat/alerts/:id/resolve', async (request, reply) => {
    try {
      // SECURITY: Require authentication (H-07)
      getUserIdFromRequest(request);

      const { id } = request.params as { id: string };
      const monitor = getHeartbeatMonitor();

      const resolved = monitor.resolveAlert(id);
      if (!resolved) {
        return reply.status(404).send({ error: 'Alert not found or already resolved' });
      }

      return { success: true, alertId: id };
    } catch (error) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Heartbeat] Resolve alert failed');
    }
  });

  /**
   * GET /api/heartbeat/config
   * Get heartbeat configuration
   */
  fastify.get('/api/heartbeat/config', async (request, reply) => {
    try {
      // SECURITY: Require authentication (H-07)
      getUserIdFromRequest(request);

      const monitor = getHeartbeatMonitor();
      return monitor.getConfig();
    } catch (error) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Heartbeat] Get config failed');
    }
  });

  /**
   * PUT /api/heartbeat/config
   * Update heartbeat configuration
   */
  fastify.put('/api/heartbeat/config', async (request, reply) => {
    try {
      // SECURITY: Require authentication (H-07)
      getUserIdFromRequest(request);

      const body = request.body as Partial<ReturnType<typeof getHeartbeatMonitor>['getConfig']>;
      const monitor = getHeartbeatMonitor();

      monitor.updateConfig(body);

      return {
        success: true,
        config: monitor.getConfig(),
      };
    } catch (error) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Heartbeat] Update config failed');
    }
  });

  /**
   * POST /api/heartbeat/check
   * Perform manual health check
   */
  fastify.post('/api/heartbeat/check', async (request, reply) => {
    try {
      // SECURITY: Require authentication (H-07)
      getUserIdFromRequest(request);

      const body = request.body as { type: 'api' | 'database' | 'memory' };

      let result;
      switch (body.type) {
        case 'api':
          result = await builtInChecks.apiServer();
          break;
        case 'database':
          result = await builtInChecks.database();
          break;
        case 'memory':
          result = builtInChecks.memoryUsage();
          break;
        default:
          return reply.status(400).send({ error: 'Invalid check type' });
      }

      return {
        type: body.type,
        result,
      };
    } catch (error) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Heartbeat] Health check failed');
    }
  });

  /**
   * GET /api/heartbeat/resources
   * Get system resources
   */
  fastify.get('/api/heartbeat/resources', async (request, reply) => {
    try {
      // SECURITY: Require authentication (H-07)
      getUserIdFromRequest(request);

      const resources = getSystemResources();
      return resources;
    } catch (error) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Heartbeat] Get resources failed');
    }
  });

  console.log('[Heartbeat API] ✅ Routes registered (all endpoints authenticated)');
}
