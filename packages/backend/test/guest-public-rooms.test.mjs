// CL-06 (Q-13): guest accounts may use public rooms only (plus who-am-I and
// logout); everything else answers 403, private rooms included.
// Run: node --import tsx --test test/guest-public-rooms.test.mjs
// Throwaway DB + cwd, random test-only secrets; no model is called (no network).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-guest-rooms-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => { throw new Error(`unexpected network call in test: ${url}`); };

const quiet = { log: console.log, warn: console.warn, info: console.info };
console.log = () => {}; console.info = () => {}; console.warn = () => {};
const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const addUser = (id, role) => db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', ?, 'active')`).run(id, `${id}@example.test`, id, role);
addUser('u-owner', 'owner');
addUser('u-guest', 'guest');
const room = db.prepare(`INSERT INTO public_chat_rooms (id, name, owner_user_id, model, is_public, require_auth, allowed_users) VALUES (?, ?, 'u-owner', 'llama3', ?, ?, ?)`);
room.run('room-pub', 'Lobby', 1, 0, null);
room.run('room-pub-auth', 'Members', 1, 1, null);
room.run('room-priv', 'Private', 0, 0, JSON.stringify(['u-guest'])); // guest listed, still refused

const { registerAuthGate } = await import(join(backendDir, 'src/auth/auth-gate.ts'));
const { registerPublicChatRoutes } = await import(join(backendDir, 'src/api/routes/public-chat.ts'));
const { storageRoutes } = await import(join(backendDir, 'src/api/routes/storage.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { default: Fastify } = await import('fastify');
const app = Fastify();
registerAuthGate(app);
await app.register(registerPublicChatRoutes);
await app.register(storageRoutes);
app.get('/api/auth/me', async (req) => ({ id: req.authUser?.id }));
app.post('/api/auth/logout', async () => ({ success: true }));
app.get('/api/agents', async () => ({ agents: [] }));
await app.ready();
console.log = quiet.log; console.info = quiet.info; console.warn = quiet.warn;

test.after(async () => {
  globalThis.fetch = realFetch;
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const guest = { authorization: `Bearer ${generateToken('u-guest', 1)}` };
const req = (method, url, payload) => app.inject({ method, url, headers: guest, payload });

test('guest reaches who-am-I and logout', async () => {
  assert.equal((await req('GET', '/api/auth/me')).statusCode, 200);
  assert.equal((await req('POST', '/api/auth/logout')).statusCode, 200);
});

test('guest uses public rooms: read, list, participants, join/leave, post (validated)', async () => {
  for (const id of ['room-pub', 'room-pub-auth']) {
    assert.equal((await req('GET', `/api/public-chat/rooms/${id}`)).statusCode, 200, id);
    assert.equal((await req('GET', `/api/public-chat/rooms/${id}/messages`)).statusCode, 200, id);
    assert.equal((await req('GET', `/api/public-chat/rooms/${id}/participants`)).statusCode, 200, id);
    // Empty content stops before any model call; it proves the gate and room check let the guest through.
    assert.equal((await req('POST', `/api/public-chat/rooms/${id}/messages`, { content: '' })).statusCode, 400, id);
  }
  const list = await req('GET', '/api/public-chat/rooms?filter=my');
  assert.equal(list.statusCode, 200);
  assert.deepEqual(list.json().rooms.map((r) => r.id).sort(), ['room-pub', 'room-pub-auth'], 'public rooms only');
  assert.equal((await req('POST', '/api/public-chat/rooms/room-pub/join', {})).statusCode, 200);
  assert.equal((await req('POST', '/api/public-chat/rooms/room-pub/leave', {})).statusCode, 200);
});

test('guest is refused on private rooms even when listed in allowed_users', async () => {
  for (const [m, u, p] of [['GET', '/api/public-chat/rooms/room-priv'], ['GET', '/api/public-chat/rooms/room-priv/messages'],
    ['GET', '/api/public-chat/rooms/room-priv/participants'], ['POST', '/api/public-chat/rooms/room-priv/messages', { content: 'x' }],
    ['POST', '/api/public-chat/rooms/room-priv/join', {}]]) {
    assert.equal((await req(m, u, p)).statusCode, 403, `${m} ${u}`);
  }
});

test('everything else answers 403 for guests (room management, other optional and user routes)', async () => {
  for (const [m, u, p] of [['POST', '/api/public-chat/rooms', { name: 'x' }], ['PUT', '/api/public-chat/rooms/room-pub', {}],
    ['DELETE', '/api/public-chat/rooms/room-pub'], ['GET', '/api/public-chat/rooms/room-pub/embed-code'],
    ['GET', '/api/storage/00000000-0000-0000-0000-000000000000'], ['GET', '/api/agents']]) {
    assert.equal((await req(m, u, p)).statusCode, 403, `${m} ${u}`);
  }
});
