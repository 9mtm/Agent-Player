/**
 * Webhooks API Routes
 * Endpoints for webhook management
 */

import type { FastifyInstance } from 'fastify';
import {
  getWebhookManager,
  getDeliveryService,
  getWebhooksStatus,
  triggerWebhooks,
  type WebhookConfig,
  type WebhookEventType,
  type InboundHandler,
} from '../../webhooks/index.js';
import { getAuditLogger } from '../../audit/index.js';
import { handleError } from '../error-handler.js';

export async function webhooksRoutes(fastify: FastifyInstance) {
  // ============ Outbound Webhooks ============

  /**
   * GET /api/webhooks/status
   * Get webhooks system status
   */
  fastify.get('/api/webhooks/status', async (request, reply) => {
    try {
      const status = getWebhooksStatus();
      return status;
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Webhooks] Get status failed');
    }
  });

  /**
   * GET /api/webhooks
   * List all webhooks
   */
  fastify.get('/api/webhooks', async (request, reply) => {
    try {
      const query = request.query as {
        status?: string;
        event?: string;
        ownerId?: string;
        limit?: string;
        offset?: string;
      };

      const manager = getWebhookManager();
      const webhooks = manager.list({
        status: query.status as any,
        event: query.event as WebhookEventType,
        ownerId: query.ownerId,
        limit: query.limit ? parseInt(query.limit) : 50,
        offset: query.offset ? parseInt(query.offset) : 0,
      });

      // Hide secrets
      const safeWebhooks = webhooks.map((w) => ({
        ...w,
        secret: w.secret ? '********' : undefined,
        auth: w.auth ? { type: w.auth.type } : undefined,
      }));

      return {
        webhooks: safeWebhooks,
        count: safeWebhooks.length,
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Webhooks] List failed');
    }
  });

  /**
   * POST /api/webhooks
   * Create a new webhook
   */
  fastify.post('/api/webhooks', async (request, reply) => {
    try {
      const body = request.body as {
        name: string;
        url: string;
        events: WebhookEventType[];
        description?: string;
        method?: 'POST' | 'PUT' | 'PATCH';
        auth?: WebhookConfig['auth'];
        headers?: Record<string, string>;
        retry?: Partial<WebhookConfig['retry']>;
        filters?: WebhookConfig['filters'];
        transform?: string;
        timeout?: number;
        ownerId?: string;
        tags?: string[];
      };

      if (!body.name || !body.url || !body.events || body.events.length === 0) {
        return reply.status(400).send({
          error: 'Missing required fields: name, url, events',
        });
      }

      const manager = getWebhookManager();
      const webhook = manager.create(body);

      // Audit log
      const audit = getAuditLogger();
      audit.logAccess(
        'write',
        { type: 'api', id: body.ownerId || 'admin' },
        { type: 'config', id: webhook.id, name: webhook.name },
        'success',
        { action: 'create_webhook', events: body.events }
      );

      return {
        success: true,
        webhook: {
          id: webhook.id,
          name: webhook.name,
          url: webhook.url,
          events: webhook.events,
          status: webhook.status,
          secret: webhook.secret, // Return secret only on creation
          createdAt: webhook.createdAt,
        },
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Webhooks] Create failed');
    }
  });

  /**
   * GET /api/webhooks/:id
   * Get webhook details
   */
  fastify.get('/api/webhooks/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const manager = getWebhookManager();

      const webhook = manager.getById(id);
      if (!webhook) {
        return reply.status(404).send({ error: 'Webhook not found' });
      }

      return {
        ...webhook,
        secret: '********',
        auth: webhook.auth ? { type: webhook.auth.type } : undefined,
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Webhooks] Get failed');
    }
  });

  /**
   * PUT /api/webhooks/:id
   * Update a webhook
   */
  fastify.put('/api/webhooks/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as Partial<WebhookConfig>;
      const manager = getWebhookManager();

      const webhook = manager.update(id, body);
      if (!webhook) {
        return reply.status(404).send({ error: 'Webhook not found' });
      }

      // Audit log
      const audit = getAuditLogger();
      audit.logAccess(
        'write',
        { type: 'api', id: 'admin' },
        { type: 'config', id: webhook.id, name: webhook.name },
        'success',
        { action: 'update_webhook' }
      );

      return {
        success: true,
        webhook: {
          id: webhook.id,
          name: webhook.name,
          status: webhook.status,
          updatedAt: webhook.updatedAt,
        },
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Webhooks] Update failed');
    }
  });

  /**
   * DELETE /api/webhooks/:id
   * Delete a webhook
   */
  fastify.delete('/api/webhooks/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const manager = getWebhookManager();

      const webhook = manager.getById(id);
      const deleted = manager.delete(id);

      if (!deleted) {
        return reply.status(404).send({ error: 'Webhook not found' });
      }

      // Cancel pending retries
      const delivery = getDeliveryService();
      delivery.cancelRetries(id);

      // Audit log
      const audit = getAuditLogger();
      audit.logAccess(
        'delete',
        { type: 'api', id: 'admin' },
        { type: 'config', id, name: webhook?.name },
        'success'
      );

      return { success: true, id };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Webhooks] Delete failed');
    }
  });

  /**
   * POST /api/webhooks/:id/test
   * Send a test webhook
   */
  fastify.post('/api/webhooks/:id/test', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as { data?: Record<string, unknown> };
      const manager = getWebhookManager();

      const webhook = manager.getById(id);
      if (!webhook) {
        return reply.status(404).send({ error: 'Webhook not found' });
      }

      // Trigger test event
      const result = await triggerWebhooks(
        'custom',
        {
          test: true,
          message: 'This is a test webhook delivery',
          timestamp: new Date().toISOString(),
          ...body.data,
        },
        { type: 'test', id: 'api', name: 'Test Trigger' }
      );

      return {
        success: true,
        triggered: result.triggered,
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Webhooks] Test failed');
    }
  });

  /**
   * GET /api/webhooks/:id/deliveries
   * Get delivery history for a webhook
   */
  fastify.get('/api/webhooks/:id/deliveries', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const query = request.query as { limit?: string };
      const delivery = getDeliveryService();

      const limit = query.limit ? parseInt(query.limit) : 50;
      const deliveries = delivery.getDeliveries(id, limit);

      return {
        webhookId: id,
        deliveries,
        count: deliveries.length,
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Webhooks] Get deliveries failed');
    }
  });

  /**
   * GET /api/webhooks/deliveries/:id
   * Get delivery details
   */
  fastify.get('/api/webhooks/deliveries/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const service = getDeliveryService();

      const delivery = service.getDeliveryById(id);
      if (!delivery) {
        return reply.status(404).send({ error: 'Delivery not found' });
      }

      return delivery;
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Webhooks] Get delivery failed');
    }
  });

  // ============ Inbound Webhooks ============

  /**
   * GET /api/webhooks/inbound
   * List inbound webhooks
   */
  fastify.get('/api/webhooks/inbound', async (request, reply) => {
    try {
      const manager = getWebhookManager();
      const webhooks = manager.listInbound();

      // Hide secrets
      const safeWebhooks = webhooks.map((w) => ({
        ...w,
        secret: '********',
      }));

      return {
        webhooks: safeWebhooks,
        count: safeWebhooks.length,
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Webhooks] List inbound failed');
    }
  });

  /**
   * POST /api/webhooks/inbound
   * Create inbound webhook
   */
  fastify.post('/api/webhooks/inbound', async (request, reply) => {
    try {
      const body = request.body as {
        name: string;
        description?: string;
        path?: string;
        allowedIps?: string[];
        handler: InboundHandler;
      };

      if (!body.name || !body.handler) {
        return reply.status(400).send({
          error: 'Missing required fields: name, handler',
        });
      }

      const manager = getWebhookManager();
      const webhook = manager.createInbound(body);

      return {
        success: true,
        webhook: {
          id: webhook.id,
          name: webhook.name,
          path: webhook.path,
          secret: webhook.secret, // Return secret only on creation
          createdAt: webhook.createdAt,
        },
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Webhooks] Create inbound failed');
    }
  });

  /**
   * DELETE /api/webhooks/inbound/:id
   * Delete inbound webhook
   */
  fastify.delete('/api/webhooks/inbound/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const manager = getWebhookManager();

      const deleted = manager.deleteInbound(id);
      if (!deleted) {
        return reply.status(404).send({ error: 'Inbound webhook not found' });
      }

      return { success: true, id };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Webhooks] Delete inbound failed');
    }
  });

  /**
   * POST /webhook/:path (*)
   * Handle inbound webhook calls
   */
  fastify.post('/webhook/*', async (request, reply) => {
    try {
      const path = `/webhook/${(request.params as any)['*']}`;
      const manager = getWebhookManager();

      const webhook = manager.getInboundByPath(path);
      if (!webhook || webhook.status !== 'active') {
        return reply.status(404).send({ error: 'Webhook not found' });
      }

      // Verify signature if secret provided
      const signature = request.headers['x-webhook-signature'] as string;
      if (webhook.secret && signature) {
        // Verification would happen here
      }

      // Check IP allowlist
      if (webhook.allowedIps && webhook.allowedIps.length > 0) {
        const clientIp = request.ip;
        if (!webhook.allowedIps.includes(clientIp)) {
          return reply.status(403).send({ error: 'IP not allowed' });
        }
      }

      // Record trigger
      manager.recordInboundTrigger(webhook.id);

      // Handle based on handler type
      const data = request.body as Record<string, unknown>;

      // For now, just acknowledge receipt
      // In full implementation, this would trigger workflows/agents/skills

      return {
        success: true,
        webhookId: webhook.id,
        received: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Webhooks] Process inbound failed');
    }
  });

  /**
   * GET /api/webhooks/stats
   * Get webhook statistics
   */
  fastify.get('/api/webhooks/stats', async (request, reply) => {
    try {
      const manager = getWebhookManager();
      return manager.getStats();
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Webhooks] Get stats failed');
    }
  });

  /**
   * POST /api/webhooks/cleanup
   * Cleanup old deliveries
   */
  fastify.post('/api/webhooks/cleanup', async (request, reply) => {
    try {
      const body = request.body as { retentionDays?: number };
      const delivery = getDeliveryService();

      const deleted = delivery.cleanup(body.retentionDays);

      return {
        success: true,
        deletedDeliveries: deleted,
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Webhooks] Cleanup failed');
    }
  });

  /**
   * POST /api/webhooks/trigger
   * Manually trigger webhooks for an event
   */
  fastify.post('/api/webhooks/trigger', async (request, reply) => {
    try {
      const body = request.body as {
        eventType: WebhookEventType;
        data: Record<string, unknown>;
        source?: { type: string; id: string; name?: string };
      };

      if (!body.eventType || !body.data) {
        return reply.status(400).send({
          error: 'Missing required fields: eventType, data',
        });
      }

      const result = await triggerWebhooks(
        body.eventType,
        body.data,
        body.source || { type: 'api', id: 'manual', name: 'Manual Trigger' }
      );

      return {
        success: true,
        ...result,
      };
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Webhooks] Trigger failed');
    }
  });
}
