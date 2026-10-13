// S0-Q.12: SSRF guard for server-side downloads (avatar models).
// Run from the repo root: node --import tsx --test src/lib/net/safe-fetch.test.mjs
// DNS and the transport are stubbed: no real network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkUrl, isBlockedAddress, safeDownload, SafeFetchError } from './safe-fetch.ts';
import { AVATAR_MODEL_HOSTS, downloadAvatarModel } from './avatar-download.ts';

const HOSTS = ['models.readyplayer.me'];
const GLB = Buffer.concat([Buffer.from('glTF'), Buffer.alloc(16)]);

function stubs({ dns = { 'models.readyplayer.me': ['104.18.1.1'] }, responses = [] } = {}) {
  const calls = { lookup: [], transport: [] };
  return {
    calls,
    lookup: async (host) => {
      calls.lookup.push(host);
      const list = dns[host];
      if (!list) throw new Error('ENOTFOUND');
      return list.map(address => ({ address, family: address.includes(':') ? 6 : 4 }));
    },
    transport: async (req) => {
      calls.transport.push({ url: req.url.toString(), address: req.address });
      const next = responses.shift();
      if (!next) throw new Error('unexpected request');
      return next;
    },
  };
}

const ok = (body = GLB, type = 'model/gltf-binary', extra = {}) =>
  ({ status: 200, headers: { 'content-type': type, ...extra }, body });

async function refused(promise, code) {
  await assert.rejects(promise, (err) => {
    assert.ok(err instanceof SafeFetchError, `expected SafeFetchError, got ${err}`);
    assert.equal(err.code, code);
    return true;
  });
}

test('IPv4-compatible IPv6 (::/96) is blocked in every spelling', () => {
  for (const a of ['::7f00:1', '::127.0.0.1', '0:0:0:0:0:0:7f00:1', '::a00:1', '::c0a8:101', '::a9fe:a9fe', '::808:808']) {
    assert.ok(isBlockedAddress(a), a);
  }
  assert.ok(!isBlockedAddress('2606:4700::6810:101'), 'public IPv6 still allowed');
});

test('non-public addresses are blocked (v4, v6, mapped)', () => {
  for (const a of [
    '127.0.0.1', '127.1.2.3', '10.0.0.1', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254',
    '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255', '198.18.0.1',
    '::', '::1', 'fc00::1', 'fd00:1234::1', 'fe80::1', 'fe80::1%en0', 'ff02::1', 'fec0::1',
    '::ffff:127.0.0.1', '::ffff:7f00:1', '0:0:0:0:0:ffff:a00:1', '::ffff:8.8.8.8', '2001:db8::1', '64:ff9b::7f00:1',
    'not-an-ip', '',
  ]) assert.ok(isBlockedAddress(a), a);
  for (const a of ['104.18.1.1', '8.8.8.8', '2606:4700::6810:101', '2a00:1450:4001::1']) assert.ok(!isBlockedAddress(a), a);
});

test('URL checks: https only, allow-listed host only, no IP literals in any notation, no credentials/ports', () => {
  assert.equal(checkUrl('https://models.readyplayer.me/abc.glb', HOSTS).hostname, 'models.readyplayer.me');
  assert.equal(checkUrl('https://MODELS.readyplayer.me:443/abc.glb', HOSTS).hostname, 'models.readyplayer.me');
  const cases = {
    'http://models.readyplayer.me/a.glb': 'protocol',
    'file:///etc/passwd': 'protocol',
    'ftp://models.readyplayer.me/a': 'protocol',
    'https://evil.example/a.glb': 'host_not_allowed',
    'https://models.readyplayer.me.evil.example/a.glb': 'host_not_allowed',
    'https://evilmodels.readyplayer.me/a.glb': 'host_not_allowed',
    'https://127.0.0.1/a.glb': 'ip_literal',
    'https://2130706433/a.glb': 'ip_literal',     // decimal 127.0.0.1
    'https://0177.0.0.1/a.glb': 'ip_literal',     // octal
    'https://0x7f.0.0.1/a.glb': 'ip_literal',     // hex
    'https://127.1/a.glb': 'ip_literal',          // short form
    'https://[::1]/a.glb': 'ip_literal',
    'https://[fe80::1]/a.glb': 'ip_literal',
    'https://[::ffff:127.0.0.1]/a.glb': 'ip_literal',
    'https://user:pw@models.readyplayer.me/a.glb': 'credentials',
    'https://models.readyplayer.me:8443/a.glb': 'port',
    'not a url': 'invalid_url',
  };
  for (const [url, code] of Object.entries(cases)) {
    assert.throws(() => checkUrl(url, HOSTS), (e) => e instanceof SafeFetchError && e.code === code, url);
  }
});

