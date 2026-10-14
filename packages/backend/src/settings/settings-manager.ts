/**
 * Settings Manager
 *
 * Manages application settings (stored in SQLite)
 */

/**
 * Settings Manager
 *
 * Manages application settings: one JSON row ('agent_settings') in
 * `app_settings`, API keys encrypted (settings/encryption.ts).
 *
 * B2.2c: on the process driver (SQL steps). The table is created at run time
 * on SQLite (APP_SETTINGS_SQL); on PostgreSQL it comes from migrations-pg
 * r006 (scripts/pg/runtime/r006_app_settings.sql, kept equal to this DDL by
 * test/pg-runtime-ddl.test.mjs). The getters are async; updateSettings reads,
 * merges and writes in one transaction under a lock on the settings key, so
 * two concurrent updates never lose each other's fields. getSettingsSync /
 * getApiKeySync are for the SQLite-only callers that remain (onboarding
 * wizard, B2.2c part 2) and throw on PostgreSQL.
 */

import type { AgentSettings } from './types.js';
import { DEFAULT_SETTINGS } from './types.js';
import { encrypt, decrypt, maskApiKey, isEncrypted } from './encryption.js';
import { isMaskedSecret } from '../credentials/secret-mask.js';
import { dbDriver } from '../db/pg/config.js';
import { lockName, one, run, sql, sqliteSync, type Step } from '../repositories/sql-steps.js';
import { assertProviderSettingsAllowed } from '../config/isolation.js';

/** The runtime DDL of app_settings (SQLite); equal to scripts/pg/runtime/r006_app_settings.sql. */
export const APP_SETTINGS_SQL = `
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `;

const SETTINGS_KEY = 'agent_settings';

/** Stored row -> settings with decrypted API keys (defaults when absent or unreadable). */
function parseSettings(row: { value: string } | undefined): AgentSettings {
  if (!row) {
    // Return defaults if no settings found
    return DEFAULT_SETTINGS;
  }

  try {
    const settings = JSON.parse(row.value) as AgentSettings;

    // Decrypt API keys — handle individually so one failure doesn't block everything
    if (settings.claude?.apiKey && isEncrypted(settings.claude.apiKey)) {
      try {
        settings.claude.apiKey = decrypt(settings.claude.apiKey);
      } catch {
        console.warn('[Settings] ⚠️ Could not decrypt Claude API key — re-save it in Settings to fix');
        settings.claude.apiKey = '';
      }
    }

    if (settings.openai?.apiKey && isEncrypted(settings.openai.apiKey)) {
      try {
        settings.openai.apiKey = decrypt(settings.openai.apiKey);
      } catch {
        console.warn('[Settings] ⚠️ Could not decrypt OpenAI API key — re-save it in Settings to fix');
        settings.openai.apiKey = '';
      }
    }

    // Merge with defaults to ensure all fields exist
    return { ...DEFAULT_SETTINGS, ...settings };
  } catch (error) {
    console.error('[Settings] ❌ Failed to parse settings:', error);
    return DEFAULT_SETTINGS;
  }
}

