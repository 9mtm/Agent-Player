/**
 * Team Extension - Entry Point
 * Pure JavaScript ONLY - NO TypeScript syntax
 */

import { registerTeamRoutes } from '../../../src/api/routes/team.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  id: 'team',
  name: 'Team Management',
  version: '1.0.0',

  /**
   * Called when extension is enabled
   * @param {ExtensionApi} api - Extension SDK
   */
  async register(api) {
    // 1. Run database migrations (idempotent)
    await api.runMigrations([
      join(__dirname, '../migrations/001_team_tables.sql'),
    ]);

    // 2. Register team API routes (uses existing TypeScript routes)
    api.registerRoutes(async (fastify) => {
      // Import and register existing team routes
      await registerTeamRoutes(fastify);
      api.log('info', 'Team routes registered');
    });

    api.log('info', 'Team Extension ready');
  },

  /**
   * Called when extension is disabled
   * @param {ExtensionApi} api - Extension SDK
   */
  async onDisable(api) {
    api.log('info', 'Team Extension disabled');
  },
};
