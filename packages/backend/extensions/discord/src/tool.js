import { sendChannel } from '../../shared/channel-host.js';

export function discordSendTool(api) {
  return {
    name: 'discord_send',
    description: 'Send a plain text message through the configured Discord bot.',
    input_schema: {
      type: 'object',
      properties: { channelId: { type: 'string', description: 'Discord channel ID' }, content: { type: 'string', description: 'Message text' } },
      required: ['channelId', 'content'],
    },
    async execute(params, context) {
      try {
        api.authorizeChannelUser(context?.userId);
        const result = await sendChannel('discord', params.channelId, params.content);
        return { content: [{ type: 'text', text: `Message delivered. ID: ${result.id}` }] };
      } catch {
        return { error: 'Discord delivery failed or access denied', content: [{ type: 'text', text: 'Message was not delivered. Check channel access and connection.' }] };
      }
    },
  };
}
