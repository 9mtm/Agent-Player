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

import path from 'node:path';
import { realish } from './data-root.js';

export { realish };

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
  /**
   * 1 = read-only; 2 = read-only plus chat with the local Ollama model only;
   * 3 = stage 2 plus hiring agents (create + tool grants) on the fresh fake data.
   */
  stage: 1 | 2 | 3;
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
  // Both stages keep the read-only gate (api/read-only-stage.ts); stage 2
  // opens exactly one more route there (POST /api/chat).
  AGENT_PLAYER_READONLY: '1',
};

export const ISOLATED_STAGE_ENV = 'AGENT_PLAYER_ISOLATED_STAGE';

/**
 * Stage 2 (chat test, owner-approved 2026-10-15): every chat turn goes to the
 * local Ollama on this machine and nowhere else (api/routes/chat.ts reads
 * LOCAL_MODEL_ONLY_ENV): no paid provider, no CLI bridge, no tools.
 */
export const LOCAL_CHAT_OLLAMA_URL = 'http://127.0.0.1:11434';
export const LOCAL_MODEL_ONLY_ENV = 'AGENT_PLAYER_LOCAL_MODEL_ONLY';

/** Dead loopback port forced for every local-model endpoint (nothing listens on port 9). */
export const DEAD_OLLAMA_URL = 'http://127.0.0.1:9';
export const DEAD_LOCAL_MODEL_API_URL = `${DEAD_OLLAMA_URL}/v1`;

/** Provider endpoints the launcher always forces to the dead port (ISO-2). */
export const FORCED_PROVIDER_URLS: Readonly<Record<string, string>> = {
  OLLAMA_URL: DEAD_OLLAMA_URL,
  LOCAL_MODEL_API_URL: DEAD_LOCAL_MODEL_API_URL,
};

/**
 * Environment names that select a model-provider endpoint: the two local
 * ones, Ollama's own OLLAMA_HOST, and every `*_BASE_URL` / `*_API_URL` /
 * `*_API_BASE` (the names provider SDKs read, e.g. ANTHROPIC_BASE_URL,
 * OPENAI_BASE_URL). In isolated mode each must be a loopback http URL.
 */
export function isProviderEndpointVar(name: string): boolean {
  return name === 'OLLAMA_URL' || name === 'LOCAL_MODEL_API_URL' || name === 'OLLAMA_HOST'
    || /_(BASE_URL|API_URL|API_BASE)$/.test(name);
}

/** Thrown when isolated mode refuses an action (HTTP 403, code `isolated_mode`). */
export class IsolatedModeError extends Error {
  readonly statusCode = 403;
  readonly code = 'isolated_mode';
  constructor(message: string) {
    super(message);
    this.name = 'IsolatedModeError';
  }
}

export function isIsolatedMode(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[ISOLATED_ENV] === '1';
}

/**
 * ISO-2: in isolated mode the settings layer never stores a provider that
 * leaves the machine: the provider must stay `local` and its URL must be a
 * loopback http URL. Outside isolated mode this does nothing.
 */
export function assertProviderSettingsAllowed(
  updates: { provider?: unknown; local?: { url?: unknown } | null } | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (!isIsolatedMode(env) || !updates || typeof updates !== 'object') return;
  if (updates.provider !== undefined && updates.provider !== 'local') {
    throw new IsolatedModeError('isolated mode allows only the local provider');
  }
  const url = updates.local && typeof updates.local === 'object' ? updates.local.url : undefined;
  if (url !== undefined && (typeof url !== 'string' || !isLoopbackHttpUrl(url))) {
    throw new IsolatedModeError('isolated mode allows only a loopback provider URL');
  }
}

/** The 403 body for an IsolatedModeError (no detail beyond the code). */
export const ISOLATED_MODE_BODY = Object.freeze({ error: 'Forbidden', code: 'isolated_mode' });

