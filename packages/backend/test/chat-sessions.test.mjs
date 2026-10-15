// B2.2d-8 (SQLite): the /api/sessions routes (chat sessions and messages)
// on the async driver API. The PostgreSQL side:
// test/pg-chat-sessions.integration.test.mjs. Scenario:
// test/fixtures/chat-sessions-scenario.mjs.
// Run: node --import tsx --test test/chat-sessions.test.mjs
// Throwaway DB + cwd, random test-only secrets, no network.
import test from 'node:test';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { chatSessionsScenario } from './fixtures/chat-sessions-scenario.mjs';

const dir = mkdtempSync(join(tmpdir(), 'ap-chat-sessions-'));
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
const { registerAuthGate } = await import('../src/auth/auth-gate.ts');
const { generateToken } = await import('../src/auth/jwt.ts');
const { sessionsRoutes } = await import('../src/api/routes/sessions.ts');
const app = Fastify();
registerAuthGate(app);
await app.register(sessionsRoutes);
await app.ready();
const ctx = {
  app,
  q: (await import('../src/repositories/sql-steps.ts')).q,
  auth: (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` }),
};

chatSessionsScenario(test, () => ctx, { tag: randomBytes(4).toString('hex') });

test.after(async () => {
  await app.close();
  Object.assign(console, quiet);
  closeDatabase();
  process.chdir('/');
  rmSync(dir, { recursive: true, force: true });
});
