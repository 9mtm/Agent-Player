import { sendChannel } from '../../shared/channel-host.js';

export function telegramSendTool(api) {
  return {
    name: 'telegram_send',
    description: 'Send a plain text message through the configured Telegram bot.',
    input_schema: {
      type: 'object',
      properties: { chatId: { type: 'string', description: 'Telegram chat ID' }, text: { type: 'string', description: 'Message text' } },
      required: ['chatId', 'text'],
    },
    async execute(params, context) {
      try {
        api.authorizeChannelUser(context?.userId);
        const result = await sendChannel('telegram', params.chatId, params.text);
        return { content: [{ type: 'text', text: `Message delivered. ID: ${result.id}` }] };
      } catch {
        return { error: 'Telegram delivery failed or access denied', content: [{ type: 'text', text: 'Message was not delivered. Check channel access and connection.' }] };
      }
    },
  };
}
