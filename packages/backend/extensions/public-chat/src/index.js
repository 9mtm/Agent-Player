/**
 * Public Chat Extension - Entry Point
 * Pure JavaScript ONLY - NO TypeScript syntax
 */

import { registerPublicChatRoutes } from '../../../src/api/routes/public-chat.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  id: 'public-chat',
  name: 'Public Chat Rooms',
  version: '1.0.0',

  /**
   * Called when extension is enabled
   * @param {ExtensionApi} api - Extension SDK
   */
  async register(api) {
    // 1. Run database migrations (idempotent)
    await api.runMigrations([
      join(__dirname, '../migrations/001_public_chat_tables.sql'),
    ]);

    // 2. Register public chat API routes (uses existing TypeScript routes)
    api.registerRoutes(async (fastify) => {
      // Import and register existing public chat routes
      await registerPublicChatRoutes(fastify);
      api.log('info', 'Public Chat routes registered');
    });

    api.log('info', 'Public Chat Extension ready');
  },

  /**
   * Called when extension is disabled
   * @param {ExtensionApi} api - Extension SDK
   */
  async onDisable(api) {
    api.log('info', 'Public Chat Extension disabled');
  },
};
