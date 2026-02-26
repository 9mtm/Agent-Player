/**
 * Extension SDK
 * Provides ExtensionApi interface for extensions to register routes, tools, migrations, cron jobs, etc.
 */

import type { FastifyInstance } from 'fastify';
import type { Database } from 'better-sqlite3';
import type { Tool } from '../tools/types.js';
import { registerExtensionTool, unregisterExtensionTool } from '../tools/index.js';
import { getDatabase } from '../db/index.js';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, sep } from 'path';

/**
 * Extension SDK API Interface
 * Extensions receive this interface when their register() hook is called
 */
export interface ExtensionApi {
  // Route registration — routes registered at startup, mounted under /api/ext/:extensionId/
  registerRoutes(routesFn: (fastify: FastifyInstance) => Promise<void>, prefix?: string): void;

  // Tool registration — dynamic, available immediately to AI agents
  registerTool(tool: Tool): void;
  unregisterTool(name: string): void;

  // Dashboard widget registration — extensions can add custom dashboard widgets
  registerDashboardWidget(widget: {
    id: string;
    name: string;
    description?: string;
    component: 'stats' | 'chart' | 'list' | 'table' | 'calendar' | 'activity';
    size?: 'small' | 'medium' | 'large' | 'full';
    category?: string;
    icon?: string;
    dataEndpoint: string;
    refreshInterval?: number;
    settingsSchema?: Record<string, unknown>;
  }): void;

  // Database migrations — idempotent, tracked per extension
  runMigrations(sqlFilePaths: string[]): Promise<void>;

  // Cron/Scheduler registration — for scheduled tasks
  registerCronJob(schedule: string, handler: () => Promise<void>, jobId: string): void;
  unregisterCronJob(jobId: string): void;

  // Services — access to core systems
  db: Database;

  // Config — persisted per-extension in SQLite (extension_configs table)
  getConfig<T = Record<string, unknown>>(): T | null;
  setConfig<T = Record<string, unknown>>(config: T): void;

  // Logger
  log(level: 'info' | 'warn' | 'error', message: string, data?: unknown): void;

  // Extension metadata
  extensionId: string;
}

/**
 * Create Extension SDK API instance
 * SECURITY: extensionDir parameter added for path validation (H-04)
 */
