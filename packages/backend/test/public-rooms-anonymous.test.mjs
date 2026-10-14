// CL-07 (Q-14): public rooms stay, but anonymous visitors may read or post only
// after the owner turns `publicRooms.allowAnonymous` on in Settings (default off).
// Run: node --import tsx --test test/public-rooms-anonymous.test.mjs
// Throwaway DB + cwd, random test-only secrets; no model is called (no network).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-anon-rooms-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => { throw new Error(`unexpected network call in test: ${url}`); };

const quiet = { log: console.log, warn: console.warn, info: console.info };
console.log = () => {}; console.info = () => {}; console.warn = () => {};
const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const addUser = (id, role) => db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', ?, 'active')`).run(id, `${id}@example.test`, id, role);
addUser('u-owner', 'owner');
addUser('u-admin', 'admin');
addUser('u-member', 'user');
db.prepare(`INSERT INTO public_chat_rooms (id, name, owner_user_id, model, is_public, require_auth) VALUES ('room-pub', 'Lobby', 'u-owner', 'llama3', 1, 0)`).run();

const { registerAuthGate } = await import(join(backendDir, 'src/auth/auth-gate.ts'));
const { registerPublicChatRoutes } = await import(join(backendDir, 'src/api/routes/public-chat.ts'));
const { settingsRoutes } = await import(join(backendDir, 'src/api/routes/settings.ts'));
const { anonymousPublicRoomsEnabled } = await import(join(backendDir, 'src/services/public-rooms.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { default: Fastify } = await import('fastify');
const app = Fastify();
registerAuthGate(app);
await app.register(registerPublicChatRoutes);
await app.register(settingsRoutes);
await app.ready();
console.log = quiet.log; console.info = quiet.info; console.warn = quiet.warn;

test.after(async () => {
  globalThis.fetch = realFetch;
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const bearer = (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` });
const anonRequests = [
  ['GET', '/api/public-chat/rooms/room-pub'],
  ['GET', '/api/public-chat/rooms/room-pub/messages'],
  ['GET', '/api/public-chat/rooms/room-pub/participants'],
  ['POST', '/api/public-chat/rooms/room-pub/messages', { content: '' }],
  ['POST', '/api/public-chat/rooms/room-pub/join', { username: 'v' }],
];
const setAnon = (value, who = 'u-owner') => app.inject({
  method: 'PUT', url: '/api/settings', headers: bearer(who), payload: { publicRooms: { allowAnonymous: value } },
});

test('default: off — anonymous visitors get 404 everywhere; signed-in users unaffected', async () => {
  assert.equal((await anonymousPublicRoomsEnabled()), false);
  for (const [method, url, payload] of anonRequests) {
    const res = await app.inject({ method, url, payload });
    assert.equal(res.statusCode, 404, `${method} ${url} -> ${res.statusCode}`);
  }
  assert.equal((await app.inject({ method: 'GET', url: '/api/public-chat/rooms/room-pub', headers: bearer('u-member') })).statusCode, 200);
});

test('only the owner can turn it on; non-booleans count as off', async () => {
  for (const who of ['u-admin', 'u-member']) assert.equal((await setAnon(true, who)).statusCode, 403, who);
  assert.equal((await app.inject({ method: 'PUT', url: '/api/settings', payload: { publicRooms: { allowAnonymous: true } } })).statusCode, 401);
  assert.equal((await anonymousPublicRoomsEnabled()), false);
  assert.equal((await setAnon('true')).statusCode, 200);
  assert.equal((await anonymousPublicRoomsEnabled()), false, 'a string is not true');
});

test('when the owner turns it on, anonymous visitors can read and post; off again closes it', async () => {
  assert.equal((await setAnon(true)).statusCode, 200);
  assert.equal((await anonymousPublicRoomsEnabled()), true);
  const shown = await app.inject({ method: 'GET', url: '/api/settings', headers: bearer('u-owner') });
  assert.deepEqual(shown.json().settings.publicRooms, { allowAnonymous: true });
  assert.equal((await app.inject({ method: 'GET', url: '/api/public-chat/rooms/room-pub' })).statusCode, 200);
  assert.equal((await app.inject({ method: 'GET', url: '/api/public-chat/rooms/room-pub/messages' })).statusCode, 200);
  // Empty content stops before any model call: it proves the switch let the visitor through.
  assert.equal((await app.inject({ method: 'POST', url: '/api/public-chat/rooms/room-pub/messages', payload: { content: '' } })).statusCode, 400);

  assert.equal((await setAnon(false)).statusCode, 200);
  assert.equal((await app.inject({ method: 'GET', url: '/api/public-chat/rooms/room-pub' })).statusCode, 404);
});
