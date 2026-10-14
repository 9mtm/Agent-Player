// RUN-ISO ISO-2: with AGENT_PLAYER_ISOLATED=1 the settings layer refuses a
// provider that leaves the machine (PUT /api/settings and the onboarding
// provider step reply 403 { error: 'Forbidden', code: 'isolated_mode' }),
// on the real buildServer() route table with read-only stage off.
// Throwaway temp data root; fetch is stubbed (no network); app.inject only.
// Run: node --import tsx --test test/isolated-settings.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const base = realpathSync(mkdtempSync(join(tmpdir(), 'ap-iso-settings-')));
const dataDir = join(base, 'data');
const cwdDir = join(base, 'cwd');
for (const d of [dataDir, cwdDir, join(base, 'home'), join(base, 'tmp')]) mkdirSync(d, { recursive: true });
process.chdir(cwdDir);
for (const k of ['DATABASE_PATH', 'UPLOADS_DIR', 'AUDIT_DB_PATH', 'ENCRYPTION_DB_PATH', 'MCP_SERVERS_DIR', 'STORAGE_BASE_DIR',
  'AGENT_PLAYER_DB', 'AGENT_PLAYER_PG_URL', 'DATABASE_URL', 'JWT_SECRET', 'ENCRYPTION_KEY', 'MASTER_ENCRYPTION_KEY',
  'WORKFLOW_SECRET', 'AGENT_EXEC_TOOLS', 'AGENT_PLAYER_ISOLATED']) delete process.env[k];
Object.assign(process.env, {
  HOME: join(base, 'home'), TMPDIR: join(base, 'tmp'), NODE_ENV: 'production', HOST: '127.0.0.1', PORT: '0',
  AGENT_PLAYER_DATA_DIR: dataDir, AGENT_PLAYER_BACKGROUND: 'off', EXTENSIONS_DISABLED: 'true', MEMORY_EMBEDDINGS: 'hash',
  OLLAMA_URL: 'http://127.0.0.1:9', LOCAL_MODEL_API_URL: 'http://127.0.0.1:9/v1', ALLOWED_ORIGINS: 'http://127.0.0.1:42522',
});

const realFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('network disabled in test'); };
const quiet = { log: console.log, warn: console.warn, info: console.info };
console.log = () => {}; console.info = () => {}; console.warn = () => {};

await import(join(backendDir, 'src/config/load-env.ts'));
const { buildServer } = await import(join(backendDir, 'src/api/app.ts'));
const appIsolated = await buildServer({ logger: false });
await appIsolated.ready();
const { closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));

test.after(async () => {
  console.log = quiet.log; console.info = quiet.info; console.warn = quiet.warn;
  globalThis.fetch = realFetch;
  await appIsolated.close();
  closeDatabase();
  rmSync(base, { recursive: true, force: true });
});

const ORIGIN = 'http://127.0.0.1:42522';
const owner = { name: 'Fictional Owner', email: 'owner@example.test', password: `T-${randomBytes(12).toString('hex')}-a1!` };
let token = null;

function call(target, method, url, { payload, headers = {}, auth = true } = {}) {
  return target.inject({
    method, url, payload,
    headers: {
      host: '127.0.0.1:42521', origin: ORIGIN,
      ...(payload !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(auth && token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
}

test('ISO-2: isolated mode refuses a remote provider at the settings layer (403 isolated_mode)', async () => {
  assert.equal((await call(appIsolated, 'POST', '/api/setup/admin', { payload: owner })).statusCode, 200);
  const login = await call(appIsolated, 'POST', '/api/auth/login', { payload: { email: owner.email, password: owner.password }, auth: false });
  assert.equal(login.statusCode, 200, login.body);
  token = login.json().token ?? login.json().accessToken;
  process.env.AGENT_PLAYER_ISOLATED = '1';
  try {
    for (const payload of [{ local: { url: 'http://10.0.0.5:11434', model: 'm' } }, { local: { url: 'https://ollama.example.com', model: 'm' } },
      { provider: 'claude' }, { provider: 'openai' }]) {
      const res = await call(appIsolated, 'PUT', '/api/settings', { payload });
      assert.equal(res.statusCode, 403, `${JSON.stringify(payload)}: ${res.body}`);
      assert.deepEqual(res.json(), { error: 'Forbidden', code: 'isolated_mode' });
    }
    const ok = await call(appIsolated, 'PUT', '/api/settings', { payload: { provider: 'local', local: { url: 'http://127.0.0.1:9', model: 'm' } } });
    assert.equal(ok.statusCode, 200, ok.body);
    const wiz = await call(appIsolated, 'POST', '/api/onboarding', { payload: { step: 'provider', data: { aiProvider: 'anthropic' } } });
    assert.equal(wiz.statusCode, 403, wiz.body);
    assert.deepEqual(wiz.json(), { error: 'Forbidden', code: 'isolated_mode' });
    const settings = await call(appIsolated, 'GET', '/api/settings');
    assert.equal(settings.json().settings.provider, 'local', 'nothing remote was stored');
  } finally {
    delete process.env.AGENT_PLAYER_ISOLATED;
  }
});