function* readSettingsStep(): Step<AgentSettings> {
  return parseSettings(yield* one<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', SETTINGS_KEY));
}

/** Merge an update into the current settings and encrypt the API keys (pure). */
function mergeSettings(current: AgentSettings, settings: Partial<AgentSettings>): AgentSettings {
  const updated = { ...current, ...settings };

  // Provider blocks are merged, not replaced. A missing or masked apiKey
  // (the UI only ever sees a masked key) keeps the stored key.
  for (const provider of ['claude', 'openai'] as const) {
    const incoming = settings[provider];
    if (!incoming) continue;
    const merged: any = { ...(current[provider] || {}), ...incoming };
    if (incoming.apiKey === undefined || isMaskedSecret(incoming.apiKey)) {
      merged.apiKey = current[provider]?.apiKey;
    }
    (updated as any)[provider] = merged;
  }

  // Owner switch for anonymous public-room access: strictly boolean, default off.
  if (Object.prototype.hasOwnProperty.call(settings, 'publicRooms')) {
    updated.publicRooms = { allowAnonymous: (settings.publicRooms as any)?.allowAnonymous === true };
  }

  // Encrypt API keys before saving
  if (updated.claude?.apiKey && !isEncrypted(updated.claude.apiKey)) {
    updated.claude.apiKey = encrypt(updated.claude.apiKey);
  }

  if (updated.openai?.apiKey && !isEncrypted(updated.openai.apiKey)) {
    updated.openai.apiKey = encrypt(updated.openai.apiKey);
  }
  return updated;
}

function* updateSettingsStep(settings: Partial<AgentSettings>): Step<void> {
  // Read-merge-write under one lock: a concurrent update waits (PostgreSQL).
  yield* lockName(`app_settings:${SETTINGS_KEY}`);
  const updated = mergeSettings(yield* readSettingsStep(), settings);
  // Replaces the row on the primary key (an upsert both drivers accept).
  yield* run(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `, SETTINGS_KEY, JSON.stringify(updated), Date.now());
}

export class SettingsManager {
  constructor() {
    this.init();
  }

  /**
   * Initialize settings table (SQLite; PostgreSQL has it from migrations-pg r006)
   */
  private init() {
    if (dbDriver() === 'postgres') return;
    sqliteSync(run(APP_SETTINGS_SQL));

    console.log('[Settings] ✅ Settings table initialized (SQLite)');
  }

  /**
   * Get all settings (with decrypted API keys)
   */
  getSettings(): Promise<AgentSettings> {
    return sql().read(readSettingsStep());
  }

  /** SQLite only: getSettings, synchronously (throws on PostgreSQL). */
  getSettingsSync(): AgentSettings {
    return sqliteSync(readSettingsStep());
  }

  /**
   * Get settings with masked API keys (for API responses)
   */
  async getSettingsMasked(): Promise<AgentSettings> {
    const settings = await this.getSettings();

    if (settings.claude?.apiKey) {
      settings.claude.apiKey = maskApiKey(settings.claude.apiKey);
    }

    if (settings.openai?.apiKey) {
      settings.openai.apiKey = maskApiKey(settings.openai.apiKey);
    }

    return settings;
  }

  /**
   * Update settings (encrypts API keys before saving; one transaction)
   */
  async updateSettings(settings: Partial<AgentSettings>): Promise<void> {
    // RUN-ISO ISO-2: an isolated server never stores a provider that leaves the machine
    // (checked before the transaction: a refused update writes nothing).
    assertProviderSettingsAllowed(settings);
    await sql().tx(() => updateSettingsStep(settings));

    console.log('[Settings] ✅ Settings updated (API keys encrypted)');
  }

  /**
   * Get API key for provider
   */
  async getApiKey(provider: 'claude' | 'openai'): Promise<string | undefined> {
    const settings = await this.getSettings();
    return settings[provider]?.apiKey;
  }

  /** SQLite only: getApiKey, synchronously (throws on PostgreSQL). */
  getApiKeySync(provider: 'claude' | 'openai'): string | undefined {
    return this.getSettingsSync()[provider]?.apiKey;
  }

  /**
   * Check if API key is configured
   */
  async hasApiKey(provider: 'claude' | 'openai'): Promise<boolean> {
    const apiKey = await this.getApiKey(provider);
    return !!apiKey && apiKey.trim().length > 0;
  }

  /**
   * Get current provider
   */
  async getCurrentProvider(): Promise<'local' | 'claude' | 'openai'> {
    const settings = await this.getSettings();
    return settings.provider;
  }

}

// Singleton instance
let instance: SettingsManager | null = null;

export function getSettingsManager(): SettingsManager {
  if (!instance) {
    instance = new SettingsManager();
  }
  return instance;
}
