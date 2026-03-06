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

import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { sessionsRoutes } from './routes/sessions.js';
import { modelsRoutes } from './routes/models.js';
import { chatRoutes } from './routes/chat.js';
import { smartChatRoutes } from './routes/smart-chat.js';
import { settingsRoutes } from './routes/settings.js';
import { agentsStatusRoutes } from './routes/agents-status.js';
import { pluginsRoutes } from './routes/plugins.js';
import { channelsRoutes } from './routes/channels.js';
import { skillsRoutes } from './routes/skills.js';
import { schedulerRoutes } from './routes/scheduler.js';
import { memoryRoutes } from './routes/memory.js';
import { credentialsRoutes } from './routes/credentials.js';
import { onboardingRoutes } from './routes/onboarding.js';
import { gatewayRoutes } from './routes/gateway.js';
import { authRoutes } from './routes/auth.js';
import { databaseRoutes } from './routes/database.js';
import { workflowRoutes } from './routes/workflows.js';
import { sandboxRoutes } from './routes/sandbox.js';
import { auditRoutes } from './routes/audit.js';
import { encryptionRoutes } from './routes/encryption.js';
import { heartbeatRoutes } from './routes/heartbeat.js';
import { webhooksRoutes } from './routes/webhooks.js';
import { multiAgentRoutes } from './routes/multi-agent.js';
import { browserRoutes } from './routes/browser.js';
import { inboxRoutes } from './routes/inbox.js';
import { registerAudioRoutes } from './routes/audio.js';
import { registerAvatarRoutes } from './routes/avatar.js';
import { agentsConfigRoutes } from './routes/agents-config.js';
import { storageRoutes } from './routes/storage.js';
import { claudeLocalRoutes } from './routes/claude-local.js';
import { aiToolsRoutes } from './routes/ai-tools.js';
import { cameraRoutes } from './routes/camera.js';
import { profileRoutes } from './routes/profile.js';
import { notificationsRoutes } from './routes/notifications.js';
import { registerTeamRoutes } from './routes/team.js';
// Email routes moved to email-client extension
// import { registerEmailRoutes } from './routes/email.js';
// import emailAccountsRoutes from './routes/email-accounts.js';
// import emailFoldersRoutes from './routes/email-folders.js';
// import emailMessagesRoutes from './routes/email-messages.js';
// import emailSearchRoutes from './routes/email-search.js';
// import emailComposeRoutes from './routes/email-compose.js';
// import emailAttachmentsRoutes from './routes/email-attachments.js';
// import emailDraftsRoutes from './routes/email-drafts.js';
import { worldsRoutes } from './routes/worlds.js';
import { multiverseRoutes } from './routes/multiverse.js';
import { worldBotsRoutes } from './routes/world-bots.js';
import { worldGeneratorRoutes } from './routes/world-generator.js';
import { worldBuilderRoutes } from './routes/world-builder.js';
import { extensionsRoutes } from './routes/extensions.js';
import { systemRoutes } from './routes/system.js';
import { registerTelephonyRoutes } from './routes/telephony.js';
import { agentFilesRoutes } from './routes/agent-files.js';
import { registerDashboardRoutes } from './routes/dashboard.js';
import { registerCalendarRoutes } from './routes/calendar.js';
import { registerPublicChatRoutes } from './routes/public-chat.js';
import { registerCostAnalyticsRoutes } from './routes/cost-analytics.js';
import evolutionRoutes from './routes/evolution.js';
import evaluationRoutes from './routes/evaluation.js';
import memorySharingRoutes from './routes/memory-sharing.js';
import memoryQualityRoutes from './routes/memory-quality.js';
import setupRoutes from './routes/setup.js';
import { marketplaceRoutes } from './routes/marketplace.js';
import { processScheduledNotifications } from '../services/notification-service.js';
import { startCalendarSyncScheduler } from '../services/calendar-sync.js';
import { config } from '../config/index.js';
import { registerCsrfProtection } from '../middleware/csrf-protection.js';
import { registerHttpsEnforcement } from '../middleware/https-enforcement.js';

