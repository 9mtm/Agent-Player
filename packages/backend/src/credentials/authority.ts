/**
 * Credential authority (S1.1).
 *
 * The single place where provider and tool secrets are read. Routes, tools,
 * services and the cron runner ask this module for a key; none of them read
 * `agents_config`, the settings tables or `process.env.*_API_KEY` directly.
 *
 * Sources, all through the credential manager or the encrypted settings:
 *  - Agent keys: an encrypted credential (system scope, `user_id` NULL)
 *    referenced by `agents_config.api_key_credential_id`. The old plaintext
 *    column `agents_config.api_key` is migrated on startup and then kept empty.
 *  - Global provider keys: the Settings page keys (stored encrypted by the
 *    settings manager in `app_settings`).
 *  - Server environment (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
 *    `GEMINI_API_KEY`): only where a caller asks for it with `allowEnv`
 *    (tools and services that used the environment before).
 *
 * A key is never returned to an HTTP client; routes use `hasAgentApiKey` /
 * the masked forms.
 *
 * B2.2b-3: the agents_config / settings SQL runs on the process driver
 * (repositories/sql-steps.ts), so every reader here is async.
 */

import { all, one, run, sql } from '../repositories/sql-steps.js';
import { getCredentialManager } from './manager.js';
import { isMaskedSecret } from './secret-mask.js';
import { CredentialType } from './types.js';
import { getSettingsManager } from '../settings/index.js';
import { decrypt as decryptSettingsValue, isEncrypted as isSettingsEncrypted } from '../settings/encryption.js';

export type ProviderName = 'claude' | 'openai' | 'gemini';

const ENV_KEYS: Record<ProviderName, string> = {
  claude: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  gemini: 'GEMINI_API_KEY',
};

const AGENT_ID = /^[A-Za-z0-9_.:-]{1,128}$/;

/** Credential name used for an agent's provider key. */
export function agentKeyCredentialName(agentId: string): string {
  return `agent:${agentId}:api_key`;
}

async function agentRow(agentId: string): Promise<{ id: string; name: string; provider: string; api_key_credential_id: string | null } | undefined> {
  if (typeof agentId !== 'string' || !AGENT_ID.test(agentId)) return undefined;
  try {
    return await sql().read(one<{ id: string; name: string; provider: string; api_key_credential_id: string | null }>(
      'SELECT id, name, provider, api_key_credential_id FROM agents_config WHERE id = ?', agentId));
  } catch {
    return undefined;
  }
}

/** True when ENCRYPTION_KEY is a usable 32-byte hex key (not the temporary random key). */
export function hasPersistentEncryptionKey(): boolean {
  const key = process.env.ENCRYPTION_KEY;
  return typeof key === 'string' && /^[0-9a-fA-F]{64}$/.test(key);
}

/**
 * Store (or replace) an agent's provider key as an encrypted credential and
 * reference it from agents_config. Empty or masked values are ignored (the
 * stored key is kept). Returns the credential id, or null when nothing changed.
 */
export async function setAgentApiKey(agentId: string, value: string): Promise<string | null> {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || isMaskedSecret(trimmed)) return null;
  const row = await agentRow(agentId);
  if (!row) throw new Error('Agent not found');

  const manager = getCredentialManager();
  const description = `Provider API key for agent ${row.name || agentId}`;
  let credentialId = row.api_key_credential_id || null;
  const existing = credentialId ? await manager.get(credentialId) : null;
  if (existing) {
    await manager.update(existing.id, { value: trimmed, description });
  } else {
    const byName = await manager.getByName(agentKeyCredentialName(agentId));
    if (byName) {
      await manager.update(byName.id, { value: trimmed, description });
      credentialId = byName.id;
    } else {
      const created = await manager.create({
        name: agentKeyCredentialName(agentId),
        type: CredentialType.API_KEY,
        value: trimmed,
        description,
        skillId: `agent:${agentId}`,
      });
      credentialId = created.id;
    }
  }
  await sql().read(run(`UPDATE agents_config SET api_key_credential_id = ?, api_key = '' WHERE id = ?`, credentialId, agentId));
  return credentialId;
}

