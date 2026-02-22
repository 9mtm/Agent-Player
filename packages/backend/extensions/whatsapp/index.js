/**
 * WhatsApp Extension - New SDK
 * Pure JavaScript - NO TypeScript syntax
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { registerWhatsAppRoutes } from './src/routes.js';
import { whatsappSendTool } from './src/tool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  id: 'whatsapp',
  name: 'WhatsApp',
  version: '2.0.0',

  async register(api) {
    // 1. Run database migrations
    await api.runMigrations([
      join(__dirname, 'migrations', '001_whatsapp_messages.sql'),
    ]);

    // 2. Register API routes (/api/ext/whatsapp/*)
    api.registerRoutes(registerWhatsAppRoutes);

    // 3. Register AI tool
    api.registerTool(whatsappSendTool);

    api.log('info', 'WhatsApp channel ready');
  },

  async onDisable(api) {
    api.unregisterTool('whatsapp_send');
    api.log('info', 'WhatsApp channel disabled');
  },
};