const PORT = config.port;
const HOST = config.host;

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname'
      }
    }
  }
});

// Register CORS — SECURITY: Restrict to allowed origins only
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:41521').split(',').map(o => o.trim());
await fastify.register(cors, {
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
});

// Register Multipart (for file uploads - audio transcription)
await fastify.register(multipart, {
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// SECURITY: Register rate limiting
await fastify.register(rateLimit, {
  global: false, // Don't apply to all routes by default
  max: 100, // Global default: 100 requests
  timeWindow: '1 minute' // Per minute
});

// SECURITY: Register helmet for security headers (M-05)
await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for local dev
});

// SECURITY: Register CSRF protection middleware (M-01)
// Validates Origin/Referer headers for state-changing requests
registerCsrfProtection(fastify);

// SECURITY: Register HTTPS enforcement middleware (L-01)
// Redirects HTTP to HTTPS in production mode
registerHttpsEnforcement(fastify);

// Serve static files from public folder (avatars, backgrounds, worlds, etc.)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', '..', '..', '..', 'public');

await fastify.register(fastifyStatic, {
  root: publicDir,
  prefix: '/', // Serve files at root level (e.g., /avatars/user/1/abc/avatar.glb)
});

fastify.log.info(`[Server] ✅ Static files served from: ${publicDir}`);

// Register Swagger Documentation
const { registerSwagger } = await import('../docs/swagger.js');
await registerSwagger(fastify);

// Health check
fastify.get('/health', {
  schema: {
    tags: ['Health'],
    summary: 'Health check endpoint',
    description: 'Returns the current health status of the API server',
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'degraded', 'error'] },
          timestamp: { type: 'string', format: 'date-time' },
          version: { type: 'string' },
        },
      },
    },
  },
}, async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '0.1.0'
}));

// Root route
fastify.get('/', {
  schema: {
    tags: ['Health'],
    summary: 'API information',
    description: 'Returns basic information about the API',
    response: {
      200: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          version: { type: 'string' },
          docs: { type: 'string', description: 'Documentation URL' },
        },
      },
    },
  },
}, async () => ({
  name: 'Agent Player Backend',
  version: '0.1.0',
  docs: '/docs'
}));

