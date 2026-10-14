// B2.2c part 2: the app boots with AGENT_PLAYER_DB=postgres. buildServer() and
// the startup chain (initializeBackend) run in-process on a THROWAWAY,
// already migrated PostgreSQL database, with AGENT_PLAYER_BACKGROUND=off, and
// the server listens on an ephemeral 127.0.0.1 port inside this test only.
// Runs ONLY when AGENT_PLAYER_PG_TEST_URL is set (scripts/pg/integration.sh);
// otherwise it skips. Every other store lives in a temp data root.
//
// It also records which tables the boot still reads or writes on the SQLite
// side (modules not ported yet); the list is printed for the report.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const URL_ = process.env.AGENT_PLAYER_PG_TEST_URL;
const skip = URL_ ? false : 'AGENT_PLAYER_PG_TEST_URL is not set (PostgreSQL integration test)';

const sqliteTables = new Set();
let base;
let m = {};
if (URL_) {
  base = realpathSync(mkdtempSync(join(tmpdir(), 'ap-pg-boot-')));
  const dataDir = join(base, 'data');
  const cwdDir = join(base, 'cwd');
  const homeDir = join(base, 'home');
  for (const d of [dataDir, cwdDir, homeDir]) mkdirSync(d, { recursive: true });
  process.chdir(cwdDir);
  for (const k of ['DATABASE_PATH', 'UPLOADS_DIR', 'AUDIT_DB_PATH', 'ENCRYPTION_DB_PATH', 'MCP_SERVERS_DIR', 'STORAGE_BASE_DIR',
    'AGENT_PLAYER_CONFIG_DIR', 'XDG_CONFIG_HOME', 'WHATSAPP_SESSION_PATH', 'DATABASE_URL', 'AGENT_EXEC_TOOLS', 'AGENT_PLAYER_ISOLATED',
    'AGENT_PLAYER_READONLY']) delete process.env[k];
  Object.assign(process.env, {
    HOME: homeDir, NODE_ENV: 'production', HOST: '127.0.0.1', PORT: '0',
    AGENT_PLAYER_DATA_DIR: dataDir, AGENT_PLAYER_BACKGROUND: 'off', EXTENSIONS_DISABLED: 'true', MEMORY_EMBEDDINGS: 'hash',
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
    if (!/^http:\/\/127\.0\.0\.1:\d+\//.test(target)) throw new Error(`unexpected network call in test: ${target}`);
    return realFetch(url, init);
  };

  const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
  const mgr = getDatabase();
  const watch = (target) => {
    const original = target.prepare;
    target.prepare = function (sql) {
      for (const t of String(sql).matchAll(/\b(?:FROM|INTO|UPDATE|JOIN)\s+([a-z_][a-z0-9_]*)/gi)) sqliteTables.add(t[1].toLowerCase());
      return original.call(this, sql);
    };
  };
  watch(mgr);
  m = {
    closeDatabase,
    getDatabase,
    watch,
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

test('the backend boots on PostgreSQL (buildServer + startup chain, background off) and serves on loopback', { skip }, async () => {
  const quiet = { log: console.log, info: console.info, warn: console.warn };
  console.log = () => {}; console.info = () => {}; console.warn = () => {};
  let summary;
  try {
    server = await m.app.buildServer({ logger: false });
    m.watch(m.getDatabase().getDb());
    summary = await m.startup.initializeBackend(server);
    await server.listen({ port: 0, host: '127.0.0.1' });
  } finally {
    Object.assign(console, quiet);
  }
  assert.equal(summary.background, false);
  const addr = server.server.address();
  assert.equal(addr.address, '127.0.0.1');
  const base = `http://127.0.0.1:${addr.port}`;
  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  // Ported routes answer from PostgreSQL through the real server.
  const setup = await fetch(`${base}/api/setup/status`);
  assert.equal(setup.status, 200);
  assert.equal(typeof (await setup.json()).setupComplete, 'boolean');
  assert.equal((await fetch(`${base}/api/webhooks/status`)).status, 401, 'auth gate in front');
  const denied = await fetch(`${base}/api/database/backup`, { method: 'POST' });
  assert.equal(denied.status, 401);
  console.log(`[pg-boot] listening on ${base}; SQLite-side tables touched during boot and requests: ${[...sqliteTables].sort().join(', ') || '(none)'}`);
});
