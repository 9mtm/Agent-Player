// S0-Q.2: first-owner guard, post-setup lock, and no fixed-password accounts.
// Run: node --import tsx --test test/setup-guard.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-setup-guard-'));
process.chdir(dir); // setup flag file lives in <cwd>/.data
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only

const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
const { seedDatabase } = await import('../src/db/seed.ts');
const { default: Fastify } = await import('fastify');
const { default: setupRoutes } = await import('../src/api/routes/setup.ts');
const { authRoutes } = await import('../src/api/routes/auth.ts');
const bcrypt = (await import('bcryptjs')).default;
const { issueSetupToken } = await import('../src/auth/setup-token.ts');

const db = getDatabase();
await db.initialize();

const app = Fastify();
await app.register(setupRoutes);
await app.register(authRoutes);
await app.ready();

test.after(async () => {
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const post = (url, payload) => app.inject({ method: 'POST', url, payload });

test('a fresh database has no login-capable default accounts', async () => {
  await seedDatabase();
  const rows = db.prepare("SELECT id FROM users WHERE id NOT IN ('mock-user', '1')").all();
  assert.deepEqual(rows, []);
  assert.equal(db.prepare("SELECT 1 FROM users WHERE email LIKE '%@localhost'").get(), undefined);
});

test('setup cannot complete before an owner exists', async () => {
  const res = await post('/api/setup/complete', {});
  assert.equal(res.statusCode, 400);
});

test('first owner: weak or published passwords are rejected, then only one owner can be created', async () => {
  const setupToken = issueSetupToken(); // INSTALLER-07
  const weak = await post('/api/setup/admin', { name: 'Owner', email: 'owner@example.test', password: 'admin123', setupToken });
  assert.equal(weak.statusCode, 400);

  const ok = await post('/api/setup/admin', { name: 'Owner', email: 'owner@example.test', password: 'a-strong-passphrase-42', setupToken });
  assert.equal(ok.statusCode, 200, ok.body);
  const row = db.prepare('SELECT role FROM users WHERE email = ?').get('owner@example.test');
  assert.equal(row.role, 'owner');

  const second = await post('/api/setup/admin', { name: 'Intruder', email: 'intruder@example.test', password: 'another-strong-pass-42', setupToken: issueSetupToken() });
  assert.equal(second.statusCode, 403);
  assert.equal(db.prepare('SELECT 1 FROM users WHERE email = ?').get('intruder@example.test'), undefined);
});

test('after setup is complete, system-changing setup routes are locked', async () => {
  const done = await post('/api/setup/complete', {});
  assert.equal(done.statusCode, 200, done.body);

  for (const url of ['/api/setup/complete', '/api/setup/database', '/api/setup/python']) {
    const res = await post(url, {});
    assert.equal(res.statusCode, 403, url);
  }
  const check = await app.inject({ method: 'GET', url: '/api/setup/check' });
  assert.equal(check.statusCode, 403);
  const status = await app.inject({ method: 'GET', url: '/api/setup/status' });
  assert.equal(status.statusCode, 200);
  assert.equal(status.json().setupComplete, true);
});

test('login: system accounts and published default passwords are refused; a real password works', async () => {
  const hash = await bcrypt.hash('admin123', 10);
  db.prepare(`INSERT INTO users (id, email, username, password_hash, full_name, role, status, email_verified, token_version)
              VALUES ('legacy-owner', 'legacy@localhost', 'legacy', ?, 'Legacy', 'admin', 'active', 1, 1)`).run(hash);

  const legacy = await post('/api/auth/login', { email: 'legacy@localhost', password: 'admin123' });
  assert.equal(legacy.statusCode, 403);
  assert.equal(legacy.json().token, undefined);

  // S0-Q.21: a wrong password gets the generic 401; with the password older
  // databases stored for it, the system account is refused with 403.
  const systemWrong = await post('/api/auth/login', { email: 'system@agent-player.local', password: 'system-user-not-for-login' });
  assert.equal(systemWrong.statusCode, 401);
  db.prepare(`UPDATE users SET password_hash = ? WHERE id = 'mock-user'`).run(await bcrypt.hash('system-user-not-for-login', 4));
  const system = await post('/api/auth/login', { email: 'system@agent-player.local', password: 'system-user-not-for-login' });
  assert.equal(system.statusCode, 403);
  assert.equal(system.json().token, undefined);

  const owner = await post('/api/auth/login', { email: 'owner@example.test', password: 'a-strong-passphrase-42' });
  assert.equal(owner.statusCode, 200, owner.body);
  assert.ok(owner.json().token);
});
