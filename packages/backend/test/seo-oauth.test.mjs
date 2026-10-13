// F-08 (SEO OAuth): the OAuth state is bound to the browser that started the
// flow through an HttpOnly nonce cookie (only its hash is stored), and the
// Google token is stored encrypted through the credential manager, owned by
// the user who started the flow. Network is stubbed.
// Run: node --import tsx --test test/seo-oauth.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, symlinkSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-seo-oauth-'));
const backendDir = process.cwd();
process.chdir(dir);
symlinkSync(join(backendDir, 'extensions'), join(dir, 'extensions'), 'dir'); // permission check reads <cwd>/extensions
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
process.env.BACKEND_URL = 'https://agent.example.test';

const ACCESS = 'stub-access-token-value';
const REFRESH = 'stub-refresh-token-value';
const outbound = [];
globalThis.fetch = async (url) => {
  outbound.push(String(url));
  return new Response(JSON.stringify({ access_token: ACCESS, refresh_token: REFRESH }), {
    status: 200, headers: { 'content-type': 'application/json' },
  });
};

const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { ExtensionRunner } = await import(join(backendDir, 'src/plugins/extension-runner.ts'));
const { getCredentialManager, getCredentialStorage } = await import(join(backendDir, 'src/credentials/index.ts'));
const { createOAuthState, consumeOAuthState, OAUTH_COOKIE } = await import(join(backendDir, 'extensions/seo/src/oauth.js'));
const { default: Fastify } = await import('fastify');

const db = getDatabase();
await db.initialize();
await getCredentialStorage().initialize();
const addUser = (id, role) => db.prepare(
  `INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', ?, 'active')`
).run(id, `${id}@example.test`, id, role);
addUser('u-owner', 'owner');
addUser('u-user', 'user');
const token = id => `Bearer ${generateToken(id, 1)}`;

db.prepare(`INSERT OR REPLACE INTO extension_configs (extension_id, enabled) VALUES ('seo', 1)`).run();
const app = Fastify();
app.decorate('db', db);
const runner = new ExtensionRunner(join(backendDir, 'extensions'));
await runner.initialize(app, { register() {}, unregister() {} });
await app.ready();

test.after(async () => {
  for (const [, ext] of runner.getLoadedExtensions()) {
    try { await ext.onDisable?.({ log() {}, unregisterTool() {} }); } catch {}
  }
  await app.close();
  closeDatabase();
  unlinkSync(join(dir, 'extensions')); // remove the link only, never its target
  rmSync(dir, { recursive: true, force: true });
  setTimeout(() => process.exit(process.exitCode ?? 0), 50).unref();
});

db.prepare(`INSERT INTO seo_domains (id, user_id, domain, slug) VALUES ('d-1', 'u-user', 'example.test', 'example-test')`).run();

const start = async (who = 'u-user') => {
  const res = await app.inject({ method: 'GET', url: '/api/ext/seo/oauth/google/authorize?domain_id=d-1', headers: { authorization: token(who) } });
  assert.equal(res.statusCode, 302, res.body);
  const state = new URL(res.headers.location).searchParams.get('state');
  const setCookie = String(res.headers['set-cookie']);
  return { state, setCookie, cookie: setCookie.split(';')[0] };
};
const callback = (state, cookie) => app.inject({
  method: 'GET',
  url: `/api/ext/seo/oauth/google/callback?code=c&state=${state}`,
  headers: cookie ? { cookie } : {},
});

test('authorize sets an HttpOnly, Secure (https), SameSite=Lax nonce cookie', async () => {
  const { setCookie, cookie } = await start();
  assert.match(cookie, new RegExp(`^${OAUTH_COOKIE}=[0-9a-f]{64}$`));
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Lax/);
  assert.match(setCookie, /Secure/);
  assert.match(setCookie, /Path=\/api\/ext\/seo\/oauth\/google/);
  assert.match(setCookie, /Max-Age=600/);
});

