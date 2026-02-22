/**
 * WhatsApp Send Message Tool - Pure JavaScript
 * Allows AI agents to send WhatsApp messages
 */

export const whatsappSendTool = {
  name: 'whatsapp_send',
  description: 'Send a WhatsApp message. Requires Twilio WhatsApp Business account to be configured.',
  input_schema: {
    type: 'object',
    properties: {
      to: {
        type: 'string',
        description: 'Recipient phone number in E.164 format (e.g., +14155552671)',
      },
      body: {
        type: 'string',
        description: 'Message text to send',
      },
      mediaUrl: {
        type: 'string',
        description: 'Optional URL to media file (image, video, etc.)',
      },
    },
    required: ['to', 'body'],
  },

  async execute(params) {
    const { to, body, mediaUrl } = params;
    const backendUrl = process.env.BACKEND_URL || `http://${process.env.HOST || 'localhost'}:${process.env.PORT || '41522'}`;

    try {
      const response = await fetch(`${backendUrl}/api/ext/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, body, mediaUrl }),
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
            text: `⚠️ ${result.note}\n\nMessage logged with ID: ${result.messageId}\n\nTo enable WhatsApp integration:\n1. Sign up for Twilio account\n2. Get WhatsApp Business API access\n3. Configure Account SID, Auth Token, and WhatsApp number\n4. Set webhook URL at /dashboard/extensions\n5. Retry sending message`,
          }],
        };
      }

      return {
        content: [{
          type: 'text',
          text: `✅ WhatsApp message sent to ${to}${mediaUrl ? ' (with media)' : ''}\nMessage ID: ${result.messageId}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to send WhatsApp message: ${error.message}`,
        }],
      };
    }
  },
};
