// FU-04: POST /api/settings/test never echoes the provider's response body.
// The upstream body can hold the key or account details; the reply carries
// only a fixed text, a code and the upstream status number.
// Run: node --import tsx --test test/settings-test-connection.test.mjs
// No network: fetch is stubbed per case.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-settings-test-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only

const CLAUDE_KEY = `sk-test-claude-${randomBytes(8).toString('hex')}`;
const OPENAI_KEY = `sk-test-openai-${randomBytes(8).toString('hex')}`;
const ACCOUNT = `org-secret-${randomBytes(6).toString('hex')}`;

const realFetch = globalThis.fetch;
let upstream = () => new Response('{}', { status: 200 });
const outbound = [];
globalThis.fetch = async (url, init) => {
  outbound.push(String(url));
  return upstream(String(url), init);
};

// Capture every log line so the test can check none holds the secret.
const logs = [];
const realWarn = console.warn;
const realError = console.error;
const capture = (...args) => logs.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
console.warn = capture;
console.error = capture;

const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
const db = getDatabase();
await db.initialize();
db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status, email_verified) VALUES ('u-owner', 'o@example.test', 'o', 'x', 'owner', 'active', 1)`).run();

const { default: Fastify } = await import('fastify');
const { settingsRoutes } = await import('../src/api/routes/settings.ts');
const { getSettingsManager } = await import('../src/settings/index.ts');
const { generateToken } = await import('../src/auth/jwt.ts');
const { providerStatusCode, providerRejectedBody } = await import('../src/services/provider-test-result.ts');

const app = Fastify();
await app.register(settingsRoutes);
await app.ready();
await getSettingsManager().updateSettings({ claude: { apiKey: CLAUDE_KEY, model: 'm1' }, openai: { apiKey: OPENAI_KEY, model: 'm2' } });

test.after(async () => {
  globalThis.fetch = realFetch;
  console.warn = realWarn;
  console.error = realError;
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const owner = { authorization: `Bearer ${generateToken('u-owner', 1)}` };
const runTest = (provider) => app.inject({ method: 'POST', url: '/api/settings/test', headers: owner, payload: { provider } });

// The upstream body echoes both keys and an account id, as a hostile or
// verbose provider might.
const leakyBody = () => JSON.stringify({ error: { message: `bad key ${CLAUDE_KEY} ${OPENAI_KEY} for ${ACCOUNT}` } });

function assertClean(res, label) {
  for (const secret of [CLAUDE_KEY, OPENAI_KEY, ACCOUNT, 'bad key']) {
    assert.ok(!res.body.includes(secret), `${label}: reply must not contain upstream text or keys`);
  }
}

const CASES = [
  [401, 'invalid_key'],
  [403, 'invalid_key'],
  [429, 'provider_rate_limited'],
  [500, 'provider_unavailable'],
  [503, 'provider_unavailable'],
  [400, 'provider_rejected'],
  [404, 'provider_rejected'],
];

test('FU-04: status mapping is fixed', () => {
  for (const [status, code] of CASES) assert.equal(providerStatusCode(status), code, String(status));
  assert.deepEqual(providerRejectedBody(429), { success: false, error: 'Connection test failed', code: 'provider_rate_limited', status: 429 });
  assert.equal(providerRejectedBody(NaN).status, undefined);
});

for (const provider of ['claude', 'openai']) {
  test(`FU-04: ${provider} upstream failures return a fixed body with code and status, never the body text`, async () => {
    for (const [status, code] of CASES) {
      upstream = () => new Response(leakyBody(), { status, headers: { 'content-type': 'application/json' } });
      logs.length = 0;
      const res = await runTest(provider);
      assert.equal(res.statusCode, 400, `${provider} ${status}`);
      assert.deepEqual(res.json(), { success: false, error: 'Connection test failed', code, status });
      assertClean(res, `${provider} ${status}`);
      for (const line of logs) {
        for (const secret of [CLAUDE_KEY, OPENAI_KEY, ACCOUNT]) assert.ok(!line.includes(secret), `${provider} ${status}: log leaks`);
      }
    }
  });

  test(`FU-04: ${provider} network error returns provider_unreachable without the error text`, async () => {
    upstream = () => {
      const err = new TypeError(`fetch failed for ${CLAUDE_KEY} ${OPENAI_KEY} ${ACCOUNT}`);
      err.cause = { code: 'ECONNREFUSED', message: ACCOUNT };
      throw err;
    };
    logs.length = 0;
    const res = await runTest(provider);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.json(), { success: false, error: 'Connection test failed', code: 'provider_unreachable' });
    assertClean(res, `${provider} network`);
    for (const line of logs) {
      for (const secret of [CLAUDE_KEY, OPENAI_KEY, ACCOUNT]) assert.ok(!line.includes(secret), `${provider} network: log leaks`);
    }
  });

  test(`FU-04: ${provider} success still answers 200`, async () => {
    upstream = () => new Response(leakyBody(), { status: 200 });
    const res = await runTest(provider);
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(res.json().success, true);
    assertClean(res, `${provider} ok`);
  });
}

test('FU-04: invalid provider has a code and makes no outbound call', async () => {
  const before = outbound.length;
  const res = await runTest('nope');
  assert.equal(res.statusCode, 400);
  assert.equal(res.json().code, 'invalid_provider');
  assert.equal(outbound.length, before);
});
