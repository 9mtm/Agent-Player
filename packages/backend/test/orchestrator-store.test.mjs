// B2.2d-15: the multi-agent orchestrator store on SQLite: its own file with
// tables agents/teams/tasks (unchanged), rows written at once and loaded back
// after a restart (test/fixtures/orchestrator-scenario.mjs; the same scenario
// runs on PostgreSQL in test/pg-orchestrator.integration.test.mjs).
// Run: node --import tsx --test test/orchestrator-store.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { orchestratorScenario, subtaskRestartScenario } from './fixtures/orchestrator-scenario.mjs';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-orchestrator-'));
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
delete process.env.AGENT_PLAYER_DB;

const quiet = { log: console.log, info: console.info };
console.log = () => {}; console.info = () => {};
const { AgentOrchestrator, orchestratorSchemaSql, orchestratorTablesFor } = await import(join(backendDir, 'src/multi-agent/orchestrator.ts'));
const file = join(dir, 'multi-agent', 'orchestrator.db');

test.after(() => {
  Object.assign(console, quiet);
  process.chdir(backendDir);
  rmSync(dir, { recursive: true, force: true });
});

test('SQLite keeps the old table names in its own file', () => {
  assert.deepEqual(orchestratorTablesFor('sqlite'), { agents: 'agents', teams: 'teams', tasks: 'tasks' });
  assert.match(orchestratorSchemaSql(), /CREATE TABLE IF NOT EXISTS tasks \(/);
  assert.match(orchestratorSchemaSql(), /idx_tasks_status ON tasks\(status\)/);
});

test('scenario: agents, teams and tasks survive a restart', async () => {
  const { doneId, openId } = await orchestratorScenario(async () => {
    const o = new AgentOrchestrator();
    await o.initialize(file);
    return o;
  });
  const db = new Database(file, { readonly: true });
  try {
    assert.deepEqual(db.prepare('SELECT id, name FROM agents').all(), [{ id: 'ag-1', name: 'After' }]);
    assert.equal(db.prepare('SELECT status FROM tasks WHERE id = ?').get(doneId).status, 'completed');
    assert.equal(db.prepare('SELECT origin FROM tasks WHERE id = ?').get(openId).origin, 'agent');
  } finally {
    db.close();
  }
});

test('an old file without the origin column gets it (S1.2 upgrade kept)', async () => {
  const old = join(dir, 'old', 'orchestrator.db');
  const { mkdirSync } = await import('node:fs');
  mkdirSync(join(dir, 'old'));
  const raw = new Database(old);
  raw.exec(orchestratorSchemaSql().replace(',\n        origin TEXT', ''));
  assert.ok(!raw.prepare("SELECT name FROM pragma_table_info('tasks')").all().some((c) => c.name === 'origin'));
  raw.close();
  const o = new AgentOrchestrator();
  await o.initialize(old);
  const t = o.createTask({ title: 't', description: 'd', origin: 'owner' });
  o.close();
  const check = new Database(old, { readonly: true });
  assert.equal(check.prepare('SELECT origin FROM tasks WHERE id = ?').get(t.id).origin, 'owner');
  check.close();
});

test('a parent task completes after a restart (subtasks saved and loaded back)', async () => {
  await subtaskRestartScenario(async () => {
    const o = new AgentOrchestrator();
    await o.initialize(join(dir, 'sub', 'orchestrator.db'));
    return o;
  });
});
