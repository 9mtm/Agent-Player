// B2.2d-15: the multi-agent orchestrator store on PostgreSQL
// (test/fixtures/orchestrator-scenario.mjs; the same scenario runs on SQLite
// in test/orchestrator-store.test.mjs).
// Runs ONLY when AGENT_PLAYER_PG_TEST_URL names a THROWAWAY database on
// 127.0.0.1 that the PostgreSQL runner has already migrated (it writes test
// rows and never cleans up: drop the database afterwards). Otherwise every
// test skips. scripts/pg/integration.sh runs it.
//
// On PostgreSQL the orchestrator must not open its SQLite file: the test
// checks that <data>/multi-agent/orchestrator.db is never created.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { orchestratorScenario, subtaskRestartScenario } from './fixtures/orchestrator-scenario.mjs';

const URL_ = process.env.AGENT_PLAYER_PG_TEST_URL;
const skip = URL_ ? false : 'AGENT_PLAYER_PG_TEST_URL is not set (PostgreSQL integration test)';

let ctx = {};
let dir;
let closeAll = async () => {};
if (URL_) {
  dir = mkdtempSync(join(tmpdir(), 'ap-pg-orchestrator-'));
  mkdirSync(join(dir, '.data'), { recursive: true });
  process.chdir(dir);
  process.env.HOME = dir;
  process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
  process.env.AGENT_PLAYER_DATA_DIR = join(dir, '.data');
  process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
  process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
  process.env.AGENT_PLAYER_DB = 'postgres';
  process.env.AGENT_PLAYER_PG_URL = URL_;

  const quiet = { log: console.log, info: console.info };
  console.log = () => {}; console.info = () => {};
  const pool = await import('../src/db/pg/pool.ts');
  ctx = {
    orchestrator: await import('../src/multi-agent/orchestrator.ts'),
    q: (await import('../src/repositories/sql-steps.ts')).q,
  };
  closeAll = async () => {
    Object.assign(console, quiet);
    await pool.closePgPool();
  };
}

test('scenario: agents, teams and tasks survive a restart on PostgreSQL', { skip }, async () => {
  const { AgentOrchestrator } = ctx.orchestrator;
  const { doneId, openId } = await orchestratorScenario(async () => {
    const o = new AgentOrchestrator();
    await o.initialize();
    return o;
  });
  const { q } = ctx;
  assert.deepEqual(await q.all('SELECT id, name FROM orchestrator_agents ORDER BY id'), [{ id: 'ag-1', name: 'After' }]);
  assert.equal((await q.one('SELECT status FROM orchestrator_tasks WHERE id = ?', doneId)).status, 'completed');
  assert.equal((await q.one('SELECT origin FROM orchestrator_tasks WHERE id = ?', openId)).origin, 'agent');
  assert.equal(Number((await q.one(`SELECT COUNT(*) AS n FROM orchestrator_teams WHERE status = 'disbanded'`)).n), 1);
});

test('writes keep call order (many updates of one task land as the last one)', { skip }, async () => {
  const o = new ctx.orchestrator.AgentOrchestrator();
  await o.initialize();
  const t = o.createTask({ title: 'order', description: 'o' });
  for (let p = 1; p <= 30; p++) o.updateTaskProgress(t.id, p);
  await o.flush();
  assert.equal(Number((await ctx.q.one('SELECT progress FROM orchestrator_tasks WHERE id = ?', t.id)).progress), 30);
  o.close();
});

test('a failed write is logged and does not stop later writes', { skip }, async () => {
  const o = new ctx.orchestrator.AgentOrchestrator();
  await o.initialize();
  const errors = [];
  const original = console.error;
  console.error = (...args) => errors.push(args.map(String).join(' '));
  try {
    // NOT NULL name: this insert fails on the server.
    o.registerAgent({ id: 'ag-bad', name: null, role: 'worker', capabilities: [], maxConcurrentTasks: 1 });
    o.registerAgent({ id: 'ag-good', name: 'Good', role: 'worker', capabilities: [], maxConcurrentTasks: 1 });
    await o.flush();
  } finally {
    console.error = original;
  }
  assert.equal(errors.length, 1);
  assert.match(errors[0], /\[Orchestrator\] PostgreSQL write failed/);
  assert.equal(await ctx.q.one(`SELECT id FROM orchestrator_agents WHERE id = 'ag-bad'`), undefined);
  assert.ok(await ctx.q.one(`SELECT id FROM orchestrator_agents WHERE id = 'ag-good'`));
  o.close();
});

test('no orchestrator SQLite file was created', { skip }, () => {
  assert.equal(existsSync(join(dir, '.data', 'multi-agent', 'orchestrator.db')), false);
  assert.equal(existsSync(join(dir, '.data', 'multi-agent')), false);
});

test('a parent task completes after a restart (subtasks saved and loaded back)', { skip }, async () => {
  await subtaskRestartScenario(async () => {
    const o = new ctx.orchestrator.AgentOrchestrator();
    await o.initialize();
    return o;
  });
});

test.after(async () => {
  await closeAll();
  if (dir) {
    process.chdir('/');
    rmSync(dir, { recursive: true, force: true });
  }
});
