// S0-A.4: auto-evolve cron jobs run the evolution service in-process
// ('evolve-agent' action), not as an unauthenticated HTTP call to the
// backend's own /api/evolution route (which the auth gate refuses).
// Run: node --import tsx --test test/evolution-scheduler-internal.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-evo-sched-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only

const realFetch = globalThis.fetch;
const outbound = [];
globalThis.fetch = async (url) => { outbound.push(String(url)); return new Response('{}', { status: 200 }); };

const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
db.prepare(`INSERT INTO agents_config (id, name) VALUES ('ag1', 'Agent One'), ('ag2', 'Agent Two')`).run();
// An old-style row, as created before S0-A.4.
db.prepare(`INSERT INTO cron_jobs (id, name, description, cron_expression, action_type, action_data, enabled, created_at, updated_at)
  VALUES ('old-job', 'agent-evolution-ag2', 'x', '0 2 * * *', 'api-call', ?, 1, '2026-01-01', '2026-01-01')`)
  .run(JSON.stringify({ method: 'POST', url: 'http://localhost:41522/api/evolution/ag2/evolve' }));

const { scheduleAgentEvolution } = await import(join(backendDir, 'src/services/agent-evolution-scheduler.js'));
const { getCronEngine } = await import(join(backendDir, 'src/scheduler/engine.ts'));
const engine = getCronEngine();

test.after(async () => {
  globalThis.fetch = realFetch;
  await engine.stop();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

test('new auto-evolve jobs use the in-process evolve-agent action', async () => {
  await scheduleAgentEvolution('ag1', 'daily');
  const row = db.prepare(`SELECT * FROM cron_jobs WHERE name = 'agent-evolution-ag1'`).get();
  assert.equal(row.action_type, 'evolve-agent');
  assert.deepEqual(JSON.parse(row.action_data), { agentId: 'ag1' });
  const result = await engine.executeJob(row.id);
  assert.equal(result.success, true, result.error);
  assert.equal(result.output.agentId, 'ag1');
  assert.equal(result.output.skipped, true); // evolution not enabled for this agent
  assert.deepEqual(outbound, [], 'no HTTP call');
});

test('old api-call rows are rewritten when rescheduled', async () => {
  await scheduleAgentEvolution('ag2', 'weekly');
  const row = db.prepare(`SELECT * FROM cron_jobs WHERE name = 'agent-evolution-ag2'`).get();
  assert.equal(row.id, 'old-job');
  assert.equal(row.action_type, 'evolve-agent');
  assert.deepEqual(JSON.parse(row.action_data), { agentId: 'ag2' });
  assert.equal(engine.getJob('old-job').actionType, 'evolve-agent');
});

test('an evolve-agent job without an agent id fails closed', async () => {
  db.prepare(`INSERT INTO cron_jobs (id, name, cron_expression, action_type, action_data, enabled, created_at, updated_at)
    VALUES ('bad', 'bad', '0 3 * * *', 'evolve-agent', '{}', 1, '2026-01-01', '2026-01-01')`).run();
  engine.scheduleJob({
    id: 'bad', name: 'bad', cronExpression: '0 3 * * *', actionType: 'evolve-agent',
    actionData: {}, enabled: true, createdAt: new Date(), updatedAt: new Date(),
  });
  const result = await engine.executeJob('bad');
  assert.equal(result.success, false);
  assert.match(result.error, /missing agentId/);
});