export function createExtensionApi(
  extensionId: string,
  fastify: FastifyInstance,
  db: Database,
  cronEngine: any, // CronEngine type (avoid circular dependency)
  extensionDir: string // Extension's base directory for path validation
): ExtensionApi {
  const routesToRegister: Array<{ fn: (fastify: FastifyInstance) => Promise<void>; prefix?: string }> = [];

  return {
    extensionId,
    db,

    // Route Registration (collected, registered later at startup)
    registerRoutes(routesFn, prefix?) {
      routesToRegister.push({ fn: routesFn, prefix });
      console.log(`[ExtensionApi:${extensionId}] ✅ Route registered: /api/ext/${extensionId}${prefix || ''}`);
    },

    // Tool Registration (global - available to all sessions)
    registerTool(tool) {
      // Tag tool with extensionId for tracking
      const taggedTool = { ...tool, extensionId };
      registerExtensionTool(taggedTool);
      console.log(`[ExtensionApi:${extensionId}] ✅ Tool registered globally: ${tool.name}`);
    },

    unregisterTool(name) {
      unregisterExtensionTool(name);
      console.log(`[ExtensionApi:${extensionId}] ❌ Tool unregistered globally: ${name}`);
    },

    // Dashboard Widget Registration
    registerDashboardWidget(widget) {
      const widgetId = `${extensionId}-${widget.id}`;

      // Check if widget already exists
      const existing = db.prepare('SELECT id FROM dashboard_widgets WHERE id = ?').get(widgetId);

      if (existing) {
        console.log(`[ExtensionApi:${extensionId}] ⏭️  Dashboard widget already registered: ${widget.id}`);
        return;
      }

      // Insert widget
      db.prepare(`
        INSERT INTO dashboard_widgets
        (id, name, description, component_type, extension_id, default_size, icon, category, data_endpoint, refresh_interval, settings_schema)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        widgetId,
        widget.name,
        widget.description || '',
        widget.component,
        extensionId,
        widget.size || 'medium',
        widget.icon || 'square',
        widget.category || 'extensions',
        widget.dataEndpoint,
        widget.refreshInterval || 60000,
        widget.settingsSchema ? JSON.stringify(widget.settingsSchema) : null
      );

      console.log(`[ExtensionApi:${extensionId}] ✅ Dashboard widget registered: ${widget.id} → ${widget.name}`);
    },

    // Migration Runner (idempotent per extension)
    // SECURITY: Validates paths are within extension directory (H-04)
    async runMigrations(sqlFilePaths) {
      for (const filePath of sqlFilePaths) {
        // Resolve URL to filesystem path if needed
        let resolvedPath = filePath;
        if (filePath.startsWith('file://')) {
          resolvedPath = fileURLToPath(filePath);
        }

        // SECURITY: Resolve to absolute path and validate it's within extension directory (H-04)
        const absolutePath = resolve(resolvedPath);
        const normalizedExtensionDir = resolve(extensionDir);

        // Path traversal protection: ensure the resolved path is within the extension directory
        if (!absolutePath.startsWith(normalizedExtensionDir + sep) &&
            absolutePath !== normalizedExtensionDir) {
          throw new Error(
            `SECURITY: Migration file outside extension directory rejected: ${resolvedPath}\n` +
            `Extension dir: ${normalizedExtensionDir}\n` +
            `Attempted path: ${absolutePath}`
          );
        }

        // Extract filename for tracking
        const filename = resolvedPath.split(/[\\/]/).pop() || filePath;

        // Check if already run
        const alreadyRun = db
          .prepare('SELECT 1 FROM extension_migrations WHERE extension_id = ? AND filename = ?')
          .get(extensionId, filename);

        if (alreadyRun) {
          console.log(`[ExtensionApi:${extensionId}] ⏭️  Migration already run: ${filename}`);
          continue;
        }

        // Read and execute SQL
        if (!existsSync(absolutePath)) {
          throw new Error(`Migration file not found: ${absolutePath}`);
        }

        const sql = readFileSync(absolutePath, 'utf-8');
        db.exec(sql);

        // Track migration
        db.prepare(
          'INSERT INTO extension_migrations (extension_id, filename) VALUES (?, ?)'
        ).run(extensionId, filename);

        console.log(`[ExtensionApi:${extensionId}] ✅ Migration executed: ${filename}`);
      }
    },

    // Cron Job Registration
    registerCronJob(schedule, handler, jobId) {
      const fullJobId = `ext:${extensionId}:${jobId}`;
      cronEngine.register(fullJobId, schedule, handler);
      console.log(`[ExtensionApi:${extensionId}] ✅ Cron job registered: ${jobId} (${schedule})`);
    },

    unregisterCronJob(jobId) {
      const fullJobId = `ext:${extensionId}:${jobId}`;
      cronEngine.unregister(fullJobId);
      console.log(`[ExtensionApi:${extensionId}] ❌ Cron job unregistered: ${jobId}`);
    },

    // Config Management
    getConfig<T = Record<string, unknown>>(): T | null {
      const row = db
        .prepare('SELECT config_json FROM extension_configs WHERE extension_id = ?')
        .get(extensionId) as { config_json: string } | undefined;

      if (!row) return null;
      return JSON.parse(row.config_json) as T;
    },

    setConfig<T = Record<string, unknown>>(config: T): void {
      db.prepare(
        `INSERT INTO extension_configs (extension_id, config_json, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(extension_id) DO UPDATE SET
           config_json = excluded.config_json,
           updated_at = excluded.updated_at`
      ).run(extensionId, JSON.stringify(config));

      console.log(`[ExtensionApi:${extensionId}] ✅ Config saved`);
    },

    // Logger
    log(level, message, data?) {
      const prefix = `[Extension:${extensionId}]`;
      const msg = data ? `${message} ${JSON.stringify(data)}` : message;

      switch (level) {
        case 'info':
          console.log(`${prefix} ℹ️  ${msg}`);
          break;
        case 'warn':
          console.warn(`${prefix} ⚠️  ${msg}`);
          break;
        case 'error':
          console.error(`${prefix} ❌ ${msg}`);
          break;
      }
    },

    // Internal: Get pending routes (used by extension-runner)
    __getRoutesToRegister() {
      return routesToRegister;
    },
  } as ExtensionApi & { __getRoutesToRegister: () => typeof routesToRegister };
}