const LOOPBACK_ORIGIN = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\]):(\d{1,5})$/;

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
  const stageValue = (env[ISOLATED_STAGE_ENV] ?? '').trim();
  if (stageValue !== '' && stageValue !== '1' && stageValue !== '2' && stageValue !== '3') errors.push(`${ISOLATED_STAGE_ENV} must be unset, 1, 2 or 3`);
  const stage: 1 | 2 | 3 = stageValue === '3' ? 3 : stageValue === '2' ? 2 : 1;
  for (const [name, forced] of Object.entries(FORCED_VARS)) {
    if (set(env, name) && env[name]!.trim().toLowerCase() !== forced) errors.push(`${name} must be unset or ${forced}`);
  }
  if (set(env, LOCAL_MODEL_ONLY_ENV)) errors.push(`${LOCAL_MODEL_ONLY_ENV} must be unset (the launcher sets it for stage 2)`);
  // ISO-2: the launcher sets every provider endpoint itself (the dead port;
  // in stage 2 OLLAMA_URL is the local Ollama); an inherited value, even a
  // loopback one, is refused, never passed through.
  for (const name of Object.keys(env)) {
    if (!isProviderEndpointVar(name) || !set(env, name)) continue;
    errors.push(`${name} must be unset (the launcher sets every model endpoint itself)`);
  }
  if (errors.length || dataDir === null || port === null || origins === null) return { ok: false, errors };
  return { ok: true, config: { dataDir, port, origins, stage } };
}

export function isLoopbackHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname) && !u.username && !u.password;
  } catch {
    return false;
  }
}

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
    ...FORCED_PROVIDER_URLS,
    [ISOLATED_STAGE_ENV]: String(cfg.stage ?? 1),
  };
  if (cfg.stage === 2 || cfg.stage === 3) {
    child.OLLAMA_URL = LOCAL_CHAT_OLLAMA_URL;
    child[LOCAL_MODEL_ONLY_ENV] = '1';
  }
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
  const stage = (env[ISOLATED_STAGE_ENV] ?? '').trim();
  if (stage !== '1' && stage !== '2' && stage !== '3') errors.push(`${ISOLATED_STAGE_ENV} must be 1, 2 or 3`);
  const localChat = stage === '2' || stage === '3';
  // ISO-2: both local endpoints are exactly the dead port (stage 2: OLLAMA_URL
  // is exactly the local Ollama and every turn is local-only), and no other
  // provider endpoint variable may point off the machine.
  const expected: Record<string, string> = localChat ? { ...FORCED_PROVIDER_URLS, OLLAMA_URL: LOCAL_CHAT_OLLAMA_URL } : { ...FORCED_PROVIDER_URLS };
  for (const [name, forced] of Object.entries(expected)) {
    if ((env[name] ?? '').trim() !== forced) errors.push(`${name} must be ${forced}`);
  }
  if (localChat && (env[LOCAL_MODEL_ONLY_ENV] ?? '').trim() !== '1') errors.push(`${LOCAL_MODEL_ONLY_ENV} must be 1 in stages 2 and 3`);
  if (!localChat && set(env, LOCAL_MODEL_ONLY_ENV)) errors.push(`${LOCAL_MODEL_ONLY_ENV} must be unset in stage 1`);
  for (const name of Object.keys(env)) {
    if (isProviderEndpointVar(name) && set(env, name) && !isLoopbackHttpUrl(env[name]!)) {
      errors.push(`${name} must be a loopback http URL`);
    }
  }
  // CLI providers and every exec-class tool stay off (tools/exec-policy.ts also refuses them).
  if (set(env, 'AGENT_EXEC_TOOLS')) errors.push('AGENT_EXEC_TOOLS must be unset (CLI providers and exec tools are off)');
  if (dataDir) {
    if (!isInsideOrEqual(cwd, dataDir)) errors.push('the working directory must be inside AGENT_PLAYER_DATA_DIR');
    for (const name of ['HOME', 'XDG_CONFIG_HOME', 'TMPDIR']) {
      if (set(env, name) && !isInsideOrEqual(env[name]!, dataDir)) errors.push(`${name} must be inside AGENT_PLAYER_DATA_DIR`);
    }
  }
  return errors;
}
