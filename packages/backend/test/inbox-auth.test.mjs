// F-07: inbox routes take the user from the verified token (they used to read
// request.user, which nothing set, so every route answered 401). Messages stay
// scoped to their owner.
// Run: node --import tsx --test test/inbox-auth.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-inbox-auth-'));
const backendDir = process.cwd();
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only

const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { createInboxSystem } = await import(join(backendDir, 'src/inbox/index.ts'));
const { inboxRoutes } = await import(join(backendDir, 'src/api/routes/inbox.ts'));
const { default: Fastify } = await import('fastify');

const db = getDatabase();
await db.initialize();
const addUser = (id, role, status = 'active') => db.prepare(
  `INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', ?, ?)`
).run(id, `${id}@example.test`, id, role, status);
addUser('u-alice', 'user');
addUser('u-bob', 'user');
addUser('u-owner', 'owner');
addUser('u-suspended', 'user', 'suspended');
const token = id => `Bearer ${generateToken(id, 1)}`;

// Same wiring as the real server.
const app = Fastify();
const inbox = createInboxSystem(db);
app.decorate('inboxGateway', inbox.inboxGateway);
app.decorate('messageStore', inbox.messageStore);
await app.register(inboxRoutes);
await app.ready();

test.after(async () => {
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const call = (method, url, who, payload) => app.inject({
  method, url, ...(payload ? { payload } : {}),
  headers: who ? { authorization: who.startsWith('Bearer ') ? who : token(who) } : {},
});

test('anonymous, forged and suspended callers get 401 on every route', async () => {
  const routes = [
    ['GET', '/api/inbox'], ['GET', '/api/inbox/x'], ['POST', '/api/inbox', { message: 'hi' }],
    ['DELETE', '/api/inbox/x'], ['GET', '/api/inbox/stats'], ['GET', '/api/inbox/approvals'],
    ['POST', '/api/inbox/x/approve', {}], ['POST', '/api/inbox/x/deny', {}], ['POST', '/api/inbox/cleanup'],
  ];
  for (const [method, url, payload] of routes) {
    assert.equal((await call(method, url, null, payload)).statusCode, 401, `${method} ${url}`);
    assert.equal((await call(method, url, 'Bearer not-a-jwt', payload)).statusCode, 401, `forged ${method} ${url}`);
    assert.equal((await call(method, url, 'u-suspended', payload)).statusCode, 401, `suspended ${method} ${url}`);
  }
});

test('a signed-in user can create, list, read, see stats and delete their messages', async () => {
  const created = await call('POST', '/api/inbox', 'u-alice', { message: 'check status please' });
  assert.equal(created.statusCode, 200, created.body);
  const id = created.json().messageId;
  assert.ok(id);

  const list = await call('GET', '/api/inbox', 'u-alice');
  assert.equal(list.statusCode, 200, list.body);
  assert.deepEqual(list.json().messages.map(m => m.id), [id]);

  const one = await call('GET', `/api/inbox/${id}`, 'u-alice');
  assert.equal(one.statusCode, 200);
  assert.equal(one.json().message.userId, 'u-alice');

  assert.equal((await call('GET', '/api/inbox/stats', 'u-alice')).statusCode, 200);
  assert.equal((await call('GET', '/api/inbox/approvals', 'u-alice')).statusCode, 200);
  assert.equal((await call('POST', '/api/inbox/cleanup', 'u-alice')).statusCode, 200);

  assert.equal((await call('DELETE', `/api/inbox/${id}`, 'u-alice')).statusCode, 200);
  assert.equal((await call('GET', `/api/inbox/${id}`, 'u-alice')).statusCode, 404);
});

test('messages are scoped per user (also for the owner); a body userId is ignored', async () => {
  const created = await call('POST', '/api/inbox', 'u-alice', { message: 'private note', userId: 'u-bob' });
  const id = created.json().messageId;

  assert.equal((await call('GET', '/api/inbox', 'u-bob')).json().messages.length, 0);
  assert.equal((await call('GET', '/api/inbox?userId=u-alice', 'u-bob')).json().messages.length, 0);
  for (const who of ['u-bob', 'u-owner']) {
    assert.equal((await call('GET', `/api/inbox/${id}`, who)).statusCode, 404, who);
    assert.equal((await call('DELETE', `/api/inbox/${id}`, who)).statusCode, 404, who);
    assert.equal((await call('POST', `/api/inbox/${id}/approve`, who, {})).statusCode, 404, who);
    assert.equal((await call('POST', `/api/inbox/${id}/deny`, who, {})).statusCode, 404, who);
  }
  const still = await call('GET', `/api/inbox/${id}`, 'u-alice');
  assert.equal(still.statusCode, 200, 'other users changed nothing');
  assert.equal(still.json().message.userId, 'u-alice');

  // Unknown ids answer 404, not 500.
  assert.equal((await call('GET', '/api/inbox/no-such-id', 'u-alice')).statusCode, 404);
  assert.equal((await call('POST', '/api/inbox/no-such-id/approve', 'u-alice', {})).statusCode, 404);
});
