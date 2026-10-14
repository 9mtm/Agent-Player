// B2.2d-11 (SQLite): the extension marketplace, dependency and update
// services and routes on the async driver API. The PostgreSQL side:
// test/pg-marketplace.integration.test.mjs. Scenario:
// test/fixtures/marketplace-scenario.mjs.
// Run: node --import tsx --test test/marketplace.test.mjs
// Throwaway DB + cwd, random test-only secrets, no network.
import test from 'node:test';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { marketplaceScenario } from './fixtures/marketplace-scenario.mjs';

const dir = mkdtempSync(join(tmpdir(), 'ap-marketplace-'));
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
const { marketplaceRoutes } = await import('../src/api/routes/marketplace.ts');
const app = Fastify();
registerAuthGate(app);
await app.register(marketplaceRoutes);
await app.ready();
const ctx = {
  app,
  q: (await import('../src/repositories/sql-steps.ts')).q,
  auth: (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` }),
  mk: await import('../src/services/extension-marketplace.ts'),
  deps: await import('../src/services/extension-dependencies.ts'),
  upd: await import('../src/services/extension-update-manager.ts'),
};

marketplaceScenario(test, () => ctx, { tag: randomBytes(4).toString('hex') });

test.after(async () => {
  await app.close();
  Object.assign(console, quiet);
  closeDatabase();
  process.chdir('/');
  rmSync(dir, { recursive: true, force: true });
});
