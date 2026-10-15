// B2.2d-6: the leftovers scenario (test/fixtures/pg-leftovers-scenario.mjs)
// on PostgreSQL: resolveToolUser reads users and the extension runner
// reads/writes extension_configs on PostgreSQL, where those tables live.
// Runs ONLY when AGENT_PLAYER_PG_TEST_URL names a THROWAWAY database on
// 127.0.0.1 that the PostgreSQL runner has already migrated (it writes test
// rows and never cleans up: drop the database afterwards). Otherwise every
// test skips. scripts/pg/integration.sh runs it.
//
// The SQLite file (a temp file, never the real .data) is watched: any
// users / extension_configs statement that reaches SQLite fails the last test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { leftoversScenario } from './fixtures/pg-leftovers-scenario.mjs';

const URL_ = process.env.AGENT_PLAYER_PG_TEST_URL;
const skip = URL_ ? false : 'AGENT_PLAYER_PG_TEST_URL is not set (PostgreSQL integration test)';
const sqliteHits = [];

let ctx = {};
let dir;
let closeAll = async () => {};
if (URL_) {
  dir = mkdtempSync(join(tmpdir(), 'ap-pg-leftovers-'));
  mkdirSync(join(dir, '.data'), { recursive: true });
  process.chdir(dir);
  process.env.HOME = dir;
  // SQLite still backs the modules that are not ported yet: a temp file, never the real .data.
  process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
  process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
  process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
  process.env.AGENT_PLAYER_DB = 'postgres';
  process.env.AGENT_PLAYER_PG_URL = URL_;
  delete process.env.EXTENSIONS_DISABLED;

  const quiet = { log: console.log, info: console.info, warn: console.warn };
  console.log = () => {}; console.info = () => {}; console.warn = () => {};
  const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
  await getDatabase().initialize();
  const mgr = getDatabase();
  for (const target of [mgr, mgr.getDb()]) {
    const original = target.prepare;
    target.prepare = function (sql) {
      if (/\b(users|extension_configs)\b/i.test(String(sql))) sqliteHits.push(String(sql).replace(/\s+/g, ' ').slice(0, 120));
      return original.call(this, sql);
    };
  }
  const pool = await import('../src/db/pg/pool.ts');
  ctx = {
    q: (await import('../src/repositories/sql-steps.ts')).q,
    tools: await import('../src/tools/credentials/credentials-save.ts'),
    Runner: (await import('../src/plugins/extension-runner.ts')).ExtensionRunner,
    Fastify: (await import('fastify')).default,
    extDir: join(dir, 'extensions'),
  };
  closeAll = async () => {
    Object.assign(console, quiet);
    await pool.closePgPool();
    closeDatabase();
  };
}

leftoversScenario(test, () => ctx, { tag: randomBytes(4).toString('hex'), skip });

test('no users / extension_configs statement reached SQLite', { skip }, () => {
  assert.deepEqual(sqliteHits, []);
});

test.after(async () => {
  await closeAll();
  if (dir) {
    process.chdir('/');
    rmSync(dir, { recursive: true, force: true });
  }
});