// Register routes
await fastify.register(setupRoutes); // 🛠️ Setup Wizard (First-Time Installation)
await fastify.register(authRoutes); // 🔐 Authentication
await fastify.register(databaseRoutes); // 🗄️ Database Management (Stats, Backups, Vacuum)
await fastify.register(workflowRoutes); // ⚡ Workflow Builder
await fastify.register(sessionsRoutes);
await fastify.register(modelsRoutes);
await fastify.register(chatRoutes);
await fastify.register(smartChatRoutes); // 🧠 Smart Agent System
await fastify.register(settingsRoutes); // ⚙️ Settings API
await fastify.register(agentsStatusRoutes); // 📊 Agents Status
await fastify.register(pluginsRoutes); // 🔌 Plugins System
await fastify.register(channelsRoutes); // 📱 Channels System
await fastify.register(skillsRoutes); // 🛠️ Skills System
await fastify.register(schedulerRoutes); // ⏰ Scheduler System
await fastify.register(memoryRoutes); // 🧠 Memory System
await fastify.register(credentialsRoutes); // 🔐 Credentials System
await fastify.register(onboardingRoutes); // 🎯 Onboarding Wizard
await fastify.register(gatewayRoutes); // 🌐 Multi-Interface Gateway
await fastify.register(sandboxRoutes); // 🐳 Docker Sandbox System
await fastify.register(auditRoutes); // 🛡️ Security Audit System
await fastify.register(encryptionRoutes); // 🔒 Encryption & Vault
await fastify.register(heartbeatRoutes); // 💓 Heartbeat Monitor
await fastify.register(webhooksRoutes); // 🪝 Webhooks System
await fastify.register(multiAgentRoutes); // 🤖 Multi-Agent System
await fastify.register(browserRoutes); // 🌐 Browser Automation
await fastify.register(registerAudioRoutes); // 🎤 Audio (Whisper STT + TTS)
await fastify.register(registerAvatarRoutes); // 🧑‍🎨 Avatar Settings (Ready Player Me)
await fastify.register(agentsConfigRoutes);  // 🤖 Agent Configurations CRUD
await fastify.register(storageRoutes);       // 📦 Local Storage (Cache + CDN)
await fastify.register(claudeLocalRoutes);   // 🔗 Claude Local Integration
await fastify.register(aiToolsRoutes);       // 🔍 AI Tools Scanner
await fastify.register(cameraRoutes);        // 📷 Camera Sessions + WebRTC Signaling
await fastify.register(profileRoutes);       // 👤 User Profile (GET/PUT /api/profile)
await fastify.register(notificationsRoutes); // 🔔 Notifications (CRUD + Settings + Schedules)
await fastify.register(registerTeamRoutes);     // 👥 Team Management (Teams, Members, Invitations)
// Email routes moved to email-client extension (install via /dashboard/extensions)
// await fastify.register(registerEmailRoutes);    // 📧 Email Configuration (SMTP Test + Verify)
// await fastify.register(emailAccountsRoutes);    // 📬 Email Accounts (Multi-Account IMAP/SMTP + OAuth)
// await fastify.register(emailFoldersRoutes);     // 📁 Email Folders (List, Create, Update, Delete)
// await fastify.register(emailMessagesRoutes);    // 📨 Email Messages (List, Read, Star, Delete, Move, Bulk)
// await fastify.register(emailSearchRoutes);      // 🔍 Email Search (FTS5 Full-Text Search)
// await fastify.register(emailComposeRoutes);     // ✉️  Email Compose (Send, Reply, Forward)
// await fastify.register(emailAttachmentsRoutes); // 📎 Email Attachments (Upload, Download)
// await fastify.register(emailDraftsRoutes);      // 📝 Email Drafts (Auto-Save, CRUD)
// await fastify.register(worldsRoutes);           // 🌍 Interactive 3D Worlds (DEPRECATED - merged into multiverseRoutes)
await fastify.register(multiverseRoutes);    // 🪐 Multiverse (Worlds + Bots + System Worlds)
// await fastify.register(worldBotsRoutes);     // 🤖 World Bots (DEPRECATED - merged into multiverseRoutes)
await fastify.register(worldGeneratorRoutes); // ✨ AI World Generator (Prompt-based Generation)
await fastify.register(worldBuilderRoutes);     // 🏗️  World Builder (Manual Building + Save/Load)
await fastify.register(extensionsRoutes);    // 🔌 Extensions Management (SDK-based)
await fastify.register(marketplaceRoutes);   // 🛒 Extension Marketplace (Registry, Install, Reviews)
await fastify.register(registerTelephonyRoutes); // ☎️ Telephony / Assistant Center (Call Center)
await fastify.register(systemRoutes);        // ⚙️ System Operations (Restart, Shutdown)
await fastify.register(agentFilesRoutes);    // 📝 Agent Files (PERSONALITY.md + MEMORY.md)
await fastify.register(registerDashboardRoutes); // 📊 Customizable Dashboard (Widgets + Layouts)
await fastify.register(registerCalendarRoutes);  // 📅 Calendar System (Events + Google Calendar Sync)
await fastify.register(registerPublicChatRoutes); // 💬 Public Chat Rooms (Multi-User Chat with AI Agents)
await fastify.register(registerCostAnalyticsRoutes); // 💰 Cost Analytics (Model Usage & Savings Tracking)
await fastify.register(evolutionRoutes);        // 🧬 Agent Evolution System (Self-Learning & Adaptation)
await fastify.register(evaluationRoutes);       // 📊 Agent Evaluation Framework (Quality Assessment & Metrics)
await fastify.register(memorySharingRoutes);    // 🤝 Multi-Agent Memory Sharing (Shared Knowledge & Deduplication)
await fastify.register(memoryQualityRoutes);    // ✨ High-Quality Memory Content (Quality Scoring & Enrichment)

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

start();

export default fastify;
