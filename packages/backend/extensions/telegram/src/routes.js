/**
 * Telegram API Routes - Pure JavaScript
 * Mounted at /api/ext/telegram/
 */

export async function registerTelegramRoutes(fastify) {
  /**
   * POST /api/ext/telegram/send - Send message to Telegram chat
   */
  fastify.post('/send', {
    schema: {
      tags: ['Telegram'],
      description: 'Send message to Telegram chat',
      body: {
        type: 'object',
        properties: {
          chatId: { type: 'string' },
          text: { type: 'string' },
          parseMode: { type: 'string', enum: ['Markdown', 'HTML'] },
        },
        required: ['chatId', 'text'],
      },
    },
  }, async (request, reply) => {
    const { chatId, text, parseMode } = request.body;
    const db = fastify.db || request.server.db;

    try {
      // TODO: Implement Telegram Bot API logic
      // const config = db.prepare('SELECT * FROM telegram_config WHERE id = 1').get();
      // const response = await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
      // });

      // For now, just store in database
      const messageId = `tg_${Date.now()}`;
      db.prepare(`
        INSERT INTO telegram_messages (id, chat_id, content, user_id, username, timestamp, direction)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        messageId,
        chatId,
        text,
        'bot',
        'Agent Player Bot',
        new Date().toISOString(),
        'outgoing'
      );

      console.log(`[Telegram] ✅ Message sent to chat ${chatId}`);

      return {
        success: true,
        messageId,
        note: 'Telegram bot not connected - message logged to database',
      };
    } catch (error) {
      console.error('[Telegram] ❌ Send failed:', error);
      return reply.status(500).send({
        error: error.message,
      });
    }
  });

  /**
   * POST /api/ext/telegram/webhook - Receive Telegram updates
   */
  fastify.post('/webhook', {
    schema: {
      tags: ['Telegram'],
      description: 'Receive Telegram bot updates',
    },
  }, async (request, reply) => {
    const update = request.body;
    const db = fastify.db || request.server.db;

    try {
      if (update.message) {
        const msg = update.message;

        db.prepare(`
          INSERT INTO telegram_messages (id, chat_id, chat_type, content, user_id, username, first_name, last_name, timestamp, direction)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          String(msg.message_id),
          String(msg.chat.id),
          msg.chat.type,
          msg.text || msg.caption || '[media]',
          String(msg.from.id),
          msg.from.username || null,
          msg.from.first_name || null,
          msg.from.last_name || null,
          new Date(msg.date * 1000).toISOString(),
          'incoming'
        );

        console.log(`[Telegram] ✅ Message received from ${msg.from.first_name}`);
      }

      return { ok: true };
    } catch (error) {
      console.error('[Telegram] ❌ Webhook failed:', error);
      return reply.status(500).send({
        error: error.message,
      });
    }
  });

  /**
   * GET /api/ext/telegram/messages - Get recent messages
   */
  fastify.get('/messages', {
    schema: {
      tags: ['Telegram'],
      description: 'Get recent Telegram messages',
      querystring: {
        type: 'object',
        properties: {
          chatId: { type: 'string' },
          limit: { type: 'number', default: 50 },
        },
      },
    },
  }, async (request, reply) => {
    const { chatId, limit } = request.query;
    const db = fastify.db || request.server.db;

    let query = `
      SELECT * FROM telegram_messages
      ${chatId ? 'WHERE chat_id = ?' : ''}
      ORDER BY timestamp DESC
      LIMIT ?
    `;

    const messages = chatId
      ? db.prepare(query).all(chatId, limit || 50)
      : db.prepare(query).all(limit || 50);

    return { messages };
  });

  /**
   * GET /api/ext/telegram/status - Get bot status
   */
  fastify.get('/status', {
    schema: {
      tags: ['Telegram'],
      description: 'Get Telegram bot status',
    },
  }, async (request, reply) => {
    const db = fastify.db || request.server.db;

    const config = db.prepare('SELECT * FROM telegram_config WHERE id = 1').get();

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END) as incoming,
        SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END) as outgoing
      FROM telegram_messages
    `).get();

    return {
      configured: config?.bot_token ? true : false,
      connected: false, // TODO: Check actual bot connection
      stats: {
        totalMessages: stats.total || 0,
        incoming: stats.incoming || 0,
        outgoing: stats.outgoing || 0,
      },
    };
  });

  /**
   * PUT /api/ext/telegram/config - Update configuration
   */
  fastify.put('/config', {
    schema: {
      tags: ['Telegram'],
      description: 'Update Telegram bot configuration',
      body: {
        type: 'object',
        properties: {
          bot_token: { type: 'string' },
          webhook_url: { type: 'string' },
          allowed_users: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    const { bot_token, webhook_url, allowed_users } = request.body;
    const db = fastify.db || request.server.db;

    db.prepare(`
      INSERT OR REPLACE INTO telegram_config (id, bot_token, webhook_url, allowed_users, updated_at)
      VALUES (1, ?, ?, ?, datetime('now'))
    `).run(
      bot_token || null,
      webhook_url || null,
      allowed_users ? JSON.stringify(allowed_users) : null
    );

    console.log('[Telegram] ✅ Configuration updated');

    return { success: true };
  });

  console.log('[Telegram Routes] ✅ Registered');
}
