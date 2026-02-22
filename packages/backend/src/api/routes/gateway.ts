/**
 * Gateway API Routes
 *
 * Manage multi-interface gateway
 */

import { FastifyInstance } from 'fastify';
import { getGateway } from '../../gateway/index.js';
import { WebChannelAdapter } from '../../gateway/adapters/web-adapter.js';

export async function gatewayRoutes(fastify: FastifyInstance) {
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
        return reply.status(500).send({
          error: err.message
        });
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
        return reply.status(500).send({
          error: err.message
        });
      }
    }
  );

  /**
   * POST /api/gateway/message
   * Send message through gateway (from web client)
   */
  fastify.post<{
    Body: {
      userId: string;
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

    const { userId, sessionId, message, metadata } = request.body;

    if (!userId || !message) {
      return reply.status(400).send({
        error: 'userId and message are required'
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
      fastify.log.error('Error processing gateway message:', err);
      return reply.status(500).send({
        error: err.message
      });
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
