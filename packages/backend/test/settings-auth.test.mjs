// S0-Q.15: /api/settings* need auth. Reading (masked) needs an active owner/admin;
// changing provider settings / API keys and /api/settings/test need the active owner.
// Run: node --import tsx --test test/settings-auth.test.mjs
// No network: fetch is stubbed and records every outbound call.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-settings-auth-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only

const realFetch = globalThis.fetch;
const outbound = [];
globalThis.fetch = async (url, init) => {
  outbound.push({ url: String(url), init });
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
};

const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
const db = getDatabase();
await db.initialize();
const addUser = (id, role, status = 'active') =>
  db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status, email_verified) VALUES (?, ?, ?, 'x', ?, ?, 1)`)
    .run(id, `${id}@example.test`, id, role, status);
addUser('u-owner', 'owner');
addUser('u-admin', 'admin');
addUser('u-member', 'user');
addUser('u-off', 'owner', 'inactive');

const { default: Fastify } = await import('fastify');
const { settingsRoutes } = await import('../src/api/routes/settings.ts');
const { getSettingsManager } = await import('../src/settings/index.ts');
const { generateToken } = await import('../src/auth/jwt.ts');

const app = Fastify();
await app.register(settingsRoutes);
await app.ready();

test.after(async () => {
  globalThis.fetch = realFetch;
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const bearer = (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` });
const req = (method, url, headers = {}, payload) => app.inject({ method, url, headers, payload });
const STORED_KEY = `sk-test-stored-${randomBytes(8).toString('hex')}`;
await getSettingsManager().updateSettings({ provider: 'local', claude: { apiKey: STORED_KEY, model: 'm1' } });
const stored = () => getSettingsManager().getSettings();

test('S0-Q.15: anonymous, bad-token, member and inactive callers get 401/403 on every settings route', async () => {
  const routes = [
    ['GET', '/api/settings'],
    ['PUT', '/api/settings', { provider: 'claude', claude: { apiKey: 'sk-attacker' } }],
    ['POST', '/api/settings/test', { provider: 'claude' }],
  ];
  for (const [method, url, body] of routes) {
    assert.equal((await req(method, url, {}, body)).statusCode, 401, `${method} ${url} anonymous`);
    assert.equal((await req(method, url, { authorization: 'Bearer not.a.jwt' }, body)).statusCode, 401, `${method} ${url} bad token`);
    assert.equal((await req(method, url, bearer('u-member'), body)).statusCode, 403, `${method} ${url} member`);
    assert.equal((await req(method, url, bearer('u-off'), body)).statusCode, 403, `${method} ${url} inactive owner`);
  }
  assert.equal((await stored()).provider, 'local');
  assert.equal((await stored()).claude.apiKey, STORED_KEY);
  assert.equal(outbound.length, 0, 'no outbound call with the stored key');
});

test('S0-Q.15: an admin reads masked settings but cannot change them or run /test', async () => {
  const get = await req('GET', '/api/settings', bearer('u-admin'));
  assert.equal(get.statusCode, 200, get.body);
  assert.doesNotMatch(get.body, new RegExp(STORED_KEY));
  assert.equal((await req('PUT', '/api/settings', bearer('u-admin'), { provider: 'claude', claude: { apiKey: 'sk-admin' } })).statusCode, 403);
  assert.equal((await req('POST', '/api/settings/test', bearer('u-admin'), { provider: 'claude' })).statusCode, 403);
  assert.equal((await stored()).claude.apiKey, STORED_KEY);
  assert.equal(outbound.length, 0);
});

test('S0-Q.15: the owner reads masked settings, updates them, and runs /test', async () => {
  const get = await req('GET', '/api/settings', bearer('u-owner'));
  assert.equal(get.statusCode, 200, get.body);
  assert.doesNotMatch(get.body, new RegExp(STORED_KEY));
  assert.equal(get.json().settings.claude.apiKey.slice(-4), STORED_KEY.slice(-4));

  // A masked key sent back keeps the stored key; other fields change.
  const put = await req('PUT', '/api/settings', bearer('u-owner'), { provider: 'claude', claude: { apiKey: get.json().settings.claude.apiKey, model: 'm2' } });
  assert.equal(put.statusCode, 200, put.body);
  assert.equal((await stored()).provider, 'claude');
  assert.equal((await stored()).claude.model, 'm2');
  assert.equal((await stored()).claude.apiKey, STORED_KEY);

  const t = await req('POST', '/api/settings/test', bearer('u-owner'), { provider: 'claude' });
  assert.equal(t.statusCode, 200, t.body);
  assert.equal(outbound.length, 1);
  assert.match(outbound[0].url, /api\.anthropic\.com/);
  assert.doesNotMatch(t.body, new RegExp(STORED_KEY));
});
