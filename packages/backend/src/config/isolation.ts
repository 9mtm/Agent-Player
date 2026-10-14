/**
 * Isolated backend rules (RUN-ISO F3).
 *
 * Used twice:
 *  - by the launcher `scripts/isolated-server.ts` (`checkLauncherEnv`), which
 *    refuses to start and builds a clean child environment;
 *  - by the server itself when `AGENT_PLAYER_ISOLATED=1`
 *    (`checkIsolatedServerEnv`, from config/load-env.ts, before any store is
 *    opened or any secret is generated).
 *
 * Pure functions: the caller passes the environment, the repo root and the
 * real home directories. Messages name variables, never their values.
 */

import fs from 'node:fs';
import path from 'node:path';

export const ISOLATED_ENV = 'AGENT_PLAYER_ISOLATED';
export const ISOLATED_HOST = '127.0.0.1';

export interface IsolationContext {
  /** Root of the source checkout (the data dir must be outside it). */
  repoRoot: string;
  /** Real home directories (the data dir must be outside each). */
  homeDirs: string[];
}

export interface IsolatedLaunchConfig {
  dataDir: string;
  port: number;
  origins: string[];
}

/** Database selectors that must stay unset (SQLite under the data dir only). */
export const FORBIDDEN_DB_VARS = ['AGENT_PLAYER_DB', 'AGENT_PLAYER_PG_URL', 'DATABASE_URL'] as const;

/** Per-store path overrides: every store must resolve under AGENT_PLAYER_DATA_DIR instead. */
export const FORBIDDEN_STORE_VARS = [
  'DATABASE_PATH', 'UPLOADS_DIR', 'AUDIT_DB_PATH', 'ENCRYPTION_DB_PATH', 'MCP_SERVERS_DIR',
  'STORAGE_BASE_DIR', 'AGENT_PLAYER_CONFIG_DIR', 'WHATSAPP_SESSION_PATH',
] as const;

/** Values the launcher forces; a conflicting value is refused, not overridden. */
export const FORCED_VARS: Readonly<Record<string, string>> = {
  AGENT_PLAYER_BACKGROUND: 'off',
  EXTENSIONS_DISABLED: 'true',
  MEMORY_EMBEDDINGS: 'hash',
};

const LOOPBACK_ORIGIN = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\]):(\d{1,5})$/;

/** realpath of the nearest existing ancestor, plus the rest (symlinks such as /tmp -> /private/tmp). */
export function realish(p: string): string {
  const abs = path.resolve(p);
  let cur = abs;
  const rest: string[] = [];
  for (;;) {
    try {
      return path.join(fs.realpathSync.native(cur), ...rest.reverse());
    } catch {
      const parent = path.dirname(cur);
      if (parent === cur) return abs;
      rest.push(path.basename(cur));
      cur = parent;
    }
  }
}

function caseFold(p: string): string {
  return process.platform === 'darwin' || process.platform === 'win32' ? p.toLowerCase() : p;
}

/** True when `child` is `parent` or inside it (after realpath and case folding). */
export function isInsideOrEqual(child: string, parent: string): boolean {
  const c = caseFold(realish(child));
  const p = caseFold(realish(parent));
  const rel = path.relative(p, c);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function set(env: NodeJS.ProcessEnv, name: string): boolean {
  return (env[name] ?? '').trim() !== '';
}

function checkDataDir(raw: string | undefined, ctx: IsolationContext, errors: string[]): string | null {
  const value = (raw ?? '').trim();
  if (!value) {
    errors.push('AGENT_PLAYER_DATA_DIR is required');
    return null;
  }
  if (!path.isAbsolute(value)) {
    errors.push('AGENT_PLAYER_DATA_DIR must be an absolute path');
    return null;
  }
  const dir = path.resolve(value);
  const before = errors.length;
  if (path.dirname(dir) === dir) errors.push('AGENT_PLAYER_DATA_DIR must not be a filesystem root');
  if (isInsideOrEqual(dir, ctx.repoRoot) || isInsideOrEqual(ctx.repoRoot, dir)) {
    errors.push('AGENT_PLAYER_DATA_DIR must be outside the source checkout');
  }
  for (const home of ctx.homeDirs.filter(Boolean)) {
    if (isInsideOrEqual(dir, home) || isInsideOrEqual(home, dir)) {
      errors.push('AGENT_PLAYER_DATA_DIR must be outside the home directory');
      break;
    }
  }
  return errors.length === before ? dir : null;
}

function checkPort(raw: string | undefined, errors: string[]): number | null {
  const value = (raw ?? '').trim();
  if (!value) {
    errors.push('PORT is required');
    return null;
  }
  const n = /^\d{1,5}$/.test(value) ? Number(value) : NaN;
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    errors.push('PORT must be a number from 1 to 65535');
    return null;
  }
  return n;
}

function checkOrigins(raw: string | undefined, errors: string[]): string[] | null {
  const value = (raw ?? '').trim();
  if (!value) {
    errors.push('ALLOWED_ORIGINS is required (an exact, comma-separated list of loopback origins)');
    return null;
  }
  const origins = value.split(',').map((o) => o.trim());
  for (const o of origins) {
    const m = LOOPBACK_ORIGIN.exec(o);
    const port = m ? Number(m[2]) : 0;
    if (!m || port < 1 || port > 65535) {
      errors.push('ALLOWED_ORIGINS must list exact origins like http://127.0.0.1:42522 (loopback, explicit port, no wildcard, no path)');
      return null;
    }
  }
  return origins;
}

