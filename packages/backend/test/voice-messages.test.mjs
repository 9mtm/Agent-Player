// B2.2d-14 (SQLite): the TTS voice-message record on the async driver API.
// The PostgreSQL side: test/pg-voice-messages.integration.test.mjs.
// Run: node --import tsx --test test/voice-messages.test.mjs
// Throwaway DB + cwd, random test-only secrets, no network, no TTS engine.
import test from 'node:test';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { voiceMessagesScenario } from './fixtures/voice-messages-scenario.mjs';

const dir = mkdtempSync(join(tmpdir(), 'ap-voice-'));
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
const ctx = {
  q: (await import('../src/repositories/sql-steps.ts')).q,
  audio: await import('../src/services/audio-service.ts'),
};

voiceMessagesScenario(test, () => ctx, { tag: randomBytes(4).toString('hex') });

test.after(() => {
  Object.assign(console, quiet);
  closeDatabase();
  process.chdir('/');
  rmSync(dir, { recursive: true, force: true });
});
