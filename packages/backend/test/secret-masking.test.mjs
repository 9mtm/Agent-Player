// S0-Q.4: no plaintext secret values in API responses, no generated keys in logs.
// Run: node --import tsx --test test/secret-masking.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-secret-mask-'));
process.chdir(dir);
process.env.HOME = dir; // credential storage defaults to ~/.agent-player
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
delete process.env.ENCRYPTION_KEY; // exercise the "no key" path

// Capture everything printed while the encryption modules create a temporary key.
const printed = [];
const orig = { log: console.log, warn: console.warn, error: console.error, info: console.info };
for (const k of Object.keys(orig)) console[k] = (...args) => printed.push(args.map(String).join(' '));
const settingsEnc = await import('../src/settings/encryption.ts');
const { getEncryptionService } = await import('../src/credentials/encryption.ts');
const credEnc = getEncryptionService();
Object.assign(console, orig);

const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
const { default: Fastify } = await import('fastify');
const { credentialsRoutes } = await import('../src/api/routes/credentials.ts');
const { settingsRoutes } = await import('../src/api/routes/settings.ts');
const { extensionsRoutes } = await import('../src/api/routes/extensions.ts');
const { agentsConfigRoutes } = await import('../src/api/routes/agents-config.ts');
const { getCredentialManager } = await import('../src/credentials/manager.ts');
const { getSettingsManager } = await import('../src/settings/index.ts');
const mask = await import('../src/credentials/secret-mask.ts');

const db = getDatabase();
await db.initialize();
// Pre-existing schema conflict: schema.sql creates an older `credentials` table
// (no skill_id) that CredentialStorage.initialize() cannot index. On this empty
// throwaway DB, drop it so the storage creates its own table (tracked in HANDOFF).
db.prepare('DROP TABLE IF EXISTS credentials').run();

const app = Fastify();
await app.register(credentialsRoutes);
await app.register(settingsRoutes);
await app.register(extensionsRoutes);
await app.register(agentsConfigRoutes);
await app.ready();

test.after(async () => {
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const SECRET = 'sk-test-' + randomBytes(24).toString('hex');
const call = (method, url, payload) => app.inject({ method, url, payload });
const noSecret = (res, secret = SECRET) => assert.ok(!res.body.includes(secret), `secret leaked in ${res.body}`);

test('a generated encryption key is never printed', () => {
  const keys = [credEnc.getMasterKeyHex()];
  const out = printed.join('\n');
  assert.match(out, /ENCRYPTION_KEY/); // the operator is still warned
  for (const k of keys) assert.ok(!out.includes(k), 'generated key printed');
  assert.doesNotMatch(out, /\b[0-9a-f]{64}\b/i);
  assert.equal(typeof settingsEnc.encrypt, 'function');
});

test('mask helpers', () => {
  assert.equal(mask.maskSecret(''), '');
  assert.equal(mask.maskSecret('short'), mask.SECRET_PLACEHOLDER);
  assert.equal(mask.maskSecret(SECRET), '••••' + SECRET.slice(-4));
  assert.ok(mask.isMaskedSecret(mask.maskSecret(SECRET)));
  assert.ok(mask.isMaskedSecret('****'));
  assert.ok(mask.isMaskedSecret('sk-a...wxyz'));
  assert.ok(!mask.isMaskedSecret(SECRET));
  const masked = mask.maskSecretFields({ bot_token: SECRET, api_key: SECRET, channel: 'general' });
  assert.equal(masked.channel, 'general');
  assert.equal(masked.has_bot_token, true);
  assert.ok(!JSON.stringify(masked).includes(SECRET));
});

test('credentials: values are only ever returned masked; masked updates keep the secret', async () => {
  const created = await call('POST', '/api/credentials', { name: 'test.key', type: 'api_key', value: SECRET });
  assert.equal(created.statusCode, 200, created.body);
  noSecret(created);
  const id = created.json().credential.id;

  for (const url of ['/api/credentials', '/api/credentials?decrypt=true', `/api/credentials/${id}`,
    `/api/credentials/${id}?decrypt=true`, `/api/credentials/${id}/value`]) {
    const res = await call('GET', url);
    assert.equal(res.statusCode, 200, url);
    noSecret(res);
  }
  const listed = (await call('GET', '/api/credentials?decrypt=true')).json().credentials.find(c => c.id === id);
  assert.equal(listed.value, '••••' + SECRET.slice(-4));

  // Echoing the masked value back must not overwrite the stored secret.
  const put = await call('PUT', `/api/credentials/${id}`, { value: listed.value, description: 'd' });
  assert.equal(put.statusCode, 200, put.body);
  assert.equal(await getCredentialManager().getValue(id), SECRET);

  const NEW = 'sk-new-' + randomBytes(16).toString('hex');
  await call('PUT', `/api/credentials/${id}`, { value: NEW });
  assert.equal(await getCredentialManager().getValue(id), NEW);
});

test('settings: API keys are masked; a masked or omitted key keeps the stored one', async () => {
  const put = await call('PUT', '/api/settings', { claude: { apiKey: SECRET, model: 'm1' } });
  assert.equal(put.statusCode, 200, put.body);
  const got = await call('GET', '/api/settings');
  noSecret(got);
  const shown = got.json().settings.claude.apiKey;
  assert.ok(mask.isMaskedSecret(shown));

  await call('PUT', '/api/settings', { claude: { apiKey: shown, model: 'm2' } });
  assert.equal(getSettingsManager().getApiKey('claude'), SECRET);
  await call('PUT', '/api/settings', { claude: { model: 'm3' } }); // UI sends apiKey undefined
  assert.equal(getSettingsManager().getApiKey('claude'), SECRET);
  assert.equal(getSettingsManager().getSettings().claude.model, 'm3');
});

test('extension config: secret keys masked on read, kept on masked write', async () => {
  db.prepare('INSERT INTO extension_configs (extension_id, config_json) VALUES (?, ?)')
    .run('slack', JSON.stringify({ bot_token: SECRET, signing_secret: SECRET + 'x', channel: 'general' }));

  for (const url of ['/api/extensions/slack/config', '/api/extensions/slack/inspect']) {
    const res = await call('GET', url);
    assert.equal(res.statusCode, 200, `${url} ${res.body}`);
    noSecret(res);
  }
  const shown = (await call('GET', '/api/extensions/slack/config')).json().config;
  assert.equal(shown.channel, 'general');

  const put = await call('PUT', '/api/extensions/slack/config', { config: { ...shown, channel: 'ops' } });
  assert.equal(put.statusCode, 200, put.body);
  const stored = JSON.parse(db.prepare('SELECT config_json FROM extension_configs WHERE extension_id = ?').get('slack').config_json);
  assert.equal(stored.bot_token, SECRET);
  assert.equal(stored.signing_secret, SECRET + 'x');
  assert.equal(stored.channel, 'ops');
  assert.equal(stored.has_bot_token, undefined);
});

test('agents config: api_key is never returned', async () => {
  const res = await call('POST', '/api/agents', { name: 'mask-test', api_key: SECRET, provider: 'claude', model: 'm' });
  assert.equal(res.statusCode, 201, res.body);
  noSecret(res);
  const list = await call('GET', '/api/agents');
  noSecret(list);
});
