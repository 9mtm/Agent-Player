// INSTALLER-07: the first owner is claimed only from this machine and only
// with the one-time setup token that `agent-player setup` / `start` issues.
//  - no token file, no token, a wrong or expired token, or a peer that is not
//    loopback: 403 with a fixed code, no user row;
//  - the right token creates exactly one owner in the one `users` table and
//    deletes the token file; the same token (or a second browser) cannot
//    claim again; normal sign-in works afterwards.
// Real buildServer() route table (host check, CSRF, auth gate); throwaway
// temp data root; fetch stubbed (no network); app.inject only.
// Run: node --import tsx --test test/setup-token.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const base = realpathSync(mkdtempSync(join(tmpdir(), 'ap-setup-token-')));
const dataDir = join(base, 'data');
const cwdDir = join(base, 'cwd');
for (const d of [dataDir, cwdDir, join(base, 'home'), join(base, 'tmp')]) mkdirSync(d, { recursive: true });
process.chdir(cwdDir);
for (const k of ['DATABASE_PATH', 'UPLOADS_DIR', 'AUDIT_DB_PATH', 'ENCRYPTION_DB_PATH', 'MCP_SERVERS_DIR', 'STORAGE_BASE_DIR',
  'AGENT_PLAYER_DB', 'AGENT_PLAYER_PG_URL', 'DATABASE_URL', 'JWT_SECRET', 'ENCRYPTION_KEY', 'MASTER_ENCRYPTION_KEY',
  'WORKFLOW_SECRET', 'AGENT_EXEC_TOOLS', 'AGENT_PLAYER_ISOLATED', 'AGENT_PLAYER_READONLY']) delete process.env[k];
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
const { issueSetupToken, checkSetupToken, isLoopbackPeer, SETUP_TOKEN_FILE } = await import(join(backendDir, 'src/auth/setup-token.ts'));
const app = await buildServer({ logger: false });
await app.ready();
const { closeDatabase, getDatabase } = await import(join(backendDir, 'src/db/database.ts'));

test.after(async () => {
  console.log = quiet.log; console.info = quiet.info; console.warn = quiet.warn;
  globalThis.fetch = realFetch;
  await app.close();
  closeDatabase();
  rmSync(base, { recursive: true, force: true });
});

const ORIGIN = 'http://127.0.0.1:42522';
const tokenFile = join(dataDir, SETUP_TOKEN_FILE);
const owner = { name: 'Fictional Owner', email: 'owner@example.test', password: `T-${randomBytes(12).toString('hex')}-a1!` };

function claim(payload, remoteAddress = '127.0.0.1') {
  return app.inject({
    method: 'POST', url: '/api/setup/admin', payload, remoteAddress,
    headers: { host: '127.0.0.1:42521', origin: ORIGIN, 'content-type': 'application/json' },
  });
}
const users = () => getDatabase().prepare("SELECT id, email, role FROM users WHERE id NOT IN ('mock-user', '1')").all();
const userTables = () => getDatabase().prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE '%user%' ORDER BY name").all().map(r => r.name);
const tablesBefore = userTables();

function refused(res, code, what) {
  assert.equal(res.statusCode, 403, `${what}: ${res.statusCode} ${res.body}`);
  assert.equal(res.json().code, code, what);
  assert.deepEqual(users(), [], `${what}: no user row`);
}

test('helpers: loopback peers only; token shape and hash compare', () => {
  for (const a of ['127.0.0.1', '127.8.9.10', '::1', '::ffff:127.0.0.1']) assert.equal(isLoopbackPeer(a), true, a);
  for (const a of [undefined, '', '10.0.0.5', '192.168.1.5', '::ffff:10.0.0.5', '0.0.0.0', 'fe80::1', '128.0.0.1']) assert.equal(isLoopbackPeer(a), false, String(a));
  const dir = join(base, 'helper');
  assert.equal(checkSetupToken('x'.repeat(43), dir), 'missing');
  const t = issueSetupToken(dir);
  assert.match(t, /^[A-Za-z0-9_-]{43}$/);
  const stored = readFileSync(join(dir, SETUP_TOKEN_FILE), 'utf8');
  assert.ok(!stored.includes(t), 'only the hash is stored');
  assert.equal(statSync(join(dir, SETUP_TOKEN_FILE)).mode & 0o777, 0o600);
  assert.equal(checkSetupToken(t, dir), 'ok');
  assert.equal(checkSetupToken(t.slice(0, 42) + (t[42] === 'A' ? 'B' : 'A'), dir), 'invalid');
  assert.equal(checkSetupToken(undefined, dir), 'invalid');
  assert.equal(checkSetupToken(t, dir, Date.now() + 25 * 60 * 60 * 1000), 'expired');
});

