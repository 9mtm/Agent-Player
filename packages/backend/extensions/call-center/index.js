/**
 * Call Center Extension
 * AI-powered telephony with Twilio/Google Voice integration
 * Entry point - pure JavaScript only
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  id: 'call-center',
  name: 'Call Center',
  version: '1.0.0',

  async register(api) {
    api.log('info', '[Call Center] 📞 Initializing extension...');

    // 1. Run database migrations
    await api.runMigrations([
      join(__dirname, 'migrations', '001_telephony_system.sql'),
    ]);

    // 2. Register telephony routes
    const { registerCallCenterRoutes } = await import('./src/routes.js');
    api.registerRoutes(registerCallCenterRoutes);

    // 3. Register AI agent tools
    const { makeCallTool, hangupCallTool } = await import('./src/tools.js');
    api.registerTool(makeCallTool);
    api.registerTool(hangupCallTool);

    // 4. Initialize telephony services
    const { initializeTelephonyService } = await import('./src/service.js');
    await initializeTelephonyService();

    api.log('info', '[Call Center] ✅ Extension ready - Telephony system online');
  },

  async onDisable(api) {
    // Cleanup when extension is disabled
    api.unregisterTool('make_call');
    api.unregisterTool('hangup_call');

    api.log('info', '[Call Center] ❌ Extension disabled');
  },

  // Extension metadata for UI
  getMetadata() {
    return {
      displayName: 'Call Center',
      description: 'AI-powered call center with full telephony capabilities',
      icon: 'phone',
      color: '#10b981', // green-600
      category: 'channel',
      providers: ['Twilio', 'Google Voice'],
      features: [
        'Inbound call handling',
        'Outbound call initiation',
        'IVR menu builder',
        'Call recording & transcription',
        'AI agent integration',
        'Workflow automation',
        'Multi-language support',
        'Business hours routing',
      ],
      dashboardUrl: '/dashboard/call-center',
      settingsRequired: true,
      credentialsRequired: ['Twilio Account SID', 'Twilio Auth Token'],
    };
  },
};
