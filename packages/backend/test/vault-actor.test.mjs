// B1.8: the credential vault's owner/requester and its audit actor come from
// the request's actor, never from body ownerId/ownerType or
// requesterId/requesterType. A non-owner caller only reaches their own entries.
//
// Run: node --import tsx --test test/vault-actor.test.mjs
// Throwaway DB + cwd, random test-only secrets, no network (fetch refused).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-vault-actor-'));
mkdirSync(join(dir, '.data', 'audit'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.ENCRYPTION_DB_PATH = join(dir, '.data', 'encryption', 'credentials.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
process.env.NODE_ENV = 'test';

const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => { throw new Error(`unexpected network call in test: ${url}`); };

const silent = async (fn) => {
  const s = { ...console };
  console.log = () => {}; console.info = () => {}; console.warn = () => {}; console.error = () => {};
  try { return await fn(); } finally { Object.assign(console, s); }
};

const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await silent(() => db.initialize());
const addUser = (id, role) => db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', ?, 'active')`)
  .run(id, `${id}@example.test`, id, role);
addUser('va-owner', 'owner');
addUser('va-user', 'user');
addUser('va-other', 'user');

const { getCredentialVault } = await import(join(backendDir, 'src/encryption/index.ts'));
const vault = getCredentialVault();
await silent(() => vault.initialize());
const { getAuditLogger } = await import(join(backendDir, 'src/audit/index.ts'));
const { encryptionRoutes } = await import(join(backendDir, 'src/api/routes/encryption.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { default: Fastify } = await import('fastify');

// Plugin mounted without the gate: the actor is built from the bearer token.
const app = Fastify();
await app.register(encryptionRoutes);
await app.ready();

const logger = getAuditLogger();
const originalLogAccess = logger.logAccess;
const seen = [];
logger.logAccess = function (action, actor, ...rest) { seen.push({ action, actor }); return originalLogAccess.call(this, action, actor, ...rest); };

test.after(async () => {
  logger.logAccess = originalLogAccess;
  globalThis.fetch = realFetch;
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const auth = (userId) => ({ authorization: `Bearer ${generateToken(userId, 1)}` });
const inject = (opts) => silent(() => app.inject(opts));
const store = (userId, body) => inject({ method: 'POST', url: '/api/vault/credentials', headers: auth(userId), payload: body });
const retrieve = (userId, id, body = {}) => inject({ method: 'POST', url: `/api/vault/credentials/${id}/retrieve`, headers: auth(userId), payload: body });
const secret = () => `test-${randomBytes(6).toString('hex')}`;

test('store: body ownerId/ownerType are ignored; owner and audit actor are the caller', async () => {
  seen.length = 0;
  const res = await store('va-user', {
    name: 'user-key', type: 'api_key', data: { key: secret() },
    ownerId: 'va-owner', ownerType: 'system',
  });
  assert.equal(res.statusCode, 200, res.body);
  const { id } = res.json().credential;
  const saved = vault.getById(id);
  assert.equal(saved.ownerId, 'va-user');
  assert.equal(saved.ownerType, 'user');
  assert.equal(seen.length, 1);
  assert.equal(seen[0].action, 'write');
  assert.equal(seen[0].actor.type, 'user');
  assert.equal(seen[0].actor.id, 'va-user');
});

test('store: owner/requester fields are no longer required; no actor is refused', async () => {
  const ok = await store('va-owner', { name: 'owner-key', type: 'api_key', data: { key: secret() } });
  assert.equal(ok.statusCode, 200, ok.body);
  assert.equal(vault.getById(ok.json().credential.id).ownerId, 'va-owner');
  const missing = await store('va-owner', { name: 'no-data', type: 'api_key' });
  assert.equal(missing.statusCode, 400);
  const anon = await inject({ method: 'POST', url: '/api/vault/credentials', payload: { name: 'x', type: 'api_key', data: { k: 'v' }, ownerId: 'va-owner', ownerType: 'user' } });
  assert.equal(anon.statusCode, 401);
});

test('retrieve: body requesterId/requesterType are ignored; audit actor is the caller', async () => {
  const id = (await store('va-user', { name: 'mine', type: 'api_key', data: { key: secret() } })).json().credential.id;
  seen.length = 0;
  const res = await retrieve('va-user', id, { requesterId: 'va-owner', requesterType: 'system' });
  assert.equal(res.statusCode, 200, res.body);
  assert.equal(res.json().masked, true);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].action, 'read');
  assert.deepEqual([seen[0].actor.type, seen[0].actor.id], ['user', 'va-user']);
  // no body at all still works (requester comes from the actor)
  const bare = await inject({ method: 'POST', url: `/api/vault/credentials/${id}/retrieve`, headers: auth('va-user') });
  assert.equal(bare.statusCode, 200, bare.body);
});

test('retrieve: a non-owner caller reaches only their own entries; the owner reaches all', async () => {
  const ownerEntry = (await store('va-owner', { name: 'owner-secret', type: 'api_key', data: { key: secret() } })).json().credential.id;
  const userEntry = (await store('va-user', { name: 'user-secret', type: 'api_key', data: { key: secret() } })).json().credential.id;
  const before = vault.getById(ownerEntry).accessCount;
  // claiming to be the owner in the body does not help
  const denied = await retrieve('va-user', ownerEntry, { requesterId: 'va-owner', requesterType: 'user' });
  assert.equal(denied.statusCode, 404);
  assert.equal(vault.getById(ownerEntry).accessCount, before, 'a refused read never decrypts');
  assert.equal((await retrieve('va-other', userEntry, { requesterId: 'va-user', requesterType: 'user' })).statusCode, 404);
  assert.equal((await retrieve('va-owner', userEntry)).statusCode, 200);
  assert.equal((await retrieve('va-owner', ownerEntry)).statusCode, 200);
  const anon = await inject({ method: 'POST', url: `/api/vault/credentials/${ownerEntry}/retrieve`, payload: { requesterId: 'va-owner', requesterType: 'user' } });
  assert.equal(anon.statusCode, 401);
});

test('vault routes stay owner-only behind the gate', async () => {
  const { resolveRouteAccess } = await import(join(backendDir, 'src/auth/auth-gate.ts'));
  assert.equal(resolveRouteAccess('POST', '/api/vault/credentials'), 'owner');
  assert.equal(resolveRouteAccess('POST', '/api/vault/credentials/:id/retrieve'), 'owner');
});
