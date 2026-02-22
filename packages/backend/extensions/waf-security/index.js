/**
 * WAF Security Scanner Extension
 * Entry point - pure JavaScript only
 */

import { registerWafRoutes } from './src/routes.js';
import { wafScanTool } from './src/tool.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  id: 'waf-security',
  name: 'WAF Security Scanner',
  version: '1.0.0',

  async register(api) {
    // 1. Run database migrations (idempotent)
    await api.runMigrations([
      join(__dirname, 'migrations', '001_waf_scans.sql'),
    ]);

    // 2. Register routes under /api/ext/waf/
    api.registerRoutes(registerWafRoutes);

    // 3. Register AI agent tool
    api.registerTool(wafScanTool);

    api.log('info', 'WAF Security Scanner ready');
  },

  async onDisable(api) {
    // Cleanup when extension is disabled
    api.unregisterTool('waf_scan');
    api.log('info', 'WAF Security Scanner disabled');
  },
};
