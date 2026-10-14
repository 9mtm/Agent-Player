/**
 * Outer environment check for the isolated launcher (RUN-ISO ISO-3).
 *
 * The launcher process itself runs under whatever Node, loader and
 * environment started it, so it refuses to go on when that outer process
 * could already have been changed: Node/loader injection variables, dynamic
 * linker variables, npm config, extra tsx settings, or any Node flag other
 * than the `--import tsx` loader. Used by scripts/isolated-server.ts and the
 * tests. Pure: the caller passes the environment and execArgv. Messages name
 * variables, never their values.
 *
 * Expected outer command (see the launcher header):
 *   env -i PATH=<node bin dir>:/usr/bin:/bin HOME=<parent of fresh root> \
 *     AGENT_PLAYER_DATA_DIR=<fresh root> PORT=42521 \
 *     ALLOWED_ORIGINS=http://127.0.0.1:42522 \
 *     <node> --import tsx scripts/isolated-server.ts
 */

import path from 'node:path';

/** Names refused when present at all (even empty). */
export const REFUSED_OUTER_VARS: readonly string[] = [
  'NODE_OPTIONS', 'NODE_PATH', 'NODE_EXTRA_CA_CERTS', 'NODE_TLS_REJECT_UNAUTHORIZED',
  'UV_THREADPOOL_SIZE', 'ELECTRON_RUN_AS_NODE',
];

/** The only tsx variable allowed outside: the launcher's own tsconfig. */
export const ALLOWED_TSX_VAR = 'TSX_TSCONFIG_PATH';

export interface OuterEnvOptions {
  /** Absolute path of packages/backend/tsconfig.json (the launcher-set TSX_TSCONFIG_PATH). */
  tsconfigPath: string;
}

function has(env: NodeJS.ProcessEnv, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(env, name) && env[name] !== undefined;
}

/** True when execArgv is exactly the tsx loader (`--import tsx` or `--import=tsx`). */
export function isAllowedExecArgv(execArgv: readonly string[]): boolean {
  if (execArgv.length === 2) return execArgv[0] === '--import' && execArgv[1] === 'tsx';
  if (execArgv.length === 1) return execArgv[0] === '--import=tsx';
  return false;
}

/** Refusal reasons for the launcher's own environment and Node flags (empty = ok). */
export function checkOuterLauncherEnv(
  env: NodeJS.ProcessEnv,
  execArgv: readonly string[],
  opts: OuterEnvOptions,
): string[] {
  const errors: string[] = [];
  for (const name of REFUSED_OUTER_VARS) {
    if (has(env, name)) errors.push(`${name} must not be set for the isolated launcher`);
  }
  for (const name of Object.keys(env)) {
    if (env[name] === undefined || REFUSED_OUTER_VARS.includes(name)) continue;
    if (name.startsWith('NODE_') && name !== 'NODE_ENV') {
      errors.push(`${name} must not be set for the isolated launcher`);
    } else if (/^npm_config_/i.test(name)) {
      errors.push(`${name} must not be set for the isolated launcher (npm config)`);
    } else if (name.startsWith('TSX_')) {
      if (name !== ALLOWED_TSX_VAR || path.resolve(env[name]!) !== path.resolve(opts.tsconfigPath)) {
        errors.push(`${name} must not be set for the isolated launcher (only ${ALLOWED_TSX_VAR}=<backend tsconfig.json>)`);
      }
    } else if (name.startsWith('LD_') || name.startsWith('DYLD_')) {
      errors.push(`${name} must not be set for the isolated launcher (dynamic linker)`);
    }
  }

  const dataDir = (env.AGENT_PLAYER_DATA_DIR ?? '').trim();
  const home = (env.HOME ?? '').trim();
  if (!home) {
    errors.push('HOME must be set to the parent of AGENT_PLAYER_DATA_DIR');
  } else if (path.isAbsolute(dataDir) && path.resolve(home) !== path.dirname(path.resolve(dataDir))) {
    errors.push('HOME must be the parent of AGENT_PLAYER_DATA_DIR (a throwaway folder, not the real home)');
  }

  if (!isAllowedExecArgv(execArgv)) {
    errors.push('the launcher must be started as `node --import tsx scripts/isolated-server.ts` with no other Node flags');
  }
  return errors;
}
