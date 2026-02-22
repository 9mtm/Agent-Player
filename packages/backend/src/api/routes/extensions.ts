/**
 * Extensions API Routes
 * Manage modern Extension SDK extensions
 */

import type { FastifyInstance } from 'fastify';
import { handleError } from '../error-handler.js';
import { getDatabase } from '../../db/index.js';
import { getExtensionRunner } from '../../plugins/extension-runner.js';
import { getExtensionTools } from '../../tools/index.js';
import { readdirSync, existsSync, readFileSync } from 'fs';
import { resolve, join } from 'path';
import { validateTableName } from '../../db/sql-utils.js';

export async function extensionsRoutes(fastify: FastifyInstance) {
  const extensionsDir = resolve('./extensions');

  /**
   * GET /api/extensions - List all extensions (installed + available)
   */
  fastify.get('/api/extensions', {
    schema: {
      tags: ['Extensions'],
      description: 'List all installed extensions with their status',
    },
  }, async (request, reply) => {
    try {
      const db = getDatabase();
      const extensions = [];

      // Scan extensions directory
      if (existsSync(extensionsDir)) {
        const dirs = readdirSync(extensionsDir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name);

        for (const dirName of dirs) {
          // Try both manifest filename formats (new and old)
          let manifestPath = join(extensionsDir, dirName, 'agentplayer.plugin.json');
          if (!existsSync(manifestPath)) {
            manifestPath = join(extensionsDir, dirName, 'agent-player.plugin.json');
          }

          if (!existsSync(manifestPath)) continue;

          const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

          // Get enabled state from DB
          const config = db
            .prepare('SELECT enabled, config_json, installed_at FROM extension_configs WHERE extension_id = ?')
            .get(manifest.id) as { enabled: number; config_json: string; installed_at: string } | undefined;

          extensions.push({
            id: manifest.id,
            name: manifest.name,
            description: manifest.description,
            version: manifest.version,
            type: manifest.type || (manifest.channels ? 'channel' : 'custom'),
            author: manifest.author || 'Unknown',
            enabled: config?.enabled === 1,
            installedAt: config?.installed_at || null,
            permissions: manifest.permissions || manifest.channels || [],
            settingsUI: manifest.settingsUI || undefined,
          });
        }
      }

      return {
        success: true,
        extensions,
        total: extensions.length,
        enabled: extensions.filter((e) => e.enabled).length,
      };
    } catch (error: any) {
      console.error('[Extensions API] ❌ List failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Extensions]');
    }
  });

  /**
   * POST /api/extensions/:id/enable - Enable an extension
   */
  fastify.post<{ Params: { id: string } }>('/api/extensions/:id/enable', {
    schema: {
      tags: ['Extensions'],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const extensionRunner = getExtensionRunner();

      await extensionRunner.enableExtension(id);

      return {
        success: true,
        message: `Extension "${id}" enabled. Restart backend to load routes.`,
        restartRequired: true,
      };
    } catch (error: any) {
      console.error('[Extensions API] ❌ Enable failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Extensions]');
    }
  });

  /**
   * POST /api/extensions/:id/disable - Disable an extension
   */
  fastify.post<{ Params: { id: string } }>('/api/extensions/:id/disable', {
    schema: {
      tags: ['Extensions'],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const extensionRunner = getExtensionRunner();

      await extensionRunner.disableExtension(id);

      return {
        success: true,
        message: `Extension "${id}" disabled. Tools unregistered.`,
      };
    } catch (error: any) {
      console.error('[Extensions API] ❌ Disable failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Extensions]');
    }
  });

  /**
   * GET /api/extensions/:id/inspect - Get extension details (database, tools, routes, etc.)
   */
  fastify.get<{ Params: { id: string } }>('/api/extensions/:id/inspect', {
    schema: {
      tags: ['Extensions'],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const db = getDatabase();

      // 1. Get migrations history
      const migrations = db
        .prepare('SELECT filename, ran_at FROM extension_migrations WHERE extension_id = ? ORDER BY ran_at DESC')
        .all(id);

      // 2. Get config
      const configRow = db
        .prepare('SELECT config_json FROM extension_configs WHERE extension_id = ?')
        .get(id) as { config_json: string } | undefined;
      const config = configRow ? JSON.parse(configRow.config_json) : null;

      // 3. Get database tables (query SQLite schema for tables created by this extension)
      const allTables = db.prepare(`
        SELECT name, sql FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `).all() as Array<{ name: string; sql: string }>;

      // Filter tables that might belong to this extension (heuristic: contain extension id in name)
      const extensionTables = allTables.filter((t) =>
        t.name.toLowerCase().includes(id.replace('-', '_')) ||
        t.name.toLowerCase().includes(id.replace('_', ''))
      );

      // Get row count and column count for each table
      const tables = extensionTables.map((table) => {
        // SECURITY: Validate table name before using in SQL
        const safeName = validateTableName(table.name);
        const rowCount = db.prepare(`SELECT COUNT(*) as count FROM ${safeName}`).get() as { count: number };
        const columns = db.prepare(`PRAGMA table_info(${safeName})`).all();

        return {
          name: table.name,
          rows: rowCount.count,
          columns: columns.length,
        };
      });

      // 4. Get registered tools (from extension tools global array)
      const extensionToolsList = getExtensionTools(id);
      const tools = extensionToolsList.map((t) => t.name);

      // 5. Get registered routes (inferred from extension ID)
      const routes = [`/api/ext/${id}/*`];

      return {
        success: true,
        data: {
          migrations,
          config,
          tables,
          tools,
          routes,
        },
      };
    } catch (error: any) {
      console.error('[Extensions API] ❌ Inspect failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Extensions]');
    }
  });

  /**
   * DELETE /api/extensions/:id - Delete an extension completely
   */
  fastify.delete<{ Params: { id: string } }>('/api/extensions/:id', {
    schema: {
      tags: ['Extensions'],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const db = getDatabase();

      // 1. Disable extension first (unregister tools, call onDisable)
      const extensionRunner = getExtensionRunner();
      await extensionRunner.disableExtension(id);

      // 2. Delete extension config
      db.prepare('DELETE FROM extension_configs WHERE extension_id = ?').run(id);

      // 3. Delete extension migrations history
      db.prepare('DELETE FROM extension_migrations WHERE extension_id = ?').run(id);

      // 4. Delete extension directory
      const extensionPath = resolve(extensionsDir, id);
      if (existsSync(extensionPath)) {
        const { rmSync } = await import('fs');
        rmSync(extensionPath, { recursive: true, force: true });
      }

      return {
        success: true,
        message: `Extension "${id}" deleted. Files, config, migrations, and cron jobs removed.`,
      };
    } catch (error: any) {
      console.error('[Extensions API] ❌ Delete failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Extensions]');
    }
  });

  /**
   * GET /api/extensions/:id/config - Get extension configuration
   */
  fastify.get<{ Params: { id: string } }>('/api/extensions/:id/config', {
    schema: {
      tags: ['Extensions'],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const db = getDatabase();

      const extension = db.prepare('SELECT * FROM extension_configs WHERE extension_id = ?').get(id) as any;

      if (!extension) {
        return reply.status(404).send({
          success: false,
          error: 'Extension not found',
        });
      }

      const config = extension.config_json ? JSON.parse(extension.config_json) : {};

      return {
        success: true,
        config,
      };
    } catch (error: any) {
      console.error('[Extensions API] ❌ Get config failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Extensions]');
    }
  });

  /**
   * PUT /api/extensions/:id/config - Update extension configuration
   */
  fastify.put<{ Params: { id: string }; Body: { config: Record<string, any> } }>('/api/extensions/:id/config', {
    schema: {
      tags: ['Extensions'],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          config: { type: 'object' },
        },
        required: ['config'],
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { config } = request.body;
      const db = getDatabase();

      // Check if extension exists
      const extension = db.prepare('SELECT * FROM extension_configs WHERE extension_id = ?').get(id);

      if (!extension) {
        return reply.status(404).send({
          success: false,
          error: 'Extension not found',
        });
      }

      // Update config
      db.prepare('UPDATE extension_configs SET config_json = ? WHERE extension_id = ?')
        .run(JSON.stringify(config), id);

      console.log(`[Extensions API] ✅ Config updated for ${id}`);

      return {
        success: true,
        message: 'Configuration saved successfully',
      };
    } catch (error: any) {
      console.error('[Extensions API] ❌ Update config failed:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Extensions]');
    }
  });

  console.log('[Extensions API] ✅ Routes registered');
}
