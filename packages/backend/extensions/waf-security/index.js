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
    // 1. Run database migrations (idempotent) - Phase 1, 2 & 3
    await api.runMigrations([
      join(__dirname, 'migrations', '001_waf_scans.sql'),
      join(__dirname, 'migrations', '002_waf_user_isolation.sql'),
      join(__dirname, 'migrations', '003_waf_payload_library.sql'),
      join(__dirname, 'migrations', '004_waf_campaigns.sql'),
    ]);

    // 2. Register routes under /api/ext/waf/
    api.registerRoutes(registerWafRoutes);

    // 3. Register AI agent tool
    api.registerTool(wafScanTool);

    // 4. Register scheduled campaign processor (runs every hour)
    if (api.registerCronJob) {
      const { processScheduledCampaigns } = await import('./src/campaign-service.js');

      api.registerCronJob({
        name: 'waf-campaign-scheduler',
        schedule: '0 * * * *', // Every hour at minute 0
        handler: async () => {
          const db = api.getDatabase();
          const executed = await processScheduledCampaigns(db);
          if (executed > 0) {
            api.log('info', `Executed ${executed} scheduled WAF campaigns`);
          }
        },
      });
    }

    api.log('info', 'WAF Security Scanner ready (100 payloads, campaign system enabled)');
  },

  async onDisable(api) {
    // Cleanup when extension is disabled
    api.unregisterTool('waf_scan');
    api.log('info', 'WAF Security Scanner disabled');
  },
};
