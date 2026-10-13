// S0-Q.18: server-monitor extension routes need an active owner/admin token,
// never return stored SSH/WHM secrets, and validate host/port. The real
// extension is loaded through the ExtensionRunner; outbound network is stubbed
// and must never be used.
// Run: node --import tsx --test test/server-monitor-auth.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { mkdtempSync, rmSync, symlinkSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-server-monitor-auth-'));
const backendDir = process.cwd();
process.chdir(dir);
// The permission check reads manifests from <cwd>/extensions (as in the real server).
symlinkSync(join(backendDir, 'extensions'), join(dir, 'extensions'), 'dir');
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only

// No real network: any outbound attempt is recorded and refused.
const outbound = [];
globalThis.fetch = async (url) => { outbound.push(String(url)); throw new Error('network disabled in test'); };
const realConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) { outbound.push(JSON.stringify(args[0])); throw new Error('network disabled in test'); };

const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { ExtensionRunner } = await import(join(backendDir, 'src/plugins/extension-runner.ts'));
const { default: Fastify } = await import('fastify');

const db = getDatabase();
await db.initialize();

const addUser = (id, role, status = 'active') => db.prepare(
  `INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', ?, ?)`
).run(id, `${id}@example.test`, id, role, status);
addUser('u-owner', 'owner');
addUser('u-admin', 'admin');
addUser('u-user', 'user');
addUser('u-suspended', 'admin', 'suspended');
const token = id => `Bearer ${generateToken(id, 1)}`;

// Only server-monitor is enabled; every other extension is skipped.
db.prepare(`INSERT OR REPLACE INTO extension_configs (extension_id, enabled) VALUES ('server-monitor', 1)`).run();

const app = Fastify();
const cronEngine = { register() {}, unregister() {} };
await new ExtensionRunner(join(dir, 'extensions')).initialize(app, cronEngine);
await app.ready();

test.after(async () => {
  await app.close();
  closeDatabase();
  net.Socket.prototype.connect = realConnect;
  unlinkSync(join(dir, 'extensions')); // remove the link only, never its target
  rmSync(dir, { recursive: true, force: true });
});

const call = (method, url, authorization, payload) => app.inject({
  method, url, ...(payload ? { payload } : {}), headers: authorization ? { authorization } : {},
});

const BASE = '/api/ext/server-monitor';
const routes = [
  ['GET', `${BASE}/dashboard`],
  ['GET', `${BASE}/pulse`],
  ['GET', `${BASE}/whm/servers`],
  ['GET', `${BASE}/whm/server/1/accounts`],
  ['GET', `${BASE}/settings/servers`],
  ['POST', `${BASE}/settings/servers`, { name: 'x', host: 'h.example.test', username: 'root', password: 'p' }],
  ['PUT', `${BASE}/settings/servers/1`, { name: 'renamed' }],
  ['POST', `${BASE}/settings/servers/1/test`],
  ['DELETE', `${BASE}/settings/servers/2`],
];

test('anonymous and forged-token requests get 401 on every route', async () => {
  for (const [method, url, payload] of routes) {
    assert.equal((await call(method, url, null, payload)).statusCode, 401, `${method} ${url}`);
    assert.equal((await call(method, url, 'Bearer not-a-jwt', payload)).statusCode, 401, `forged ${method} ${url}`);
  }
});

test('member and suspended admin get 403 on every route', async () => {
  for (const [method, url, payload] of routes) {
    assert.equal((await call(method, url, token('u-user'), payload)).statusCode, 403, `user ${method} ${url}`);
    assert.equal((await call(method, url, token('u-suspended'), payload)).statusCode, 403, `suspended ${method} ${url}`);
  }
  const list = await call('GET', `${BASE}/settings/servers`, token('u-owner'));
  assert.equal(list.json().servers.length, 2, 'refused requests changed nothing');
});

test('owner and admin can use the routes', async () => {
  for (const who of ['u-owner', 'u-admin']) {
    assert.equal((await call('GET', `${BASE}/dashboard`, token(who))).statusCode, 200);
    assert.equal((await call('GET', `${BASE}/settings/servers`, token(who))).statusCode, 200);
    assert.equal((await call('POST', `${BASE}/settings/servers/1/test`, token(who))).statusCode, 200);
  }
});

test('stored SSH/WHM secrets are never returned; masked values keep them', async () => {
  const SSH = 'ssh-password-secret-value-1234';
  const WHM = 'whm-api-token-secret-value-5678';
  const created = await call('POST', `${BASE}/settings/servers`, token('u-owner'), {
    name: 'Box', type: 'ssh', host: 'box.example.test', port: '2222', username: 'root',
    password: SSH, api_token: WHM, ssh_password: SSH, unexpected: 'dropped',
  });
  assert.equal(created.statusCode, 200, created.body);
  const server = created.json().server;
  assert.ok(!created.body.includes(SSH) && !created.body.includes(WHM), 'create response leaks a secret');
  assert.equal(server.port, 2222);
  assert.equal(server.has_password, true);
  assert.equal(server.has_api_token, true);
  assert.equal(server.unexpected, undefined, 'unknown fields are not stored');

  const list = await call('GET', `${BASE}/settings/servers`, token('u-admin'));
  assert.ok(!list.body.includes(SSH) && !list.body.includes(WHM), 'list leaks a secret');

  // Saving the masked value back keeps the stored secret (still reported as set).
  const updated = await call('PUT', `${BASE}/settings/servers/${server.id}`, token('u-owner'), {
    ...server, name: 'Box 2',
  });
  assert.equal(updated.statusCode, 200, updated.body);
  assert.equal(updated.json().server.name, 'Box 2');
  assert.equal(updated.json().server.has_password, true);
  assert.equal(updated.json().server.password, server.password);
  assert.ok(!updated.body.includes(SSH) && !updated.body.includes(WHM));
});

test('host and port are validated', async () => {
  const bad = [
    { host: 'http://evil.example.test' },
    { host: 'evil.example.test/path' },
    { host: 'user@evil.example.test' },
    { host: 'evil.example.test:22' },
    { host: ' evil.example.test' },
    { host: 'a b' },
    { host: '' },
    { port: 0 },
    { port: 70000 },
    { port: '22; rm -rf /' },
    { port: 1.5 },
    { ssh_host: 'ssh://x' },
    { ssh_port: -1 },
    { type: 'telnet' },
  ];
  for (const patch of bad) {
    const res = await call('POST', `${BASE}/settings/servers`, token('u-owner'),
      { name: 'Bad', host: 'ok.example.test', username: 'root', ...patch });
    assert.equal(res.statusCode, 400, `${JSON.stringify(patch)} -> ${res.statusCode}`);
  }
  for (const host of ['ok.example.test', '10.0.0.5', '2001:db8::1', 'localhost']) {
    const res = await call('POST', `${BASE}/settings/servers`, token('u-owner'), { name: 'Ok', host, username: 'root' });
    assert.equal(res.statusCode, 200, `${host} -> ${res.body}`);
  }
  const put = await call('PUT', `${BASE}/settings/servers/1`, token('u-owner'), { host: 'http://x' });
  assert.equal(put.statusCode, 400);
});

test('no outbound network connection was attempted', () => {
  assert.deepEqual(outbound, []);
});
