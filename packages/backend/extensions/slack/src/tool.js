/**
 * Slack Send Message Tool - Pure JavaScript
 * Allows AI agents to send Slack messages
 */

export const slackSendTool = {
  name: 'slack_send',
  description: 'Send a message to a Slack channel or thread. Requires Slack bot to be configured.',
  input_schema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Slack channel ID (starts with C) or channel name (e.g., #general)',
      },
      text: {
        type: 'string',
        description: 'Message text to send (supports Slack mrkdwn formatting)',
      },
      thread_ts: {
        type: 'string',
        description: 'Optional thread timestamp to reply in a thread',
      },
    },
    required: ['channel', 'text'],
  },

  async execute(params) {
    const { channel, text, thread_ts } = params;
    const backendUrl = process.env.BACKEND_URL || `http://${process.env.HOST || 'localhost'}:${process.env.PORT || '41522'}`;

    try {
      const response = await fetch(`${backendUrl}/api/ext/slack/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, text, thread_ts }),
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
            text: `⚠️ ${result.note}\n\nMessage logged with ID: ${result.messageId}\n\nTo enable Slack integration:\n1. Create a Slack app at https://api.slack.com/apps\n2. Add Bot Token Scopes: chat:write, channels:read, groups:read\n3. Install app to workspace\n4. Configure bot token at /dashboard/extensions\n5. Retry sending message`,
          }],
        };
      }

      return {
        content: [{
          type: 'text',
          text: `✅ Message sent to Slack channel ${channel}${thread_ts ? ' (in thread)' : ''}\nMessage ID: ${result.messageId}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to send Slack message: ${error.message}`,
        }],
      };
    }
  },
};
