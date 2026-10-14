/**
 * Gateway API Routes
 *
 * Manage multi-interface gateway. Owner only (auth gate owner tier for
 * /api/gateway*, plus the central owner rule on the request's actor here).
 *
 * B1.6: POST /api/gateway/message runs the web turn as the signed-in owner;
 * a `userId` in the body is ignored (it used to choose the account the turn
 * ran as). The session routes keep the user in the path: an owner-wide view
 * of one account's gateway session.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { actorOf } from '../../auth/auth-gate.js';
import type { Actor } from '../../repositories/actor.js';
import { actorOrReply, requireOwner } from '../../repositories/scope.js';
import { getGateway } from '../../gateway/index.js';
import { WebChannelAdapter } from '../../gateway/adapters/web-adapter.js';
import { sendInternalError } from '../error-handler.js';

/** The owner account's actor (central rule), else 401/403 sent and null. */
function ownerOf(request: FastifyRequest, reply: FastifyReply): Actor | null {
  return actorOrReply(reply, actorOf(request), requireOwner);
}

export async function gatewayRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', async (request, reply) => {
    if (ownerOf(request, reply) === null) return reply;
  });

  /**
   * Helper to get gateway instance (initialized after routes registration)
   */
  const getGatewayInstance = () => {
    try {
      return getGateway();
    } catch (err) {
      return null;
    }
  };

  /**
   * GET /api/gateway/status
   * Get gateway status and statistics
   */
  fastify.get('/api/gateway/status', async (request, reply) => {
    const gateway = getGatewayInstance();

    if (!gateway) {
      return reply.status(503).send({
        error: 'Gateway not initialized'
      });
    }

    const stats = gateway.getStats();

    return {
      status: 'ok',
      ...stats
    };
  });

  /**
   * GET /api/gateway/sessions/:userId
   * Get session info for user
   */
  fastify.get<{ Params: { userId: string } }>(
    '/api/gateway/sessions/:userId',
    async (request, reply) => {
      const gateway = getGatewayInstance();

      if (!gateway) {
        return reply.status(503).send({
          error: 'Gateway not initialized'
        });
      }

      const { userId } = request.params;

      try {
        const session = await gateway.getSession(userId);

        return {
          session: {
            sessionId: session.sessionId,
            userId: session.userId,
            activeChannels: session.activeChannels,
            lastActiveChannel: session.lastActiveChannel,
            conversationCount: session.conversationHistory.length,
            createdAt: session.createdAt,
            lastActivityAt: session.lastActivityAt
          }
        };
      } catch (err: any) {
        return sendInternalError(reply, '[Gateway] GET /api/gateway/sessions/:userId', err);
      }
    }
  );

  /**
   * GET /api/gateway/sessions/:userId/history
   * Get conversation history for user
   */
  fastify.get<{
    Params: { userId: string };
    Querystring: { limit?: string };
  }>(
    '/api/gateway/sessions/:userId/history',
    async (request, reply) => {
      const gateway = getGatewayInstance();

      if (!gateway) {
        return reply.status(503).send({
          error: 'Gateway not initialized'
        });
      }

      const { userId } = request.params;
      const limit = request.query.limit ? parseInt(request.query.limit) : undefined;

      try {
        const session = await gateway.getSession(userId);
        const history = session.conversationHistory.slice(limit ? -limit : 0);

        return {
          history,
          total: session.conversationHistory.length
        };
      } catch (err: any) {
        return sendInternalError(reply, '[Gateway] GET /api/gateway/sessions/:userId/history', err);
      }
    }
  );

  /**
   * POST /api/gateway/message
   * Send message through gateway (from web client)
   */
  fastify.post<{
    Body: {
      sessionId?: string;
      message: string;
      metadata?: Record<string, any>;
    };
  }>('/api/gateway/message', async (request, reply) => {
    const gateway = getGatewayInstance();

    if (!gateway) {
      return reply.status(503).send({
        error: 'Gateway not initialized'
      });
    }

    // The turn runs as the signed-in owner (never a user id from the body).
    const userId = actorOf(request)?.userId;
    if (!userId) return reply.status(401).send({ error: 'Authentication required' });
    const { sessionId, message, metadata } = (request.body ?? {}) as { sessionId?: string; message?: string; metadata?: Record<string, any> };

    if (!message) {
      return reply.status(400).send({
        error: 'message is required'
      });
    }

    try {
      // Get web adapter
      const webAdapter = gateway.getChannel('web' as any);

      if (!webAdapter || !(webAdapter instanceof WebChannelAdapter)) {
        return reply.status(503).send({
          error: 'Web channel not available'
        });
      }

      // Get or create session
      const session = await gateway.getSession(userId);
      const finalSessionId = sessionId || session.sessionId;

      // Send message through web adapter
      await (webAdapter as WebChannelAdapter).receiveMessage(
        userId,
        finalSessionId,
        message,
        metadata
      );

      return {
        success: true,
        sessionId: finalSessionId
      };
    } catch (err: any) {
      return sendInternalError(reply, '[Gateway] POST /api/gateway/message', err);
    }
  });

  /**
   * GET /api/gateway/channels
   * List registered channels
   */
  fastify.get('/api/gateway/channels', async (request, reply) => {
    const gateway = getGatewayInstance();

    if (!gateway) {
      return reply.status(503).send({
        error: 'Gateway not initialized'
      });
    }

    const stats = gateway.getStats();

    const channels = stats.channels.map((channelId) => {
      const adapter = gateway.getChannel(channelId as any);
      return {
        id: channelId,
        name: adapter?.name || channelId,
        connected: adapter?.isConnected() || false
      };
    });

    return {
      channels,
      total: channels.length
    };
  });
}
