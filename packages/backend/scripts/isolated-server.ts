/**
 * Isolated backend launcher (RUN-ISO F2/F3).
 *
 * Starts src/api/server.ts as a child process with an environment built from
 * nothing (like `env -i`), so no real key, token, database or config reaches
 * it, and with every store under one throwaway data root.
 *
 * Usage (from packages/backend; values are placeholders):
 *
 *   AGENT_PLAYER_DATA_DIR=/absolute/temp/dir/data PORT=<port> \
 *   ALLOWED_ORIGINS=http://127.0.0.1:<ui-port> \
 *   node --import tsx scripts/isolated-server.ts
 *
 * Refuses to start (exit 2) when:
 *  - AGENT_PLAYER_DATA_DIR is unset, relative, a filesystem root, inside (or
 *    containing) the source checkout, or inside (or containing) the real home;
 *  - HOST is set to anything but 127.0.0.1 (it is forced to 127.0.0.1);
 *  - PORT is missing or not 1-65535;
 *  - ALLOWED_ORIGINS is missing or not an exact list of loopback origins;
 *  - AGENT_PLAYER_DB, AGENT_PLAYER_PG_URL or DATABASE_URL is set;
 *  - a per-store path override (DATABASE_PATH, UPLOADS_DIR, ...) is set;
 *  - AGENT_PLAYER_BACKGROUND, EXTENSIONS_DISABLED or MEMORY_EMBEDDINGS is set
 *    to anything but off / true / hash (they are forced to those values);
 *  - OLLAMA_URL or LOCAL_MODEL_API_URL is not a loopback http URL (when
 *    unset, both point at the dead port http://127.0.0.1:9).
 *
 * The child gets AGENT_PLAYER_ISOLATED=1, so the server re-checks the same
 * rules before it generates secrets or opens any store. Its cwd, HOME,
 * XDG_CONFIG_HOME and TMPDIR are inside the data root; its output goes to
 * <data root>/logs/backend.log. This launcher prints only
 * `listening on 127.0.0.1:<port>` and the data dir, never a secret.
 * Ctrl-C (SIGINT) or SIGTERM is passed to the server for a clean shutdown.
 */

import { spawn } from 'node:child_process';
import { mkdirSync, openSync, closeSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIsolatedChildEnv, checkLauncherEnv } from '../src/config/isolation.js';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(backendDir, '..', '..');

const homeDirs = [os.userInfo().homedir, process.env.HOME ?? ''].filter(Boolean);
const checked = checkLauncherEnv(process.env, { repoRoot, homeDirs });
if (!checked.ok) {
  for (const e of checked.errors) console.error(`refused: ${e}`);
  process.exit(2);
}
const cfg = checked.config;

const dirs = {
  run: path.join(cfg.dataDir, 'run'),
  home: path.join(cfg.dataDir, 'home'),
  config: path.join(cfg.dataDir, 'home', '.config'),
  tmp: path.join(cfg.dataDir, 'tmp'),
  logs: path.join(cfg.dataDir, 'logs'),
};
mkdirSync(cfg.dataDir, { recursive: true, mode: 0o700 });
for (const d of Object.values(dirs)) mkdirSync(d, { recursive: true, mode: 0o700 });

const env = buildIsolatedChildEnv(cfg, process.env, path.dirname(process.execPath));
env.TSX_TSCONFIG_PATH = path.join(backendDir, 'tsconfig.json');

const logFd = openSync(path.join(dirs.logs, 'backend.log'), 'a', 0o600);
const child = spawn(process.execPath, ['--import', import.meta.resolve('tsx'), path.join(backendDir, 'src', 'api', 'server.ts')], {
  cwd: dirs.run,
  env,
  stdio: ['ignore', logFd, logFd, 'ipc'],
});
closeSync(logFd);

child.on('message', (msg: any) => {
  if (msg && msg.type === 'listening' && Number.isInteger(msg.port)) {
    console.log(`listening on 127.0.0.1:${msg.port}`);
    console.log(`data dir: ${cfg.dataDir}`);
  }
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => { child.kill(signal); });
}

child.on('exit', (code, signal) => {
  if (code !== 0) console.error(`server stopped (${signal ?? `exit ${code}`}); see ${path.join(dirs.logs, 'backend.log')}`);
  process.exit(code ?? 1);
});
