// B2.2d-10: the worlds scenario (test/fixtures/worlds-scenario.mjs) on
// PostgreSQL: world builder + AI world generator routes (behind the auth
// gate); the local model points at a dead loopback port, no paid provider.
// Runs ONLY when AGENT_PLAYER_PG_TEST_URL names a THROWAWAY database on
// 127.0.0.1 that the PostgreSQL runner has already migrated (it writes test
// rows and never cleans up: drop the database afterwards). Otherwise every
// test skips. scripts/pg/integration.sh runs it.
//
// The SQLite file (a temp file, never the real .data) is watched: any
// user_worlds / storage_files statement that reaches SQLite fails the last test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { worldsScenario } from './fixtures/worlds-scenario.mjs';

const URL_ = process.env.AGENT_PLAYER_PG_TEST_URL;
const skip = URL_ ? false : 'AGENT_PLAYER_PG_TEST_URL is not set (PostgreSQL integration test)';
const sqliteHits = [];

let ctx = {};
let dir;
let closeAll = async () => {};
if (URL_) {
  dir = mkdtempSync(join(tmpdir(), 'ap-pg-worlds-'));
  mkdirSync(join(dir, '.data'), { recursive: true });
  process.chdir(dir);
  process.env.HOME = dir;
  // SQLite still backs the modules that are not ported yet: a temp file, never the real .data.
  process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
  process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
  process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
  process.env.AGENT_PLAYER_DB = 'postgres';
  process.env.AGENT_PLAYER_PG_URL = URL_;
  process.env.OLLAMA_URL = 'http://127.0.0.1:9'; // dead loopback port: the local model never answers
  delete process.env.LOCAL_MODEL_API_URL; delete process.env.BACKGROUND_PAID_PURPOSES; delete process.env.ANTHROPIC_API_KEY; delete process.env.CLAUDE_API_KEY;

  const quiet = { log: console.log, info: console.info };
  console.log = () => {}; console.info = () => {};
  const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
  await getDatabase({ path: process.env.DATABASE_PATH }).initialize(); // B2.2d-17: an explicit temp SQLite file, watched for strays
  const mgr = getDatabase();
  for (const target of [mgr, mgr.getDb()]) {
    const original = target.prepare;
    target.prepare = function (sql) {
      if (/\b(user_worlds|storage_files|agents_config)\b/i.test(String(sql))) sqliteHits.push(String(sql).replace(/\s+/g, ' ').slice(0, 120));
      return original.call(this, sql);
    };
  }
  const pool = await import('../src/db/pg/pool.ts');
  const { default: Fastify } = await import('fastify');
  const { registerAuthGate } = await import('../src/auth/auth-gate.ts');
  const { generateToken } = await import('../src/auth/jwt.ts');
  const { worldBuilderRoutes } = await import('../src/api/routes/world-builder.ts');
const { worldGeneratorRoutes } = await import('../src/api/routes/world-generator.ts');
  const app = Fastify();
  registerAuthGate(app);
  await app.register(worldBuilderRoutes);
  await app.register(worldGeneratorRoutes);
  await app.ready();
  ctx = {
    app,
    q: (await import('../src/repositories/sql-steps.ts')).q,
    auth: (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` }),
    storage: join(dir, '.data', 'storage'),
  storage: join(dir, '.data', 'storage'),
  };
  closeAll = async () => {
    await app.close();
    Object.assign(console, quiet);
    await pool.closePgPool();
    closeDatabase();
  };
}

worldsScenario(test, () => ctx, { tag: randomBytes(4).toString('hex'), skip });

test('no user_worlds / storage_files / agents_config statement reached SQLite', { skip }, () => {
  assert.deepEqual(sqliteHits, []);
});

test.after(async () => {
  await closeAll();
  if (dir) {
    process.chdir('/');
    rmSync(dir, { recursive: true, force: true });
  }
});
