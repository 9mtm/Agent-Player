require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApplicationServer } = require('../scripts/application-server.cjs');
const { chatError, SSEParser } = require('../src/chat-protocol.js');
const { SessionClient } = require('../src/session.ts');
const ids = { runId: 'fiction-run', messageId: 'fiction-message' };
const body = { stream: true, sessionId: 'fiction-session', messages: [{ role: 'user', content: 'Hi' }] };
const frame = x => `data: ${JSON.stringify({ ...ids, ...x })}\n\n`;
const listen = s => new Promise(r => s.listen(0, '127.0.0.1', () => r(s.address().port)));
const close = s => new Promise(r => { s.close(r); s.closeAllConnections(); });
async function bridge(t, handler, options = {}) {
  let calls = 0;
  const backend = http.createServer(async (req, res) => {
    for await (const chunk of req) { /* Drain fictional request. */ }
    calls++; handler(req, res);
  });
  const upstreamPort = await listen(backend);
  const app = createApplicationServer({ channel: 'candidate', upstreamPort, ...options });
  const port = await listen(app), origin = `http://127.0.0.1:${port}`;
  t.after(async () => { await close(app); await close(backend); });
  const request = (path = '/api/chat', method = 'POST', payload = body) => fetch(origin + path, {
    method, mode: 'same-origin', body: payload === undefined ? undefined : JSON.stringify(payload),
    headers: { Origin: origin, ...(path === '/api/auth/login' ? {} : { Authorization: 'Bearer fictional' }),
      ...(path === '/api/chat' ? { 'Idempotency-Key': 'fiction-key' } : {}), ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }) },
  });
  return { app, request, calls: () => calls };
}
function start(res) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'X-Run-Id': ids.runId, 'X-Message-Id': ids.messageId }); res.flushHeaders();
}
const routes = [
  ['POST', '/api/auth/login', { email: 'fiction@example.invalid', password: 'fictional' }],
  ['PUT', '/api/agents/main', { name: 'Fiction', expectedVersion: 1 }],
  ['POST', '/api/agents/name-suggestion', { language: 'en', exclude: [] }],
  ['POST', '/api/chat', body],
  ...['approve', 'reject'].flatMap(action => [
    ['POST', `/api/memory/proposals/p/${action}`, { expectedReviewHash: 'a'.repeat(64) }],
    ['POST', `/api/agents/main/personality/proposals/11111111-1111-1111-1111-111111111111/${action}`, { expectedReviewHash: 'a'.repeat(64) }],
  ]),
];
for (const [method, path, payload] of routes) test(`421 cannot trigger fetch write replay: ${method} ${path}`, async t => {
  const s = await bridge(t, (_req, res) => { res.writeHead(421, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ code: 'host_not_allowed', message: 'private' })); });
  const response = await s.request(path, method, payload);
  assert.equal(response.status, 502); assert.deepEqual(await response.json(), { code: 'host_not_allowed' }); assert.equal(s.calls(), 1);
});
test('logout 421 becomes 502 exactly once; GET preserves 421', async t => {
  const s = await bridge(t, (_req, res) => { res.writeHead(421, { 'Content-Type': 'application/json' }); res.end('{"code":"host_not_allowed"}'); });
  // Use the application's ephemeral origin and an empty request body.
  const origin = `http://127.0.0.1:${s.app.address().port}`;
  const response = await fetch(origin + '/api/auth/logout', { method: 'POST', mode: 'same-origin', headers: { Origin: origin, Authorization: 'Bearer fictional' } });
  assert.equal(response.status, 502); assert.deepEqual(await response.json(), { code: 'host_not_allowed' }); assert.equal(s.calls(), 1);
  // Raw HTTP observes GET status without Fetch's permitted read replay.
  await new Promise((resolve, reject) => {
    http.get(origin + '/api/auth/me', { headers: { Authorization: 'Bearer fictional' } }, res => {
      assert.equal(res.statusCode, 421); res.resume(); res.on('end', resolve);
    }).on('error', reject);
  });
  assert.equal(s.calls(), 2);
});
test('no-frame chunks produce fixed heartbeats at most once per three seconds, not raw comments or metadata', async t => {
  const s = await bridge(t, (_req, res) => {
    start(res); res.write(': secret-upstream\n\nretry: 1\n\nid: private\n\n');
    const interval = setInterval(() => res.write(': private\n\n'), 20);
    const end = setTimeout(() => res.end(frame({ type: 'done' })), 3200);
    res.on('close', () => { clearInterval(interval); clearTimeout(end); });
  }, { streamTimeoutMs: 4500, streamIdleMs: 1000 });
  const response = await s.request(); const reader = response.body.getReader(); const decoder = new TextDecoder();
  let text = ''; const times = [];
  while (true) {
    const part = await reader.read(); if (part.done) break;
    const chunk = decoder.decode(part.value); text += chunk;
    for (const _ of chunk.matchAll(/: keepalive\n\n/g)) times.push(performance.now());
  }
  assert.equal(times.length, 2); assert.ok(times[1] - times[0] >= 2900);
  assert.equal(text, ': keepalive\n\n: keepalive\n\n' + frame({ type: 'done', done: true }));
  const parser = new SSEParser(ids); assert.equal(parser.push(Buffer.from(text)).length, 1); parser.finish(); assert.equal(s.calls(), 1);
});
test('partial data and discarded event kinds get only a sanitized heartbeat', async t => {
  const s = await bridge(t, (_req, res) => {
    start(res); res.write('data: {');
    const end = setTimeout(() => res.end('"type":"future","runId":"fiction-run","messageId":"fiction-message","private":"hidden"}\n\n' + frame({ type: 'done' })), 25);
    res.on('close', () => clearTimeout(end));
  });
  const text = await (await s.request()).text(); assert.equal(text, ': keepalive\n\n' + frame({ type: 'done', done: true }));
});
test('chat waits beyond ordinary header timeout, ordinary JSON still expires', async t => {
  const s = await bridge(t, (req, res) => {
    const timer = setTimeout(() => { if (req.url === '/api/chat') { start(res); res.end(frame({ type: 'done' })); } else { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{}'); } }, 90);
    res.on('close', () => clearTimeout(timer));
  }, { timeoutMs: 30, streamTimeoutMs: 300 });
  const response = await s.request(); assert.equal(response.status, 200); assert.match(await response.text(), /done/);
  const ordinary = await s.request('/api/agents/name-suggestion', 'POST', { language: 'en', exclude: [] }); assert.equal(ordinary.status, 504); await ordinary.text(); assert.equal(s.calls(), 2);
});
test('chat header wait expires at stream deadline without a replay', async t => {
  const s = await bridge(t, () => {}, { timeoutMs: 20, streamTimeoutMs: 100 });
  const started = performance.now(); const response = await s.request(); assert.equal(response.status, 504); await response.text();
  assert.ok(performance.now() - started >= 80); assert.equal(s.calls(), 1);
});
test('headers and heartbeat body share an absolute deadline', async t => {
  const s = await bridge(t, (_req, res) => {
    let interval;
    const header = setTimeout(() => { start(res); res.write(': private\n\n'); interval = setInterval(() => res.write(': private\n\n'), 10); }, 140);
    res.on('close', () => { clearTimeout(header); clearInterval(interval); });
  }, { timeoutMs: 30, streamTimeoutMs: 220, streamIdleMs: 100 });
  const started = performance.now(); const response = await s.request(); await assert.rejects(response.text());
  const elapsed = performance.now() - started; assert.ok(elapsed >= 190 && elapsed < 330, `elapsed ${elapsed}`); assert.equal(s.calls(), 1);
});
test('heartbeat backpressure pauses upstream and drain resumes; deadline still closes a blocked consumer', async t => {
  let stopped; const closed = new Promise(r => { stopped = r; });
  const s = await bridge(t, (_req, res) => {
    start(res); res.write(': private\n\n');
    const interval = setInterval(() => res.write(': private\n\n'), 5);
    res.on('close', () => { clearInterval(interval); stopped(); });
  }, { streamTimeoutMs: 160, streamIdleMs: 100 });
  let writes = 0, drained = false;
  s.app.on('request', (_req, res) => {
    const original = res.write.bind(res);
    res.write = (...args) => { writes++; original(...args); return false; };
    const timer = setTimeout(() => { drained = true; res.emit('drain'); }, 40);
    res.on('close', () => clearTimeout(timer));
  });
  const response = await s.request(); await assert.rejects(response.text()); await closed;
  assert.equal(writes, 1); assert.equal(drained, true); assert.equal(s.calls(), 1);
});
test('obsolete account_locked is stripped by the shared browser/bridge schema', () => {
  assert.equal(chatError(429, { code: 'account_locked', message: 'private' }), null);
  assert.deepEqual(chatError(429, { ...ids, code: 'account_locked' }), ids);
  assert.deepEqual(chatError(429, { code: 'rate_limited' }), { code: 'rate_limited' });
});
const user = { id: 'fiction-owner', email: 'a@example.invalid', username: 'Fiction', role: 'owner' };
const success = n => ({ status: 200, body: { user, token: 'fictional-auth', deviceToken: String(n).padEnd(43, '_') } });
function race() {
  const calls = [], pending = [];
  const transport = async request => {
    calls.push(request);
    if (request.path.endsWith('/login')) return new Promise(resolve => pending.push(resolve));
    return { status: 200, body: { user } };
  };
  const client = new SessionClient({ mock: transport, live: transport }); client.selectMode('mock');
  return { client, calls, pending, login: (email = user.email) => client.login(email, 'fictional') };
}
for (const action of ['cancel', 'discovery']) test(`late login after ${action} saves device only, normalizes email, never authenticates`, async () => {
  const s = race(), old = s.login(' A@EXAMPLE.INVALID '); s.client.cancel();
  if (action === 'discovery') await s.client.discoverSetup();
  const state = s.client.getSnapshot(); s.pending[0](success(1)); await old;
  assert.equal(s.client.getSnapshot(), state); assert.equal(s.calls.filter(x => x.path.endsWith('/me')).length, 0);
  if (action === 'discovery') s.client.cancel();
  const next = s.login(); assert.equal(s.calls.at(-1).body.deviceToken, success(1).body.deviceToken); s.pending[1]({ status: 401, body: null }); await next;
});
for (const action of ['account-roundtrip', 'mode-roundtrip', 'same-mode', 'newer-failed', 'newer-pending']) test(`late rotation cannot cross or overwrite ${action}`, async () => {
  const s = race(), old = s.login(); s.client.cancel();
  if (action === 'account-roundtrip') { const other = s.login('b@example.invalid'); s.pending.at(-1)({ status: 401, body: null }); await other; }
  if (action === 'mode-roundtrip') { s.client.selectMode('live'); s.client.selectMode('mock'); }
  if (action === 'same-mode') s.client.selectMode('mock');
  let newer;
  if (action.startsWith('newer')) { newer = s.login(); if (action === 'newer-failed') { s.pending.at(-1)({ status: 401, body: null }); await newer; } }
  const state = s.client.getSnapshot(); s.pending[0](success(99)); await old; assert.equal(s.client.getSnapshot(), state);
  if (action === 'newer-pending') { s.pending.at(-1)(success(2)); await newer; }
  const next = s.login(); assert.equal(s.calls.at(-1).body.deviceToken, action === 'newer-pending' ? success(2).body.deviceToken : undefined);
  s.pending.at(-1)({ status: 401, body: null }); await next;
});
for (const value of [undefined, '', 'x'.repeat(42), 'x'.repeat(44), 'x'.repeat(42) + '=']) test(`late malformed rotation is discarded: length ${value?.length}`, async () => {
  const s = race(), old = s.login(); s.client.cancel();
  s.pending[0]({ status: 200, body: { ...success(1).body, deviceToken: value } }); await old;
  const next = s.login(); assert.equal(s.calls.at(-1).body.deviceToken, undefined); s.pending[1]({ status: 401, body: null }); await next;
});
test('late response retains only validated device even when auth/user are unusable', async () => {
  const s = race(), old = s.login(); s.client.cancel();
  s.pending[0]({ status: 200, body: { deviceToken: success(1).body.deviceToken, token: {}, user: null } }); await old;
  assert.equal(s.client.getSnapshot().user, undefined); await assert.rejects(s.client.request({ method: 'GET', path: '/api/auth/me' }));
  const next = s.login(); assert.equal(s.calls.at(-1).body.deviceToken, success(1).body.deviceToken); s.pending[1]({ status: 401, body: null }); await next;
});
