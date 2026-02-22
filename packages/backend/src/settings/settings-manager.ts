/**
 * Settings Manager
 *
 * Manages application settings (stored in SQLite)
 */

import type { AgentSettings } from './types.js';
import { DEFAULT_SETTINGS } from './types.js';
import { encrypt, decrypt, maskApiKey, isEncrypted } from './encryption.js';
import { getDatabase } from '../db/index.js';

export class SettingsManager {
  private get db() {
    return getDatabase();
  }

  constructor() {
    this.init();
  }

  /**
   * Initialize settings table
   */
  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    console.log('[Settings] ✅ Settings table initialized (SQLite)');
  }

  /**
   * Get all settings (with decrypted API keys)
   */
  getSettings(): AgentSettings {
    const row = this.db
      .prepare('SELECT value FROM app_settings WHERE key = ?')
      .get('agent_settings') as { value: string } | undefined;

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

  /**
   * Get settings with masked API keys (for API responses)
   */
  getSettingsMasked(): AgentSettings {
    const settings = this.getSettings();

    if (settings.claude?.apiKey) {
      settings.claude.apiKey = maskApiKey(settings.claude.apiKey);
    }

    if (settings.openai?.apiKey) {
      settings.openai.apiKey = maskApiKey(settings.openai.apiKey);
    }

    return settings;
  }

  /**
   * Update settings (encrypts API keys before saving)
   */
  updateSettings(settings: Partial<AgentSettings>): void {
    const current = this.getSettings();
    const updated = { ...current, ...settings };

    // Encrypt API keys before saving
    if (updated.claude?.apiKey && !isEncrypted(updated.claude.apiKey)) {
      updated.claude.apiKey = encrypt(updated.claude.apiKey);
    }

    if (updated.openai?.apiKey && !isEncrypted(updated.openai.apiKey)) {
      updated.openai.apiKey = encrypt(updated.openai.apiKey);
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO app_settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `);

    stmt.run('agent_settings', JSON.stringify(updated), Date.now());

    console.log('[Settings] ✅ Settings updated (API keys encrypted)');
  }

  /**
   * Get API key for provider
   */
  getApiKey(provider: 'claude' | 'openai'): string | undefined {
    const settings = this.getSettings();
    return settings[provider]?.apiKey;
  }

  /**
   * Check if API key is configured
   */
  hasApiKey(provider: 'claude' | 'openai'): boolean {
    const apiKey = this.getApiKey(provider);
    return !!apiKey && apiKey.trim().length > 0;
  }

  /**
   * Get current provider
   */
  getCurrentProvider(): 'local' | 'claude' | 'openai' {
    const settings = this.getSettings();
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
