// S0-Q.11: /api/memory* and /api/sessions* need a valid token of an active user;
// the user comes from the token (query/body userId ignored) and other users'
// memories/sessions answer 404.
// Run: node --import tsx --test test/memory-sessions-auth.test.mjs
// No network: fetch is stubbed (model/embedding calls fail fast and are recorded).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-mem-sess-'));
// Memory storage writes to `../../.data/memory` relative to cwd: keep it inside `dir`.
const cwd = join(dir, 'a', 'b');
mkdirSync(cwd, { recursive: true });
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(cwd);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
process.env.OLLAMA_URL = 'http://127.0.0.1:9'; // never reached: fetch is stubbed

const realFetch = globalThis.fetch;
const outbound = [];
globalThis.fetch = async (url) => { outbound.push(String(url)); throw new Error('network disabled in test'); };

const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
const db = getDatabase();
await db.initialize();
const addUser = (id, role, status = 'active') =>
  db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status, email_verified) VALUES (?, ?, ?, 'x', ?, ?, 1)`)
    .run(id, `${id}@example.test`, id, role, status);
addUser('u-owner', 'owner');
addUser('u-alice', 'user');
addUser('u-bob', 'user');
addUser('u-off', 'user', 'inactive');

const { default: Fastify } = await import('fastify');
const { memoryRoutes } = await import('../src/api/routes/memory.ts');
const { sessionsRoutes } = await import('../src/api/routes/sessions.ts');
const { generateToken } = await import('../src/auth/jwt.ts');

const app = Fastify();
await app.register(memoryRoutes);
await app.register(sessionsRoutes);
await app.ready();

test.after(async () => {
  globalThis.fetch = realFetch;
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const bearer = (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` });
const req = (method, url, headers = {}, payload) => app.inject({ method, url, headers, payload });

// Seed one memory per user directly (no embedding call needed).
const seedMemory = (id, userId, content) => db.prepare(
  `INSERT INTO memories (id, user_id, type, content, memory_layer, status, metadata, importance_score, created_at)
   VALUES (?, ?, 'fact', ?, 'working', 'active', '{}', 0.5, ?)`
).run(id, userId, content, new Date().toISOString());
seedMemory('m-alice', 'u-alice', 'alice likes tea');
seedMemory('m-bob', 'u-bob', 'bob secret note');
seedMemory('m-alice-2', 'u-alice', 'alice second');

test('S0-Q.11: every memory and session route answers 401 without a valid active token', async () => {
  const routes = [
    ['GET', '/api/memory?userId=u-alice'], ['GET', '/api/memory/m-alice'], ['POST', '/api/memory', { userId: 'u-alice', type: 'fact', content: 'x' }],
    ['PUT', '/api/memory/m-alice', { content: 'x' }], ['DELETE', '/api/memory/m-alice'],
    ['POST', '/api/memory/search', { query: 'tea', userId: 'u-alice' }], ['POST', '/api/memory/extract', { text: 'x', userId: 'u-alice' }],
    ['GET', '/api/memory/relevant?query=tea&userId=u-alice'], ['GET', '/api/memory/summary?userId=u-alice'],
    ['POST', '/api/memory/consolidate', { userId: 'u-alice' }], ['GET', '/api/memory/types'],
    ['GET', '/api/memory/layers/stats?userId=u-alice'], ['POST', '/api/memory/layers/promote', { userId: 'u-alice', memoryId: 'm-alice', targetLayer: 'experiential' }],
    ['POST', '/api/memory/layers/consolidate'], ['GET', '/api/memory/layers/consolidate/log'],
    ['GET', '/api/memory/layers/candidates?userId=u-alice'], ['POST', '/api/memory/importance', { memoryId: 'm-alice', importanceScore: 0.9 }],
    ['GET', '/api/sessions'], ['POST', '/api/sessions', { title: 't' }], ['GET', '/api/sessions/x'],
    ['PUT', '/api/sessions/x', { title: 't' }], ['PATCH', '/api/sessions/x', { title: 't' }], ['DELETE', '/api/sessions/x'],
    ['GET', '/api/sessions/x/messages'], ['POST', '/api/sessions/x/messages', { role: 'user', content: 'hi' }],
    ['DELETE', '/api/sessions/x/messages'],
  ];
  for (const [method, url, body] of routes) {
    assert.equal((await req(method, url, {}, body)).statusCode, 401, `${method} ${url} anonymous`);
    assert.equal((await req(method, url, { authorization: 'Bearer not.a.jwt' }, body)).statusCode, 401, `${method} ${url} bad token`);
    assert.equal((await req(method, url, bearer('u-off'), body)).statusCode, 401, `${method} ${url} inactive`);
  }
  // Nothing changed.
  assert.equal(db.prepare('SELECT content FROM memories WHERE id = ?').get('m-alice').content, 'alice likes tea');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM memories').get().n, 3);
});

