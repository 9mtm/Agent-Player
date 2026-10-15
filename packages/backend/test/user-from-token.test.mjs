// S0-A.6: avatar and workflow routes take the user from the verified token,
// never from a userId in the query/body or "the first user in the database".
// Uses the real app (buildServer) so request.authUser comes from the gate.
// Run: node --import tsx --test test/user-from-token.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-user-token-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
process.env.NODE_ENV = 'test';

const realFetch = globalThis.fetch;
globalThis.fetch = async () => new Response('{}', { status: 200 });
const quiet = { log: console.log, warn: console.warn, info: console.info };
console.log = () => {}; console.info = () => {}; console.warn = () => {};

const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const addUser = (id, role) =>
  db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status, email_verified) VALUES (?, ?, ?, 'x', ?, 'active', 1)`)
    .run(id, `${id}@example.test`, id, role);
addUser('t-owner', 'owner');
addUser('t-admin', 'admin');
addUser('t-alice', 'user');
addUser('t-bob', 'user');

const { buildServer } = await import(join(backendDir, 'src/api/app.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const app = await buildServer({ logger: false });
await app.ready();
console.log = quiet.log; console.info = quiet.info; console.warn = quiet.warn;

test.after(async () => {
  globalThis.fetch = realFetch;
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const as = (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` });

test('avatars: a userId in the body/query is ignored; other users cannot touch them', async () => {
  const created = await app.inject({
    method: 'POST', url: '/api/avatars', headers: as('t-alice'),
    payload: { userId: 't-bob', name: 'mine', source: 'url', glbUrl: 'https://models.readyplayer.me/abc.glb' },
  });
  assert.equal(created.statusCode, 200, created.body);
  const row = db.prepare(`SELECT id, user_id FROM user_avatars WHERE name = 'mine'`).get();
  assert.equal(row.user_id, 't-alice', 'stored under the token user, not the body userId');

  const bobList = await app.inject({ method: 'GET', url: '/api/avatars?userId=t-alice', headers: as('t-bob') });
  assert.equal(bobList.statusCode, 200);
  assert.ok(!bobList.body.includes(row.id), 'bob does not see alice avatars via ?userId');

  for (const [method, url, payload] of [
    ['PATCH', `/api/avatars/${row.id}`, { name: 'hacked' }],
    ['GET', `/api/avatars/${row.id}`, undefined],
    ['POST', `/api/avatars/${row.id}/localize`, {}],
  ]) {
    const res = await app.inject({ method, url, headers: as('t-bob'), payload });
    assert.equal(res.statusCode, 404, `${method} ${url} -> ${res.statusCode}`);
  }
  assert.equal(db.prepare('SELECT name FROM user_avatars WHERE id = ?').get(row.id).name, 'mine');
  const del = await app.inject({ method: 'DELETE', url: `/api/avatars/${row.id}?userId=t-alice`, headers: as('t-bob') });
  assert.ok(db.prepare('SELECT id FROM user_avatars WHERE id = ?').get(row.id), `bob could not delete (${del.statusCode})`);

  const own = await app.inject({ method: 'PATCH', url: `/api/avatars/${row.id}`, headers: as('t-alice'), payload: { name: 'renamed' } });
  assert.equal(own.statusCode, 200);
  assert.equal(db.prepare('SELECT name FROM user_avatars WHERE id = ?').get(row.id).name, 'renamed');
});

test('workflows: rows belong to the token user, not the first user in the DB', async () => {
  const created = await app.inject({ method: 'POST', url: '/api/workflows', headers: as('t-owner'), payload: { name: 'wf1', nodes: [], edges: [] } });
  assert.equal(created.statusCode, 201, created.body);
  const row = db.prepare(`SELECT user_id FROM workflows WHERE name = 'wf1'`).get();
  assert.equal(row.user_id, 't-owner');
  const firstUser = db.prepare('SELECT id FROM users LIMIT 1').get().id;
  assert.notEqual(firstUser, 't-owner', 'test is meaningful: the first DB user is someone else');
  const adminList = await app.inject({ method: 'GET', url: '/api/workflows', headers: as('t-admin') });
  assert.equal(adminList.statusCode, 200);
  assert.ok(!adminList.body.includes('wf1'), 'admin sees only own workflows');
});

test('webhooks: the owner is the token user, not an ownerId in the body', async () => {
  // Started by api/startup.ts in the real server, not by buildServer.
  const { initializeWebhooks } = await import(join(backendDir, 'src/webhooks/index.ts'));
  const { manager } = await initializeWebhooks();
  for (const [who, name] of [['t-owner', 'wh-owner'], ['t-admin', 'wh-admin']]) {
    const created = await app.inject({
      method: 'POST', url: '/api/webhooks', headers: as(who),
      payload: { name, url: 'https://hooks.example.test/in', events: ['agent.started'], ownerId: 't-bob' },
    });
    assert.equal(created.statusCode, 200, created.body);
    const stored = await manager.getById(JSON.parse(created.body).webhook.id);
    assert.equal(stored.ownerId, who, `${name} stored under the token user, not the body ownerId`);
  }
  const anon = await app.inject({
    method: 'POST', url: '/api/webhooks',
    payload: { name: 'wh-anon', url: 'https://hooks.example.test/in', events: ['agent.started'], ownerId: 't-owner' },
  });
  assert.ok(anon.statusCode === 401 || anon.statusCode === 403, `anonymous -> ${anon.statusCode}`);
  assert.ok(!(await manager.list({})).some((w) => w.name === 'wh-anon'), 'anonymous create stored nothing');
});
