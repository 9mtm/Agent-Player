// MCP-01b: backend instance identity. The MCP server sends the owner's
// token only after the loopback backend answers a nonce with
// HMAC(secret, ...) under the per-install secret it keeps in
// .data/instance.json and copies next to the CLI token (0600).
// Throwaway folder/DB; no network, no port.
// Run: node --import tsx --test test/instance-identity.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = realpathSync(mkdtempSync(join(tmpdir(), 'ap-instance-')));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
process.env.NODE_ENV = 'test';

const quiet = { log: console.log, info: console.info, warn: console.warn };
console.log = () => {};
console.info = () => {};
console.warn = () => {};
const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
await getDatabase().initialize();
const { buildServer } = await import(join(backendDir, 'src/api/app.ts'));
const app = await buildServer({ logger: false });
await app.ready();
Object.assign(console, quiet);

test.after(async () => {
  try { await app.close(); } catch { /* ignore */ }
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

test('instance identity: public HMAC challenge, 0600 files next to the CLI token, secret never returned', async () => {
  const { readFileSync, statSync, existsSync } = await import('node:fs');
  const { createHmac } = await import('node:crypto');
  const ident = await import(join(backendDir, 'src/services/instance-identity.ts'));
  const nonce = randomBytes(24).toString('hex');
  const res = await app.inject({ method: 'GET', url: `/api/instance?nonce=${nonce}` });
  assert.equal(res.statusCode, 200, 'public, no token needed');
  const body = res.json();
  const stored = JSON.parse(readFileSync(join(dir, '.data', 'instance.json'), 'utf8'));
  assert.equal(statSync(join(dir, '.data', 'instance.json')).mode & 0o777, 0o600);
  assert.equal(body.id, stored.id);
  assert.equal(body.proof, createHmac('sha256', Buffer.from(stored.secret, 'hex')).update(`agent-player-instance-v1:${stored.id}:${nonce}`).digest('hex'));
  assert.ok(!res.body.includes(stored.secret), 'the secret is never sent');
  for (const bad of ['', 'short', 'x'.repeat(200), 'bad%20chars%20here%20!!']) {
    assert.equal((await app.inject({ method: 'GET', url: `/api/instance?nonce=${bad}` })).statusCode, 400, bad);
  }
  // Startup copy next to the CLI token (0600, dir 0700); never over a foreign file.
  const cfg = join(dir, 'cli-config');
  const file = ident.publishInstanceIdentity({ AGENT_PLAYER_CONFIG_DIR: cfg });
  assert.equal(file, join(cfg, 'instance.json'));
  const copy = JSON.parse(readFileSync(file, 'utf8'));
  assert.deepEqual({ createdBy: copy.createdBy, id: copy.id, secret: copy.secret }, { createdBy: 'agent-player-backend', id: stored.id, secret: stored.secret });
  assert.equal(statSync(file).mode & 0o777, 0o600);
  assert.equal(statSync(cfg).mode & 0o777, 0o700);
  const foreign = join(dir, 'cli-foreign');
  mkdirSync(foreign, { recursive: true });
  writeFileSync(join(foreign, 'instance.json'), '{"createdBy":"someone-else"}');
  assert.equal(ident.publishInstanceIdentity({ AGENT_PLAYER_CONFIG_DIR: foreign }), null);
  assert.equal(readFileSync(join(foreign, 'instance.json'), 'utf8'), '{"createdBy":"someone-else"}');
  assert.ok(existsSync(file));
});
