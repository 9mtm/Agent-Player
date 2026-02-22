/**
 * Discord API Routes - Pure JavaScript
 * Mounted at /api/ext/discord/
 */

export async function registerDiscordRoutes(fastify) {
  /**
   * POST /api/ext/discord/send - Send message to Discord channel
   */
  fastify.post('/send', {
    schema: {
      tags: ['Discord'],
      description: 'Send message to Discord channel',
      body: {
        type: 'object',
        properties: {
          channelId: { type: 'string' },
          content: { type: 'string' },
          guildId: { type: 'string' },
        },
        required: ['channelId', 'content'],
      },
    },
  }, async (request, reply) => {
    const { channelId, content, guildId } = request.body;
    const db = fastify.db || request.server.db;

    try {
      // TODO: Implement Discord.js bot logic
      // const discordClient = getDiscordClient();
      // const channel = await discordClient.channels.fetch(channelId);
      // const message = await channel.send(content);

      // For now, just store in database
      const messageId = `msg_${Date.now()}`;
      db.prepare(`
        INSERT INTO discord_messages (id, channel_id, guild_id, content, author, author_id, timestamp, direction)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        messageId,
        channelId,
        guildId || null,
        content,
        'Agent Player Bot',
        'bot',
        new Date().toISOString(),
        'outgoing'
      );

      console.log(`[Discord] ✅ Message sent to channel ${channelId}`);

      return {
        success: true,
        messageId,
        note: 'Discord bot not connected - message logged to database',
      };
    } catch (error) {
      console.error('[Discord] ❌ Send failed:', error);
      return reply.status(500).send({
        error: error.message,
      });
    }
  });

  /**
   * POST /api/ext/discord/webhook - Receive Discord webhook
   */
  fastify.post('/webhook', {
    schema: {
      tags: ['Discord'],
      description: 'Receive incoming Discord message via webhook',
    },
  }, async (request, reply) => {
    const message = request.body;
    const db = fastify.db || request.server.db;

    try {
      // Store incoming message
      db.prepare(`
        INSERT INTO discord_messages (id, channel_id, guild_id, content, author, author_id, timestamp, direction)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        message.id || `msg_${Date.now()}`,
        message.channel_id,
        message.guild_id || null,
        message.content,
        message.author?.username || 'Unknown',
        message.author?.id || 'unknown',
        message.timestamp || new Date().toISOString(),
        'incoming'
      );

      console.log(`[Discord] ✅ Webhook received from ${message.author?.username}`);

      return { received: true };
    } catch (error) {
      console.error('[Discord] ❌ Webhook failed:', error);
      return reply.status(500).send({
        error: error.message,
      });
    }
  });

  /**
   * GET /api/ext/discord/messages - Get recent messages
   */
  fastify.get('/messages', {
    schema: {
      tags: ['Discord'],
      description: 'Get recent Discord messages',
      querystring: {
        type: 'object',
        properties: {
          channelId: { type: 'string' },
          limit: { type: 'number', default: 50 },
        },
      },
    },
  }, async (request, reply) => {
    const { channelId, limit } = request.query;
    const db = fastify.db || request.server.db;

    let query = `
      SELECT * FROM discord_messages
      ${channelId ? 'WHERE channel_id = ?' : ''}
      ORDER BY timestamp DESC
      LIMIT ?
    `;

    const messages = channelId
      ? db.prepare(query).all(channelId, limit || 50)
      : db.prepare(query).all(limit || 50);

    return { messages };
  });

  /**
   * GET /api/ext/discord/status - Get bot status
   */
  fastify.get('/status', {
    schema: {
      tags: ['Discord'],
      description: 'Get Discord bot connection status',
    },
  }, async (request, reply) => {
    const db = fastify.db || request.server.db;

    // Get config
    const config = db.prepare('SELECT * FROM discord_config WHERE id = 1').get();

    // Count messages
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END) as incoming,
        SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END) as outgoing
      FROM discord_messages
    `).get();

    return {
      configured: config?.bot_token ? true : false,
      connected: false, // TODO: Check actual Discord connection
      stats: {
        totalMessages: stats.total || 0,
        incoming: stats.incoming || 0,
        outgoing: stats.outgoing || 0,
      },
    };
  });

  /**
   * PUT /api/ext/discord/config - Update Discord configuration
   */
  fastify.put('/config', {
    schema: {
      tags: ['Discord'],
      description: 'Update Discord bot configuration',
      body: {
        type: 'object',
        properties: {
          bot_token: { type: 'string' },
          client_id: { type: 'string' },
          guild_id: { type: 'string' },
          allowed_channels: { type: 'array', items: { type: 'string' } },
          webhook_url: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { bot_token, client_id, guild_id, allowed_channels, webhook_url } = request.body;
    const db = fastify.db || request.server.db;

    db.prepare(`
      INSERT OR REPLACE INTO discord_config (id, bot_token, client_id, guild_id, allowed_channels, webhook_url, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      bot_token || null,
      client_id || null,
      guild_id || null,
      allowed_channels ? JSON.stringify(allowed_channels) : null,
      webhook_url || null
    );

    console.log('[Discord] ✅ Configuration updated');

    return { success: true };
  });

  console.log('[Discord Routes] ✅ Registered');
}
