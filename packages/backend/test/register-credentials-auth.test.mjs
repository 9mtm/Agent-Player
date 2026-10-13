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
const { generateToken } = await import('../src/auth/jwt.ts');

const app = Fastify();
await app.register(authRoutes);
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
