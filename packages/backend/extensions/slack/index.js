/**
 * Slack Extension - New SDK
 * Pure JavaScript - NO TypeScript syntax
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { registerSlackRoutes } from './src/routes.js';
import { slackSendTool } from './src/tool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  id: 'slack',
  name: 'Slack',
  version: '2.0.0',

  async register(api) {
    // 1. Run database migrations
    await api.runMigrations([
      join(__dirname, 'migrations', '001_slack_messages.sql'),
    ]);

    // 2. Register API routes (/api/ext/slack/*)
    api.registerRoutes(registerSlackRoutes);

    // 3. Register AI tool
    api.registerTool(slackSendTool);

    api.log('info', 'Slack channel ready');
  },

  async onDisable(api) {
    api.unregisterTool('slack_send');
    api.log('info', 'Slack channel disabled');
  },
};
