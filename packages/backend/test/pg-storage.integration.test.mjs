// B2.2d-1: the storage_files scenario (test/fixtures/storage-scenario.mjs)
// on PostgreSQL: storage manager, extension analytics storage usage and the
// dashboard storage-usage widget.
// Runs ONLY when AGENT_PLAYER_PG_TEST_URL names a THROWAWAY database on
// 127.0.0.1 that the PostgreSQL runner has already migrated (it writes test
// rows and never cleans up: drop the database afterwards). Otherwise every
// test skips. scripts/pg/integration.sh runs it.
//
// The SQLite file (a temp file, never the real .data) is watched: any
// storage_files statement that reaches SQLite during these tests fails the
// last test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { storageScenario } from './fixtures/storage-scenario.mjs';

const URL_ = process.env.AGENT_PLAYER_PG_TEST_URL;
const skip = URL_ ? false : 'AGENT_PLAYER_PG_TEST_URL is not set (PostgreSQL integration test)';
const tag = randomBytes(4).toString('hex');
const sqliteHits = [];

let ctx = {};
let dir;
let closeAll = async () => {};
if (URL_) {
  dir = mkdtempSync(join(tmpdir(), 'ap-pg-storage-'));
  mkdirSync(join(dir, '.data'), { recursive: true });
  process.chdir(dir);
  process.env.HOME = dir;
  // SQLite still backs the modules that are not ported yet: a temp file, never the real .data.
  process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
  process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
  process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
  process.env.AGENT_PLAYER_DB = 'postgres';
  process.env.AGENT_PLAYER_PG_URL = URL_;
  const base = join(dir, 'storage');
  process.env.STORAGE_BASE_DIR = base;
  delete process.env.STORAGE_PROVIDER;
  mkdirSync(join(base, 'cdn', 'images'), { recursive: true });
  writeFileSync(join(base, 'cdn', 'images', `pre-${tag}.png`), 'png');
  const outsideFile = join(dir, 'outside.mp3');
  writeFileSync(outsideFile, 'mp3');

  const quiet = { log: console.log, info: console.info };
  console.log = () => {}; console.info = () => {};
  const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
  await getDatabase().initialize();
  const mgrDb = getDatabase();
  for (const target of [mgrDb, mgrDb.getDb()]) {
    const original = target.prepare;
    target.prepare = function (sql) {
      if (/\bstorage_files\b/i.test(String(sql))) sqliteHits.push(String(sql).replace(/\s+/g, ' ').slice(0, 120));
      return original.call(this, sql);
    };
  }
  const { q } = await import('../src/repositories/sql-steps.ts');
  const { getStorageManager } = await import('../src/services/storage-manager.ts');
  const analytics = await import('../src/services/extension-analytics.ts');
  const pool = await import('../src/db/pg/pool.ts');
  const { default: Fastify } = await import('fastify');
  const { registerDashboardRoutes } = await import('../src/api/routes/dashboard.ts');
  const app = Fastify();
  await app.register(registerDashboardRoutes);
  await app.ready();
  ctx = { mgr: getStorageManager(), q, analytics, app, base, outsideFile };
  closeAll = async () => {
    await app.close();
    Object.assign(console, quiet);
    await pool.closePgPool?.();
    closeDatabase();
  };
}

storageScenario(test, () => ctx, { tag, skip });

test('no storage_files statement reached SQLite', { skip }, () => {
  assert.deepEqual(sqliteHits, []);
});

test.after(async () => {
  await closeAll();
  if (dir) {
    process.chdir('/');
    rmSync(dir, { recursive: true, force: true });
  }
});
