// B2.2d-10 (SQLite): world builder + AI world generator routes on the async
// driver API; the local model points at a dead loopback port (no network).
// The PostgreSQL side: test/pg-worlds.integration.test.mjs. Scenario:
// test/fixtures/worlds-scenario.mjs.
// Run: node --import tsx --test test/worlds-routes.test.mjs
// Throwaway DB + cwd, random test-only secrets, no network.
import test from 'node:test';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { worldsScenario } from './fixtures/worlds-scenario.mjs';

const dir = mkdtempSync(join(tmpdir(), 'ap-worlds-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
delete process.env.AGENT_PLAYER_DB;
process.env.OLLAMA_URL = 'http://127.0.0.1:9'; // dead loopback port: the local model never answers
delete process.env.LOCAL_MODEL_API_URL; delete process.env.BACKGROUND_PAID_PURPOSES; delete process.env.ANTHROPIC_API_KEY; delete process.env.CLAUDE_API_KEY;

const quiet = { log: console.log, info: console.info };
console.log = () => {}; console.info = () => {};
const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
await getDatabase().initialize();
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
const ctx = {
  app,
  q: (await import('../src/repositories/sql-steps.ts')).q,
  auth: (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` }),
  storage: join(dir, '.data', 'storage'),
};

worldsScenario(test, () => ctx, { tag: randomBytes(4).toString('hex') });

test.after(async () => {
  await app.close();
  Object.assign(console, quiet);
  closeDatabase();
  process.chdir('/');
  rmSync(dir, { recursive: true, force: true });
});