test('S0-Q.11: memory routes take the user from the token and ignore query/body userId', async () => {
  const list = await req('GET', '/api/memory?userId=u-bob', bearer('u-alice'));
  assert.equal(list.statusCode, 200, list.body);
  assert.deepEqual(list.json().memories.map(m => m.id).sort(), ['m-alice', 'm-alice-2']);
  assert.doesNotMatch(list.body, /bob secret/);

  // Other users' memories: 404 for read/update/delete/importance/promote.
  assert.equal((await req('GET', '/api/memory/m-bob', bearer('u-alice'))).statusCode, 404);
  assert.equal((await req('PUT', '/api/memory/m-bob', bearer('u-alice'), { content: 'hijack' })).statusCode, 404);
  assert.equal((await req('DELETE', '/api/memory/m-bob', bearer('u-alice'))).statusCode, 404);
  assert.equal((await req('POST', '/api/memory/importance', bearer('u-alice'), { memoryId: 'm-bob', importanceScore: 1 })).statusCode, 404);
  assert.equal((await req('POST', '/api/memory/layers/promote', bearer('u-alice'), { userId: 'u-bob', memoryId: 'm-bob', targetLayer: 'experiential' })).statusCode, 400);
  const bob = db.prepare('SELECT content, memory_layer, importance_score FROM memories WHERE id = ?').get('m-bob');
  assert.deepEqual({ ...bob }, { content: 'bob secret note', memory_layer: 'working', importance_score: 0.5 });

  // The owner has no special memory path: strictly own scope.
  assert.equal((await req('GET', '/api/memory/m-bob', bearer('u-owner'))).statusCode, 404);
  assert.equal((await req('GET', '/api/memory?userId=u-bob', bearer('u-owner'))).json().count, 0);

  // Own memory: read works; an update cannot move it to another user.
  assert.equal((await req('GET', '/api/memory/m-alice', bearer('u-alice'))).statusCode, 200);
  const upd = await req('PUT', '/api/memory/m-alice-2', bearer('u-alice'), { userId: 'u-bob', importance: 7 });
  assert.equal(upd.statusCode, 200, upd.body);
  assert.equal(db.prepare('SELECT user_id FROM memories WHERE id = ?').get('m-alice-2').user_id, 'u-alice');

  // Create: the owner of the new memory is the caller, not the body userId.
  const created = await req('POST', '/api/memory', bearer('u-alice'), { userId: 'u-bob', type: 'fact', content: 'created by alice' });
  assert.equal(created.statusCode, 200, created.body);
  assert.equal(db.prepare('SELECT user_id FROM memories WHERE id = ?').get(created.json().memory.id).user_id, 'u-alice');

  // Summary / stats / candidates / relevant are scoped to the caller.
  const summary = await req('GET', '/api/memory/summary?userId=u-bob', bearer('u-alice'));
  assert.equal(summary.statusCode, 200, summary.body);
  assert.doesNotMatch(summary.body, /bob secret/);
  const relevant = await req('GET', '/api/memory/relevant?query=secret&userId=u-bob', bearer('u-alice'));
  assert.equal(relevant.statusCode, 200, relevant.body);
  assert.doesNotMatch(relevant.body, /bob secret/);
  const stats = await req('GET', '/api/memory/layers/stats?userId=u-bob', bearer('u-alice'));
  assert.equal(stats.statusCode, 200, stats.body);

  // Extract (model call stubbed to fail): runs as the caller, stores nothing for bob.
  const before = db.prepare(`SELECT COUNT(*) AS n FROM memories WHERE user_id = 'u-bob'`).get().n;
  const ex = await req('POST', '/api/memory/extract', bearer('u-alice'), { text: 'I live in Berlin', userId: 'u-bob' });
  assert.equal(ex.statusCode, 200, ex.body);
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM memories WHERE user_id = 'u-bob'`).get().n, before);

  // Server-wide maintenance is owner-only.
  assert.equal((await req('POST', '/api/memory/layers/consolidate', bearer('u-alice'))).statusCode, 403);
  assert.equal((await req('GET', '/api/memory/layers/consolidate/log', bearer('u-alice'))).statusCode, 403);
  assert.equal((await req('GET', '/api/memory/layers/consolidate/log', bearer('u-owner'))).statusCode, 200);

  for (const url of outbound) assert.match(url, /^http:\/\/(127\.0\.0\.1|localhost)/, `only local model URLs attempted: ${url}`);
});

test('S0-Q.11: sessions belong to the token user; other users\' sessions answer 404', async () => {
  const create = await req('POST', '/api/sessions', bearer('u-alice'), { title: 'Alice chat', model: 'm', userId: 'u-bob' });
  assert.equal(create.statusCode, 200, create.body);
  const sid = create.json().session.id;
  assert.equal(db.prepare('SELECT user_id FROM chat_sessions WHERE id = ?').get(sid).user_id, 'u-alice');

  const msg = await req('POST', `/api/sessions/${sid}/messages`, bearer('u-alice'), { role: 'user', content: 'hello from alice' });
  assert.equal(msg.statusCode, 200, msg.body);
  assert.equal((await req('POST', `/api/sessions/${sid}/messages`, bearer('u-alice'), { role: 'root', content: 'x' })).statusCode, 400);

  assert.deepEqual((await req('GET', '/api/sessions', bearer('u-alice'))).json().sessions.map(s => s.id), [sid]);
  assert.deepEqual((await req('GET', '/api/sessions', bearer('u-bob'))).json().sessions, []);

  for (const [method, url, body] of [
    ['GET', `/api/sessions/${sid}`], ['PUT', `/api/sessions/${sid}`, { title: 'pwned' }], ['PATCH', `/api/sessions/${sid}`, { title: 'pwned' }],
    ['GET', `/api/sessions/${sid}/messages`], ['POST', `/api/sessions/${sid}/messages`, { role: 'user', content: 'injected' }],
    ['DELETE', `/api/sessions/${sid}/messages`], ['DELETE', `/api/sessions/${sid}`],
  ]) {
    assert.equal((await req(method, url, bearer('u-bob'), body)).statusCode, 404, `${method} ${url} as bob`);
    assert.equal((await req(method, url, bearer('u-owner'), body)).statusCode, 404, `${method} ${url} as owner`);
  }
  const msgs = (await req('GET', `/api/sessions/${sid}/messages`, bearer('u-alice'))).json().messages;
  assert.deepEqual(msgs.map(m => m.content), ['hello from alice']);
  assert.equal((await req('GET', `/api/sessions/${sid}`, bearer('u-alice'))).json().session.title, 'Alice chat');

  assert.equal((await req('DELETE', `/api/sessions/${sid}`, bearer('u-alice'))).statusCode, 200);
  assert.equal((await req('GET', `/api/sessions/${sid}`, bearer('u-alice'))).statusCode, 404);
});
