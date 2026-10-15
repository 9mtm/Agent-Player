// TSC-02: the text form of a chat message (api/routes/chat.ts messageText).
// A multimodal (vision) message is an array of parts; the agent analyzers,
// the model router and the text-only providers get only its text parts
// (they used to get the array: .toLowerCase() on an array, or
// "User: [object Object]" for a CLI model).
// Run: node --import tsx --test test/chat-message-text.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-chat-text-'));
process.chdir(dir);
process.env.HOME = dir;
process.env.AGENT_PLAYER_DATA_DIR = join(dir, 'data');
process.env.DATABASE_PATH = join(dir, 'data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
const quiet = { log: console.log, info: console.info, warn: console.warn };
console.log = () => {}; console.info = () => {}; console.warn = () => {};
const { messageText } = await import(join(backendDir, 'src/api/routes/chat.ts'));
Object.assign(console, quiet);

test.after(() => {
  process.chdir(backendDir);
  rmSync(dir, { recursive: true, force: true });
});

test('a string message is its own text', () => {
  assert.equal(messageText('hello'), 'hello');
  assert.equal(messageText(''), '');
});

test('a multimodal message keeps only its text parts, joined by newlines', () => {
  const content = [
    { type: 'text', text: 'What is in this picture?' },
    { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } },
    { type: 'text', text: 'Answer briefly.' },
  ];
  assert.equal(messageText(content), 'What is in this picture?\nAnswer briefly.');
  assert.ok(!messageText(content).includes('[object Object]'));
});

test('odd shapes give empty text, never a crash', () => {
  for (const v of [undefined, null, [], [null], [{ type: 'image' }], [{ type: 'text', text: 3 }], 42]) {
    assert.equal(messageText(v), '');
  }
});
