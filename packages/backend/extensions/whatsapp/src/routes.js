/**
 * WhatsApp API Routes - Pure JavaScript
 * Mounted at /api/ext/whatsapp/
 */

export async function registerWhatsAppRoutes(fastify) {
  /**
   * POST /api/ext/whatsapp/send - Send WhatsApp message
   */
  fastify.post('/send', {
    schema: {
      tags: ['WhatsApp'],
      description: 'Send WhatsApp message via Twilio',
      body: {
        type: 'object',
        properties: {
          to: { type: 'string' },
          body: { type: 'string' },
          mediaUrl: { type: 'string' },
        },
        required: ['to', 'body'],
      },
    },
  }, async (request, reply) => {
    const { to, body, mediaUrl } = request.body;
    const db = fastify.db || request.server.db;

    try {
      // TODO: Implement Twilio API logic
      // const config = db.prepare('SELECT * FROM whatsapp_config WHERE id = 1').get();
      // const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Basic ${Buffer.from(`${config.account_sid}:${config.auth_token}`).toString('base64')}`,
      //     'Content-Type': 'application/x-www-form-urlencoded',
      //   },
      //   body: new URLSearchParams({
      //     From: `whatsapp:${config.from_number}`,
      //     To: `whatsapp:${to}`,
      //     Body: body,
      //     ...(mediaUrl && { MediaUrl: mediaUrl }),
      //   }),
      // });

      // For now, just store in database
      const messageId = `wa_${Date.now()}`;
      db.prepare(`
        INSERT INTO whatsapp_messages (id, from_number, to_number, content, media_url, status, timestamp, direction)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        messageId,
        'bot',
        to,
        body,
        mediaUrl || null,
        'logged',
        new Date().toISOString(),
        'outgoing'
      );

      console.log(`[WhatsApp] ✅ Message sent to ${to}`);

      return {
        success: true,
        messageId,
        note: 'Twilio not connected - message logged to database',
      };
    } catch (error) {
      console.error('[WhatsApp] ❌ Send failed:', error);
      return reply.status(500).send({
        error: error.message,
      });
    }
  });

  /**
   * POST /api/ext/whatsapp/webhook - Receive WhatsApp messages
   */
  fastify.post('/webhook', {
    schema: {
      tags: ['WhatsApp'],
      description: 'Receive incoming WhatsApp messages from Twilio',
    },
  }, async (request, reply) => {
    const message = request.body;
    const db = fastify.db || request.server.db;

    try {
      db.prepare(`
        INSERT INTO whatsapp_messages (id, from_number, to_number, content, media_url, status, timestamp, direction)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        message.MessageSid || `wa_${Date.now()}`,
        message.From?.replace('whatsapp:', '') || 'unknown',
        message.To?.replace('whatsapp:', '') || 'bot',
        message.Body || '',
        message.MediaUrl0 || null,
        'received',
        new Date().toISOString(),
        'incoming'
      );

      console.log(`[WhatsApp] ✅ Message received from ${message.From}`);

      // Respond with TwiML
      return `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
    } catch (error) {
      console.error('[WhatsApp] ❌ Webhook failed:', error);
      return reply.status(500).send({
        error: error.message,
      });
    }
  });

  /**
   * GET /api/ext/whatsapp/messages - Get recent messages
   */
  fastify.get('/messages', {
    schema: {
      tags: ['WhatsApp'],
      description: 'Get recent WhatsApp messages',
      querystring: {
        type: 'object',
        properties: {
          number: { type: 'string' },
          limit: { type: 'number', default: 50 },
        },
      },
    },
  }, async (request, reply) => {
    const { number, limit } = request.query;
    const db = fastify.db || request.server.db;

    let query = `
      SELECT * FROM whatsapp_messages
      ${number ? 'WHERE from_number = ? OR to_number = ?' : ''}
      ORDER BY timestamp DESC
      LIMIT ?
    `;

    const messages = number
      ? db.prepare(query).all(number, number, limit || 50)
      : db.prepare(query).all(limit || 50);

    return { messages };
  });

  /**
   * GET /api/ext/whatsapp/status - Get connection status
   */
  fastify.get('/status', {
    schema: {
      tags: ['WhatsApp'],
      description: 'Get WhatsApp/Twilio connection status',
    },
  }, async (request, reply) => {
    const db = fastify.db || request.server.db;

    const config = db.prepare('SELECT * FROM whatsapp_config WHERE id = 1').get();

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END) as incoming,
        SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END) as outgoing
      FROM whatsapp_messages
    `).get();

    return {
      configured: config?.account_sid ? true : false,
      connected: false, // TODO: Check actual Twilio connection
      stats: {
        totalMessages: stats.total || 0,
        incoming: stats.incoming || 0,
        outgoing: stats.outgoing || 0,
      },
    };
  });

  /**
   * PUT /api/ext/whatsapp/config - Update configuration
   */
  fastify.put('/config', {
    schema: {
      tags: ['WhatsApp'],
      description: 'Update WhatsApp/Twilio configuration',
      body: {
        type: 'object',
        properties: {
          account_sid: { type: 'string' },
          auth_token: { type: 'string' },
          from_number: { type: 'string' },
          webhook_url: { type: 'string' },
          allowed_numbers: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    const { account_sid, auth_token, from_number, webhook_url, allowed_numbers } = request.body;
    const db = fastify.db || request.server.db;

    db.prepare(`
      INSERT OR REPLACE INTO whatsapp_config (id, account_sid, auth_token, from_number, webhook_url, allowed_numbers, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      account_sid || null,
      auth_token || null,
      from_number || null,
      webhook_url || null,
      allowed_numbers ? JSON.stringify(allowed_numbers) : null
    );

    console.log('[WhatsApp] ✅ Configuration updated');

    return { success: true };
  });

  console.log('[WhatsApp Routes] ✅ Registered');
}
