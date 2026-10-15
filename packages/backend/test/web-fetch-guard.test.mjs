// SEC-NET-01: the web_fetch tool reaches public addresses only (the URL and
// every redirect hop), and never reads more than the size limit. Before, any
// URL/method/headers went out and redirects were followed (SSRF to
// 127.0.0.1 services, the LAN, cloud metadata).
// Uses an injected fetch and DNS lookup: no request leaves the machine.
// Run: node --import tsx --test test/web-fetch-guard.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-web-fetch-'));
process.chdir(dir);
process.env.HOME = dir;
process.env.AGENT_PLAYER_DATA_DIR = join(dir, 'data');
process.env.DATABASE_PATH = join(dir, 'data', 'agent-player.db');
const quiet = { log: console.log, error: console.error };
console.log = () => {}; console.error = () => {};
const mod = await import(join(backendDir, 'src/tools/core/web-fetch.ts'));
const { fetchPublic, readTextCapped, webFetchTool, webFetchDeps } = mod;

test.after(() => {
  Object.assign(console, quiet);
  process.chdir(backendDir);
  rmSync(dir, { recursive: true, force: true });
});

/** Public names resolve to a public address, 'evil.example' to a private one. */
const lookup = async (host) => [{ address: host === 'evil.example' ? '192.168.0.10' : '93.184.215.14', family: 4 }];
function fakeFetch(routes) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, method: init?.method ?? 'GET', body: init?.body, redirect: init?.redirect });
    const r = routes[url];
    if (!r) return new Response('not found', { status: 404 });
    return new Response(r.body ?? '', { status: r.status ?? 200, headers: r.headers ?? {} });
  };
  return { impl, calls };
}

test('private, loopback, metadata and non-http URLs are refused before any request', async () => {
  const { impl, calls } = fakeFetch({});
  for (const url of ['http://127.0.0.1:41521/api/agents', 'http://localhost/', 'http://169.254.169.254/latest/meta-data/',
    'http://10.0.0.1/', 'http://[::1]/', 'https://evil.example/', 'http://app.localhost/', 'http://localhost./', 'file:///etc/passwd', 'data:text/plain,x']) {
    await assert.rejects(() => fetchPublic(url, {}, { fetchImpl: impl, lookup }), /Blocked: /, url);
  }
  assert.equal(calls.length, 0);
});

test('a redirect to a private address is refused; to a public one it is followed', async () => {
  const { impl, calls } = fakeFetch({
    'https://public.example/a': { status: 302, headers: { location: 'http://127.0.0.1:41521/api/secret' } },
    'https://public.example/b': { status: 301, headers: { location: '/c' } },
    'https://public.example/c': { body: 'ok' },
  });
  await assert.rejects(() => fetchPublic('https://public.example/a', {}, { fetchImpl: impl, lookup }), /Blocked: /);
  assert.ok(!calls.some((c) => c.url.includes('127.0.0.1')), 'the private hop was never requested');
  const { response, finalUrl } = await fetchPublic('https://public.example/b', {}, { fetchImpl: impl, lookup });
  assert.equal(finalUrl, 'https://public.example/c');
  assert.equal(await response.text(), 'ok');
  assert.ok(calls.every((c) => c.redirect === 'manual'));
});

test('303 (and 301/302 after POST) continue as GET without a body; too many redirects stop', async () => {
  const { impl, calls } = fakeFetch({
    'https://public.example/post': { status: 303, headers: { location: 'https://public.example/done' } },
    'https://public.example/done': { body: 'done' },
    'https://public.example/loop': { status: 302, headers: { location: 'https://public.example/loop' } },
  });
  await fetchPublic('https://public.example/post', { method: 'POST', body: 'x' }, { fetchImpl: impl, lookup });
  assert.deepEqual(calls.map((c) => [c.method, c.body ?? null]), [['POST', 'x'], ['GET', null]]);
  await assert.rejects(() => fetchPublic('https://public.example/loop', {}, { fetchImpl: impl, lookup }), /Too many redirects/);
});

test('the body is read with a hard size cap (a lying content-length does not help)', async () => {
  assert.equal(await readTextCapped(new Response('hello'), 10), 'hello');
  await assert.rejects(() => readTextCapped(new Response('x'.repeat(11)), 10), /Content too large/);
});

test('the tool answers a refused URL with an error result, not a request', async () => {
  const { impl, calls } = fakeFetch({});
  webFetchDeps.fetchImpl = impl; webFetchDeps.lookup = lookup;
  try {
    const res = await webFetchTool.execute({ url: 'http://169.254.169.254/latest/meta-data/iam/', method: 'GET' });
    assert.match(res.error, /^Blocked: /);
    assert.equal(calls.length, 0);
    const ok = await webFetchTool.execute({ url: 'https://public.example/x' });
    assert.equal(ok.error, undefined, JSON.stringify(ok));
  } finally {
    delete webFetchDeps.fetchImpl; delete webFetchDeps.lookup;
  }
});
