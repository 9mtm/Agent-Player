// S0-Q.13: no open self-registration; only an active owner/admin creates accounts.
// S0-Q.14: /api/credentials* need an active owner/admin and are scoped to that
// user; the onboarding (terminal wizard) routes are not reachable anonymously.
// Run: node --import tsx --test test/register-credentials-auth.test.mjs
// No network: any fetch fails the test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-reg-cred-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir; // credential storage defaults to ~/.agent-player
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only

const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => { throw new Error(`unexpected network call in test: ${url}`); };

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
const { authRoutes } = await import('../src/api/routes/auth.ts');
const { credentialsRoutes } = await import('../src/api/routes/credentials.ts');
const { onboardingRoutes } = await import('../src/api/routes/onboarding.ts');
const { getCredentialManager } = await import('../src/credentials/manager.ts');
const { generateToken } = await import('../src/auth/jwt.ts');
const { readFileSync } = await import('node:fs');
const { fileURLToPath } = await import('node:url');

const app = Fastify();
await app.register(authRoutes);
await app.register(credentialsRoutes);
await app.register(onboardingRoutes); // registered here only to test its own guard
await app.ready();

test.after(async () => {
  globalThis.fetch = realFetch;
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const bearer = (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` });
const PASSWORD = 'Created-By-Owner-42!';
const newUser = (name, extra = {}) => ({ email: `${name}@example.test`, username: name, password: PASSWORD, ...extra });
const register = (payload, headers = {}) => app.inject({ method: 'POST', url: '/api/auth/register', payload, headers });
const userCount = () => db.prepare('SELECT COUNT(*) AS n FROM users').get().n;

test('S0-Q.13: anonymous, bad-token, member and inactive callers cannot register', async () => {
  const before = userCount();
  const anon = await register(newUser('anon1'));
  assert.equal(anon.statusCode, 401);
  assert.equal(anon.json().token, undefined);
  assert.equal((await register(newUser('anon2'), { authorization: 'Bearer not.a.jwt' })).statusCode, 401);
  assert.equal((await register(newUser('anon3'), bearer('u-member'))).statusCode, 403);
  assert.equal((await register(newUser('anon4'), bearer('u-off'))).statusCode, 403);
  assert.equal(userCount(), before);
});

test('S0-Q.13: an owner creates an account; no token is returned; the new user can log in', async () => {
  const res = await register(newUser('alice', { full_name: 'Alice' }), bearer('u-owner'));
  assert.equal(res.statusCode, 201, res.body);
  assert.equal(res.json().token, undefined);
  assert.equal(res.json().user.role, 'user');
  assert.equal(res.json().user.password_hash, undefined);

  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'alice@example.test', password: PASSWORD } });
  assert.equal(login.statusCode, 200, login.body);
  assert.equal(login.json().user.role, 'user');
});

test('S0-Q.13: role limits — nobody creates an owner; admins create only user/guest', async () => {
  assert.equal((await register(newUser('o2', { role: 'owner' }), bearer('u-owner'))).statusCode, 403);
  assert.equal((await register(newUser('a2', { role: 'admin' }), bearer('u-owner'))).statusCode, 201);
  assert.equal((await register(newUser('a3', { role: 'admin' }), bearer('u-admin'))).statusCode, 403);
  assert.equal((await register(newUser('g1', { role: 'guest' }), bearer('u-admin'))).statusCode, 201);
  assert.equal((await register(newUser('x1', { role: 'root' }), bearer('u-owner'))).statusCode, 403);
});

// ---- S0-Q.14: credentials -------------------------------------------------
const req = (method, url, headers = {}, payload) => app.inject({ method, url, headers, payload });
const cred = (name) => ({ name, type: 'api_key', value: `secret-value-${name}-${randomBytes(4).toString('hex')}` });

test('S0-Q.14: every credential route answers 401 without a token and 403 for a non-owner/admin', async () => {
  const sysCred = await getCredentialManager().create({ name: 'system-key', type: 'api_key', value: 'sys-secret-1234' });
  const routes = [
    ['GET', '/api/credentials'], ['GET', '/api/credentials?userId=u-owner'], ['GET', '/api/credentials/types'],
    ['GET', `/api/credentials/${sysCred.id}`], ['GET', `/api/credentials/${sysCred.id}/value`],
    ['POST', '/api/credentials', cred('anon')], ['PUT', `/api/credentials/${sysCred.id}`, { value: 'x' }],
    ['DELETE', `/api/credentials/${sysCred.id}`], ['POST', `/api/credentials/${sysCred.id}/test`],
    ['POST', '/api/credentials/export', {}], ['POST', '/api/credentials/import', { credentials: [] }],
  ];
  for (const [method, url, body] of routes) {
    assert.equal((await req(method, url, {}, body)).statusCode, 401, `${method} ${url} anonymous`);
    assert.equal((await req(method, url, { authorization: 'Bearer not.a.jwt' }, body)).statusCode, 401, `${method} ${url} bad token`);
    assert.equal((await req(method, url, bearer('u-member'), body)).statusCode, 403, `${method} ${url} member`);
    assert.equal((await req(method, url, bearer('u-off'), body)).statusCode, 403, `${method} ${url} inactive owner`);
  }
  assert.ok(await getCredentialManager().get(sysCred.id)); // nothing was deleted
});

test('S0-Q.14: credentials are scoped to the caller (owner also sees unowned system ones)', async () => {
  const ownerCreate = await req('POST', '/api/credentials', bearer('u-owner'), { ...cred('owner-key'), userId: 'u-admin' });
  assert.equal(ownerCreate.statusCode, 200, ownerCreate.body);
  const ownerKey = ownerCreate.json().credential.id;
  const adminCreate = await req('POST', '/api/credentials', bearer('u-admin'), cred('admin-key'));
  assert.equal(adminCreate.statusCode, 200, adminCreate.body);
  const adminKey = adminCreate.json().credential.id;

  assert.equal((await getCredentialManager().get(ownerKey)).userId, 'u-owner'); // body userId ignored

  const names = async (id, query = '') =>
    (await req('GET', `/api/credentials${query}`, bearer(id))).json().credentials.map(c => c.name).sort();
  assert.deepEqual(await names('u-owner'), ['owner-key', 'system-key']);
  assert.deepEqual(await names('u-admin'), ['admin-key']);
  assert.deepEqual(await names('u-admin', '?userId=u-owner'), ['admin-key']); // query userId ignored

  // The admin cannot read, change, test, reveal or delete the owner's or system credentials.
  const sys = (await getCredentialManager().list()).find(c => c.name === 'system-key');
  for (const id of [ownerKey, sys.id]) {
    assert.equal((await req('GET', `/api/credentials/${id}`, bearer('u-admin'))).statusCode, 404);
    assert.equal((await req('GET', `/api/credentials/${id}/value`, bearer('u-admin'))).statusCode, 404);
    assert.equal((await req('PUT', `/api/credentials/${id}`, bearer('u-admin'), { value: 'hijack' })).statusCode, 404);
    assert.equal((await req('POST', `/api/credentials/${id}/test`, bearer('u-admin'))).statusCode, 404);
    assert.equal((await req('DELETE', `/api/credentials/${id}`, bearer('u-admin'))).statusCode, 404);
    assert.ok(await getCredentialManager().get(id));
  }
  // ...and the owner cannot touch the admin's.
  assert.equal((await req('GET', `/api/credentials/${adminKey}`, bearer('u-owner'))).statusCode, 404);
  assert.equal((await req('GET', `/api/credentials/${adminKey}`, bearer('u-admin'))).statusCode, 200);
  assert.equal((await req('GET', `/api/credentials/${sys.id}?decrypt=true`, bearer('u-owner'))).statusCode, 200);

  // Export only contains the caller's scope (body userId ignored).
  const exp = await req('POST', '/api/credentials/export', bearer('u-admin'), { userId: 'u-owner' });
  assert.equal(exp.statusCode, 200);
  const exported = JSON.parse(Buffer.from(exp.json().data, 'base64').toString('utf8'));
  assert.deepEqual(exported.map(c => c.name), ['admin-key']);

  // Import cannot overwrite another user's credential by id; it lands in the caller's scope.
  const forged = [{ ...exported[0], id: ownerKey, name: 'forged', userId: 'u-owner' }];
  const imp = await req('POST', '/api/credentials/import', bearer('u-admin'), { credentials: forged });
  assert.equal(imp.statusCode, 200, imp.body);
  assert.equal((await getCredentialManager().get(ownerKey)).name, 'owner-key');
  assert.deepEqual(await names('u-admin'), ['admin-key', 'forged']);
  assert.deepEqual(await names('u-owner'), ['owner-key', 'system-key']);

  // Delete of an in-scope credential works.
  assert.equal((await req('DELETE', `/api/credentials/${adminKey}`, bearer('u-admin'))).statusCode, 200);
});

// ---- S0-Q.14: onboarding (terminal wizard) -------------------------------
test('S0-Q.14: onboarding routes are not registered by the server and are owner-only', async () => {
  const serverSrc = readFileSync(fileURLToPath(new URL('../src/api/server.ts', import.meta.url)), 'utf8');
  assert.doesNotMatch(serverSrc, /^\s*await\s+fastify\.register\(\s*onboardingRoutes/m);

  for (const [method, url] of [['POST', '/api/onboarding/start'], ['POST', '/api/onboarding/resume'],
    ['POST', '/api/onboarding/skip'], ['GET', '/api/onboarding/status']]) {
    assert.equal((await req(method, url)).statusCode, 401, `${method} ${url} anonymous`);
    assert.equal((await req(method, url, bearer('u-admin'))).statusCode, 403, `${method} ${url} admin`);
    assert.equal((await req(method, url, bearer('u-member'))).statusCode, 403, `${method} ${url} member`);
  }
  // Owner path: status/skip only (start/resume would open the terminal wizard).
  assert.equal((await req('GET', '/api/onboarding/status', bearer('u-owner'))).statusCode, 200);
  assert.equal((await req('POST', '/api/onboarding/skip', bearer('u-owner'))).statusCode, 200);
});
