// B2.2d-6 (SQLite): resolveToolUser and the extension runner on the async
// driver API. The PostgreSQL side: test/pg-leftovers.integration.test.mjs.
// Scenario: test/fixtures/pg-leftovers-scenario.mjs.
// Run: node --import tsx --test test/pg-leftovers.test.mjs
// Throwaway DB + cwd + extensions dir, random test-only secrets, no network.
import test from 'node:test';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { leftoversScenario } from './fixtures/pg-leftovers-scenario.mjs';

const dir = mkdtempSync(join(tmpdir(), 'ap-leftovers-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
delete process.env.AGENT_PLAYER_DB;
delete process.env.EXTENSIONS_DISABLED;

const quiet = { log: console.log, info: console.info, warn: console.warn };
console.log = () => {}; console.info = () => {}; console.warn = () => {};
const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
await getDatabase().initialize();
const ctx = {
  q: (await import('../src/repositories/sql-steps.ts')).q,
  tools: await import('../src/tools/credentials/credentials-save.ts'),
  Runner: (await import('../src/plugins/extension-runner.ts')).ExtensionRunner,
  Fastify: (await import('fastify')).default,
  extDir: join(dir, 'extensions'),
  routes: {
    registerAuthGate: (await import('../src/auth/auth-gate.ts')).registerAuthGate,
    generateToken: (await import('../src/auth/jwt.ts')).generateToken,
    extensionsRoutes: (await import('../src/api/routes/extensions.ts')).extensionsRoutes,
    marketplaceRoutes: (await import('../src/api/routes/marketplace.ts')).marketplaceRoutes,
  },
};

leftoversScenario(test, () => ctx, { tag: randomBytes(4).toString('hex') });

test.after(() => {
  Object.assign(console, quiet);
  closeDatabase();
  process.chdir('/');
  rmSync(dir, { recursive: true, force: true });
});
