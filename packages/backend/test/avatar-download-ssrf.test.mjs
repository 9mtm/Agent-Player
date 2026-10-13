// S0-A.13: POST /api/avatars/download and /api/avatars/:id/localize fetch a
// user-supplied glbUrl on the server. They go through the backend SSRF guard
// (src/services/net/safe-fetch.ts). DNS and the transport are stubbed: no network.
// Run: node --import tsx --test test/avatar-download-ssrf.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-avatar-ssrf-'));
// The avatar routes write to <cwd>/../../public/storage: run from dir/pkg/backend.
const cwd = join(dir, 'pkg', 'backend');
mkdirSync(join(cwd, '.data'), { recursive: true });
process.chdir(cwd);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(cwd, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
process.env.NODE_ENV = 'test';

const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => { throw new Error(`unexpected network call in test: ${url}`); };
const quiet = { log: console.log, warn: console.warn, info: console.info };
console.log = () => {}; console.info = () => {}; console.warn = () => {};

const sf = await import(join(backendDir, 'src/services/net/safe-fetch.ts'));
const ad = await import(join(backendDir, 'src/services/net/avatar-download.ts'));

const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status, email_verified) VALUES ('t-alice', 'a@example.test', 'alice', 'x', 'user', 'active', 1)`).run();
const { buildServer } = await import(join(backendDir, 'src/api/app.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const app = await buildServer({ logger: false });
await app.ready();
console.log = quiet.log; console.info = quiet.info; console.warn = quiet.warn;

test.after(async () => {
  ad.setAvatarFetchDepsForTests({});
  globalThis.fetch = realFetch;
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const GLB = Buffer.concat([Buffer.from('glTF'), Buffer.alloc(16, 1)]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const RPM = 'https://models.readyplayer.me/abc123.glb';

/** Stub world: dns maps host -> addresses; routes maps url -> response. Records calls. */
function world({ dns = {}, routes = {} } = {}) {
  const calls = [];
  return {
    calls,
    lookup: async (host) => {
      if (!(host in dns)) throw new Error('ENOTFOUND');
      return dns[host].map(address => ({ address, family: address.includes(':') ? 6 : 4 }));
    },
    transport: async (req) => {
      calls.push({ url: req.url.toString(), address: req.address });
      const r = routes[req.url.toString()];
      if (!r) return { status: 404, headers: {}, body: Buffer.alloc(0) };
      return { status: r.status ?? 200, headers: r.headers ?? { 'content-type': 'model/gltf-binary' }, body: r.body ?? GLB };
    },
  };
}

const okWorld = () => world({
  dns: { 'models.readyplayer.me': ['93.184.216.34'] },
  routes: {
    [RPM]: {},
    'https://models.readyplayer.me/abc123.png': { headers: { 'content-type': 'image/png' }, body: PNG },
  },
});

const code = async (p) => { try { await p; return 'ok'; } catch (e) { return e.code || e.message; } };

test('URL rules: https, default port, no credentials, no IP literals, allow-listed hosts only', async () => {
  const w = okWorld();
  for (const [url, expected] of [
    ['http://models.readyplayer.me/abc123.glb', 'protocol'],
    ['https://models.readyplayer.me:8443/abc123.glb', 'port'],
    ['https://u:p@models.readyplayer.me/abc123.glb', 'credentials'],
    ['https://127.0.0.1/a.glb', 'ip_literal'],
    ['https://[::1]/a.glb', 'ip_literal'],
    ['https://2130706433/a.glb', 'ip_literal'],
    ['https://0177.0.0.1/a.glb', 'ip_literal'],
    ['https://169.254.169.254/latest/meta-data', 'ip_literal'],
    ['https://evil.example/a.glb', 'host_not_allowed'],
    ['https://models.readyplayer.me.evil.example/a.glb', 'host_not_allowed'],
    ['file:///etc/passwd', 'protocol'],
    ['not a url', 'invalid_url'],
  ]) {
    assert.equal(await code(ad.downloadAvatarModel(url, w)), expected, url);
  }
  assert.equal(w.calls.length, 0, 'nothing was contacted');
});

test('every DNS answer must be public (private, loopback, link-local, ULA, multicast, mapped, NAT64, 6to4, Teredo)', async () => {
  for (const bad of [
    '10.0.0.5', '127.0.0.1', '169.254.169.254', '172.16.1.1', '192.168.1.1', '100.64.0.1', '0.0.0.0', '224.0.0.1',
    '::1', '::', 'fe80::1', 'fd00::1', 'fc00::1', 'ff02::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::7f00:1',
    '64:ff9b::7f00:1', '2002:7f00:1::', '2001:0:4136:e378::1',
  ]) {
    const w = world({ dns: { 'models.readyplayer.me': ['93.184.216.34', bad] }, routes: { [RPM]: {} } });
    assert.equal(await code(ad.downloadAvatarModel(RPM, w)), 'blocked_address', bad);
    assert.equal(w.calls.length, 0, `${bad}: not contacted`);
  }
});

test('the connection is pinned to the checked address', async () => {
  const w = okWorld();
  const body = await ad.downloadAvatarModel(RPM, w);
  assert.ok(ad.isGlb(body));
  assert.deepEqual(w.calls, [{ url: RPM, address: '93.184.216.34' }]);
});

test('redirects: same host only, at most 3', async () => {
  const hop = (to) => ({ status: 302, headers: { location: to }, body: Buffer.alloc(0) });
  const other = world({
    dns: { 'models.readyplayer.me': ['93.184.216.34'], 'readyplayerme-assets.s3.amazonaws.com': ['52.0.0.1'] },
    routes: { [RPM]: hop('https://readyplayerme-assets.s3.amazonaws.com/x.glb') },
  });
  assert.equal(await code(ad.downloadAvatarModel(RPM, other)), 'redirect_host');
  const toInternal = world({ dns: { 'models.readyplayer.me': ['93.184.216.34'] }, routes: { [RPM]: hop('http://169.254.169.254/') } });
  assert.equal(await code(ad.downloadAvatarModel(RPM, toInternal)), 'protocol');

  const chain = (n) => {
    const routes = {};
    for (let i = 0; i < n; i++) routes[i === 0 ? RPM : `https://models.readyplayer.me/r${i}.glb`] = hop(`https://models.readyplayer.me/r${i + 1}.glb`);
    routes[`https://models.readyplayer.me/r${n}.glb`] = {};
    return world({ dns: { 'models.readyplayer.me': ['93.184.216.34'] }, routes });
  };
  assert.equal(await code(ad.downloadAvatarModel(RPM, chain(3))), 'ok');
  assert.equal(await code(ad.downloadAvatarModel(RPM, chain(4))), 'redirects');
});