/** Remove an agent's key credential (used when the agent is deleted). */
export async function removeAgentApiKey(agentId: string): Promise<void> {
  const row = await agentRow(agentId);
  if (!row?.api_key_credential_id) return;
  const manager = getCredentialManager();
  if (await manager.get(row.api_key_credential_id)) await manager.delete(row.api_key_credential_id);
  await sql().read(run(`UPDATE agents_config SET api_key_credential_id = NULL WHERE id = ?`, agentId));
}

/** True when the agent has its own stored key (value never returned). */
export async function hasAgentApiKey(agentId: string): Promise<boolean> {
  const row = await agentRow(agentId);
  return !!row?.api_key_credential_id;
}

let warnedLegacy = false;

/**
 * The agent's own provider key, or '' when it has none.
 * Transitional: a plaintext key the startup migration could not move yet
 * (no ENCRYPTION_KEY, or a failed write) is still used for THIS agent only,
 * so the owner's agents keep working until the migration succeeds.
 */
export async function getAgentApiKey(agentId: string | undefined): Promise<string> {
  if (!agentId) return '';
  const row = await agentRow(agentId);
  if (!row) return '';
  if (!row.api_key_credential_id) {
    try {
      const legacy = await sql().read(one<{ api_key?: string }>('SELECT api_key FROM agents_config WHERE id = ?', agentId));
      const value = (legacy?.api_key || '').trim();
      if (value && !isMaskedSecret(value)) {
        if (!warnedLegacy) {
          warnedLegacy = true;
          console.warn('[CredentialAuthority] Using a not yet migrated plaintext agent key; set ENCRYPTION_KEY and restart to encrypt it.');
        }
        return value;
      }
    } catch { /* column missing: nothing to use */ }
    return '';
  }
  try {
    return await getCredentialManager().getValue(row.api_key_credential_id);
  } catch {
    console.warn('[CredentialAuthority] Could not read the stored agent key');
    return '';
  }
}

/** Global provider key from the Settings page (stored encrypted; B2.2c: process driver). */
export async function getGlobalProviderApiKey(provider: ProviderName): Promise<string> {
  if (provider === 'gemini') return '';
  try {
    return (await getSettingsManager().getApiKey(provider)) || '';
  } catch {
    return '';
  }
}

/** True when a global Settings key is configured for the provider. */
export async function hasGlobalProviderApiKey(provider: ProviderName): Promise<boolean> {
  return (await getGlobalProviderApiKey(provider)).trim().length > 0;
}

/** Server environment key (operator-provided). */
export function getEnvProviderApiKey(provider: ProviderName): string {
  return process.env[ENV_KEYS[provider]] || '';
}

export interface ResolveKeyOptions {
  /** Agent whose own key is tried first. */
  agentId?: string;
  /** Skip the global Settings key. */
  noGlobal?: boolean;
  /** Also accept the server environment key (last). */
  allowEnv?: boolean;
  /**
   * Also accept the legacy `settings` table row with this key (historical
   * source of the cron runner). Kept so this change does not start paid
   * calls that did not happen before; see HANDOFF Q-16.
   */
  legacySettingsRow?: 'claude_api_key';
}

async function legacySettingsValue(key: string): Promise<string> {
  try {
    const row = await sql().read(one<{ value?: string }>('SELECT value FROM settings WHERE key = ? LIMIT 1', key));
    const value = typeof row?.value === 'string' ? row.value : '';
    return value && isSettingsEncrypted(value) ? decryptSettingsValue(value) : value;
  } catch {
    return '';
  }
}

/**
 * Provider key for a call: the agent's own key, then the global Settings key,
 * then (only with allowEnv) the server environment. Never another agent's key.
 */
export async function resolveProviderApiKey(provider: ProviderName, opts: ResolveKeyOptions = {}): Promise<string> {
  const own = await getAgentApiKey(opts.agentId);
  if (own) return own;
  if (opts.legacySettingsRow) {
    const legacy = await legacySettingsValue(opts.legacySettingsRow);
    if (legacy) return legacy;
  }
  if (!opts.noGlobal) {
    const global = await getGlobalProviderApiKey(provider);
    if (global) return global;
  }
  if (opts.allowEnv) return getEnvProviderApiKey(provider);
  return '';
}

