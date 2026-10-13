// CRITICAL: Load .env FIRST before ANY imports (including type imports)
import { config as loadEnv } from 'dotenv';
loadEnv();

// SECURITY: Default to production mode if NODE_ENV not set (L-04)
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
  console.warn('[Security] NODE_ENV not set - defaulting to production mode');
}

/**
 * Agent Player Backend Server
 * Fastify-based REST API
 */

import { buildServer } from './app.js';
import { processScheduledNotifications } from '../services/notification-service.js';
import { startCalendarSyncScheduler } from '../services/calendar-sync.js';
import { config } from '../config/index.js';

const PORT = config.port;
const HOST = config.host;

const fastify = await buildServer();

// Start server
async function start() {
  try {
    console.log('[Server] 🚀 Initializing backend systems...\n');

    // Initialize Database
    const { initializeDatabase, getDatabase } = await import('../db/index.js');
    await initializeDatabase();
    const db = getDatabase();
    // Decorate Fastify instance with database for extensions to use
    fastify.decorate('db', db);
    console.log('[Server] ✅ Database initialized\n');

    // Seed database in development mode
    if (process.env.NODE_ENV === 'development') {
      const { seedDatabase } = await import('../db/seed.js');
      await seedDatabase();
    }

    // Initialize Skills Registry
    const { getSkillsRegistry } = await import('../skills/registry.js');
    const skillsRegistry = getSkillsRegistry();
    await skillsRegistry.load(['./skills']);
    skillsRegistry.watch(); // Enable hot reload
    console.log(`[Server] ✅ Loaded ${skillsRegistry.getAll().length} skills\n`);

    // Start cron engine
    const { getCronEngine } = await import('../scheduler/engine.js');
    const cronEngine = getCronEngine();
    await cronEngine.start();

    // Initialize Memory System
    const { getMemoryStorage } = await import('../memory/index.js');
    const memoryStorage = getMemoryStorage();
    await memoryStorage.initialize();
    console.log('[Server] ✅ Memory system initialized\n');

    // Initialize Credentials System
    const { getCredentialStorage } = await import('../credentials/index.js');
    const credentialStorage = getCredentialStorage();
    await credentialStorage.initialize();
    console.log('[Server] ✅ Credentials system initialized\n');

    // SECURITY (S1.1): move plaintext agents_config.api_key values into
    // encrypted credentials (verified round-trip; refused without ENCRYPTION_KEY).
    const { migrateAgentApiKeys } = await import('../credentials/authority.js');
    await migrateAgentApiKeys();

    // Initialize Multi-Interface Gateway
    const { getGateway, WebChannelAdapter, DesktopChannelAdapter } = await import('../gateway/index.js');
    const { AgentRuntime } = await import('../agent/index.js');

    // Create agent runtime instance for gateway (uses default config)
    const agentRuntime = new AgentRuntime();

    const gateway = getGateway(agentRuntime, {
      storageDir: './.data/gateway',
      sessionTimeout: 3600000, // 1 hour
      syncAcrossChannels: true
    });

    // Register channel adapters
    await gateway.registerChannel(new WebChannelAdapter());
    await gateway.registerChannel(new DesktopChannelAdapter());

    // Start gateway
    await gateway.start();
    console.log('[Server] ✅ Gateway initialized with 2 channels\n');

    // Initialize Telephony Service (Twilio + Google Voice)
    const { initializeTelephonyService } = await import('../services/telephony-service.js');
    await initializeTelephonyService();
    console.log('[Server] ✅ Telephony service initialized\n');

    // Initialize Inbox System
    const { createInboxSystem } = await import('../inbox/index.js');
    const inboxSystem = createInboxSystem(db);

    // Attach to fastify instance for routes
    fastify.decorate('inboxGateway', inboxSystem.inboxGateway);
    fastify.decorate('messageStore', inboxSystem.messageStore);
    fastify.decorate('riskAnalyzer', inboxSystem.riskAnalyzer);
    fastify.decorate('approvalEngine', inboxSystem.approvalEngine);

    console.log('[Server] ✅ Inbox system initialized\n');

    // Register inbox routes (after initialization)
    const { inboxRoutes } = await import('./routes/inbox.js');
    await fastify.register(inboxRoutes); // 📥 Inbox System
    console.log('[Inbox API] ✅ Routes registered\n');

    // Initialize Sandbox System
    const { getSandboxExecutor, getDockerManager } = await import('../sandbox/index.js');
    const sandboxExecutor = getSandboxExecutor();
    const dockerManager = getDockerManager();
    const dockerAvailable = await dockerManager.isDockerAvailable();
    console.log(`[Server] ✅ Sandbox initialized (Docker: ${dockerAvailable ? 'Available' : 'Not Available'})\n`);

    // Initialize Audit System
    const { initializeAudit, getAuditLogger } = await import('../audit/index.js');
    const { logger: auditLogger } = await initializeAudit();
    auditLogger.log({
      category: 'system',
      action: 'startup',
      severity: 'low',
      actor: { type: 'system', id: 'server' },
      details: { version: '0.1.0', port: PORT },
      result: 'success',
    });
    console.log('[Server] ✅ Audit system initialized\n');

    // Initialize Encryption System
    const { initializeEncryption } = await import('../encryption/index.js');
    const { keyManager, vault } = await initializeEncryption();
    console.log('[Server] ✅ Encryption system initialized\n');

    // Initialize Heartbeat System
    const { initializeHeartbeat, sendHeartbeat } = await import('../heartbeat/index.js');
    const heartbeatMonitor = await initializeHeartbeat();
    console.log('[Server] ✅ Heartbeat system initialized\n');

    // Initialize Webhooks System
    const { initializeWebhooks } = await import('../webhooks/index.js');
    const { manager: webhookManager } = await initializeWebhooks();
    console.log('[Server] ✅ Webhooks system initialized\n');

    // Initialize Multi-Agent System
    const { initializeMultiAgent, getOrchestrator } = await import('../multi-agent/index.js');
    const multiAgentOrchestrator = getOrchestrator();
    await multiAgentOrchestrator.initialize();
    const { orchestrator: agentOrchestrator, messaging: agentMessaging } = await initializeMultiAgent();
    console.log('[Server] ✅ Multi-Agent system initialized\n');

    // Initialize Browser Automation System
    const { initializeBrowser } = await import('../browser/index.js');
    const { controller: browserController } = await initializeBrowser();
    console.log('[Server] ✅ Browser automation initialized\n');

    // Desktop cleanup on startup — kill any leftover indicator window and restore cursor
    // (handles the case where backend restarted without hide_indicator being called)
    try {
      const { createToolsRegistry } = await import('../tools/index.js');
      const startupRegistry = createToolsRegistry({ userId: 'system', sessionId: 'startup', workspaceDir: process.cwd() });
      await startupRegistry.execute('desktop_control', { action: 'hide_indicator' });
      console.log('[Server] ✅ Desktop cleanup: indicator hidden, cursor restored\n');
    } catch {
      // Silently ignore — pyautogui may not be installed, that is fine
    }

    // Initialize Storage System (Cache + CDN)
    const { getStorageManager } = await import('../services/storage-manager.js');
    const storageManager = getStorageManager();
    await storageManager.initialize();
    const { deleted: expiredCleaned } = storageManager.cleanup();
    if (expiredCleaned > 0) console.log(`[StorageManager] 🧹 Cleaned ${expiredCleaned} expired files on startup`);
    console.log('[Server] ✅ Storage system initialized\n');

    // Initialize Agent Cron Service
    const { startAgentCronService } = await import('../services/agent-cron.js');
    await startAgentCronService();

    // Scheduled notifications — check every minute
    setInterval(() => {
      try { processScheduledNotifications(); } catch { /* non-fatal */ }
    }, 60_000);

    // Initialize Calendar Sync Scheduler
    startCalendarSyncScheduler();
    console.log('[Server] ✅ Calendar sync scheduler started\n');

    // Initialize Extension Storage Stats Scheduler (hourly updates)
    const { updateAllExtensionStorageStats } = await import('../services/extension-analytics.js');
    setInterval(() => {
      try {
        updateAllExtensionStorageStats();
      } catch (err) {
        console.error('[Extension Analytics] Failed to update storage stats:', err);
      }
    }, 60 * 60 * 1000); // Every 60 minutes
    console.log('[Server] ✅ Extension analytics scheduler started (hourly storage updates)\n');

    // Initialize Multi-Tier Memory Consolidation Scheduler
    const { getConsolidationService } = await import('../services/memory-consolidation.js');
    const consolidationService = getConsolidationService();
    consolidationService.startScheduler();
    console.log('[Server] ✅ Memory consolidation scheduler started (runs daily at 3 AM)\n');

    // Initialize Agent Evolution Scheduler
    const { initializeEvolutionScheduler } = await import('../services/agent-evolution-scheduler.js');
    await initializeEvolutionScheduler();
    console.log('[Server] ✅ Agent evolution scheduler initialized\n');

    // Initialize Extension System
    const { getExtensionRunner } = await import('../plugins/extension-runner.js');
    const extensionRunner = getExtensionRunner();
    await extensionRunner.initialize(fastify, cronEngine);

    // Enable hot reload for extensions (development mode)
    if (process.env.NODE_ENV === 'development') {
      extensionRunner.enableHotReload();
    }

    // Register Extension Analytics Middleware
    const { extensionAnalyticsMiddleware } = await import('../middleware/extension-analytics-middleware.js');
    const { recordApiCall } = await import('../services/extension-analytics.js');

    fastify.addHook('onRequest', extensionAnalyticsMiddleware());

    // Record analytics on response
    fastify.addHook('onResponse', async (request, reply) => {
      const extensionId = (request as any).__analyticsExtensionId;
      const startTime = (request as any).__analyticsStartTime;

      if (!extensionId || !startTime) return;

      const responseTime = Date.now() - startTime;
      const success = reply.statusCode < 400;

      recordApiCall(extensionId, {
        success,
        responseTimeMs: responseTime,
        errorType: success ? undefined : `HTTP ${reply.statusCode}`,
      });
    });

    console.log('[Server] ✅ Extension analytics middleware registered\n');

    // Email Sync Service moved to email-client extension
    // const { emailSyncService } = await import('../services/email-sync-service.js');
    // await emailSyncService.startAllAutoSync();
    // console.log('[Server] ✅ Email sync service initialized\n');

    await fastify.listen({ port: PORT, host: HOST });

    // Check Python availability for audio features
    let pythonStatus = '❌ Not found';
    try {
      const { execSync } = await import('child_process');
      const pythonPaths = [
        `${process.env.LOCALAPPDATA}\\Programs\\Python\\Python312\\python.exe`,
        `${process.env.LOCALAPPDATA}\\Programs\\Python\\Python311\\python.exe`,
        'python', 'py',
      ];
      for (const p of pythonPaths) {
        try {
          const ver = execSync(`"${p}" --version 2>&1`, { timeout: 2000 }).toString().trim();
          pythonStatus = `✅ ${ver}`;
          break;
        } catch { /* try next */ }
      }
    } catch { /* ignore */ }

    console.log(`
╔══════════════════════════════════════════════════════╗
║            Agent Player Backend v1.3.0               ║
╠══════════════════════════════════════════════════════╣
║  🌐 Frontend:  ${config.frontendUrl.padEnd(32)}║
║  ⚙️  Backend:   http://${HOST}:${PORT}${' '.repeat(Math.max(0, 32 - (HOST.length + PORT.toString().length + 10)))}║
║  📖 API Docs:  http://${HOST}:${PORT}/docs${' '.repeat(Math.max(0, 26 - (HOST.length + PORT.toString().length + 10)))}║
║  💚 Health:    http://${HOST}:${PORT}/health${' '.repeat(Math.max(0, 24 - (HOST.length + PORT.toString().length + 10)))}║
╠══════════════════════════════════════════════════════╣
║  📦 Skills:       ${String(skillsRegistry.getAll().length).padEnd(2)} loaded                        ║
║  ⏰ Jobs:         ${String(cronEngine.getJobs().length).padEnd(2)} scheduled                    ║
║  🧠 Memory:       Ready                              ║
║  🔐 Credentials:  Ready                              ║
║  🌐 Gateway:      ${String(gateway.getStats().channelCount).padEnd(2)} channels active              ║
║  🐳 Sandbox:      ${(dockerAvailable ? 'Docker Ready   ' : 'Native Mode    ')}                ║
║  🛡️  Audit:        Active                             ║
║  🔒 Encryption:   Ready                              ║
║  💓 Heartbeat:    Monitoring                         ║
║  🪝 Webhooks:     Ready                              ║
║  🤖 Multi-Agent:  Ready                              ║
║  🌐 Browser:      Ready                              ║
║  📦 Storage:      Ready (Cache + CDN)                ║
║  ⏱️  Agent Cron:  Ready                              ║
╠══════════════════════════════════════════════════════╣
║  🎙️  Python/TTS:   ${pythonStatus.padEnd(33)}║
╠══════════════════════════════════════════════════════╣
║  📁 Project:  C:\\MAMP\\htdocs\\agent\\agent_player     ║
║  🗄️  Database: packages/backend/.data/agent-player.db ║
╚══════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

let shuttingDown = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    const deadline = setTimeout(() => process.exit(1), 20000);
    deadline.unref();
    try {
      // Closing Fastify runs channel transport shutdown hooks before process exit.
      await fastify.close();
      process.exit(0);
    } catch {
      process.exit(1);
    }
  });
}

start();

export default fastify;
