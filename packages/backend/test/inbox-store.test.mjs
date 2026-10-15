// B2.2d-17: the inbox store scenario (test/fixtures/inbox-store-scenario.mjs)
// on SQLite, a temp database.
// Run: node --import tsx --test test/inbox-store.test.mjs
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { inboxStoreScenario } from './fixtures/inbox-store-scenario.mjs';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-inbox-store-'));
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
delete process.env.AGENT_PLAYER_DB;

const quiet = { log: console.log, info: console.info };
console.log = () => {}; console.info = () => {};
const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
await getDatabase().initialize();
const { MessageStore } = await import(join(backendDir, 'src/inbox/core/message-store.ts'));
const { ApprovalEngine } = await import(join(backendDir, 'src/inbox/approval/approval-engine.ts'));

test.after(() => {
  Object.assign(console, quiet);
  closeDatabase();
  process.chdir(backendDir);
  rmSync(dir, { recursive: true, force: true });
});

test('inbox messages and approval rules on SQLite', async () => {
  await inboxStoreScenario({ MessageStore, ApprovalEngine }, randomBytes(4).toString('hex'));
});
