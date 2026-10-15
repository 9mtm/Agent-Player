require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApplicationServer } = require('../scripts/application-server.cjs');
const { SessionClient, createSameOriginTransport } = require('../src/session.ts');
const { ChatController } = require('../src/chat.ts');
const { SSEParser } = require('../src/chat-protocol.js');
// Fictional wire fixtures traced to backend bbcdec18bbd948b05b066375fba17e3caab707fc.
// These exercise the UI and bridge, not backend execution or its ledger implementation.
const ids = { runId: 'fiction-run', messageId: 'fiction-message' };
const user = { id: 'fiction-owner', username: 'Fiction', email: 'fiction@example.invalid', role: 'owner' };
const body = { stream: true, sessionId: 'fiction-session', messages: [{ role: 'user', content: 'Hello' }] };
const frame = (x, identity = ids) => `data: ${JSON.stringify({ ...x, ...identity })}\n\n`;
const listen = s => new Promise((resolve, reject) => { s.once('error', reject); s.listen(0, '127.0.0.1', () => resolve(s.address().port)); });
const close = s => new Promise(resolve => { s.close(resolve); s.closeAllConnections(); });
function start(res, identity = ids) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'X-Run-Id': identity.runId, 'X-Message-Id': identity.messageId });
  res.flushHeaders();
}
async function fixture(t, chat, options = {}) {
  const calls = [];
  const upstream = http.createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    if (req.url === '/api/chat') {
      const call = { body: JSON.parse(Buffer.concat(chunks)), key: req.headers['idempotency-key'], actor: req.headers.authorization };
      calls.push(call); return chat(req, res, call);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(req.url.endsWith('/login') ? { user, token: 'fictional', deviceToken: 'd'.repeat(43) } : { user }));
  });
  const upstreamPort = await listen(upstream);
  t.after(() => close(upstream));
  const app = createApplicationServer({ channel: 'candidate', upstreamPort, ...options });
  const port = await listen(app), origin = `http://127.0.0.1:${port}`;
  t.after(() => close(app));
  const fetcher = async (url, init) => {
    const r = await fetch(origin + new URL(url).pathname, { ...init, headers: { ...init.headers, Origin: origin } });
    return { status: r.status, headers: r.headers, body: r.body, redirected: r.redirected, url, json: () => r.json() };
  };
  const client = new SessionClient({ live: createSameOriginTransport('http://127.0.0.1:42522', fetcher) });
  client.selectMode('live'); await client.login(user.email, 'fictional-only');
  assert.equal(client.getSnapshot().phase, 'authenticated');
  const controller = new ChatController(client); t.after(() => controller.dispose());
  const request = (payload = body, key = 'fiction-key', actor = 'fictional') => fetch(origin + '/api/chat', {
    method: 'POST', mode: 'same-origin', body: JSON.stringify(payload), headers: { Origin: origin, Authorization: `Bearer ${actor}`, 'Content-Type': 'application/json', 'Idempotency-Key': key },
  });
  return { calls, client, controller, request };
}
async function locked(s) {
  s.controller.edit('must not resend'); await s.controller.send();
  assert.equal(s.controller.getSnapshot().phase, 'unknown'); assert.equal(s.calls.length, 1);
}
function parse(text) {
  const p = new SSEParser(ids), frames = [];
  const bytes = Buffer.from(text);
  for (let i = 0; i < bytes.length; i += 997) frames.push(...p.push(bytes.subarray(i, i + 997)));
  p.finish(); return frames;
}
for (const code of [undefined, 'model_unavailable']) test(`CHAT-01 terminal error without done (${code ?? 'generic'})`, async t => {
  const s = await fixture(t, (_req, res) => {
    start(res); res.end(frame({ type: 'text', content: 'partial' }) + frame({ type: 'error', error: 'Chat request failed', ...(code ? { code } : {}) }));
  });
  s.controller.edit('Hello'); await s.controller.send();
  const state = s.controller.getSnapshot();
  assert.equal(state.turns[0].terminal, 'error'); assert.equal(state.turns[0].content, 'partial');
  assert.equal(state.turns[0].errorCode, code);
  assert.match(state.notice, code === 'model_unavailable' ? /Model unavailable or not reachable/ : /typed error/); await locked(s);
});
test('CHAT-01 immediate headers and actual 12s pings survive cold response beyond idle', { timeout: 40000 }, async t => {
  let finished = false;
  const s = await fixture(t, (_req, res) => {
    start(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 12000);
    const end = setTimeout(() => { finished = true; res.end(frame({ type: 'done' })); }, 31000);
    res.on('close', () => { clearInterval(ping); clearTimeout(end); });
  }, { streamIdleMs: 20000, streamTimeoutMs: 38000 });
  const response = await s.request();
  assert.equal(response.status, 200); assert.equal(finished, false);
  assert.match(response.headers.get('content-type'), /^text\/event-stream/);
  const text = await response.text();
  assert.equal((text.match(/: keepalive\n\n/g) || []).length, 2);
  assert.ok(!text.includes(': ping')); assert.equal(parse(text).at(-1).done, true); assert.equal(s.calls.length, 1);
});
for (const [kind, size] of [['answer', 4096], ['replay', 16384]]) {
  for (const truncated of kind === 'replay' ? [false, true] : [false]) test(`CHAT-01 ${kind} 256KiB, ${size}-byte chunks, truncated=${truncated}`, async t => {
    const content = 'x'.repeat(262144);
    const parts = Array.from({ length: content.length / size }, (_, i) => ({
      type: 'text', content: content.slice(i * size, (i + 1) * size),
      ...(kind === 'replay' ? { done: false, replayed: true, ...(truncated && (i + 1) * size === content.length ? { truncated: true } : {}) } : {}),
    }));
    const wire = parts.map(x => frame(x)).join('') + frame({ type: 'done', ...(kind === 'replay' ? { content: '', done: true, replayed: true } : {}) });
    assert.equal(parse(wire).length, parts.length + 1);
    assert.equal(parts.filter(x => x.truncated).length, truncated ? 1 : 0);
    const s = await fixture(t, (_req, res) => { start(res); res.end(wire); });
    s.controller.edit('Hello'); await s.controller.send();
    const state = s.controller.getSnapshot();
    assert.equal(state.turns[0].content, content); assert.equal(state.turns[0].partial, truncated);
    assert.equal(state.turns[0].replayed, kind === 'replay');
    assert.equal(state.phase, truncated ? 'unknown' : 'complete');
    if (truncated) await locked(s);
  });
}
test('CHAT-01 escaped Unicode replay chunks remain within frame bound and preserve text', () => {
  const content = 'مرحبا🌍\n"\\\u0000'.repeat(400);
  assert.ok(Buffer.byteLength(JSON.stringify(content)) < 16384);
  const wire = frame({ type: 'text', content, done: false, replayed: true }) + frame({ type: 'text', content, done: false, replayed: true, truncated: true }) + frame({ type: 'done', content: '', done: true, replayed: true });
  const frames = parse(wire); assert.equal(frames.slice(0, 2).map(x => x.content).join(''), content.repeat(2));
  assert.equal(frames[0].truncated, undefined); assert.equal(frames[1].truncated, true);
});
test('CHAT-01 replay of an error ends with incomplete done and remains unknown', async t => {
  const s = await fixture(t, (_req, res) => { start(res); res.end(frame({ type: 'text', content: 'partial', done: false, replayed: true }) + frame({ type: 'done', content: '', done: true, incomplete: true, replayed: true })); });
  s.controller.edit('Hello'); await s.controller.send(); assert.equal(s.controller.getSnapshot().turns[0].partial, true); await locked(s);
});
for (const [status, code] of [[400, undefined], [401, undefined], [403, undefined], [409, 'idempotency_in_progress'], [422, 'idempotency_key_reused'], [429, 'rate_limited']]) test(`CHAT-01 pre-stream JSON ${status} remains a refusal`, async t => {
  const s = await fixture(t, (_req, res) => {
    res.writeHead(status, { 'Content-Type': 'application/json', ...(status === 429 ? { 'Retry-After': '30' } : {}) });
    res.end(JSON.stringify({ ...(code ? { code } : {}), ...(status === 409 ? ids : {}), error: 'fiction-private' }));
  });
  s.controller.edit('Hello'); await s.controller.send();
  assert.ok(!JSON.stringify(s.controller.getSnapshot()).includes('fiction-private'));
  if (status === 401) { assert.equal(s.client.getSnapshot().phase, 'signed-out'); assert.deepEqual(s.controller.getSnapshot().turns, []); }
  else { if (code) assert.match(s.controller.getSnapshot().notice, new RegExp(status === 409 ? 'still running' : status === 422 ? 'different request' : code)); await locked(s); }
});
test('CHAT-01 full allowed request is forwarded intact; earlier history mismatch 422 never resends', async t => {
  const payload = { ...body, agentId: 'fiction-agent', messages: [{ role: 'user', content: 'earlier' }, { role: 'assistant', content: 'answer' }, { role: 'user', content: 'same last message' }] };
  let original;
  const s = await fixture(t, (_req, res, call) => {
    if (!original) { original = call; start(res); res.end(frame({ type: 'done' })); return; }
    // A fictional full-body comparison, not a backend fingerprint implementation test.
    assert.equal(call.key, original.key); assert.notDeepEqual(call.body, original.body);
    res.writeHead(422, { 'Content-Type': 'application/json' }); res.end('{"code":"idempotency_key_reused"}');
  });
  await (await s.request(payload)).text(); assert.deepEqual(s.calls[0].body, payload);
  const changed = { ...payload, messages: payload.messages.map((m, i) => i ? m : { ...m, content: 'changed earlier' }) };
  const response = await s.request(changed); assert.equal(response.status, 422); assert.deepEqual(await response.json(), { code: 'idempotency_key_reused' }); assert.equal(s.calls.length, 2);
});
test('CHAT-01 disconnect drops fictional key; controller never retries a key that could start a new run', async t => {
  const ledger = new Map(); let dropped;
  const drop = new Promise(resolve => { dropped = resolve; });
  const s = await fixture(t, (_req, res, call) => {
    assert.equal(ledger.has(call.key), false);
    const identity = { runId: `fiction-run-${s.calls.length}`, messageId: `fiction-message-${s.calls.length}` };
    ledger.set(call.key, identity); start(res, identity);
    if (s.calls.length === 1) {
      res.write(frame({ type: 'text', content: 'partial' }, identity));
      const timer = setTimeout(() => res.destroy(), 20);
      res.on('close', () => { clearTimeout(timer); ledger.delete(call.key); dropped(); });
    } else res.end(frame({ type: 'done' }, identity));
  });
  s.controller.edit('Hello'); await s.controller.send(); await drop;
  const first = s.controller.getSnapshot().turns[0]; assert.equal(first.runId, 'fiction-run-1');
  await locked(s); assert.equal(ledger.size, 0);
  // Explicit test-only request illustrates why recovery is disabled. UI never does this.
  const response = await s.request(s.calls[0].body, s.calls[0].key);
  assert.equal(response.headers.get('x-run-id'), 'fiction-run-2'); await response.text(); assert.equal(s.calls.length, 2);
  assert.equal(s.controller.getSnapshot().turns[0].runId, first.runId);
});

test('CHAT-01 four fictional running keys cap one actor; 429 never schedules a fifth retry', async t => {
  const running = new Map();
  const s = await fixture(t, (_req, res, call) => {
    const n = running.get(call.actor) || 0;
    if (n >= 4) {
      res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '30' });
      res.end('{"code":"rate_limited"}'); return;
    }
    running.set(call.actor, n + 1); start(res);
    res.on('close', () => running.set(call.actor, running.get(call.actor) - 1));
  });
  const responses = [];
  for (let i = 0; i < 4; i++) { const r = await s.request(body, `fiction-key-${i}`); assert.equal(r.status, 200); responses.push(r); }
  const other = await s.request(body, 'fiction-other-key', 'fictional-other-user');
  assert.equal(other.status, 200); responses.push(other);
  s.controller.edit('Hello'); await s.controller.send();
  assert.equal(s.controller.getSnapshot().phase, 'unknown'); assert.match(s.controller.getSnapshot().notice, /rate_limited/);
  s.controller.edit('retry'); await s.controller.send(); assert.equal(s.calls.length, 6);
  for (const response of responses) await response.body.cancel();
});
