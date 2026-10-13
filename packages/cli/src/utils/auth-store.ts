/**
 * CLI session token storage.
 *
 * The token from `agent-player login` is kept in one file under the user's
 * config directory, readable by the user only (0600, directory 0700). The
 * token is never printed. `logout` deletes only this file, and only when it is
 * the CLI's own file (it carries the CLI's marker).
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

export const DEFAULT_BACKEND_URL = 'http://127.0.0.1:41522';
export const DEFAULT_FRONTEND_URL = 'http://127.0.0.1:41521';

const TOKEN_FILE_NAME = 'auth.json';
const MARKER = 'agent-player-cli';

export interface StoredSession {
  createdBy: typeof MARKER;
  token: string;
  backendUrl: string;
  email?: string;
  savedAt: string;
}

/**
 * Config directory: $AGENT_PLAYER_CONFIG_DIR, else $XDG_CONFIG_HOME/agent-player,
 * else %APPDATA%\agent-player on Windows, else ~/.config/agent-player.
 */
export function getConfigDir(): string {
  if (process.env.AGENT_PLAYER_CONFIG_DIR) return process.env.AGENT_PLAYER_CONFIG_DIR;
  if (process.env.XDG_CONFIG_HOME) return path.join(process.env.XDG_CONFIG_HOME, 'agent-player');
  if (process.platform === 'win32' && process.env.APPDATA) return path.join(process.env.APPDATA, 'agent-player');
  return path.join(os.homedir(), '.config', 'agent-player');
}

export function getTokenFilePath(): string {
  return path.join(getConfigDir(), TOKEN_FILE_NAME);
}

/** Backend URL: $AGENT_PLAYER_URL / $BACKEND_URL, else the saved one, else the default. */
export function getBackendUrl(): string {
  const fromEnv = process.env.AGENT_PLAYER_URL || process.env.BACKEND_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  const saved = readSession();
  if (saved?.backendUrl) return saved.backendUrl.replace(/\/+$/, '');
  return DEFAULT_BACKEND_URL;
}

/** Web UI URL for pages such as /onboarding: $AGENT_PLAYER_WEB_URL / $FRONTEND_URL, else the default. */
export function getFrontendUrl(): string {
  const fromEnv = process.env.AGENT_PLAYER_WEB_URL || process.env.FRONTEND_URL;
  return (fromEnv || DEFAULT_FRONTEND_URL).replace(/\/+$/, '');
}

/** The saved session, or null when there is none or the file is not the CLI's. */
export function readSession(): StoredSession | null {
  try {
    const data = JSON.parse(fs.readFileSync(getTokenFilePath(), 'utf-8'));
    if (data && data.createdBy === MARKER && typeof data.token === 'string' && data.token) {
      return data as StoredSession;
    }
  } catch {
    // missing or unreadable: not signed in
  }
  return null;
}

export function getStoredToken(): string | null {
  return readSession()?.token ?? null;
}

/** Save the session token (file 0600, directory 0700). */
export function saveSession(token: string, backendUrl: string, email?: string): string {
  const dir = getConfigDir();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = getTokenFilePath();
  const session: StoredSession = {
    createdBy: MARKER,
    token,
    backendUrl,
    email,
    savedAt: new Date().toISOString(),
  };
  // Write to a private temp file first, then move it into place, so the token
  // is never in a file with wider permissions.
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(session, null, 2), { mode: 0o600 });
  fs.chmodSync(tmp, 0o600);
  fs.renameSync(tmp, file);
  fs.chmodSync(file, 0o600);
  return file;
}

/**
 * Remove the CLI's own token file. Anything else at that path (no CLI marker)
 * is left alone. Returns true when the file was removed.
 */
export function clearSession(): boolean {
  if (!readSession()) return false;
  fs.unlinkSync(getTokenFilePath());
  return true;
}
