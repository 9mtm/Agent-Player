/**
 * Discord Send Message Tool - Pure JavaScript
 * Allows AI agents to send Discord messages
 */

export const discordSendTool = {
  name: 'discord_send',
  description: 'Send a message to a Discord channel. Requires Discord bot to be configured.',
  input_schema: {
    type: 'object',
    properties: {
      channelId: {
        type: 'string',
        description: 'Discord channel ID (18-digit number)',
      },
      content: {
        type: 'string',
        description: 'Message content to send',
      },
      guildId: {
        type: 'string',
        description: 'Optional Discord server (guild) ID',
      },
    },
    required: ['channelId', 'content'],
  },

  async execute(params) {
    const { channelId, content, guildId } = params;
    const backendUrl = process.env.BACKEND_URL || `http://${process.env.HOST || 'localhost'}:${process.env.PORT || '41522'}`;

    try {
      const response = await fetch(`${backendUrl}/api/ext/discord/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, content, guildId }),
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
            text: `⚠️ ${result.note}\n\nMessage logged with ID: ${result.messageId}\n\nTo enable Discord integration:\n1. Create a Discord bot at https://discord.com/developers/applications\n2. Configure bot token at /dashboard/extensions\n3. Add bot to your server\n4. Retry sending message`,
          }],
        };
      }

      return {
        content: [{
          type: 'text',
          text: `✅ Message sent to Discord channel ${channelId}\nMessage ID: ${result.messageId}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to send Discord message: ${error.message}`,
        }],
      };
    }
  },
};
