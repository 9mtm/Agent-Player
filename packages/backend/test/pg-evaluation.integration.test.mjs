// B2.2d-2: the evaluation-services scenario (test/fixtures/evaluation-scenario.mjs)
// on PostgreSQL: evaluation framework, analyzers, cost tracker, activity
// logger and the evaluation routes.
// Runs ONLY when AGENT_PLAYER_PG_TEST_URL names a THROWAWAY database on
// 127.0.0.1 that the PostgreSQL runner has already migrated (it writes test
// rows and never cleans up: drop the database afterwards). Otherwise every
// test skips. scripts/pg/integration.sh runs it.
//
// The SQLite file (a temp file, never the real .data) is watched: any
// statement on the ported tables that reaches SQLite fails the last test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { evaluationScenario } from './fixtures/evaluation-scenario.mjs';

const URL_ = process.env.AGENT_PLAYER_PG_TEST_URL;
const skip = URL_ ? false : 'AGENT_PLAYER_PG_TEST_URL is not set (PostgreSQL integration test)';
const PORTED_TABLES = /\b(evaluation_sessions|evaluation_scores|reasoning_scores|tool_accuracy_metrics|safety_checks|performance_profiles|agent_performance_metrics|cost_analytics|agent_activity)\b/i;
const sqliteHits = [];

let ctx = {};
let dir;
let closeAll = async () => {};
if (URL_) {
  dir = mkdtempSync(join(tmpdir(), 'ap-pg-evaluation-'));
  mkdirSync(join(dir, '.data'), { recursive: true });
  process.chdir(dir);
  process.env.HOME = dir;
  // SQLite still backs the modules that are not ported yet: a temp file, never the real .data.
  process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
  process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
  process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
  process.env.AGENT_PLAYER_DB = 'postgres';
  process.env.AGENT_PLAYER_PG_URL = URL_;

  const quiet = { log: console.log, info: console.info };
  console.log = () => {}; console.info = () => {};
  const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
  await getDatabase({ path: process.env.DATABASE_PATH }).initialize(); // B2.2d-17: an explicit temp SQLite file, watched for strays
  const mgr = getDatabase();
  for (const target of [mgr, mgr.getDb()]) {
    const original = target.prepare;
    target.prepare = function (sql) {
      if (PORTED_TABLES.test(String(sql))) sqliteHits.push(String(sql).replace(/\s+/g, ' ').slice(0, 120));
      return original.call(this, sql);
    };
  }
  const pool = await import('../src/db/pg/pool.ts');
  const { default: Fastify } = await import('fastify');
  const { default: evaluationRoutes } = await import('../src/api/routes/evaluation.ts');
  const app = Fastify();
  await app.register(evaluationRoutes);
  await app.ready();
  ctx = {
    q: (await import('../src/repositories/sql-steps.ts')).q,
    activity: await import('../src/services/activity-logger.ts'),
    framework: await import('../src/services/evaluation-framework.ts'),
    tools: await import('../src/services/tool-accuracy-analyzer.ts'),
    safety: await import('../src/services/safety-analyzer.ts'),
    perf: await import('../src/services/performance-analyzer.ts'),
    cost: await import('../src/services/cost-tracker.ts'),
    app,
  };
  closeAll = async () => {
    await app.close();
    Object.assign(console, quiet);
    await pool.closePgPool();
    closeDatabase();
  };
}

evaluationScenario(test, () => ctx, { tag: randomBytes(4).toString('hex'), skip });

test('no statement on the evaluation / cost / activity tables reached SQLite', { skip }, () => {
  assert.deepEqual(sqliteHits, []);
});

test.after(async () => {
  await closeAll();
  if (dir) {
    process.chdir('/');
    rmSync(dir, { recursive: true, force: true });
  }
});
