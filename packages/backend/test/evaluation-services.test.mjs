// B2.2d-2 (SQLite): evaluation framework, the four analyzers, cost tracker,
// activity logger and the evaluation routes on the async driver API. The
// PostgreSQL side: test/pg-evaluation.integration.test.mjs. Scenario:
// test/fixtures/evaluation-scenario.mjs.
// Run: node --import tsx --test test/evaluation-services.test.mjs
// Throwaway DB + cwd, random test-only secrets, no network.
import test from 'node:test';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { evaluationScenario } from './fixtures/evaluation-scenario.mjs';

const dir = mkdtempSync(join(tmpdir(), 'ap-evaluation-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
delete process.env.AGENT_PLAYER_DB;

const quiet = { log: console.log, info: console.info };
console.log = () => {}; console.info = () => {};
const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
await getDatabase().initialize();
const { default: Fastify } = await import('fastify');
const { default: evaluationRoutes } = await import('../src/api/routes/evaluation.ts');
const app = Fastify();
await app.register(evaluationRoutes);
await app.ready();
const ctx = {
  q: (await import('../src/repositories/sql-steps.ts')).q,
  activity: await import('../src/services/activity-logger.ts'),
  framework: await import('../src/services/evaluation-framework.ts'),
  tools: await import('../src/services/tool-accuracy-analyzer.ts'),
  safety: await import('../src/services/safety-analyzer.ts'),
  perf: await import('../src/services/performance-analyzer.ts'),
  cost: await import('../src/services/cost-tracker.ts'),
  app,
};

evaluationScenario(test, () => ctx, { tag: randomBytes(4).toString('hex') });

test.after(async () => {
  await app.close();
  Object.assign(console, quiet);
  closeDatabase();
  process.chdir('/');
  rmSync(dir, { recursive: true, force: true });
});
