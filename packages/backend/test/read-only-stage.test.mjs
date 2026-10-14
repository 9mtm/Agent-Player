// RUN-ISO read-only stage 1 (AGENT_PLAYER_READONLY=1) and ISO-2 settings
// refusal, on the real buildServer() route table.
//  - only GET/HEAD/OPTIONS pass, plus exact POST /api/auth/login,
//    POST /api/auth/logout, and the setup routes while setup is not complete;
//  - chat, memory approve, agents PUT, settings, unknown routes, query /
//    prefix / trailing-slash tricks, websocket upgrades and event streams
//    get 403 { error: 'Forbidden', code: 'read_only_stage' };
// Throwaway temp data root; fetch is stubbed (no network); app.inject only.
// Run: node --import tsx --test test/read-only-stage.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const base = realpathSync(mkdtempSync(join(tmpdir(), 'ap-readonly-')));
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
  AGENT_PLAYER_READONLY: '1',
});

const realFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('network disabled in test'); };
const quiet = { log: console.log, warn: console.warn, info: console.info };
console.log = () => {}; console.info = () => {}; console.warn = () => {};

await import(join(backendDir, 'src/config/load-env.ts'));
const { buildServer } = await import(join(backendDir, 'src/api/app.ts'));
const app = await buildServer({ logger: false });
await app.ready();
const { closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));

test.after(async () => {
  console.log = quiet.log; console.info = quiet.info; console.warn = quiet.warn;
  globalThis.fetch = realFetch;
  await app.close();
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
const req = (method, url, opts) => call(app, method, url, opts);

function assertReadOnly(res, what) {
  assert.equal(res.statusCode, 403, `${what}: ${res.statusCode} ${res.body}`);
  assert.deepEqual(res.json(), { error: 'Forbidden', code: 'read_only_stage' }, what);
}

test('reads pass: GET /health, HEAD /health, OPTIONS preflight, GET /api/setup/status', async () => {
  assert.equal((await req('GET', '/health')).statusCode, 200);
  assert.equal((await req('HEAD', '/health')).statusCode, 200);
  const pre = await req('OPTIONS', '/api/chat', { headers: { 'access-control-request-method': 'POST' } });
  assert.equal(pre.statusCode, 204);
  assert.equal((await req('GET', '/api/setup/status')).statusCode, 200);
});

test('setup before completion: only the exact routes; query, slash and case tricks are refused', async () => {
  for (const url of ['/api/setup/admin?x=1', '/api/setup/admin/', '/API/setup/admin', '/api/setup//admin',
    '/api/setup/admin%2F', '/api/setup/database', '/api/setup/python']) {
    assertReadOnly(await req('POST', url, { payload: owner }), url);
  }
  assertReadOnly(await req('GET', '/api/setup/check'), 'GET /api/setup/check spawns host commands');
  const created = await req('POST', '/api/setup/admin', { payload: owner });
  assert.equal(created.statusCode, 200, created.body);
  // An owner now exists: admin is closed even before complete.
  assertReadOnly(await req('POST', '/api/setup/admin', { payload: { ...owner, email: 'second@example.test' } }), 'second admin');
  const done = await req('POST', '/api/setup/complete', { payload: {} });
  assert.equal(done.statusCode, 200, done.body);
  assertReadOnly(await req('POST', '/api/setup/complete', { payload: {} }), 'complete after completion');
  assertReadOnly(await req('POST', '/api/setup/admin', { payload: owner }), 'admin after completion');
});

test('login works (exact URL only); a GET read works with the token', async () => {
  assertReadOnly(await req('POST', '/api/auth/login?next=/x', { payload: { email: owner.email, password: owner.password } }), 'login with query');
  assertReadOnly(await req('POST', '/api/auth/login/', { payload: { email: owner.email, password: owner.password } }), 'login with slash');
  const res = await req('POST', '/api/auth/login', { payload: { email: owner.email, password: owner.password } });
  assert.equal(res.statusCode, 200, res.body);
  token = res.json().token ?? res.json().accessToken;
  assert.ok(token, 'a token is returned');
  const me = await req('GET', '/api/auth/me');
  assert.equal(me.statusCode, 200, me.body);
  assert.equal((me.json().user ?? me.json()).email, owner.email);
  const agents = await req('GET', '/api/agents');
  assert.notEqual(agents.statusCode, 403, agents.body);
});

test('writes are refused: chat POST (and SSE chat), memory approve, agents PUT, settings, deletes, unknown routes', async () => {
  assertReadOnly(await req('POST', '/api/chat', { payload: { message: 'hi' } }), 'POST /api/chat');
  assertReadOnly(await req('POST', '/api/chat', { payload: { message: 'hi', stream: true }, headers: { accept: 'text/event-stream' } }), 'SSE chat');
  assertReadOnly(await req('POST', '/api/chat/agentic', { payload: { message: 'hi' } }), 'agentic chat');
  assertReadOnly(await req('POST', '/api/memory/proposals/p1/approve', { payload: {} }), 'memory approve');
  assertReadOnly(await req('PUT', '/api/agents/a1', { payload: { name: 'x' } }), 'agents PUT');
  assertReadOnly(await req('PUT', '/api/settings', { payload: { provider: 'local' } }), 'settings PUT');
  assertReadOnly(await req('DELETE', '/api/agents/a1'), 'agents DELETE');
  assertReadOnly(await req('PATCH', '/api/agents/a1', { payload: {} }), 'PATCH');
  assertReadOnly(await req('POST', '/api/no-such-route', { payload: {} }), 'unknown POST');
  assertReadOnly(await req('POST', '/api/public-chat/rooms', { payload: {}, auth: false }), 'anonymous public chat');
});

test('websocket upgrades and event streams are refused even on GET', async () => {
  assertReadOnly(await req('GET', '/health', { headers: { connection: 'Upgrade', upgrade: 'websocket' } }), 'upgrade');
  assertReadOnly(await req('GET', '/api/auth/me', { headers: { accept: 'text/event-stream' } }), 'event stream');
});

test('logout works', async () => {
  const res = await req('POST', '/api/auth/logout', { payload: {} });
  assert.notEqual(res.statusCode, 403, res.body);
  assert.ok(res.statusCode < 400, `${res.statusCode} ${res.body}`);
});
