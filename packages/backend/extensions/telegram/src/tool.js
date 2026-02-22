/**
 * Telegram Send Message Tool - Pure JavaScript
 * Allows AI agents to send Telegram messages
 */

export const telegramSendTool = {
  name: 'telegram_send',
  description: 'Send a message to a Telegram chat. Requires Telegram bot to be configured.',
  input_schema: {
    type: 'object',
    properties: {
      chatId: {
        type: 'string',
        description: 'Telegram chat ID (numeric ID or @username)',
      },
      text: {
        type: 'string',
        description: 'Message text to send',
      },
      parseMode: {
        type: 'string',
        enum: ['Markdown', 'HTML'],
        description: 'Optional parse mode for formatting',
      },
    },
    required: ['chatId', 'text'],
  },

  async execute(params) {
    const { chatId, text, parseMode } = params;
    const backendUrl = process.env.BACKEND_URL || `http://${process.env.HOST || 'localhost'}:${process.env.PORT || '41522'}`;

    try {
      const response = await fetch(`${backendUrl}/api/ext/telegram/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, text, parseMode }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || response.statusText);
      }

      const result = await response.json();

      if (result.note) {
        return {
          content: [{
            type: 'text',
            text: `⚠️ ${result.note}\n\nMessage logged with ID: ${result.messageId}\n\nTo enable Telegram integration:\n1. Create bot via @BotFather on Telegram\n2. Get bot token\n3. Configure at /dashboard/extensions\n4. Set webhook URL\n5. Retry sending message`,
          }],
        };
      }

      return {
        content: [{
          type: 'text',
          text: `✅ Message sent to Telegram chat ${chatId}\nMessage ID: ${result.messageId}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to send Telegram message: ${error.message}`,
        }],
      };
    }
  },
};
