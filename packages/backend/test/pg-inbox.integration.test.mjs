// B2.2d-17: the inbox store scenario (test/fixtures/inbox-store-scenario.mjs)
// on PostgreSQL. Before B2.2d-17 the inbox used the SQLite file on PostgreSQL
// too; here no SQLite is opened at all (reaching it throws).
// Runs ONLY when AGENT_PLAYER_PG_TEST_URL names a THROWAWAY database on
// 127.0.0.1 that the PostgreSQL runner has already migrated (it writes test
// rows and never cleans up: drop the database afterwards). Otherwise every
// test skips. scripts/pg/integration.sh runs it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { inboxStoreScenario } from './fixtures/inbox-store-scenario.mjs';

const URL_ = process.env.AGENT_PLAYER_PG_TEST_URL;
const skip = URL_ ? false : 'AGENT_PLAYER_PG_TEST_URL is not set (PostgreSQL integration test)';

let ctx = {};
let dir;
let closeAll = async () => {};
if (URL_) {
  dir = mkdtempSync(join(tmpdir(), 'ap-pg-inbox-'));
  mkdirSync(join(dir, '.data'), { recursive: true });
  process.chdir(dir);
  process.env.HOME = dir;
  process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
  process.env.AGENT_PLAYER_DB = 'postgres';
  process.env.AGENT_PLAYER_PG_URL = URL_;

  const quiet = { log: console.log, info: console.info };
  console.log = () => {}; console.info = () => {};
  const pool = await import('../src/db/pg/pool.ts');
  ctx = {
    MessageStore: (await import('../src/inbox/core/message-store.ts')).MessageStore,
    ApprovalEngine: (await import('../src/inbox/approval/approval-engine.ts')).ApprovalEngine,
    database: await import('../src/db/database.ts'),
  };
  closeAll = async () => {
    Object.assign(console, quiet);
    await pool.closePgPool();
  };
}

test('inbox messages and approval rules on PostgreSQL', { skip }, async () => {
  await inboxStoreScenario(ctx, randomBytes(4).toString('hex'));
});

test('the main SQLite database is refused on PostgreSQL and was never created', { skip }, () => {
  assert.throws(() => ctx.database.getDatabase(), (e) => e instanceof ctx.database.SqliteOnPostgresError);
  assert.equal(existsSync(process.env.DATABASE_PATH), false);
});

test.after(async () => {
  await closeAll();
  if (dir) {
    process.chdir('/');
    rmSync(dir, { recursive: true, force: true });
  }
});
