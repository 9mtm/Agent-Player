// S0-Q.7: /api/extensions management routes are authorized by the matched
// route, not by a regex on the raw URL. Unauthenticated and non-admin callers
// are refused, including encoded / double-slash / query variants.
// Run: node --import tsx --test test/extensions-auth.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-extensions-auth-'));
const backendDir = process.cwd();
process.chdir(dir); // extensions dir resolves to <cwd>/extensions (empty here)
mkdirSync(join(dir, 'extensions', 'canary'), { recursive: true });
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only

const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { default: Fastify } = await import('fastify');
const { extensionsRoutes } = await import(join(backendDir, 'src/api/routes/extensions.ts'));

const db = getDatabase();
await db.initialize();

const addUser = (id, role, status = 'active') => db.prepare(
  `INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', ?, ?)`
).run(id, `${id}@example.test`, id, role, status);
addUser('u-owner', 'owner');
addUser('u-admin', 'admin');
addUser('u-user', 'user');
addUser('u-suspended', 'admin', 'suspended');
const token = id => `Bearer ${generateToken(id, 1)}`;

const SECRET = 'telegram-secret-token-value';
const configs = {
  telegram: { bot_token: SECRET, allowed_users: 'a' },
  discord: { bot_token: SECRET, allowed_users: 'a' },
  'agent-connect': { channels: { ntfy: { environment: { NTFY_TOKEN: SECRET } } } },
  canary: { api_key: SECRET },
};
for (const [id, config] of Object.entries(configs)) {
  db.prepare(`INSERT OR REPLACE INTO extension_configs (extension_id, enabled, config_json) VALUES (?, 1, ?)`)
    .run(id, JSON.stringify(config));
}

// Same router options as the real server (defaults).
const app = Fastify();
await app.register(extensionsRoutes);
await app.ready();

test.after(async () => {
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const call = (method, url, authorization, payload) => app.inject({
  method, url, ...(payload ? { payload } : {}), headers: authorization ? { authorization } : {},
});

const protectedRequests = [
  ['GET', '/api/extensions/telegram/config'],
  ['GET', '/api/extensions/%74elegram/config'],
  ['GET', '/api/extensions/TELEGRAM/config'],
  ['GET', '/api/extensions/telegram/config?x=/api/extensions/public'],
  ['GET', '/api/extensions/discord/config'],
  ['GET', '/api/extensions/agent-connect/config'],
  ['GET', '/api/extensions/canary/config'],
  ['PUT', '/api/extensions/canary/config', { config: { a: 1 } }],
  ['GET', '/api/extensions/telegram/inspect'],
  ['GET', '/api/extensions/canary/inspect'],
  ['POST', '/api/extensions/canary/enable'],
  ['POST', '/api/extensions/canary/disable'],
  ['DELETE', '/api/extensions/canary'],
  ['DELETE', '/api/extensions/telegram%2Fconfig'],
  ['GET', '/api/extensions/canary/audit-logs'],
  ['GET', '/api/extensions/canary/analytics'],
  ['GET', '/api/extensions/analytics/overview'],
];

// Variants the old regex check did not recognise; they must never succeed.
const bypassAttempts = [
  ['GET', '//api/extensions/telegram/config'],
  ['GET', '/api/extensions//telegram/config'],
  ['GET', '/api/extensions/telegram%2Fconfig'],
  ['GET', '/api//extensions/telegram/config'],
  ['GET', '/api/extensions/%74elegram/%63onfig'],
  ['GET', '/api/extensions/telegram/config/'],
];

test('unauthenticated requests to management routes get 401 (encoded variants included)', async () => {
  for (const [method, url, payload] of protectedRequests) {
    const res = await call(method, url, null, payload);
    assert.equal(res.statusCode, 401, `${method} ${url} -> ${res.statusCode} ${res.body}`);
    assert.ok(!res.body.includes(SECRET));
  }
  assert.ok(existsSync(join(dir, 'extensions', 'canary')), 'unauthenticated delete removed nothing');
});

test('URL tricks never reach a handler without auth', async () => {
  for (const [method, url] of bypassAttempts) {
    const res = await call(method, url, null);
    assert.ok([401, 403, 404].includes(res.statusCode), `${method} ${url} -> ${res.statusCode}`);
    assert.ok(!res.body.includes(SECRET));
    assert.ok(!res.body.includes('"success":true'), `${method} ${url} reached a handler`);
  }
});

test('non-admin, suspended and forged-token callers get 403/401', async () => {
  for (const [method, url, payload] of protectedRequests) {
    assert.equal((await call(method, url, token('u-user'), payload)).statusCode, 403, `user ${method} ${url}`);
    assert.equal((await call(method, url, token('u-suspended'), payload)).statusCode, 403, `suspended ${method} ${url}`);
    assert.equal((await call(method, url, 'Bearer not-a-jwt', payload)).statusCode, 401, `forged ${method} ${url}`);
  }
});

test('owner and admin tokens work; secrets stay hidden', async () => {
  for (const who of ['u-owner', 'u-admin']) {
    const res = await call('GET', '/api/extensions/%74elegram/config', token(who));
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(res.json().hasToken, true);
    assert.ok(!res.body.includes(SECRET));
    const ac = await call('GET', '/api/extensions/agent-connect/config', token(who));
    assert.equal(ac.statusCode, 200);
    assert.ok(!ac.body.includes(SECRET));
  }
  const put = await call('PUT', '/api/extensions/canary/config', token('u-owner'), { config: { a: 1 } });
  assert.equal(put.statusCode, 200, put.body);
});

test('owner requests with path-like ids are rejected before any handler runs', async () => {
  for (const url of ['/api/extensions/telegram%2Fconfig', '/api/extensions/a%2F..%2F..']) {
    const res = await call('DELETE', url, token('u-owner'));
    assert.equal(res.statusCode, 400, `${url} -> ${res.statusCode}`);
  }
  const traversal = await call('GET', '/api/extensions/canary/i18n/..%2F..%2Fpackage');
  assert.equal(traversal.statusCode, 400);
  assert.ok(existsSync(join(dir, 'extensions', 'canary')));
});

test('read-only metadata routes stay public', async () => {
  assert.equal((await call('GET', '/api/extensions')).statusCode, 200);
  assert.equal((await call('GET', '/api/extensions/enabled-routes')).statusCode, 200);
  const status = await call('GET', '/api/extensions/telegram/status');
  assert.equal(status.statusCode, 200);
  assert.ok(!status.body.includes(SECRET));
  assert.equal((await call('GET', '/api/extensions/canary/i18n/en')).statusCode, 404);
});
