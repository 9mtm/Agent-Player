// F-02: logout invalidates the session. After POST /api/auth/logout the same
// JWT is refused everywhere (token_version is bumped).
// Run: node --import tsx --test test/logout.test.mjs
// No network: any fetch fails the test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-logout-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only

const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => { throw new Error(`unexpected network call in test: ${url}`); };

const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
const db = getDatabase();
await db.initialize();
const { getRepositories } = await import('../src/db/index.ts');

const PASSWORD = 'Logout-Test-Pass-42!';
const user = await getRepositories().users.create({
  email: 'owner@example.test', username: 'owner', password: PASSWORD, full_name: 'Owner', role: 'owner',
});
db.prepare(`UPDATE users SET status = 'active', email_verified = 1 WHERE id = ?`).run(user.id);

const { default: Fastify } = await import('fastify');
const { authRoutes } = await import('../src/api/routes/auth.ts');
const { chatRoutes } = await import('../src/api/routes/chat.ts');
const { worldsRoutes } = await import('../src/api/routes/worlds.ts');

const app = Fastify();
await app.register(authRoutes);
await app.register(chatRoutes);
await app.register(worldsRoutes);
await app.ready();

test.after(async () => {
  globalThis.fetch = realFetch;
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const login = async () => {
  const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'owner@example.test', password: PASSWORD } });
  assert.equal(res.statusCode, 200, res.body);
  return res.json().token;
};
const auth = (token) => ({ authorization: `Bearer ${token}` });
const me = (token) => app.inject({ method: 'GET', url: '/api/auth/me', headers: auth(token) });
const chat = (token) => app.inject({ method: 'POST', url: '/api/chat', headers: auth(token), payload: { message: 'hi' } });
const logout = (headers = {}) => app.inject({ method: 'POST', url: '/api/auth/logout', headers });

test('login -> token works -> logout -> the same token is refused', async () => {
  const token = await login();
  assert.equal((await me(token)).statusCode, 200);
  assert.equal((await app.inject({ method: 'GET', url: '/api/multiverse', headers: auth(token) })).statusCode, 200);

  const out = await logout(auth(token));
  assert.equal(out.statusCode, 200, out.body);
  assert.equal(out.json().success, true);

  assert.equal((await me(token)).statusCode, 401);
  assert.equal((await chat(token)).statusCode, 401);
  assert.equal((await app.inject({ method: 'GET', url: '/api/multiverse', headers: auth(token) })).statusCode, 401);
  assert.equal((await app.inject({
    method: 'POST', url: '/api/auth/change-password', headers: auth(token),
    payload: { currentPassword: PASSWORD, newPassword: 'Another-Strong-Pass-43!' },
  })).statusCode, 401);
  // A second logout with the ended token is refused too.
  assert.equal((await logout(auth(token))).statusCode, 401);
});

test('logout signs out every token of the user; a new login works', async () => {
  const a = await login();
  const b = await login();
  assert.equal((await me(b)).statusCode, 200);
  assert.equal((await logout(auth(a))).statusCode, 200);
  assert.equal((await me(b)).statusCode, 401);

  const fresh = await login();
  assert.equal((await me(fresh)).statusCode, 200);
});

test('logout without a valid token -> 401, nothing changes', async () => {
  const token = await login();
  assert.equal((await logout()).statusCode, 401);
  assert.equal((await logout({ authorization: 'Bearer not.a.jwt' })).statusCode, 401);
  assert.equal((await me(token)).statusCode, 200);
});
