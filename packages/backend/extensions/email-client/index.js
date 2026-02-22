/**
 * Email Client Extension
 * Professional email system with multi-account support
 */

export async function activate(api) {
  console.log('[Extension:email-client] Activating...');

  // Register all email routes
  await registerEmailRoutes(api.fastify);

  console.log('[Extension:email-client] ✅ Activated');
}

async function registerEmailRoutes(fastify) {
  // Import all email route modules from core
  // These routes will be available under /api/email/*

  const emailRoutes = await import('../../src/api/routes/email.js');
  const emailAccountsRoutes = await import('../../src/api/routes/email-accounts.js');
  const emailFoldersRoutes = await import('../../src/api/routes/email-folders.js');
  const emailMessagesRoutes = await import('../../src/api/routes/email-messages.js');
  const emailSearchRoutes = await import('../../src/api/routes/email-search.js');
  const emailComposeRoutes = await import('../../src/api/routes/email-compose.js');
  const emailAttachmentsRoutes = await import('../../src/api/routes/email-attachments.js');
  const emailDraftsRoutes = await import('../../src/api/routes/email-drafts.js');

  // Register all routes
  await fastify.register(emailRoutes.registerEmailRoutes);
  await fastify.register(emailAccountsRoutes.default);
  await fastify.register(emailFoldersRoutes.default);
  await fastify.register(emailMessagesRoutes.default);
  await fastify.register(emailSearchRoutes.default);
  await fastify.register(emailComposeRoutes.default);
  await fastify.register(emailAttachmentsRoutes.default);
  await fastify.register(emailDraftsRoutes.default);

  // Start email sync service
  try {
    const { emailSyncService } = await import('../../src/services/email-sync-service.js');
    await emailSyncService.startAllAutoSync();
    console.log('[Extension:email-client] Email sync service started');
  } catch (error) {
    console.error('[Extension:email-client] Failed to start sync service:', error);
  }
}

export async function deactivate(api) {
  console.log('[Extension:email-client] Deactivating...');

  // Stop email sync service
  try {
    const { emailSyncService } = await import('../../src/services/email-sync-service.js');
    await emailSyncService.stopAllAutoSync();
    console.log('[Extension:email-client] Email sync service stopped');
  } catch (error) {
    console.error('[Extension:email-client] Failed to stop sync service:', error);
  }

  console.log('[Extension:email-client] ✅ Deactivated');
}