test('token required: no file issued yet -> setup_token_missing', async () => {
  assert.equal(existsSync(tokenFile), false);
  refused(await claim(owner), 'setup_token_missing', 'no token file');
  refused(await claim({ ...owner, setupToken: 'A'.repeat(43) }), 'setup_token_missing', 'guessed token, no file');
});

let setupToken;
test('with a token issued: missing, wrong, malformed and expired tokens are refused', async () => {
  setupToken = issueSetupToken();
  refused(await claim(owner), 'setup_token_invalid', 'no token in body');
  refused(await claim({ ...owner, setupToken: issueSetupToken(join(base, 'other')) }), 'setup_token_invalid', 'token from another install');
  refused(await claim({ ...owner, setupToken: setupToken + 'x' }), 'setup_token_invalid', 'malformed');
  refused(await claim({ ...owner, setupToken: 12345 }), 'setup_token_invalid', 'non-string');
  // Expired: same token, record dated 25 hours ago.
  const record = JSON.parse(readFileSync(tokenFile, 'utf8'));
  writeFileSync(tokenFile, JSON.stringify({ ...record, createdAt: new Date(Date.now() - 25 * 3600e3).toISOString() }), { mode: 0o600 });
  refused(await claim({ ...owner, setupToken }), 'setup_token_expired', 'expired');
  writeFileSync(tokenFile, JSON.stringify(record), { mode: 0o600 });
});

test('a second browser on another machine cannot claim, even with the right token', async () => {
  refused(await claim({ ...owner, setupToken }, '192.168.1.20'), 'setup_not_local', 'LAN peer with valid token');
  refused(await claim({ ...owner, setupToken }, '::ffff:10.0.0.7'), 'setup_not_local', 'mapped IPv4 LAN peer');
  // A forwarded header does not make a remote peer local.
  const forwarded = await app.inject({
    method: 'POST', url: '/api/setup/admin', payload: { ...owner, setupToken }, remoteAddress: '10.0.0.7',
    headers: { host: '127.0.0.1:42521', origin: ORIGIN, 'content-type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
  });
  refused(forwarded, 'setup_not_local', 'X-Forwarded-For spoof');
  assert.ok(existsSync(tokenFile), 'refusals do not use up the token');
});

test('right token from loopback: owner created once, token file deleted, one users table', async () => {
  const weak = await claim({ ...owner, password: 'short', setupToken });
  assert.equal(weak.statusCode, 400);
  assert.equal(weak.json().code, 'weak_password');
  assert.ok(existsSync(tokenFile), 'a validation error keeps the token');

  const ok = await claim({ ...owner, setupToken });
  assert.equal(ok.statusCode, 200, ok.body);
  assert.deepEqual(users().map(u => [u.email, u.role]), [[owner.email, 'owner']]);
  assert.equal(existsSync(tokenFile), false, 'token is one-time');
  assert.deepEqual(userTables(), tablesBefore, 'no second users schema');

  const status = await app.inject({ method: 'GET', url: '/api/setup/status', headers: { host: '127.0.0.1:42521' } });
  assert.equal(status.json().setupComplete, true);
});

test('after the owner exists: the used token and a fresh token are both refused', async () => {
  const again = await claim({ ...owner, email: 'second@example.test', setupToken });
  assert.equal(again.statusCode, 403);
  assert.equal(again.json().code, 'setup_complete');
  const fresh = await claim({ ...owner, email: 'second@example.test', setupToken: issueSetupToken() });
  assert.equal(fresh.statusCode, 403);
  assert.equal(fresh.json().code, 'setup_complete');
  assert.equal(users().length, 1);
});

test('sign-in works with the new owner', async () => {
  const login = await app.inject({
    method: 'POST', url: '/api/auth/login', payload: { email: owner.email, password: owner.password },
    headers: { host: '127.0.0.1:42521', origin: ORIGIN, 'content-type': 'application/json' },
  });
  assert.equal(login.statusCode, 200, login.body);
  const token = login.json().token;
  const me = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { host: '127.0.0.1:42521', authorization: `Bearer ${token}` } });
  assert.equal(me.statusCode, 200, me.body);
  assert.equal(me.json().user.role, 'owner');
});
