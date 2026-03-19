/**
 * Extension Runner
 * Loads, initializes, and manages extensions at runtime
 */

import type { FastifyInstance } from 'fastify';
import type { PluginManifest } from './types.js';
import { createExtensionApi } from './sdk.js';
import { getDatabase } from '../db/index.js';
import { readdirSync, existsSync, readFileSync, watch } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Extension with register() hook
 */
interface Extension {
  id: string;
  name: string;
  version: string;

  // Lifecycle hooks
  register?(api: any): Promise<void>;
  onEnable?(api: any): Promise<void>;
  onDisable?(api: any): Promise<void>;
}

/**
 * Extension Runner
 * Scans extensions directory, loads enabled extensions, calls register() hooks
 */
export class ExtensionRunner {
  private loadedExtensions = new Map<string, Extension>();
  private extensionsDir: string;

  constructor(extensionsDir: string = './extensions') {
    this.extensionsDir = resolve(extensionsDir);
  }

  /**
   * Initialize all enabled extensions
   * Called at server startup before fastify.listen()
   */
  async initialize(fastify: FastifyInstance, cronEngine: any) {
    console.log('[ExtensionRunner] 🔌 Loading extensions...\n');

    // Emergency shutdown: disable all extensions via env variable
    if (process.env.EXTENSIONS_DISABLED === 'true') {
      console.log('[ExtensionRunner] 🚨 EMERGENCY SHUTDOWN: All extensions disabled via EXTENSIONS_DISABLED env variable\n');
      console.log('[ExtensionRunner] ℹ️  To re-enable extensions, remove or set EXTENSIONS_DISABLED=false in .env file\n');
      return;
    }

    const db = getDatabase();

    // Ensure extensions directory exists
    if (!existsSync(this.extensionsDir)) {
      console.log('[ExtensionRunner] ℹ️  No extensions directory found, skipping...\n');
      return;
    }

    // Scan for extension directories
    const extensionDirs = readdirSync(this.extensionsDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    console.log(`[ExtensionRunner] Found ${extensionDirs.length} extension(s): ${extensionDirs.join(', ')}\n`);

    for (const dirName of extensionDirs) {
      try {
        await this.loadExtension(dirName, fastify, cronEngine);
      } catch (error: any) {
        console.error(`[ExtensionRunner] ❌ Failed to load extension "${dirName}":`, error.message);
      }
    }

    console.log(`[ExtensionRunner] ✅ Loaded ${this.loadedExtensions.size} extension(s)\n`);
  }

  /**
   * Load a single extension
   */
  private async loadExtension(
    dirName: string,
    fastify: FastifyInstance,
    cronEngine: any
  ) {
    const extensionPath = join(this.extensionsDir, dirName);

    // Try both manifest filename formats (new and old)
    let manifestPath = join(extensionPath, 'agentplayer.plugin.json');
    if (!existsSync(manifestPath)) {
      manifestPath = join(extensionPath, 'agent-player.plugin.json');
    }

    // Read manifest
    if (!existsSync(manifestPath)) {
      console.warn(`[ExtensionRunner] ⚠️  No manifest found for "${dirName}", skipping...`);
      return;
    }

    const manifest: PluginManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    const { id, name, version, main } = manifest;

    const db = getDatabase();

    // Check if enabled
    const configRow = db
      .prepare('SELECT enabled FROM extension_configs WHERE extension_id = ?')
      .get(id) as { enabled: number } | undefined;

    const isEnabled = configRow?.enabled === 1;

    if (!isEnabled) {
      console.log(`[ExtensionRunner] ⏭️  Extension "${name}" (${id}) is disabled, skipping...`);
      return;
    }

    // Load extension module
    const entryPath = join(extensionPath, main);
    if (!existsSync(entryPath)) {
      throw new Error(`Entry point not found: ${entryPath}`);
    }

    // Dynamic import (ESM)
    const extensionModule = await import(`file://${entryPath}`);
    const extension: Extension = extensionModule.default || extensionModule;

    // Create Extension API (SECURITY: pass extensionPath for path validation - H-04)
    const api = createExtensionApi(id, fastify, db, cronEngine, extensionPath) as any;

    // Call register() hook
    if (extension.register) {
      console.log(`[ExtensionRunner] 🔧 Registering extension: ${name} (${id})`);
      await extension.register(api);
    }

    // Auto-load i18n translations if i18n directory exists
    const i18nDir = manifest.i18n?.dir || 'i18n';
    api.registerTranslations(i18nDir);

    // Register routes (collected during register() call)
    const routesToRegister = api.__getRoutesToRegister();
    for (const { fn, prefix } of routesToRegister) {
      const fullPrefix = `/api/ext/${id}${prefix || ''}`;
      await fastify.register(async (scope) => {
        await fn(scope);
      }, { prefix: fullPrefix });
      console.log(`[ExtensionRunner] ✅ Routes registered under: ${fullPrefix}`);
    }

    // Store loaded extension
    this.loadedExtensions.set(id, extension);
    console.log(`[ExtensionRunner] ✅ Extension loaded: ${name} v${version}\n`);
  }

  /**
   * Enable an extension at runtime (requires restart for routes)
   */
  async enableExtension(extensionId: string) {
    const db = getDatabase();

    db.prepare(
      `INSERT INTO extension_configs (extension_id, enabled, updated_at)
       VALUES (?, 1, datetime('now'))
       ON CONFLICT(extension_id) DO UPDATE SET
         enabled = 1,
         updated_at = datetime('now')`
    ).run(extensionId);

    console.log(`[ExtensionRunner] ✅ Extension "${extensionId}" enabled (restart required for routes)`);
  }

  /**
   * Disable an extension at runtime
   */
  async disableExtension(extensionId: string) {
    const db = getDatabase();

    db.prepare(
      `UPDATE extension_configs
       SET enabled = 0, updated_at = datetime('now')
       WHERE extension_id = ?`
    ).run(extensionId);

    // Call onDisable() hook if extension is loaded
    const extension = this.loadedExtensions.get(extensionId);
    if (extension?.onDisable) {
      const api = createExtensionApi(extensionId, {} as any, db, {} as any);
      await extension.onDisable(api);
    }

    this.loadedExtensions.delete(extensionId);

    console.log(`[ExtensionRunner] ❌ Extension "${extensionId}" disabled`);
  }

  /**
   * Enable hot reload - watch extension files for changes
   * NOTE: This requires server restart for route changes to take effect
   */
  enableHotReload() {
    if (!existsSync(this.extensionsDir)) {
      console.log('[ExtensionRunner] ⚠️  Hot reload disabled - no extensions directory');
      return;
    }

    console.log('[ExtensionRunner] 🔥 Hot reload enabled - watching for changes...\n');

    watch(this.extensionsDir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      // Only watch .js and .json files
      if (!filename.endsWith('.js') && !filename.endsWith('.json')) return;

      // Extract extension ID from path
      const parts = filename.split(/[/\\]/);
      const extensionId = parts[0];

      // Debounce rapid changes
      clearTimeout((this as any)[`_hotReload_${extensionId}`]);
      (this as any)[`_hotReload_${extensionId}`] = setTimeout(() => {
        console.log(`[ExtensionRunner] 🔄 File changed: ${filename} - restart required for changes`);
        console.log(`[ExtensionRunner] 💡 Run: npm run restart:backend`);
      }, 1000);
    });
  }

  /**
   * Get all loaded extensions
   */
  getLoadedExtensions(): Map<string, Extension> {
    return this.loadedExtensions;
  }
}

// Singleton instance
let extensionRunner: ExtensionRunner | null = null;

export function getExtensionRunner(): ExtensionRunner {
  if (!extensionRunner) {
    extensionRunner = new ExtensionRunner();
  }
  return extensionRunner;
}
