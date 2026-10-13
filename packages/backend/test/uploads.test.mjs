// CL-05 (Q-11): runtime uploads live in .data/uploads (not public/), served only
// through the authenticated GET /api/uploads/*; the explicit move from
// public/storage is idempotent (copy, verify, remove) and never runs by itself.
// Run: node --import tsx --test test/uploads.test.mjs
// Throwaway DB, cwd and temp folders only; random test-only secrets; no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, symlinkSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-uploads-'));
const uploads = join(dir, 'uploads');
mkdirSync(join(dir, '.data'), { recursive: true });
mkdirSync(uploads, { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.UPLOADS_DIR = uploads;
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only

const quiet = { log: console.log, warn: console.warn };
console.log = () => {};
console.warn = () => {};
const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const addUser = (id, role) => db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', ?, 'active')`).run(id, `${id}@example.test`, id, role);
addUser('u-owner', 'owner');
addUser('u-alice', 'user');
addUser('u-bob', 'user');
addUser('u-guest', 'guest');

const up = await import(join(backendDir, 'src/services/uploads.ts'));
const { registerAuthGate } = await import(join(backendDir, 'src/auth/auth-gate.ts'));
const { uploadsRoutes } = await import(join(backendDir, 'src/api/routes/uploads.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { default: Fastify } = await import('fastify');
const app = Fastify();
registerAuthGate(app);
await app.register(uploadsRoutes);
await app.ready();
console.log = quiet.log;
console.warn = quiet.warn;

const put = (rel, data = 'data') => { mkdirSync(join(uploads, rel, '..'), { recursive: true }); writeFileSync(join(uploads, rel), data); };
put('avatars/user/u-alice/a1/avatar.glb', 'alice-glb');
put('backgrounds/u-alice/bg.png');
put('animations/user/u-alice/x/anim.glb');
put('profiles/p.png');
put('logos/l.png');
put('cache/avatar-models/h.glb');
put('cache/screenshots/s.png', 'private-shot');
put('cdn/files/f.txt');
put('extensions/trading/d.json');
symlinkSync(join(uploads, 'cdn'), join(uploads, 'avatars/user/u-alice/leak'));

test.after(async () => {
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const auth = (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` });
const get = (url, id) => app.inject({ method: 'GET', url, headers: id ? auth(id) : {} });

test('upload root is outside public/ and honours UPLOADS_DIR', () => {
  assert.equal(up.getUploadsRoot(), uploads);
  assert.equal(up.uploadsPath('logos', 'l.png'), join(uploads, 'logos', 'l.png'));
  assert.throws(() => up.uploadsPath('..', 'x'));
  assert.equal(up.uploadPathFromUrl('/storage/profiles/p.png'), join(uploads, 'profiles', 'p.png'));
  for (const bad of ['/storage/../x', '/storage/a/../../x', '/other/x', '/storage/', null, '/storage/a\\b']) {
    assert.equal(up.uploadPathFromUrl(bad), null, String(bad));
  }
});

test('anonymous requests are refused (401)', async () => {
  assert.equal((await get('/api/uploads/profiles/p.png')).statusCode, 401);
});

test('users read only their own avatars/backgrounds/animations; shared profiles and logos', async () => {
  const own = await get('/api/uploads/avatars/user/u-alice/a1/avatar.glb', 'u-alice');
  assert.equal(own.statusCode, 200);
  assert.equal(own.body, 'alice-glb');
  assert.equal(own.headers['content-type'], 'model/gltf-binary');
  assert.equal(own.headers['x-content-type-options'], 'nosniff');
  assert.match(own.headers['cache-control'], /private/);
  for (const url of ['/api/uploads/backgrounds/u-alice/bg.png', '/api/uploads/animations/user/u-alice/x/anim.glb',
    '/api/uploads/profiles/p.png', '/api/uploads/logos/l.png', '/api/uploads/cache/avatar-models/h.glb']) {
    assert.equal((await get(url, 'u-alice')).statusCode, 200, url);
  }
  for (const url of ['/api/uploads/avatars/user/u-alice/a1/avatar.glb', '/api/uploads/backgrounds/u-alice/bg.png',
    '/api/uploads/cache/screenshots/s.png', '/api/uploads/cdn/files/f.txt', '/api/uploads/extensions/trading/d.json']) {
    assert.equal((await get(url, 'u-bob')).statusCode, 404, `bob ${url}`);
  }
});

test('owner reads every zone; guests read nothing', async () => {
  for (const url of ['/api/uploads/avatars/user/u-alice/a1/avatar.glb', '/api/uploads/cache/screenshots/s.png', '/api/uploads/cdn/files/f.txt']) {
    assert.equal((await get(url, 'u-owner')).statusCode, 200, url);
  }
  const g = await get('/api/uploads/profiles/p.png', 'u-guest');
  assert.ok([403, 404].includes(g.statusCode), `guest -> ${g.statusCode}`);
});

test('traversal, encoded separators, symlinks and odd segments are refused', async () => {
  for (const url of ['/api/uploads/avatars/user/u-alice/leak/files/f.txt', '/api/uploads/avatars/user/u-alice/../../../cdn/files/f.txt',
    '/api/uploads/avatars/user/u-alice/%2e%2e/%2e%2e/%2e%2e/cdn/files/f.txt',
    '/api/uploads/profiles/p.png.', '/api/uploads/profiles/p.png%00', '/api/uploads/Profiles/p.png', '/api/uploads/profiles',
    '/api/uploads/profiles/missing.png']) {
    const res = await get(url, 'u-alice');
    assert.equal(res.statusCode === 200, false, `${url} -> ${res.statusCode}`);
  }
  // Encoded slashes decode to the same path; the access rule still applies to it.
  assert.equal((await get('/api/uploads/avatars%2fuser%2fu-alice%2fa1%2favatar.glb', 'u-bob')).statusCode, 404);
});

test('canReadUpload unit cases', () => {
  const alice = { id: 'u-alice', role: 'user' };
  assert.equal(up.canReadUpload(alice, 'avatars/user/u-alice/a/x.glb'), true);
  assert.equal(up.canReadUpload(alice, 'avatars/user/u-alice'), false);
  assert.equal(up.canReadUpload(alice, 'avatars/user/u-bob/a/x.glb'), false);
  assert.equal(up.canReadUpload(alice, 'backgrounds/u-alice'), false);
  assert.equal(up.canReadUpload(alice, 'cache/x.png'), false);
  assert.equal(up.canReadUpload({ id: 'a', role: 'admin' }, 'cdn/files/f.txt'), true);
  assert.equal(up.canReadUpload({ id: 'g', role: 'guest' }, 'logos/l.png'), false);
  assert.equal(up.canReadUpload(null, 'logos/l.png'), false);
});

test('explicit move: copy, verify, remove; idempotent; conflicts and symlinks left in place; dry run changes nothing', () => {
  const base = mkdtempSync(join(tmpdir(), 'ap-move-'));
  try {
    const from = join(base, 'public', 'storage');
    const to = join(base, '.data', 'uploads');
    const w = (root, rel, data) => { mkdirSync(join(root, rel, '..'), { recursive: true }); writeFileSync(join(root, rel), data); };
    w(from, 'avatars/user/u-1/a/avatar.glb', 'glb');
    w(from, 'profiles/p.png', 'png');
    w(from, 'cache/screenshots/s.png', 'shot');
    w(from, 'logos/same.png', 'same');
    w(to, 'logos/same.png', 'same');          // identical copy already there
    w(from, 'logos/conflict.png', 'new');
    w(to, 'logos/conflict.png', 'different'); // different file already there
    symlinkSync('/etc/hosts', join(from, 'profiles', 'link.png'));
    const lines = [];

    const dry = up.moveLegacyPublicUploads({ from, to, dryRun: true, log: (l) => lines.push(l) });
    assert.deepEqual(dry, { moved: 0, alreadyPresent: 0, conflicts: 1, skipped: 1, errors: 0, planned: 4 });
    assert.ok(existsSync(join(from, 'profiles/p.png')), 'dry run leaves files');
    assert.ok(!existsSync(join(to, 'profiles/p.png')));

    const r = up.moveLegacyPublicUploads({ from, to, log: (l) => lines.push(l) });
    assert.deepEqual(r, { moved: 3, alreadyPresent: 1, conflicts: 1, skipped: 1, errors: 0, planned: 0 });
    assert.equal(readFileSync(join(to, 'avatars/user/u-1/a/avatar.glb'), 'utf8'), 'glb');
    assert.equal(readFileSync(join(to, 'cache/screenshots/s.png'), 'utf8'), 'shot');
    assert.ok(!existsSync(join(from, 'avatars')), 'emptied folders removed');
    assert.equal(readFileSync(join(from, 'logos/conflict.png'), 'utf8'), 'new', 'conflict kept at the old place');
    assert.equal(readFileSync(join(to, 'logos/conflict.png'), 'utf8'), 'different', 'destination never overwritten');
    assert.deepEqual(readdirSync(join(from, 'profiles')), ['link.png'], 'symlink not followed or moved');

    const again = up.moveLegacyPublicUploads({ from, to });
    assert.deepEqual(again, { moved: 0, alreadyPresent: 0, conflicts: 1, skipped: 1, errors: 0, planned: 0 });
    assert.ok(lines.every((l) => !/glb|png|shot|u-1/.test(l)), 'logs counts only');

    assert.deepEqual(up.moveLegacyPublicUploads({ from: join(base, 'missing'), to }).moved, 0);
    assert.throws(() => up.moveLegacyPublicUploads({ from, to: join(from, 'inside') }));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
