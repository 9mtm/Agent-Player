/**
 * Inbox API Routes
 *
 * Endpoints for inbox messages, approvals, and statistics
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { authenticateActiveUser } from '../../auth/route-guards.js';
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

  // SECURITY (F-07): every inbox route needs a valid token of an active user;
  // the user id comes from the verified token only, and every message is
  // scoped to that user. (Nothing ever set `request.user`, so all routes used
  // to answer 401.)
  fastify.addHook('onRequest', async (request, reply) => {
    const user = authenticateActiveUser(request);
    if (!user) return reply.code(401).send({ error: 'Authentication required' });
    (request as any).authUserId = user.id;
  });
  const currentUserId = (request: FastifyRequest): string => (request as any).authUserId;

  /** The caller's own message, or null after sending 404 (missing or someone else's). */
  async function ownMessage(id: string, userId: string, reply: any) {
    let message;
    try {
      message = await messageStore.getById(id);
    } catch {
      message = null;
    }
    if (!message || message.userId !== userId) {
      reply.code(404).send({ error: 'Inbox message not found' });
      return null;
    }
    return message;
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
    const userId = currentUserId(request);


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
    const userId = currentUserId(request);
    const { id } = request.params as { id: string };


    const message = await ownMessage(id, userId, reply);
    if (!message) return reply;

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
    const userId = currentUserId(request);


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
    const userId = currentUserId(request);
    const { id } = request.params as { id: string };


    if (!(await ownMessage(id, userId, reply))) return reply;

    await messageStore.delete(id);

    return { success: true };
  });

  /**
   * Get inbox statistics
   * GET /api/inbox/stats
   */
  fastify.get('/api/inbox/stats', async (request, reply) => {
    const userId = currentUserId(request);


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
    const userId = currentUserId(request);


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
    const userId = currentUserId(request);
    const { id } = request.params as { id: string };


    if (!(await ownMessage(id, userId, reply))) return reply;

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
    const userId = currentUserId(request);
    const { id } = request.params as { id: string };


    if (!(await ownMessage(id, userId, reply))) return reply;

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
    const userId = currentUserId(request);


    const deleted = await messageStore.deleteOldCompleted(userId, 30);

    return { deleted };
  });
}
