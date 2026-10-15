// B2.2d-1 (SQLite): the storage manager on the async driver API (index,
// save, search, stream, stats, cleanup, delete), extension analytics storage
// usage and the dashboard storage-usage widget, which now sums size_bytes
// (it summed a non-existent `size` column). The PostgreSQL side:
// test/pg-storage.integration.test.mjs. Scenario: test/fixtures/storage-scenario.mjs.
// Run: node --import tsx --test test/storage-manager.test.mjs
// Throwaway DB + cwd + storage dir, random test-only secrets, no network.
import test from 'node:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { storageScenario } from './fixtures/storage-scenario.mjs';

const dir = mkdtempSync(join(tmpdir(), 'ap-storage-manager-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
const base = join(dir, 'storage');
process.env.STORAGE_BASE_DIR = base;
delete process.env.STORAGE_PROVIDER;
delete process.env.AGENT_PLAYER_DB;

const tag = randomBytes(4).toString('hex');
mkdirSync(join(base, 'cdn', 'images'), { recursive: true });
writeFileSync(join(base, 'cdn', 'images', `pre-${tag}.png`), 'png');
const outsideFile = join(dir, 'outside.mp3');
writeFileSync(outsideFile, 'mp3');

const quiet = { log: console.log, info: console.info };
console.log = () => {}; console.info = () => {};
const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
await getDatabase().initialize();
const { q } = await import('../src/repositories/sql-steps.ts');
const { getStorageManager } = await import('../src/services/storage-manager.ts');
const analytics = await import('../src/services/extension-analytics.ts');
const { default: Fastify } = await import('fastify');
const { registerDashboardRoutes } = await import('../src/api/routes/dashboard.ts');
const app = Fastify();
await app.register(registerDashboardRoutes);
await app.ready();

const ctx = { mgr: getStorageManager(), q, analytics, app, base, outsideFile, storage: await import('../src/services/storage-manager.ts') };
storageScenario(test, () => ctx, { tag });

test.after(async () => {
  await app.close();
  Object.assign(console, quiet);
  closeDatabase();
  process.chdir('/');
  rmSync(dir, { recursive: true, force: true });
});