function checkCommon(env: NodeJS.ProcessEnv, errors: string[]): void {
  for (const name of FORBIDDEN_DB_VARS) {
    if (set(env, name)) errors.push(`${name} must be unset (isolated mode uses SQLite under AGENT_PLAYER_DATA_DIR)`);
  }
  for (const name of FORBIDDEN_STORE_VARS) {
    if (set(env, name)) errors.push(`${name} must be unset (every store lives under AGENT_PLAYER_DATA_DIR)`);
  }
  const provider = (env.STORAGE_PROVIDER ?? '').trim().toLowerCase();
  if (provider && provider !== 'local') errors.push('STORAGE_PROVIDER must be unset or local');
}

/**
 * Launcher check. Returns the config, or the refusal reasons.
 * HOST may be unset (it is forced to 127.0.0.1) or exactly 127.0.0.1.
 */
export function checkLauncherEnv(
  env: NodeJS.ProcessEnv,
  ctx: IsolationContext,
): { ok: true; config: IsolatedLaunchConfig } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const dataDir = checkDataDir(env.AGENT_PLAYER_DATA_DIR, ctx, errors);
  if (set(env, 'HOST') && env.HOST!.trim() !== ISOLATED_HOST) errors.push(`HOST must be unset or ${ISOLATED_HOST}`);
  const port = checkPort(env.PORT, errors);
  const origins = checkOrigins(env.ALLOWED_ORIGINS, errors);
  checkCommon(env, errors);
  for (const [name, forced] of Object.entries(FORCED_VARS)) {
    if (set(env, name) && env[name]!.trim().toLowerCase() !== forced) errors.push(`${name} must be unset or ${forced}`);
  }
  for (const name of ['OLLAMA_URL', 'LOCAL_MODEL_API_URL']) {
    if (set(env, name) && !isLoopbackHttpUrl(env[name]!)) errors.push(`${name} must be a loopback http URL`);
  }
  if (errors.length || dataDir === null || port === null || origins === null) return { ok: false, errors };
  return { ok: true, config: { dataDir, port, origins } };
}

export function isLoopbackHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname) && !u.username && !u.password;
  } catch {
    return false;
  }
}

/** Dead loopback port used for Ollama when the operator names none (nothing listens on port 9). */
export const DEAD_OLLAMA_URL = 'http://127.0.0.1:9';

/**
 * The child environment, built from nothing (like `env -i`): no inherited
 * keys, tokens or provider settings reach the isolated server.
 */
export function buildIsolatedChildEnv(
  cfg: IsolatedLaunchConfig,
  parent: NodeJS.ProcessEnv,
  nodeBinDir: string,
): NodeJS.ProcessEnv {
  const home = path.join(cfg.dataDir, 'home');
  const child: NodeJS.ProcessEnv = {
    PATH: [nodeBinDir, '/usr/bin', '/bin'].join(path.delimiter),
    HOME: home,
    XDG_CONFIG_HOME: path.join(home, '.config'),
    TMPDIR: path.join(cfg.dataDir, 'tmp'),
    NODE_ENV: 'production',
    HOST: ISOLATED_HOST,
    PORT: String(cfg.port),
    ALLOWED_ORIGINS: cfg.origins.join(','),
    NEXT_PUBLIC_APP_URL: cfg.origins[0],
    AGENT_PLAYER_DATA_DIR: cfg.dataDir,
    [ISOLATED_ENV]: '1',
    ...FORCED_VARS,
    OLLAMA_URL: (parent.OLLAMA_URL ?? '').trim() || DEAD_OLLAMA_URL,
    LOCAL_MODEL_API_URL: (parent.LOCAL_MODEL_API_URL ?? '').trim() || `${DEAD_OLLAMA_URL}/v1`,
  };
  for (const name of ['LANG', 'LC_ALL', 'TZ']) {
    if (parent[name]) child[name] = parent[name];
  }
  return child;
}

/**
 * Server-side check when AGENT_PLAYER_ISOLATED=1 (defence in depth: the
 * launcher already enforced the same rules). Returns refusal reasons.
 */
export function checkIsolatedServerEnv(env: NodeJS.ProcessEnv, ctx: IsolationContext, cwd: string): string[] {
  const errors: string[] = [];
  const dataDir = checkDataDir(env.AGENT_PLAYER_DATA_DIR, ctx, errors);
  if ((env.HOST ?? '').trim() !== ISOLATED_HOST) errors.push(`HOST must be ${ISOLATED_HOST}`);
  checkPort(env.PORT, errors);
  checkOrigins(env.ALLOWED_ORIGINS, errors);
  checkCommon(env, errors);
  for (const [name, forced] of Object.entries(FORCED_VARS)) {
    if ((env[name] ?? '').trim().toLowerCase() !== forced) errors.push(`${name} must be ${forced}`);
  }
  if (dataDir) {
    if (!isInsideOrEqual(cwd, dataDir)) errors.push('the working directory must be inside AGENT_PLAYER_DATA_DIR');
    for (const name of ['HOME', 'XDG_CONFIG_HOME', 'TMPDIR']) {
      if (set(env, name) && !isInsideOrEqual(env[name]!, dataDir)) errors.push(`${name} must be inside AGENT_PLAYER_DATA_DIR`);
    }
  }
  return errors;
}
