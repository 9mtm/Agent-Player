/**
 * One data root for every backend store (RUN-ISO F1).
 *
 * When `AGENT_PLAYER_DATA_DIR` is set, every store the backend writes (main
 * DB, audit, encryption keys and vault, memory, multi-agent, webhooks,
 * gateway, browser, uploads, audio, secrets.env, instance.json, credential
 * backups, MCP server folders, ...) resolves under that one folder.
 *
 * When it is unset, every caller keeps its old location exactly: the legacy
 * path is passed in and returned unchanged (`<cwd>/.data/...` for most
 * stores, `<cwd>/../../.data/...` for memory and uploads, `~/.agent-player`
 * for credential backups and MCP server folders).
 *
 * Explicit per-store variables (`DATABASE_PATH`, `UPLOADS_DIR`,
 * `AUDIT_DB_PATH`, `ENCRYPTION_DB_PATH`, `MCP_SERVERS_DIR`) still win; the
 * isolated launcher clears them (see config/isolation.ts).
 */

import path from 'node:path';

export const DATA_DIR_ENV = 'AGENT_PLAYER_DATA_DIR';

/** Absolute data root from `AGENT_PLAYER_DATA_DIR`, or null when unset. */
export function dataRootOverride(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = (env[DATA_DIR_ENV] ?? '').trim();
  return raw ? path.resolve(raw) : null;
}

/** The backend data folder: `AGENT_PLAYER_DATA_DIR`, else `<cwd>/.data`. */
export function dataRoot(): string {
  return dataRootOverride() ?? path.join(process.cwd(), '.data');
}

/** `<data root>/<parts>` (absolute); unset: `<cwd>/.data/<parts>`. */
export function dataPath(...parts: string[]): string {
  return path.join(dataRoot(), ...parts);
}

/**
 * `<AGENT_PLAYER_DATA_DIR>/<parts>` when the variable is set; otherwise the
 * caller's legacy path, returned unchanged (same string as before F1).
 */
export function dataPathOr(legacy: string, ...parts: string[]): string {
  const root = dataRootOverride();
  return root ? path.join(root, ...parts) : legacy;
}

/** The main SQLite database: `DATABASE_PATH`, else `<data root>/agent-player.db`. */
export function mainDatabasePath(): string {
  return process.env.DATABASE_PATH || dataPath('agent-player.db');
}
