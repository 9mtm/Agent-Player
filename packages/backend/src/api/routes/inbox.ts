/**
 * Inbox API Routes
 *
 * Endpoints for inbox messages, approvals, and statistics
 */

import type { FastifyInstance } from 'fastify';
import type {
  CreateInboxMessageRequest,
  ListInboxMessagesQuery,
  ApprovalDecision
} from '../../inbox/types.js';

export async function inboxRoutes(fastify: FastifyInstance) {
  const { inboxGateway, messageStore } = fastify;

  // Ensure inbox components are available
  if (!inboxGateway || !messageStore) {
    throw new Error('Inbox system not initialized');
  }

  // ==================
  // Inbox Messages
  // ==================

  /**
   * List inbox messages
   * GET /api/inbox
   */
  fastify.get('/api/inbox', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          sourceType: { type: 'string' },
          riskLevel: { type: 'string' },
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    // @ts-ignore - user is added by auth middleware
    const userId = request.user?.id;

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const query = request.query as ListInboxMessagesQuery;

    const messages = await messageStore.listByUser(userId, {
      status: query.status as any,
      sourceType: query.sourceType as any,
      riskLevel: query.riskLevel as any,
      limit: query.limit || 50,
      offset: query.offset || 0
    });

    return { messages };
  });

  /**
   * Get single inbox message
   * GET /api/inbox/:id
   */
  fastify.get('/api/inbox/:id', async (request, reply) => {
    // @ts-ignore
    const userId = request.user?.id;
    const { id } = request.params as { id: string };

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const message = await messageStore.getById(id);

    // Check ownership
    if (message.userId !== userId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    return { message };
  });

  /**
   * Create inbox message (manual/testing)
   * POST /api/inbox
   */
  fastify.post('/api/inbox', {
    schema: {
      body: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string' },
          sourceType: { type: 'string' },
          sourceId: { type: 'string' },
          metadata: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    // @ts-ignore
    const userId = request.user?.id;

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const body = request.body as CreateInboxMessageRequest;

    const receipt = await inboxGateway.receive({
      userId,
      sourceType: body.sourceType || 'manual',
      sourceId: body.sourceId,
      message: body.message,
      metadata: body.metadata
    });

    return receipt;
  });

  /**
   * Delete inbox message
   * DELETE /api/inbox/:id
   */
  fastify.delete('/api/inbox/:id', async (request, reply) => {
    // @ts-ignore
    const userId = request.user?.id;
    const { id } = request.params as { id: string };

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const message = await messageStore.getById(id);

    if (message.userId !== userId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    await messageStore.delete(id);

    return { success: true };
  });

  /**
   * Get inbox statistics
   * GET /api/inbox/stats
   */
  fastify.get('/api/inbox/stats', async (request, reply) => {
    // @ts-ignore
    const userId = request.user?.id;

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const stats = await inboxGateway.getStats(userId);

    return { stats };
  });

  // ==================
  // Approvals
  // ==================

  /**
   * Get pending approvals
   * GET /api/inbox/approvals
   */
  fastify.get('/api/inbox/approvals', async (request, reply) => {
    // @ts-ignore
    const userId = request.user?.id;

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const pending = await inboxGateway.getPendingApprovals(userId);

    return { approvals: pending };
  });

  /**
   * Approve message
   * POST /api/inbox/:id/approve
   */
  fastify.post('/api/inbox/:id/approve', {
    schema: {
      body: {
        type: 'object',
        properties: {
          reason: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    // @ts-ignore
    const userId = request.user?.id;
    const { id } = request.params as { id: string };

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const decision: ApprovalDecision = {
      decision: 'approved',
      reason: (request.body as any)?.reason
    };

    const receipt = await inboxGateway.processApproval(id, decision, userId);

    return receipt;
  });

  /**
   * Deny message
   * POST /api/inbox/:id/deny
   */
  fastify.post('/api/inbox/:id/deny', {
    schema: {
      body: {
        type: 'object',
        properties: {
          reason: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    // @ts-ignore
    const userId = request.user?.id;
    const { id } = request.params as { id: string };

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const decision: ApprovalDecision = {
      decision: 'denied',
      reason: (request.body as any)?.reason || 'Denied by user'
    };

    const receipt = await inboxGateway.processApproval(id, decision, userId);

    return receipt;
  });

  // ==================
  // Cleanup
  // ==================

  /**
   * Cleanup old completed messages
   * POST /api/inbox/cleanup
   */
  fastify.post('/api/inbox/cleanup', async (request, reply) => {
    // @ts-ignore
    const userId = request.user?.id;

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const deleted = await messageStore.deleteOldCompleted(userId, 30);

    return { deleted };
  });
}
