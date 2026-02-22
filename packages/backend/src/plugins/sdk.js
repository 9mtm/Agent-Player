/**
 * Extension SDK
 * Provides ExtensionApi interface for extensions to register routes, tools, migrations, cron jobs, etc.
 */
import { registerExtensionTool, unregisterExtensionTool } from '../tools/index.js';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
/**
 * Create Extension SDK API instance
 */
export function createExtensionApi(extensionId, fastify, db, cronEngine // CronEngine type (avoid circular dependency)
) {
    const routesToRegister = [];
    return {
        extensionId,
        db,
        // Route Registration (collected, registered later at startup)
        registerRoutes(routesFn, prefix) {
            routesToRegister.push({ fn: routesFn, prefix });
            console.log(`[ExtensionApi:${extensionId}] ✅ Route registered: /api/ext/${extensionId}${prefix || ''}`);
        },
        // Tool Registration (global - available to all sessions)
        registerTool(tool) {
            registerExtensionTool(tool);
            console.log(`[ExtensionApi:${extensionId}] ✅ Tool registered globally: ${tool.name}`);
        },
        unregisterTool(name) {
            unregisterExtensionTool(name);
            console.log(`[ExtensionApi:${extensionId}] ❌ Tool unregistered globally: ${name}`);
        },
        // Migration Runner (idempotent per extension)
        async runMigrations(sqlFilePaths) {
            for (const filePath of sqlFilePaths) {
                // Resolve URL to filesystem path if needed
                let resolvedPath = filePath;
                if (filePath.startsWith('file://')) {
                    resolvedPath = fileURLToPath(filePath);
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
                if (!existsSync(resolvedPath)) {
                    throw new Error(`Migration file not found: ${resolvedPath}`);
                }
                const sql = readFileSync(resolvedPath, 'utf-8');
                db.exec(sql);
                // Track migration
                db.prepare('INSERT INTO extension_migrations (extension_id, filename) VALUES (?, ?)').run(extensionId, filename);
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
        getConfig() {
            const row = db
                .prepare('SELECT config_json FROM extension_configs WHERE extension_id = ?')
                .get(extensionId);
            if (!row)
                return null;
            return JSON.parse(row.config_json);
        },
        setConfig(config) {
            db.prepare(`INSERT INTO extension_configs (extension_id, config_json, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(extension_id) DO UPDATE SET
           config_json = excluded.config_json,
           updated_at = excluded.updated_at`).run(extensionId, JSON.stringify(config));
            console.log(`[ExtensionApi:${extensionId}] ✅ Config saved`);
        },
        // Logger
        log(level, message, data) {
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
    };
}
