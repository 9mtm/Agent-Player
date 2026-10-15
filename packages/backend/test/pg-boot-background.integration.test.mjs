// B2.2d-16: the PostgreSQL boot rehearsal WITH background jobs on (the last
// step of B2.2d). Same setup as pg-boot.integration.test.mjs (throwaway,
// already migrated database; temp data root; ephemeral 127.0.0.1 port), but
// AGENT_PLAYER_BACKGROUND is on, so schedulers, timers, watchers and probes
// start. It waits for their first runs, then checks:
//   - that no SQLite file appears (B2.2d-17: the main SQLite database is not
//     used on PostgreSQL; reaching it throws SqliteOnPostgresError);
//   - that nothing tried to reach a non-loopback address (the fetch guard
//     refuses and records it; model URLs point at a closed loopback port).
// Runs ONLY when AGENT_PLAYER_PG_TEST_URL is set (scripts/pg/integration.sh,
// with --test-force-exit because the started timers keep the process alive).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const URL_ = process.env.AGENT_PLAYER_PG_TEST_URL;
const skip = URL_ ? false : 'AGENT_PLAYER_PG_TEST_URL is not set (PostgreSQL integration test)';

const external = [];
let base;
let m = {};
if (URL_) {
  base = realpathSync(mkdtempSync(join(tmpdir(), 'ap-pg-boot-bg-')));
  const dataDir = join(base, 'data');
  const cwdDir = join(base, 'cwd');
  const homeDir = join(base, 'home');
  for (const d of [dataDir, cwdDir, homeDir]) mkdirSync(d, { recursive: true });
  process.chdir(cwdDir);
  delete process.env.AGENT_PLAYER_BACKGROUND;
  for (const k of ['DATABASE_PATH', 'UPLOADS_DIR', 'AUDIT_DB_PATH', 'ENCRYPTION_DB_PATH', 'MCP_SERVERS_DIR', 'STORAGE_BASE_DIR',
    'AGENT_PLAYER_CONFIG_DIR', 'XDG_CONFIG_HOME', 'WHATSAPP_SESSION_PATH', 'DATABASE_URL', 'AGENT_EXEC_TOOLS', 'AGENT_PLAYER_ISOLATED',
    'AGENT_PLAYER_READONLY']) delete process.env[k];
  Object.assign(process.env, {
    HOME: homeDir, NODE_ENV: 'production', HOST: '127.0.0.1', PORT: '0',
    AGENT_PLAYER_DATA_DIR: dataDir, EXTENSIONS_DISABLED: 'true', MEMORY_EMBEDDINGS: 'hash',
    OLLAMA_URL: 'http://127.0.0.1:9', LOCAL_MODEL_API_URL: 'http://127.0.0.1:9/v1', ALLOWED_ORIGINS: 'http://127.0.0.1:42522',
    AGENT_PLAYER_DB: 'postgres', AGENT_PLAYER_PG_URL: URL_, AGENT_PLAYER_PG_POOL_MAX: '4',
    JWT_SECRET: randomBytes(64).toString('hex'), // throwaway, test only
    ENCRYPTION_KEY: randomBytes(32).toString('hex'), // throwaway, test only
    MASTER_ENCRYPTION_KEY: randomBytes(32).toString('base64'), // throwaway, test only
  });
  // Network: loopback only (the model URLs above point at a closed port).
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const target = String(url);
    if (!/^http:\/\/127\.0\.0\.1:\d+\//.test(target)) {
      external.push(target.replace(/[?#].*$/, ''));
      throw new Error(`unexpected network call in test: ${target}`);
    }
    return realFetch(url, init);
  };

  // B2.2d-17: no SQLite at all on PostgreSQL. Any code path that still
  // reaches the main SQLite database throws SqliteOnPostgresError, and no
  // SQLite file may appear under the data root.
  const { closeDatabase } = await import('../src/db/database.ts');
  m = {
    closeDatabase,
    app: await import('../src/api/app.ts'),
    startup: await import('../src/api/startup.ts'),
    pool: await import('../src/db/pg/pool.ts'),
    audit: await import('../src/services/audit-logger.ts'),
    webhooks: await import('../src/webhooks/index.ts'),
  };
}

let server;
test.after(async () => {
  if (!URL_) return;
  await server?.close();
  m.webhooks.shutdownWebhooks();
  await m.audit.flushAuditWrites();
  await m.pool.closePgPool();
  m.closeDatabase();
  rmSync(base, { recursive: true, force: true });
});

test('the backend boots on PostgreSQL with background jobs on; no SQLite file, no external call', { skip }, async () => {
  const quiet = { log: console.log, info: console.info, warn: console.warn };
  console.log = () => {}; console.info = () => {}; console.warn = () => {};
  let summary;
  try {
    server = await m.app.buildServer({ logger: false });
    summary = await m.startup.initializeBackend(server);
    await server.listen({ port: 0, host: '127.0.0.1' });
    // Let the first runs of the started jobs happen (recovery kick, probes, intervals).
    await new Promise((r) => setTimeout(r, 8000));
  } finally {
    Object.assign(console, quiet);
  }
  assert.equal(summary.background, true);
  const addr = server.server.address();
  const url = `http://127.0.0.1:${addr.port}`;
  assert.equal((await fetch(`${url}/health`)).status, 200);
  assert.equal((await fetch(`${url}/api/setup/status`)).status, 200);
  console.log(`[pg-boot-bg] external calls: ${external.join(', ') || '(none)'}`);
  assert.deepEqual(external, [], 'no call left the machine');
  // No store may use a SQLite file on PostgreSQL: not the main database
  // (B2.2d-17), nor webhooks, audit, vault, memory index or orchestrator.
  const dbFiles = readdirSync(join(base, 'data'), { recursive: true }).map(String)
    .filter((f) => /\.(db|sqlite3?)$/.test(f)).sort();
  console.log(`[pg-boot-bg] SQLite files under the data root: ${dbFiles.join(', ') || '(none)'}`);
  assert.deepEqual(dbFiles, []);
});