/**
 * Key used by memory extraction. Kept on its historical source (the legacy
 * `settings` table row `agent_settings`) so this change does not start paid
 * LLM calls that did not happen before; see HANDOFF Q-16.
 */
export async function getMemoryExtractionClaudeConfig(): Promise<{ apiKey: string; model: string } | null> {
  try {
    const row = await sql().read(one<{ value?: string }>("SELECT value FROM settings WHERE key = 'agent_settings' LIMIT 1"));
    if (!row?.value) return null;
    const settings = JSON.parse(row.value);
    let apiKey: string = settings?.claude?.apiKey || '';
    const model: string = settings?.claude?.model || 'claude-haiku-4-5-20251001';
    if (!apiKey) return null;
    if (isSettingsEncrypted(apiKey)) apiKey = decryptSettingsValue(apiKey);
    return { apiKey, model };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Startup migration: plaintext agents_config.api_key -> encrypted credential
// ---------------------------------------------------------------------------

export interface AgentKeyMigrationResult {
  migrated: number;
  skipped: number;
  failed: number;
  refused?: 'no-encryption-key';
}

/**
 * Move every non-empty plaintext `agents_config.api_key` into an encrypted
 * credential. The plaintext is cleared only after the stored value decrypts
 * back to the same string. Without a persistent ENCRYPTION_KEY nothing is
 * changed (a temporary key would make the keys unreadable after a restart).
 */
export async function migrateAgentApiKeys(): Promise<AgentKeyMigrationResult> {
  let rows: Array<{ id: string; api_key: string | null; api_key_credential_id: string | null }>;
  try {
    rows = await sql().read(all<{ id: string; api_key: string | null; api_key_credential_id: string | null }>(
      `SELECT id, api_key, api_key_credential_id FROM agents_config WHERE api_key IS NOT NULL AND api_key != ''`));
  } catch {
    return { migrated: 0, skipped: 0, failed: 0 };
  }
  if (rows.length === 0) return { migrated: 0, skipped: 0, failed: 0 };
  if (!hasPersistentEncryptionKey()) {
    console.warn(`[CredentialAuthority] ${rows.length} agent key(s) still stored in plaintext; set ENCRYPTION_KEY to migrate them.`);
    return { migrated: 0, skipped: rows.length, failed: 0, refused: 'no-encryption-key' };
  }

  const manager = getCredentialManager();
  const result: AgentKeyMigrationResult = { migrated: 0, skipped: 0, failed: 0 };
  for (const row of rows) {
    const value = (row.api_key || '').trim();
    if (!value || isMaskedSecret(value)) {
      // A masked placeholder is not a secret: drop it, keep any stored credential.
      await sql().read(run(`UPDATE agents_config SET api_key = '' WHERE id = ?`, row.id));
      result.skipped++;
      continue;
    }
    try {
      let credentialId = row.api_key_credential_id;
      const existing = credentialId ? await manager.get(credentialId) : null;
      if (existing) {
        await manager.update(existing.id, { value });
      } else {
        const byName = await manager.getByName(agentKeyCredentialName(row.id));
        if (byName) {
          await manager.update(byName.id, { value });
          credentialId = byName.id;
        } else {
          credentialId = (await manager.create({
            name: agentKeyCredentialName(row.id),
            type: CredentialType.API_KEY,
            value,
            description: `Provider API key for agent ${row.id} (migrated)`,
            skillId: `agent:${row.id}`,
          })).id;
        }
      }
      // Verify the round-trip before the plaintext is removed.
      const check = await manager.getValue(credentialId!);
      if (check !== value) throw new Error('verification failed');
      await sql().read(run(`UPDATE agents_config SET api_key_credential_id = ?, api_key = '' WHERE id = ? AND api_key = ?`,
        credentialId, row.id, row.api_key));
      result.migrated++;
    } catch (err: any) {
      result.failed++;
      console.warn(`[CredentialAuthority] Agent key migration failed for ${row.id}: ${err?.message || 'error'}`);
    }
  }
  if (result.migrated) console.log(`[CredentialAuthority] Migrated ${result.migrated} agent key(s) to encrypted credentials`);
  return result;
}
