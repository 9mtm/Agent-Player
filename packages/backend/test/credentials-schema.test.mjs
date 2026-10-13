// F-03: a fresh database gets the credentials table CredentialStorage needs,
// and legacy tables are upgraded without losing rows.
// Run: node --import tsx --test test/credentials-schema.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-cred-schema-'));
process.chdir(dir);
process.env.HOME = dir; // credential storage defaults to ~/.agent-player
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only

const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
const { CredentialStorage } = await import('../src/credentials/storage.ts');
const { default: Fastify } = await import('fastify');
const { credentialsRoutes } = await import('../src/api/routes/credentials.ts');

const db = getDatabase();
await db.initialize(); // schema.sql + migrations first, like `/api/setup/database`

test.after(() => {
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const cols = () => db.prepare("SELECT name FROM pragma_table_info('credentials')").all().map(r => r.name);

const LEGACY = `CREATE TABLE credentials (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('api_key', 'oauth', 'password', 'ssh_key', 'other')),
  encrypted_value TEXT NOT NULL, iv TEXT NOT NULL, auth_tag TEXT NOT NULL, metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`;

test('fresh database: schema.sql already has the current credentials columns', () => {
  for (const c of ['skill_id', 'description', 'refresh_token', 'expires_at', 'scopes', 'last_used']) {
    assert.ok(cols().includes(c), `missing ${c}`);
  }
});

test('fresh database: /api/credentials registers and can store a credential', async () => {
  const app = Fastify();
  await app.register(credentialsRoutes);
  await app.ready();
  try {
    const list = await app.inject({ method: 'GET', url: '/api/credentials' });
    assert.equal(list.statusCode, 200, list.body);
    const created = await app.inject({
      method: 'POST', url: '/api/credentials',
      payload: { name: 'test-key', type: 'secret', value: 'v-' + randomBytes(8).toString('hex'), skillId: 'skill-x' },
    });
    assert.ok(created.statusCode < 300, created.body);
    const bySkill = await app.inject({ method: 'GET', url: '/api/credentials?skillId=skill-x' });
    assert.equal(bySkill.json().credentials?.length ?? bySkill.json().length, 1, bySkill.body);
  } finally {
    await app.close();
  }
});

test('legacy empty table is replaced by the current definition', async () => {
  db.exec('DROP TABLE credentials');
  db.exec(LEGACY);
  await new CredentialStorage(join(dir, 'creds')).initialize();
  assert.ok(cols().includes('skill_id'));
  assert.ok(!cols().includes('metadata'));
});

test('legacy table with rows is upgraded in place, rows kept', async () => {
  db.exec('DROP TABLE credentials');
  db.exec(LEGACY);
  db.prepare("INSERT INTO credentials (id, user_id, name, type, encrypted_value, iv, auth_tag) VALUES ('old-1', 'u1', 'old', 'api_key', 'x', 'y', 'z')").run();
  await new CredentialStorage(join(dir, 'creds')).initialize();
  assert.ok(cols().includes('skill_id'));
  assert.equal(db.prepare("SELECT name FROM credentials WHERE id = 'old-1'").get().name, 'old');
  // A second initialize is a no-op.
  await new CredentialStorage(join(dir, 'creds')).initialize();
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM credentials').get().n, 1);
});
