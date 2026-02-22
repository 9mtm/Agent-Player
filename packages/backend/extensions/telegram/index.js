/**
 * Telegram Extension - New SDK
 * Pure JavaScript - NO TypeScript syntax
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { registerTelegramRoutes } from './src/routes.js';
import { telegramSendTool } from './src/tool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  id: 'telegram',
  name: 'Telegram',
  version: '2.0.0',

  async register(api) {
    // 1. Run database migrations
    await api.runMigrations([
      join(__dirname, 'migrations', '001_telegram_messages.sql'),
    ]);

    // 2. Register API routes (/api/ext/telegram/*)
    api.registerRoutes(registerTelegramRoutes);

    // 3. Register AI tool
    api.registerTool(telegramSendTool);

    api.log('info', 'Telegram bot ready');
  },

  async onDisable(api) {
    api.unregisterTool('telegram_send');
    api.log('info', 'Telegram bot disabled');
  },
};