test('callback is refused without the cookie or with a wrong one; the right cookie works once', async () => {
  const { state, cookie } = await start();
  const before = outbound.length;

  const none = await callback(state);
  assert.equal(none.statusCode, 400);
  assert.match(String(none.headers['set-cookie']), /Max-Age=0/, 'cookie cleared');

  const wrong = await callback(state, `${OAUTH_COOKIE}=${randomBytes(32).toString('hex')}`);
  assert.equal(wrong.statusCode, 400);
  const otherFlow = await start(); // another browser's valid nonce, wrong state
  assert.equal((await callback(state, otherFlow.cookie)).statusCode, 400);
  assert.equal((await callback(state, `${OAUTH_COOKIE}=not-hex`)).statusCode, 400);
  assert.equal(outbound.length, before, 'no token exchange without the matching cookie');

  const ok = await callback(state, cookie);
  assert.equal(ok.statusCode, 302, ok.body);
  assert.equal(ok.headers.location, '/dashboard/seo/settings?gsc_connected=true');
  assert.match(String(ok.headers['set-cookie']), new RegExp(`^${OAUTH_COOKIE}=;.*Max-Age=0`));
  assert.equal(outbound.length, before + 1);

  assert.equal((await callback(state, cookie)).statusCode, 400, 'single use');
  assert.equal(outbound.length, before + 1);
});

test('the token is stored encrypted, owned by the user, linked to the domain', async () => {
  const domain = db.prepare(`SELECT gsc_credential_id FROM seo_domains WHERE id = 'd-1'`).get();
  assert.ok(domain.gsc_credential_id);
  const row = db.prepare(`SELECT * FROM credentials WHERE id = ?`).get(domain.gsc_credential_id);
  assert.equal(row.user_id, 'u-user');
  assert.equal(row.type, 'oauth_token');
  assert.equal(row.name, 'gsc-refresh-token-d-1');
  assert.ok(!JSON.stringify(row).includes(REFRESH), 'no plaintext token in the row');
  assert.ok(!JSON.stringify(row).includes(ACCESS));
  assert.equal(await getCredentialManager().getValue(row.id), REFRESH);

  // Reconnecting updates the same credential instead of failing on the name.
  const { state, cookie } = await start();
  assert.equal((await callback(state, cookie)).statusCode, 302);
  const again = db.prepare(`SELECT gsc_credential_id FROM seo_domains WHERE id = 'd-1'`).get();
  assert.equal(again.gsc_credential_id, row.id);
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM credentials WHERE name = 'gsc-refresh-token-d-1'`).get().n, 1);
});

test('consumeOAuthState unit: nonce hash only, wrong nonce keeps the state, expiry', () => {
  const { state, nonce } = createOAuthState('u-x', 'd-x', 1000);
  assert.equal(consumeOAuthState(state, randomBytes(32).toString('hex'), 1001), null);
  assert.equal(consumeOAuthState(state, undefined, 1001), null);
  assert.deepEqual(consumeOAuthState(state, nonce, 1002), { userId: 'u-x', domainId: 'd-x' });
  assert.equal(consumeOAuthState(state, nonce, 1003), null);
  const late = createOAuthState('u-x', 'd-x', 0);
  assert.equal(consumeOAuthState(late.state, late.nonce, 10 * 60 * 1000 + 1), null);
});

test('revoke removes only the caller\'s credential', async () => {
  const { gsc_credential_id: id } = db.prepare(`SELECT gsc_credential_id FROM seo_domains WHERE id = 'd-1'`).get();
  const res = await app.inject({ method: 'POST', url: '/api/ext/seo/oauth/google/revoke/d-1', headers: { authorization: token('u-user') } });
  assert.equal(res.statusCode, 200, res.body);
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM credentials WHERE id = ?`).get(id).n, 0);
  assert.equal(db.prepare(`SELECT gsc_credential_id FROM seo_domains WHERE id = 'd-1'`).get().gsc_credential_id, null);
});
