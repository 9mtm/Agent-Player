// F-06: credentials_save and the claude_cli key lookup go through the
// credential manager with the real user from the tool execution context.
// Run: node --import tsx --test test/credentials-tool.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-cred-tool-'));
process.chdir(dir);
process.env.HOME = dir; // credential storage defaults to ~/.agent-player
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only

const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
const { getCredentialStorage } = await import('../src/credentials/storage.ts');
const { getCredentialManager } = await import('../src/credentials/manager.ts');
const { credentialsSaveTool } = await import('../src/tools/credentials/credentials-save.ts');
const { getAnthropicKeyForUser } = await import('../src/tools/cli/claude-cli.ts');

const db = getDatabase();
await db.initialize();
await getCredentialStorage().initialize();
const manager = getCredentialManager();

for (const [id, status] of [['tool-alice', 'active'], ['tool-bob', 'active'], ['tool-off', 'suspended']]) {
  db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status)
    VALUES (?, ?, ?, 'x', 'user', ?)`).run(id, `${id}@example.test`, id, status);
}

test.after(() => {
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const ctx = (userId) => ({ workspaceDir: dir, userId });
const KEY = 'sk-ant-' + randomBytes(24).toString('hex');

test('refuses without a real active user (no "default" fallback)', async () => {
  for (const context of [undefined, ctx(undefined), ctx(''), ctx('default'), ctx('no-such-user'), ctx('tool-off')]) {
    const res = await credentialsSaveTool.execute({ service: 'claude', name: 'k', value: KEY }, context);
    assert.ok(res.error, `expected refusal for ${JSON.stringify(context)}`);
  }
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM credentials').get().n, 0);
});

test('saves an encrypted credential owned by the context user; never echoes the value', async () => {
  const res = await credentialsSaveTool.execute(
    { service: 'claude', name: 'My Claude key', value: KEY, description: 'test' }, ctx('tool-alice'));
  assert.equal(res.error, undefined, JSON.stringify(res));
  assert.ok(!JSON.stringify(res).includes(KEY));

  const rows = db.prepare('SELECT * FROM credentials').all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].user_id, 'tool-alice');
  assert.equal(rows[0].skill_id, 'claude');
  assert.ok(rows[0].iv && rows[0].auth_tag);
  assert.ok(!rows[0].encrypted_value.includes(KEY));
  assert.equal(await manager.getValue(rows[0].id), KEY);
});

test('saving the same name again updates in place', async () => {
  const KEY2 = 'sk-ant-' + randomBytes(24).toString('hex');
  const res = await credentialsSaveTool.execute({ service: 'claude', name: 'My Claude key', value: KEY2 }, ctx('tool-alice'));
  assert.equal(res.error, undefined);
  const rows = db.prepare(`SELECT id FROM credentials WHERE user_id = 'tool-alice'`).all();
  assert.equal(rows.length, 1);
  assert.equal(await manager.getValue(rows[0].id), KEY2);
});

test('claude_cli key lookup reads only the calling user\'s credentials', async () => {
  const alice = await getAnthropicKeyForUser('tool-alice');
  assert.match(alice, /^sk-ant-/);
  assert.equal(await getAnthropicKeyForUser('tool-bob'), '', 'another user must not get alice\'s key');
  assert.equal(await getAnthropicKeyForUser(undefined), '');
  assert.equal(await getAnthropicKeyForUser('default'), '');

  const BOB = 'sk-ant-' + randomBytes(24).toString('hex');
  await credentialsSaveTool.execute({ service: 'custom', name: 'anthropic_api_key', value: BOB }, ctx('tool-bob'));
  assert.equal(await getAnthropicKeyForUser('tool-bob'), BOB, 'by name');
});