test('size, content type and GLB magic are enforced', async () => {
  const mk = (r) => world({ dns: { 'models.readyplayer.me': ['93.184.216.34'] }, routes: { [RPM]: r } });
  assert.equal(await code(ad.downloadAvatarModel(RPM, mk({ headers: { 'content-type': 'text/html' } }))), 'content_type');
  assert.equal(await code(ad.downloadAvatarModel(RPM, mk({ headers: { 'content-type': 'model/gltf-binary', 'content-length': String(ad.AVATAR_MODEL_MAX_BYTES + 1) } }))), 'too_large');
  assert.equal(await code(ad.downloadAvatarModel(RPM, mk({ body: Buffer.alloc(ad.AVATAR_MODEL_MAX_BYTES + 1) }))), 'too_large');
  assert.equal(await code(ad.downloadAvatarModel(RPM, mk({ body: Buffer.from('<html>not a model</html>') }))), 'not_glb');
  assert.equal(await code(ad.downloadAvatarModel(RPM, mk({ status: 500 }))), 'status');
  assert.ok(sf.isBlockedAddress('not-an-ip'));
});

const as = { authorization: `Bearer ${generateToken('t-alice', 1)}` };
const storage = join(dir, 'public', 'storage', 'avatars', 'user');

test('POST /api/avatars/download: refused URLs answer 400 and write nothing; anonymous 401', async () => {
  ad.setAvatarFetchDepsForTests(okWorld());
  const anon = await app.inject({ method: 'POST', url: '/api/avatars/download', payload: { glbUrl: RPM } });
  assert.equal(anon.statusCode, 401);
  for (const glbUrl of ['http://127.0.0.1:41522/api/system/info', 'https://169.254.169.254/', 'https://evil.example/a.glb', 'file:///etc/passwd']) {
    const res = await app.inject({ method: 'POST', url: '/api/avatars/download', headers: as, payload: { glbUrl } });
    assert.equal(res.statusCode, 400, `${glbUrl} -> ${res.statusCode} ${res.body}`);
  }
  assert.ok(!existsSync(storage) || readdirSync(join(storage)).length === 0, 'no folder or file written');
  assert.equal(db.prepare('SELECT COUNT(*) AS c FROM user_avatars').get().c, 0);
});

test('POST /api/avatars/download: a Ready Player Me GLB is saved for the token user', async () => {
  ad.setAvatarFetchDepsForTests(okWorld());
  const res = await app.inject({ method: 'POST', url: '/api/avatars/download', headers: as, payload: { userId: 'someone-else', glbUrl: RPM } });
  assert.equal(res.statusCode, 200, res.body);
  const { avatar } = JSON.parse(res.body);
  assert.equal(avatar.userId, 't-alice');
  const file = join(storage, 't-alice', avatar.id, 'avatar.glb');
  assert.deepEqual(readFileSync(file), GLB);
  assert.ok(existsSync(join(storage, 't-alice', avatar.id, 'preview.png')));
  assert.deepEqual(readdirSync(join(storage, 't-alice', avatar.id)).filter(f => f.endsWith('.tmp')), [], 'no temp files left');
});

test('POST /api/avatars/:id/localize uses the same guard for the stored glbUrl', async () => {
  ad.setAvatarFetchDepsForTests(okWorld());
  db.prepare(`INSERT INTO user_avatars (id, user_id, name, source, glb_url, is_active) VALUES ('av-bad', 't-alice', 'x', 'url', 'https://10.0.0.1/a.glb', 0)`).run();
  const res = await app.inject({ method: 'POST', url: '/api/avatars/av-bad/localize', headers: as, payload: {} });
  assert.equal(res.statusCode, 400, res.body);
  assert.equal(db.prepare(`SELECT local_glb_path FROM user_avatars WHERE id = 'av-bad'`).get().local_glb_path, null);
});
