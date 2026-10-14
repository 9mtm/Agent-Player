// S1.1: single credential authority. Agent keys live in encrypted credentials
// referenced by id; plaintext agents_config.api_key is migrated (verified)
// and cleared; responses stay masked; no unscoped/direct key reads remain.
// Run: node --import tsx --test test/credential-authority.test.mjs
// Throwaway DB + cwd, random test-only secrets, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-cred-authority-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENAI_API_KEY;

const quiet = { log: console.log, warn: console.warn };
console.log = () => {};
console.warn = () => {};

const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const { getCredentialStorage } = await import(join(backendDir, 'src/credentials/storage.ts'));
await getCredentialStorage().initialize();
const authority = await import(join(backendDir, 'src/credentials/authority.ts'));
const { agentsConfigRoutes } = await import(join(backendDir, 'src/api/routes/agents-config.ts'));
const { registerAuthGate } = await import(join(backendDir, 'src/auth/auth-gate.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { default: Fastify } = await import('fastify');

// B1.6: the agents routes take the actor from the verified token (owner here).
db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES ('ca-owner', 'ca-owner@example.test', 'ca-owner', 'x', 'owner', 'active')`).run();
const headers = { authorization: `Bearer ${generateToken('ca-owner', 1)}` };

const app = Fastify();
registerAuthGate(app);
await app.register(agentsConfigRoutes);
await app.ready();

console.log = quiet.log;
console.warn = quiet.warn;

test.after(async () => {
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const fakeKey = () => 'sk-ant-test-' + randomBytes(20).toString('hex');
const addAgent = (id, apiKey = '') =>
  db.prepare(`INSERT INTO agents_config (id, name, provider, api_key) VALUES (?, ?, 'claude', ?)`).run(id, id, apiKey);
const row = (id) => db.prepare('SELECT * FROM agents_config WHERE id = ?').get(id);

test('startup migration moves plaintext agent keys into encrypted credentials', async () => {
  const keyA = fakeKey();
  const keyB = fakeKey();
  addAgent('mig-a', keyA);
  addAgent('mig-b', keyB);
  addAgent('mig-masked', '••••••••');

  const result = await authority.migrateAgentApiKeys();
  assert.equal(result.migrated, 2);
  assert.equal(result.failed, 0);

  for (const [id, key] of [['mig-a', keyA], ['mig-b', keyB]]) {
    const r = row(id);
    assert.equal(r.api_key, '', 'plaintext column cleared');
    assert.ok(r.api_key_credential_id, 'credential referenced by id');
    const cred = db.prepare('SELECT * FROM credentials WHERE id = ?').get(r.api_key_credential_id);
    assert.ok(cred, 'credential row exists');
    assert.equal(cred.user_id, null, 'system scope');
    assert.ok(!cred.encrypted_value.includes(key), 'stored encrypted');
    assert.equal(await authority.getAgentApiKey(id), key);
  }
  // A masked placeholder is not migrated as a secret.
  assert.equal(row('mig-masked').api_key, '');
  assert.equal(row('mig-masked').api_key_credential_id, null);

  // Idempotent: a second run has nothing to do.
  const again = await authority.migrateAgentApiKeys();
  assert.deepEqual(again, { migrated: 0, skipped: 0, failed: 0 });
});

test('migration is refused (rows untouched) without a persistent ENCRYPTION_KEY', async () => {
  const key = fakeKey();
  addAgent('mig-nokey', key);
  const saved = process.env.ENCRYPTION_KEY;
  delete process.env.ENCRYPTION_KEY;
  console.warn = () => {};
  try {
    const result = await authority.migrateAgentApiKeys();
    assert.equal(result.refused, 'no-encryption-key');
    assert.equal(row('mig-nokey').api_key, key);
    // Transitional: the not-yet-migrated key still works for that agent only.
    assert.equal(await authority.getAgentApiKey('mig-nokey'), key);
  } finally {
    process.env.ENCRYPTION_KEY = saved;
    console.warn = quiet.warn;
  }
  const result = await authority.migrateAgentApiKeys();
  assert.equal(result.migrated, 1);
  assert.equal(row('mig-nokey').api_key, '');
});

test('keys resolve per agent only: never another agent\'s key', async () => {
  addAgent('no-key');
  assert.equal(await authority.getAgentApiKey('no-key'), '');
  assert.equal(await authority.getAgentApiKey(undefined), '');
  assert.equal(await authority.getAgentApiKey('missing-agent'), '');
  // Without a global or env key, an agent without its own key gets nothing.
  assert.equal(await authority.resolveProviderApiKey('claude', { agentId: 'no-key' }), '');
  assert.equal(await authority.resolveProviderApiKey('claude', { agentId: 'no-key', allowEnv: true }), '');
  process.env.ANTHROPIC_API_KEY = 'sk-ant-env-' + randomBytes(8).toString('hex');
  try {
    assert.equal(await authority.resolveProviderApiKey('claude', { agentId: 'no-key' }), '', 'env only with allowEnv');
    assert.equal(await authority.resolveProviderApiKey('claude', { agentId: 'no-key', allowEnv: true }), process.env.ANTHROPIC_API_KEY);
  } finally {
    delete process.env.ANTHROPIC_API_KEY;
  }
});

test('agents API stores keys encrypted and only ever answers masked', async () => {
  const key = fakeKey();
  const created = await app.inject({ method: 'POST', headers, url: '/api/agents', payload: { name: 'api-agent', provider: 'claude', api_key: key } });
  assert.equal(created.statusCode, 201, created.body);
  assert.ok(!created.body.includes(key));
  const agent = created.json().agent;
  assert.equal(agent.apiKeySet, true);
  assert.equal(agent.api_key, '••••••••');
  assert.equal(agent.api_key_credential_id, undefined, 'reference not exposed');
  assert.equal(row(agent.id).api_key, '');
  assert.equal(await authority.getAgentApiKey(agent.id), key);

  for (const url of ['/api/agents', `/api/agents/${agent.id}`]) {
    const res = await app.inject({ method: 'GET', headers, url });
    assert.equal(res.statusCode, 200);
    assert.ok(!res.body.includes(key), `${url} leaks the key`);
  }

  // Masked placeholder / empty keep the stored key.
  for (const api_key of ['••••••••', '']) {
    const put = await app.inject({ method: 'PUT', headers, url: `/api/agents/${agent.id}`, payload: { api_key } });
    assert.equal(put.statusCode, 200);
    assert.equal(await authority.getAgentApiKey(agent.id), key);
  }
  // A new key replaces it, same credential id, never in the column.
  const credId = row(agent.id).api_key_credential_id;
  const key2 = fakeKey();
  const put = await app.inject({ method: 'PUT', headers, url: `/api/agents/${agent.id}`, payload: { api_key: key2 } });
  assert.equal(put.statusCode, 200);
  assert.ok(!put.body.includes(key2));
  assert.equal(row(agent.id).api_key_credential_id, credId);
  assert.equal(row(agent.id).api_key, '');
  assert.equal(await authority.getAgentApiKey(agent.id), key2);

  // Deleting the agent removes its key credential.
  const del = await app.inject({ method: 'DELETE', headers, url: `/api/agents/${agent.id}` });
  assert.equal(del.statusCode, 200);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM credentials WHERE id = ?').get(credId).n, 0);
});

function sourceFiles(root) {
  const out = [];
  for (const name of readdirSync(root)) {
    const p = join(root, name);
    if (statSync(p).isDirectory()) {
      if (name === '__tests__' || name === 'examples') continue;
      out.push(...sourceFiles(p));
    } else if (name.endsWith('.ts')) out.push(p);
  }
  return out;
}

test('no direct key reads outside the credential authority', () => {
  const src = join(backendDir, 'src');
  const offenders = [];
  for (const file of sourceFiles(src)) {
    const rel = relative(src, file);
    if (rel === join('credentials', 'authority.ts')) continue;
    const text = readFileSync(file, 'utf8');
    if (/SELECT[^;`'"]*\bapi_key\b[^;`'"]*FROM\s+agents_config/i.test(text)) offenders.push(`${rel}: agents_config.api_key read`);
    if (/agent(Config)?\??\.api_key\b/.test(text)) offenders.push(`${rel}: agent.api_key use`);
    if (/process\.env\.(ANTHROPIC|OPENAI|GEMINI)_API_KEY/.test(text)) offenders.push(`${rel}: provider env key read`);
    if (/settings(NS)?\.(claude|openai)\??\.apiKey/.test(text) && !rel.startsWith('settings')) offenders.push(`${rel}: settings key read`);
    if (/key = 'claude_api_key'/.test(text)) offenders.push(`${rel}: legacy key row read`);
  }
  assert.deepEqual(offenders, []);
});
