// F-01 / F-03: a fresh database goes setup -> owner -> login, end to end.
// Run: node --import tsx --test test/first-run.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-first-run-'));
process.chdir(dir); // setup flag file lives in <cwd>/.data
process.env.HOME = dir; // credential storage defaults to ~/.agent-player
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only

const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
const { default: Fastify } = await import('fastify');
const { default: setupRoutes } = await import('../src/api/routes/setup.ts');
const { authRoutes } = await import('../src/api/routes/auth.ts');
const { credentialsRoutes } = await import('../src/api/routes/credentials.ts');

// Fresh database: schema + migrations first (as `start()` and the setup wizard do).
const db = getDatabase();
await db.initialize();

const app = Fastify();
await app.register(setupRoutes);
await app.register(authRoutes);
await app.register(credentialsRoutes); // F-03: must register on a fresh DB
await app.ready();

test.after(async () => {
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const OWNER = { name: 'First Owner', email: 'owner@example.test', password: 'Fresh-Install-Pass-42!' };
const get = (url, headers) => app.inject({ method: 'GET', url, headers });
const post = (url, payload) => app.inject({ method: 'POST', url, payload });

test('fresh install: setup is required and the wizard steps are open', async () => {
  const status = await get('/api/setup/status');
  assert.equal(status.statusCode, 200);
  assert.equal(status.json().setupComplete, false);
  assert.equal(status.json().setupRequired, true);

  const login = await post('/api/auth/login', { email: OWNER.email, password: OWNER.password });
  assert.notEqual(login.statusCode, 200); // no account exists yet

  assert.equal((await post('/api/setup/database', {})).statusCode, 200);
});

test('setup -> owner -> complete', async () => {
  const admin = await post('/api/setup/admin', OWNER);
  assert.equal(admin.statusCode, 200, admin.body);

  // An owner now exists: status says done (so the UI goes to login) and the
  // system-changing steps lock, but /complete can still write the flag.
  const status = await get('/api/setup/status');
  assert.equal(status.json().setupComplete, true);
  assert.equal((await post('/api/setup/database', {})).statusCode, 403);

  const done = await post('/api/setup/complete', {});
  assert.equal(done.statusCode, 200, done.body);
  assert.ok(existsSync(join(dir, '.data', '.setup_complete')));
  assert.equal((await post('/api/setup/complete', {})).statusCode, 403);
});

test('-> login with the new owner -> /api/auth/me', async () => {
  const login = await post('/api/auth/login', { email: OWNER.email, password: OWNER.password });
  assert.equal(login.statusCode, 200, login.body);
  const { token } = login.json();
  assert.ok(token);

  const me = await get('/api/auth/me', { authorization: `Bearer ${token}` });
  assert.equal(me.statusCode, 200, me.body);
  assert.equal(me.json().user.email, OWNER.email);
  assert.equal(me.json().user.role, 'owner');
});

test('/api/credentials is registered on the fresh database', async () => {
  const res = await get('/api/credentials');
  assert.equal(res.statusCode, 200, res.body);
});