test('allowed host resolving to private/loopback/link-local/IPv6 local is refused before any request', async () => {
  for (const bad of [['127.0.0.1'], ['10.0.0.5'], ['169.254.169.254'], ['::1'], ['fc00::2'], ['fe80::3'],
                     ['104.18.1.1', '192.168.0.10'], ['::ffff:127.0.0.1']]) {
    const s = stubs({ dns: { 'models.readyplayer.me': bad } });
    await refused(safeDownload('https://models.readyplayer.me/a.glb', {
      allowedHosts: HOSTS, maxBytes: 1e6, allowedContentTypes: ['model/gltf-binary'], lookup: s.lookup, transport: s.transport,
    }), 'blocked_address');
    assert.equal(s.calls.transport.length, 0, String(bad));
  }
});

test('public answer: connection pinned to the checked address, body returned', async () => {
  const s = stubs({ responses: [ok()] });
  const out = await safeDownload('https://models.readyplayer.me/a.glb', {
    allowedHosts: HOSTS, maxBytes: 1e6, allowedContentTypes: ['model/gltf-binary'], lookup: s.lookup, transport: s.transport,
  });
  assert.deepEqual(out.body, GLB);
  assert.deepEqual(s.calls.transport, [{ url: 'https://models.readyplayer.me/a.glb', address: '104.18.1.1' }]);
});

test('redirects: other host, IP, http and private-resolving targets refused; same host followed; loop limited', async () => {
  const opts = (s) => ({ allowedHosts: [...HOSTS, 'readyplayerme-assets.s3.amazonaws.com'], maxBytes: 1e6,
    allowedContentTypes: ['model/gltf-binary'], lookup: s.lookup, transport: s.transport, maxRedirects: 2 });
  const redirect = (location) => ({ status: 302, headers: { location }, body: Buffer.alloc(0) });

  for (const [loc, code] of [
    ['https://evil.example/x', 'host_not_allowed'],
    ['https://readyplayerme-assets.s3.amazonaws.com/x.glb', 'redirect_host'],  // allow-listed but another host
    ['https://169.254.169.254/latest/meta-data', 'ip_literal'],
    ['http://models.readyplayer.me/x.glb', 'protocol'],
  ]) {
    const s = stubs({ responses: [redirect(loc)] });
    await refused(safeDownload('https://models.readyplayer.me/a.glb', opts(s)), code);
    assert.equal(s.calls.transport.length, 1, loc);
  }

  // Same host, but DNS now answers loopback (rebinding between hops) -> refused.
  {
    let n = 0;
    const s = stubs({ responses: [redirect('/b.glb')] });
    s.lookup = async () => (n++ === 0 ? [{ address: '104.18.1.1', family: 4 }] : [{ address: '127.0.0.1', family: 4 }]);
    await refused(safeDownload('https://models.readyplayer.me/a.glb', opts(s)), 'blocked_address');
  }

  const s = stubs({ responses: [redirect('/b.glb'), ok()] });
  await safeDownload('https://models.readyplayer.me/a.glb', opts(s));
  assert.equal(s.calls.transport[1].url, 'https://models.readyplayer.me/b.glb');

  const loop = stubs({ responses: [redirect('/a'), redirect('/b'), redirect('/c'), ok()] });
  await refused(safeDownload('https://models.readyplayer.me/a.glb', opts(loop)), 'redirects');
});

test('size and content-type limits; non-2xx refused', async () => {
  const base = (s) => ({ allowedHosts: HOSTS, maxBytes: 10, allowedContentTypes: ['model/gltf-binary'], lookup: s.lookup, transport: s.transport });
  let s = stubs({ responses: [ok(Buffer.alloc(11))] });
  await refused(safeDownload('https://models.readyplayer.me/a.glb', base(s)), 'too_large');
  s = stubs({ responses: [ok(Buffer.alloc(5), 'model/gltf-binary', { 'content-length': '999999' })] });
  await refused(safeDownload('https://models.readyplayer.me/a.glb', base(s)), 'too_large');
  s = stubs({ responses: [ok(Buffer.alloc(5), 'text/html')] });
  await refused(safeDownload('https://models.readyplayer.me/a.glb', base(s)), 'content_type');
  s = stubs({ responses: [{ status: 500, headers: {}, body: Buffer.alloc(0) }] });
  await refused(safeDownload('https://models.readyplayer.me/a.glb', base(s)), 'status');
  s = stubs({ dns: {} });
  await refused(safeDownload('https://models.readyplayer.me/a.glb', base(s)), 'dns');
});

test('avatar policy: Ready Player Me hosts only, GLB magic required', async () => {
  assert.deepEqual([...AVATAR_MODEL_HOSTS], ['models.readyplayer.me', 'readyplayerme-assets.s3.amazonaws.com']);
  let s = stubs({ responses: [ok()] });
  assert.deepEqual(await downloadAvatarModel('https://models.readyplayer.me/a.glb', s), GLB);
  s = stubs({ responses: [ok(Buffer.from('<html>not a model</html>'), 'application/octet-stream')] });
  await assert.rejects(downloadAvatarModel('https://models.readyplayer.me/a.glb', s), /not a GLB/);
  s = stubs();
  await refused(downloadAvatarModel('https://example.com/a.glb', s), 'host_not_allowed');
  assert.equal(s.calls.lookup.length, 0);
});
