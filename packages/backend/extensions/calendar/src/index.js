/**
 * Calendar Extension - Entry Point
 * Pure JavaScript ONLY - NO TypeScript syntax
 */

import { registerCalendarRoutes } from '../../../src/api/routes/calendar.js';
import { startCalendarSync } from '../../../src/services/calendar-sync.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  id: 'calendar',
  name: 'Calendar System',
  version: '1.0.0',

  /**
   * Called when extension is enabled
   * @param {ExtensionApi} api - Extension SDK
   */
  async register(api) {
    // 1. Run database migrations (idempotent)
    await api.runMigrations([
      join(__dirname, '../migrations/001_calendar_tables.sql'),
      join(__dirname, '../migrations/002_calendar_permissions.sql'),
    ]);

    // 2. Register calendar API routes (uses existing TypeScript routes)
    api.registerRoutes(async (fastify) => {
      // Import and register existing calendar routes
      await registerCalendarRoutes(fastify);
      api.log('info', 'Calendar routes registered');
    });

    // 3. Start calendar sync service
    startCalendarSync();

    api.log('info', 'Calendar Extension ready');
  },

  /**
   * Called when extension is disabled
   * @param {ExtensionApi} api - Extension SDK
   */
  async onDisable(api) {
    api.log('info', 'Calendar Extension disabled');
  },
};
