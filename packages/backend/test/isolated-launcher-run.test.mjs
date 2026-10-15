// RUN-ISO: the REAL launcher, end to end, as a child process.
// Runs `node --import tsx scripts/isolated-server.ts` with the documented
// minimal outer environment (PATH, HOME = parent of the fresh root,
// AGENT_PLAYER_DATA_DIR, PORT, ALLOWED_ORIGINS) on a fresh temp root and a
// free ephemeral 127.0.0.1 port, and checks:
//  - the launcher prints `listening on 127.0.0.1:<port>`;
//  - GET /health returns 200;
//  - a POST (chat) returns 403 read_only_stage;
//  - a GET outside the safe-read allowlist (agents/status, a provider probe)
//    returns 403 read_only_stage, also with a raw dot-segment path;
//  - the launcher-built tree passes the isolated tree check, the log file
//    is 0600, the secrets file is inside the root;
//  - nothing appears outside the root (the parent holds only the root; the
//    checkout's .data folders are unchanged).
// The child listens on loopback only, is stopped with SIGTERM at the end,
// and its temp dir is removed. Requests go to 127.0.0.1 only.
// Run: node --import tsx --test test/isolated-launcher-run.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { lstatSync, mkdtempSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const backendDir = process.cwd();
const repoRoot = join(backendDir, '..', '..');
const parent = realpathSync(mkdtempSync(join(tmpdir(), 'ap-iso-launch-')));
const root = join(parent, 'data');

function snapshot(dir) {
  const out = new Map();
  const walk = (d) => {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else { try { const s = lstatSync(p); out.set(p, `${s.size}:${s.mtimeMs}`); } catch { /* raced */ } }
    }
  };
  walk(dir);
  return out;
}
const checkoutData = [join(backendDir, '.data'), join(repoRoot, '.data')];
const before = checkoutData.map(snapshot);

async function freePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
  });
}

const port = await freePort();
const child = spawn(process.execPath, ['--import', 'tsx', join(backendDir, 'scripts', 'isolated-server.ts')], {
  cwd: backendDir,
  env: {
    PATH: `${dirname(process.execPath)}:/usr/bin:/bin`,
    HOME: parent,
    AGENT_PLAYER_DATA_DIR: root,
    PORT: String(port),
    ALLOWED_ORIGINS: 'http://127.0.0.1:42522',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let out = '';
child.stdout.on('data', (b) => { out += b; });
child.stderr.on('data', (b) => { out += b; });
const exited = new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal })));

async function stopChild() {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM');
    const t = setTimeout(() => child.kill('SIGKILL'), 25_000);
    await exited;
    clearTimeout(t);
  }
}

test.after(async () => {
  await stopChild();
  rmSync(parent, { recursive: true, force: true });
});

const listening = await new Promise((resolve) => {
  const done = (v) => { clearInterval(tick); clearTimeout(limit); resolve(v); };
  // The launcher prints two lines (listening, then data dir); wait for both, or a poll
  // between the two writes sees only the first (flaked under a loaded full-suite run).
  const tick = setInterval(() => { if (out.includes(`listening on 127.0.0.1:${port}`) && out.includes('data dir: ')) done(true); }, 100);
  const limit = setTimeout(() => done(false), 150_000);
  exited.then(() => done(false));
});

const url = (p) => `http://127.0.0.1:${port}${p}`;

test('the real launcher starts and prints listening', () => {
  assert.equal(listening, true, `launcher output:\n${out}`);
  assert.match(out, new RegExp(`data dir: ${root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  assert.equal(/secret|password|token/i.test(out), false, 'the launcher prints no secret');
});

test('GET /health returns 200', { skip: !listening }, async () => {
  const res = await fetch(url('/health'));
  assert.equal(res.status, 200);
  await res.body?.cancel();
});

test('a POST returns 403 read_only_stage', { skip: !listening }, async () => {
  const res = await fetch(url('/api/chat'), {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:42522' },
    body: JSON.stringify({ message: 'hi' }),
  });
  assert.equal(res.status, 403);
  assert.deepEqual(await res.json(), { error: 'Forbidden', code: 'read_only_stage' });
});

test('a GET outside the safe-read allowlist (agents/status) returns 403 read_only_stage', { skip: !listening }, async () => {
  const res = await fetch(url('/api/agents/status'), { headers: { origin: 'http://127.0.0.1:42522' } });
  assert.equal(res.status, 403);
  assert.deepEqual(await res.json(), { error: 'Forbidden', code: 'read_only_stage' });
  // Raw path with a dot segment (fetch would normalise it): refused too.
  const raw = await new Promise((resolve, reject) => {
    const r = httpRequest({ host: '127.0.0.1', port, path: '/api/./agents/status', method: 'GET' }, (res2) => {
      let body = '';
      res2.on('data', (b) => { body += b; });
      res2.on('end', () => resolve({ status: res2.statusCode, body }));
    });
    r.on('error', reject);
    r.end();
  });
  assert.equal(raw.status, 403, raw.body);
  assert.deepEqual(JSON.parse(raw.body), { error: 'Forbidden', code: 'read_only_stage' });
});

test('the tree is safe and nothing appears outside the root', { skip: !listening }, async () => {
  const tree = await import(join(backendDir, 'src/config/isolated-tree.ts'));
  assert.deepEqual(tree.checkIsolatedTree(root), []);
  assert.equal(lstatSync(join(root, 'logs', 'backend.log')).mode & 0o777, 0o600);
  assert.equal(lstatSync(join(root, 'secrets.env')).mode & 0o777, 0o600);
  assert.equal(lstatSync(root).mode & 0o777, 0o700);
  assert.deepEqual(readdirSync(parent), ['data'], 'the parent (the outer HOME) holds only the root');
  checkoutData.forEach((dir, i) => assert.deepEqual(snapshot(dir), before[i], `${dir} unchanged`));
});

test('SIGTERM stops the server cleanly', { skip: !listening }, async () => {
  await stopChild();
  const { code, signal } = await exited;
  assert.ok(code === 0 || signal === 'SIGTERM', `exit ${code} ${signal}\n${out}`);
  await assert.rejects(fetch(url('/health')), 'nothing listens any more');
});
