// BOARD-01: the task board on PostgreSQL.
// Runs ONLY when AGENT_PLAYER_PG_TEST_URL names a THROWAWAY database on
// 127.0.0.1 that the PostgreSQL runner has already migrated (it writes test
// rows and never cleans up: drop the database afterwards). Otherwise every
// test skips. scripts/pg/integration.sh runs it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const URL_ = process.env.AGENT_PLAYER_PG_TEST_URL;
const skip = URL_ ? false : 'AGENT_PLAYER_PG_TEST_URL is not set (PostgreSQL integration test)';
const sqliteHits = [];
const tag = randomBytes(4).toString('hex');
let m = {};
let dir;
let closeAll = async () => {};
if (URL_) {
  dir = mkdtempSync(join(tmpdir(), 'ap-pg-board-'));
  mkdirSync(join(dir, '.data'), { recursive: true });
  process.chdir(dir);
  process.env.HOME = dir;
  process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
  process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
  process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
  process.env.AGENT_PLAYER_DB = 'postgres';
  process.env.AGENT_PLAYER_PG_URL = URL_;
  const quiet = { log: console.log, info: console.info };
  console.log = () => {}; console.info = () => {};
  const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
  await getDatabase({ path: process.env.DATABASE_PATH }).initialize();
  const mgr = getDatabase();
  for (const target of [mgr, mgr.getDb()]) {
    const original = target.prepare;
    target.prepare = function (sql) {
      if (/\bboard(s|_\w+)\b/i.test(String(sql))) sqliteHits.push(String(sql).replace(/\s+/g, ' ').slice(0, 120));
      return original.call(this, sql);
    };
  }
  const pool = await import('../src/db/pg/pool.ts');
  m = { q: (await import('../src/repositories/sql-steps.ts')).q, board: await import('../src/services/task-board.ts') };
  closeAll = async () => { Object.assign(console, quiet); await pool.closePgPool(); closeDatabase(); };
}

test('board, cards, moves, conflict and comments on PostgreSQL', { skip }, async () => {
  const { q, board } = m;
  const owner = `pg-owner-${tag}`;
  await q.run(`INSERT INTO agents_config (id, name) VALUES (?, ?)`, `pg-ag-${tag}`, `Board Agent ${tag}`);
  const [b] = await board.listBoards(owner);
  assert.equal((await board.listBoards(owner)).length, 1);
  let view = await board.getBoard(owner, b.id);
  assert.equal(view.columns.length, 5);
  const todo = view.columns[1].id; const doing = view.columns[2].id;
  const c1 = await board.createCard(owner, b.id, { columnId: todo, title: 'One', agents: [`pg-ag-${tag}`], departments: ['Sales'] });
  const c2 = await board.createCard(owner, b.id, { columnId: doing, title: 'Two' });
  const moved = await board.updateCard(owner, b.id, c1.id, { expectedVersion: 1, columnId: doing, beforeCardId: c2.id });
  assert.equal(moved.version, 2);
  view = await board.getBoard(owner, b.id);
  assert.deepEqual(view.cards.filter((c) => c.columnId === doing).map((c) => c.title), ['One', 'Two']);
  await assert.rejects(board.updateCard(owner, b.id, c1.id, { expectedVersion: 1, title: 'x' }), (e) => e.code === 'version_conflict');
  const comments = await board.addComment(owner, b.id, c1.id, { body: 'Hello' }, { kind: 'user', id: owner });
  assert.equal(comments.length, 1);
  assert.deepEqual((await board.getBoard(owner, b.id)).cards.find((c) => c.id === c1.id).departments, ['sales']);
  await assert.rejects(board.getBoard('someone-else', b.id), (e) => e.code === 'not_found');
});

test('no board statement reached SQLite', { skip }, () => { assert.deepEqual(sqliteHits, []); });

test.after(async () => {
  await closeAll();
  if (dir) { process.chdir('/'); rmSync(dir, { recursive: true, force: true }); }
});
