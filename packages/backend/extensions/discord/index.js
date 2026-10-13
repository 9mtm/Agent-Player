/**
 * Discord Extension - New SDK
 * Pure JavaScript - NO TypeScript syntax
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { registerDiscordRoutes } from './src/routes.js';
import { discordSendTool } from './src/tool.js';
import { stopChannel } from '../shared/channel-host.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  id: 'discord',
  name: 'Discord',
  version: '2.1.0',

  async register(api) {
    // 1. Run database migrations
    await api.runMigrations([
      join(__dirname, 'migrations', '001_discord_messages.sql'),
    ]);

    // 2. Register API routes (/api/ext/discord/*)
    api.registerRoutes(scope => registerDiscordRoutes(scope, api));

    // 3. Register AI tool
    api.registerTool(discordSendTool(api));

    api.log('info', 'Discord channel ready');
  },

  async onDisable(api) {
    await stopChannel('discord');
    api.unregisterTool('discord_send');
    api.log('info', 'Discord channel disabled');
  },
};
