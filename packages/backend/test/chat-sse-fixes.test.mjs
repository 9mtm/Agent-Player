// CHAT-01: chat idempotency and SSE stream hardening.
//  - running idempotency entries are never evicted at the cap (429 instead),
//    and a duplicate key does not run the turn twice;
//  - per-actor running cap (one actor cannot block another), connection
//    close settles the entry at once, stale running entries expire at 15 min;
//  - the fingerprint covers the whole request (all messages, model, options);
//  - replay frames carry <= 16 KiB of text and reassemble exactly;
//  - the final answer is sent in bounded frames (256 KiB -> < 1,000 frames);
//  - an SSE heartbeat comment runs while a slow tool step runs, cleared on end;
//  - Ollama errors relay no upstream text, and SSE headers are flushed before
//    Ollama is contacted;
//  - CSRF wildcard origins are escaped and match one host label only.
// Throwaway DB/keys; every model is stubbed (no network). The only listener is
// an in-test server on 127.0.0.1 with an ephemeral port.
// Run: node --import tsx --test test/chat-sse-fixes.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { EventEmitter } from 'node:events';
import http from 'node:http';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-chat-sse-'));
mkdirSync(join(dir, '.data', 'multi-agent'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.AGENT_PLAYER_CONFIG_DIR = join(dir, 'cli-config');
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
process.env.NODE_ENV = 'test';
process.env.OLLAMA_URL = 'http://127.0.0.1:11434';
for (const k of ['AGENT_EXEC_TOOLS', 'OLLAMA_THINK', 'DEFAULT_MODEL']) delete process.env[k];

const UPSTREAM_SECRET = 'UPSTREAM-SECRET-model qwen-test not found at /Users/someone/.ollama';

// --- stubbed models -----------------------------------------------------------
// Ollama: `ollamaMode` picks the behaviour; `beforeOllama` (if set) is awaited
// before the stub answers (lets a test observe the client side first).
let ollamaMode = 'ok';
let ollamaCalls = 0;
let beforeOllama = null;
let releaseOllama = null;
// Anthropic: a queue of responses (JSON bodies of /v1/messages).
const claudeQueue = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u === 'https://api.anthropic.com/v1/messages') {
    const next = claudeQueue.shift();
    if (!next) throw new Error('no stubbed Claude response left');
    return new Response(JSON.stringify(next), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (u !== 'http://127.0.0.1:11434/api/chat') throw new Error(`unexpected network call in test: ${u}`);
  ollamaCalls++;
  if (beforeOllama) await beforeOllama();
  if (ollamaMode === 'hold') await new Promise((r) => { releaseOllama = r; });
  if (ollamaMode === 'error') return new Response(UPSTREAM_SECRET, { status: 500, headers: { 'content-type': 'text/plain' } });
  if (ollamaMode === 'refused') throw new TypeError(`fetch failed: connect ECONNREFUSED ${UPSTREAM_SECRET}`);
  const body = JSON.parse(init.body);
  if (!body.stream) {
    return new Response(JSON.stringify({ model: body.model, message: { role: 'assistant', content: 'plain reply' }, done: true }),
      { status: 200, headers: { 'content-type': 'application/json' } });
  }
  const lines = [
    { message: { role: 'assistant', content: 'Hello ' }, done: false },
    { message: { role: 'assistant', content: 'there' }, done: false },
    { message: { role: 'assistant', content: '' }, done: true },
  ].map((l) => `${JSON.stringify(l)}\n`).join('');
  return new Response(lines, { status: 200, headers: { 'content-type': 'application/x-ndjson' } });
};

const quiet = { log: console.log, warn: console.warn, info: console.info, error: console.error };
const logged = [];
const capture = (...a) => { logged.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x) ?? String(x))).join(' ')); };
console.log = capture; console.info = capture; console.warn = capture; console.error = capture;

const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const { getCredentialStorage } = await import(join(backendDir, 'src/credentials/storage.ts'));
await getCredentialStorage().initialize();
const { getOrchestrator } = await import(join(backendDir, 'src/multi-agent/index.ts'));
await getOrchestrator().initialize(join(dir, '.data', 'multi-agent', 'orchestrator.db'));
db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status, email_verified) VALUES ('s-owner', 's-owner@example.test', 's-owner', 'x', 'owner', 'active', 1)`).run();
db.prepare(`INSERT INTO agents_config (id, name, provider, model) VALUES ('s-agent', 'SSE Agent', 'ollama', 'qwen-test')`).run();
db.prepare(`UPDATE agents_config SET is_primary = CASE WHEN id = 's-agent' THEN 1 ELSE 0 END`).run();

const tools = await import(join(backendDir, 'src/tools/index.ts'));
const grants = await import(join(backendDir, 'src/tools/grants.ts'));
const idem = await import(join(backendDir, 'src/services/chat-idempotency.ts'));
const sse = await import(join(backendDir, 'src/services/chat-sse.ts'));
const { streamChatClaude, ANSWER_FRAME_BYTES } = await import(join(backendDir, 'src/api/routes/agentic-chat.ts'));
const { csrfProtection, wildcardOriginMatches } = await import(join(backendDir, 'src/middleware/csrf-protection.ts'));

let slowToolMs = 0;
tools.registerExtensionTool({ name: 'x_slow', description: 'slow step', extensionId: 'x', requiresApproval: false,
  input_schema: { type: 'object', properties: {} },
  execute: async () => { await new Promise((r) => setTimeout(r, slowToolMs)); return { content: [{ type: 'text', text: 'slow done' }] }; } });
const avail = tools.createToolsRegistry({ workspaceDir: dir }).listRegistered();
await grants.setAgentGrants('s-agent', { grants: ['x_slow'] }, 's-owner', avail);

const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { buildServer } = await import(join(backendDir, 'src/api/app.ts'));
const app = await buildServer({ logger: false });
await app.ready();
const bearer = (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` });

console.log = quiet.log; console.info = quiet.info; console.warn = quiet.warn; console.error = quiet.error;
const muted = async (fn) => {
  const s = { log: console.log, warn: console.warn, error: console.error, info: console.info };
  console.log = capture; console.warn = capture; console.error = capture; console.info = capture;
  try { return await fn(); } finally { Object.assign(console, s); }
};
const chat = (payload, headers = {}) => muted(() => app.inject({ method: 'POST', url: '/api/chat',
  headers: { ...bearer('s-owner'), ...headers }, payload: { agentId: 's-agent', sessionId: 'sse-1', stream: true, ...payload } }));
const dataFrames = (body) => body.split('\n\n').map((b) => b.trim()).filter((b) => b.startsWith('data: ')).map((b) => JSON.parse(b.slice(6)));
const tick = (ms) => new Promise((r) => setTimeout(r, ms));

test.after(async () => {
  globalThis.fetch = realFetch;
  sse.setSseHeartbeatMs(null);
  tools.unregisterExtensionTool('x_slow');
  try { await app.close(); } catch { /* ignore */ }
  closeDatabase();
  process.chdir(backendDir);
  rmSync(dir, { recursive: true, force: true });
});

// --- 1. idempotency: no eviction of running entries -----------------------------

test('idempotency cap: running entries are never evicted; a full table of running turns refuses new keys', () => {
  idem.resetChatIdempotency();
  idem.setChatIdempotencyCap(3);
  const fp = idem.requestFingerprint({ agentId: 'a', sessionId: 's', stream: true, messages: [{ role: 'user', content: 'x' }] });
  const a = idem.beginChatTurn('u1', 'key-aaaaaaaa', fp);
  const b = idem.beginChatTurn('u1', 'key-bbbbbbbb', fp);
  const c = idem.beginChatTurn('u1', 'key-cccccccc', fp);
  assert.deepEqual([a.kind, b.kind, c.kind], ['new', 'new', 'new']);
  // Cap reached and all running: refuse, do not forget key A.
  assert.equal(idem.beginChatTurn('u1', 'key-dddddddd', fp).kind, 'busy');
  const retryA = idem.beginChatTurn('u1', 'key-aaaaaaaa', fp);
  assert.equal(retryA.kind, 'in_progress', 'the running turn is still known, so a retry cannot run it twice');
  assert.equal(retryA.ids.runId, a.ids.runId);
  // Once one finishes, the oldest finished entry makes room; running ones stay.
  b.entry.state = 'done';
  b.entry.outcome = { kind: 'json', status: 200, body: { ok: true } };
  assert.equal(idem.beginChatTurn('u1', 'key-dddddddd', fp).kind, 'new');
  assert.equal(idem.beginChatTurn('u1', 'key-aaaaaaaa', fp).kind, 'in_progress');
  assert.equal(idem.beginChatTurn('u1', 'key-cccccccc', fp).kind, 'in_progress');
  // B (finished) was the one dropped: it no longer replays, and with A, C, D
  // all running there is no room for it again.
  assert.equal(idem.beginChatTurn('u1', 'key-bbbbbbbb', fp).kind, 'busy');
  // Turns without a key are never limited by the table.
  assert.equal(idem.beginChatTurn('u1', null, fp).kind, 'new');
  idem.resetChatIdempotency();
});

test('chat route: a full table answers 429 rate_limited; a duplicate key while running does not run twice', async () => {
  idem.resetChatIdempotency();
  idem.setChatIdempotencyCap(1);
  ollamaMode = 'hold';
  ollamaCalls = 0;
  const key = `sse-${randomBytes(8).toString('hex')}`;
  const payload = { messages: [{ role: 'user', content: 'run once' }] };
  const first = chat(payload, { 'idempotency-key': key });
  for (let i = 0; i < 200 && !releaseOllama; i++) await tick(5);
  assert.ok(releaseOllama, 'first turn reached the model');
  const dup = await chat(payload, { 'idempotency-key': key });
  assert.equal(dup.statusCode, 409);
  assert.equal(dup.json().code, 'idempotency_in_progress');
  const other = await chat(payload, { 'idempotency-key': `${key}-other` });
  assert.equal(other.statusCode, 429);
  assert.equal(other.json().code, 'rate_limited');
  assert.equal(other.headers['retry-after'], '30');
  assert.equal(ollamaCalls, 1, 'neither refused request reached the model');
  ollamaMode = 'ok';
  const release = releaseOllama; releaseOllama = null; release();
  const res = await first;
  assert.equal(res.statusCode, 200);
  assert.equal(dataFrames(res.body).at(-1).done, true);
  // Finished now: the same key replays, still without a second model call.
  const again = await chat(payload, { 'idempotency-key': key });
  assert.equal(again.headers['idempotent-replayed'], 'true');
  assert.equal(ollamaCalls, 1);
  idem.resetChatIdempotency();
});

test('per-actor cap: actor A at its cap is refused alone; actor B still runs; the global cap stays a last resort', () => {
  idem.resetChatIdempotency();
  assert.equal(idem.MAX_RUNNING_PER_ACTOR, 4);
  const fp = idem.requestFingerprint({ stream: true, messages: [{ role: 'user', content: 'x' }] });
  const a = [];
  for (let i = 0; i < 4; i++) a.push(idem.beginChatTurn('uA', `key-a-${i}-xxxx`, fp));
  assert.ok(a.every((t) => t.kind === 'new'));
  const over = idem.beginChatTurn('uA', 'key-a-9-xxxx', fp);
  assert.deepEqual(over, { kind: 'busy', scope: 'actor' });
  assert.equal(idem.runningChatTurns('user:uA'), 4, 'one actor never holds more than its cap');
  // A retry of a running key is still answered (not counted as a new turn).
  assert.equal(idem.beginChatTurn('uA', 'key-a-0-xxxx', fp).kind, 'in_progress');
  // Actor B is unaffected.
  assert.equal(idem.beginChatTurn('uB', 'key-b-0-xxxx', fp).kind, 'new');
  // Channel conversations sharing one owner user id are separate actors.
  assert.equal(idem.beginChatTurn('uA', 'key-c-0-xxxx', fp, 'channel:telegram:chat-1').kind, 'new');
  // A finished turn frees A's slot.
  const reply = fakeReply();
  idem.instrumentChatReply(reply, a[0].ids, a[0].entry);
  reply.send({ ok: true });
  assert.equal(idem.runningChatTurns('user:uA'), 3);
  assert.equal(idem.beginChatTurn('uA', 'key-a-9-xxxx', fp).kind, 'new');
  // Global hard cap: many actors, one turn each, all running -> 429 global.
  idem.resetChatIdempotency();
  idem.setChatIdempotencyCap(3);
  for (const u of ['g1', 'g2', 'g3']) assert.equal(idem.beginChatTurn(u, 'key-g-xxxxxx', fp).kind, 'new');
  assert.deepEqual(idem.beginChatTurn('g4', 'key-g-xxxxxx', fp), { kind: 'busy', scope: 'global' });
  idem.resetChatIdempotency();
});

test('connection close before the reply ended: entry dropped at once, slot freed; a completed turn stays replayable', () => {
  idem.resetChatIdempotency();
  const fp = idem.requestFingerprint({ stream: true, messages: [{ role: 'user', content: 'x' }] });
  const t1 = idem.beginChatTurn('uC', 'key-close-xxxx', fp);
  const raw = fakeRaw();
  idem.instrumentChatReply(fakeReply(raw), t1.ids, t1.entry);
  raw.writeHead(200, { 'Content-Type': 'text/event-stream' });
  raw.write(`data: ${JSON.stringify({ type: 'text', content: 'partial' })}\n\n`);
  assert.equal(idem.runningChatTurns('user:uC'), 1);
  raw.destroyed = true; raw.emit('close'); // client went away
  assert.equal(idem.runningChatTurns('user:uC'), 0, 'slot freed without waiting');
  const t2 = idem.beginChatTurn('uC', 'key-close-xxxx', fp);
  assert.equal(t2.kind, 'new', 'aborted turn is not replayed; a retry runs anew');
  assert.notEqual(t2.ids.runId, t1.ids.runId);
  // The aborted backend work ending later does not resurrect or double-free.
  raw.end();
  assert.equal(idem.runningChatTurns('user:uC'), 1);
  assert.equal(idem.beginChatTurn('uC', 'key-close-xxxx', fp).kind, 'in_progress');
  // Completed stream: replayable, and the close that follows end changes nothing.
  const t3 = idem.beginChatTurn('uC', 'key-done-xxxxx', fp);
  const raw3 = fakeRaw();
  idem.instrumentChatReply(fakeReply(raw3), t3.ids, t3.entry);
  raw3.writeHead(200, { 'Content-Type': 'text/event-stream' });
  raw3.write(`data: ${JSON.stringify({ type: 'text', content: 'all' })}\n\n`);
  raw3.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  raw3.end(); // emits finish + close
  const r = idem.beginChatTurn('uC', 'key-done-xxxxx', fp);
  assert.equal(r.kind, 'replay');
  assert.equal(r.outcome.content, 'all');
  assert.equal(r.outcome.done, true);
  idem.resetChatIdempotency();
});

test('stale running entries expire at 15 minutes (injected clock); finished ones after 10', () => {
  idem.resetChatIdempotency();
  assert.equal(idem.RUNNING_STALE_MS, 15 * 60_000);
  let t = 1_000_000;
  idem.setChatIdempotencyClock(() => t);
  const fp = idem.requestFingerprint({ stream: true, messages: [{ role: 'user', content: 'x' }] });
  const run = idem.beginChatTurn('uS', 'key-stale-xxxx', fp);
  const fin = idem.beginChatTurn('uS', 'key-fin-xxxxxx', fp);
  const reply = fakeReply(); idem.instrumentChatReply(reply, fin.ids, fin.entry); reply.send({ ok: 1 });
  t += 10 * 60_000 + 1;
  assert.equal(idem.beginChatTurn('uS', 'key-stale-xxxx', fp).kind, 'in_progress', 'still running at 10 min');
  assert.equal(idem.beginChatTurn('uS', 'key-fin-xxxxxx', fp).kind, 'new', 'finished entry expired after 10 min');
  t += 5 * 60_000; // 15 min + 1 ms since the running turn started
  assert.equal(idem.runningChatTurns('user:uS'), 2);
  const again = idem.beginChatTurn('uS', 'key-stale-xxxx', fp);
  assert.equal(again.kind, 'new', 'stale running entry dropped');
  assert.notEqual(again.ids.runId, run.ids.runId);
  assert.equal(idem.runningChatTurns('user:uS'), 2, 'stale slot freed (new key-fin + new key-stale)');
  idem.resetChatIdempotency();
});

// --- 2. fingerprint covers the whole request -----------------------------------

test('fingerprint: covers all messages, agent, session, model and options; key order does not matter', () => {
  const base = { agentId: 'a', sessionId: 's', stream: true, messages: [{ role: 'user', content: 'one' }, { role: 'assistant', content: 'two' }, { role: 'user', content: 'three' }] };
  const fp = idem.requestFingerprint(base);
  const variants = [
    { ...base, messages: [{ role: 'user', content: 'ONE' }, ...base.messages.slice(1)] },
    { ...base, messages: [base.messages[0], { role: 'assistant', content: 'TWO' }, base.messages[2]] },
    { ...base, agentId: 'b' },
    { ...base, sessionId: 't' },
    { ...base, stream: false },
    { ...base, model: 'other-model' },
    { ...base, temperature: 0.2 },
    { ...base, maxTokens: 10 },
    { ...base, systemPromptAppend: 'x' },
    { ...base, memoryScope: { project: 'p' } },
  ];
  for (const v of variants) assert.notEqual(idem.requestFingerprint(v), fp, JSON.stringify(v));
  const reordered = { messages: base.messages.map((m) => ({ content: m.content, role: m.role })), stream: true, sessionId: 's', agentId: 'a', model: undefined };
  assert.equal(idem.requestFingerprint(reordered), fp, 'canonical JSON: key order and undefined members do not change the hash');
});

test('chat route: same key with a different first message is a conflict (422 idempotency_key_reused)', async () => {
  idem.resetChatIdempotency();
  ollamaMode = 'ok';
  const key = `sse-${randomBytes(8).toString('hex')}`;
  const msgs = (first) => [{ role: 'user', content: first }, { role: 'assistant', content: 'ok' }, { role: 'user', content: 'same last' }];
  const a = await chat({ messages: msgs('first A') }, { 'idempotency-key': key });
  assert.equal(a.statusCode, 200);
  const before = ollamaCalls;
  const b = await chat({ messages: msgs('first B') }, { 'idempotency-key': key });
  assert.equal(b.statusCode, 422);
  assert.equal(b.json().code, 'idempotency_key_reused');
  const c = await chat({ messages: msgs('first A'), model: 'another-model' }, { 'idempotency-key': key });
  assert.equal(c.statusCode, 422, 'a different model is a different turn');
  assert.equal(ollamaCalls, before);
});

// --- 3. bounded replay frames -------------------------------------------------

function fakeRaw() {
  const raw = new EventEmitter();
  raw.out = [];
  raw.headersSent = false; raw.writableEnded = false; raw.destroyed = false; raw.statusCode = 200;
  raw.writeHead = (status, headers) => { raw.headersSent = true; raw.statusCode = status; raw.head = headers; return raw; };
  raw.flushHeaders = () => { raw.flushed = true; };
  raw.write = (chunk) => { raw.out.push(String(chunk)); return true; };
  raw.end = () => { raw.writableEnded = true; raw.emit('finish'); raw.emit('close'); };
  return raw;
}
function fakeReply(raw = fakeRaw()) {
  return { raw, headers: {}, header(k, v) { this.headers[k] = v; return this; }, hijack() {}, status() { return this; }, send() { return this; } };
}
const LONE = /^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/;

test('chunkText: never splits a surrogate pair; each chunk within budget; joins back exactly', () => {
  const pieces = ['a', 'مرحبا', '😀', '👨‍👩‍👧', 'ß', '"', '\\', '\n', '\u0001', 'é', '𝄞', '中'];
  for (let n = 0; n < 300; n++) {
    let s = '';
    for (let i = 0; i < 40 + n; i++) s += pieces[(i * 7 + n) % pieces.length];
    for (const max of [6, 7, 8, 13, 64]) {
      const parts = sse.chunkText(s, max);
      assert.equal(parts.join(''), s);
      for (const p of parts) {
        assert.ok(Buffer.byteLength(p, 'utf8') <= max, `utf8 ${max}`);
        assert.ok(Buffer.byteLength(JSON.stringify(p), 'utf8') - 2 <= max, `json ${max}`);
        assert.doesNotMatch(p, LONE);
      }
    }
  }
  assert.deepEqual(sse.chunkText('', 10), []);
});

test('replay: stored text is sent in frames of <= 16 KiB text that reassemble exactly (emoji, Arabic at borders)', () => {
  const LIMIT = idem.REPLAY_FRAME_BYTES;
  assert.equal(LIMIT, 16 * 1024);
  // Put a 4-byte emoji and 2-byte Arabic letters right across every 16 KiB border.
  let content = '';
  while (Buffer.byteLength(content) < 250 * 1024) {
    content += 'x'.repeat(LIMIT - 1 - (Buffer.byteLength(content) % LIMIT)) + '😀' + 'سلام عليكم' + '🌙';
  }
  for (const truncated of [false, true]) {
    const reply = fakeReply();
    idem.replayChatOutcome(reply, { runId: 'r-1', messageId: 'm-1' }, { kind: 'stream', status: 200, content, truncated, done: true });
    const writes = reply.raw.out;
    const frames = writes.map((w) => { assert.ok(w.startsWith('data: ') && w.endsWith('\n\n')); return JSON.parse(w.slice(6)); });
    const text = frames.filter((f) => f.type === 'text');
    assert.ok(text.length > 1, 'chunked');
    for (const w of writes) assert.ok(Buffer.byteLength(w) < 64 * 1024, 'every frame below the UI 64 KiB limit');
    for (const f of text) {
      assert.ok(Buffer.byteLength(f.content, 'utf8') <= LIMIT);
      assert.doesNotMatch(f.content, LONE);
      assert.equal(f.replayed, true);
      assert.equal(f.done, false);
    }
    assert.equal(text.map((f) => f.content).join(''), content);
    assert.equal(Boolean(text.at(-1).truncated), truncated);
    assert.ok(text.slice(0, -1).every((f) => f.truncated === undefined));
    assert.equal(frames.at(-1).type, 'done');
    assert.equal(reply.raw.writableEnded, true);
  }
});

// --- 4/5. final answer frames + heartbeat during a slow tool step ---------------

test('agentic stream: heartbeat comments while a slow tool runs, cleared on end; 256 KiB answer in < 1,000 bounded frames', async () => {
  sse.setSseHeartbeatMs(30);
  slowToolMs = 250;
  const answer = ('Answer ' + 'مرحبا بالعالم ' + '😀🚀 ' + 'x'.repeat(97)).repeat(Math.ceil(256 * 1024 / 140)).slice(0, 256 * 1024);
  claudeQueue.length = 0;
  claudeQueue.push(
    { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'tu_1', name: 'x_slow', input: {} }], usage: { input_tokens: 1, output_tokens: 1 } },
    { stop_reason: 'end_turn', content: [{ type: 'text', text: answer }], usage: { input_tokens: 1, output_tokens: 1 } },
  );
  const raw = fakeRaw();
  const reply = fakeReply(raw);
  const policy = { kind: 'channel', channel: 'test', conversationId: 'c', allowedDestinations: [], allowedTools: new Set(['x_slow']) };
  const before = sse.activeSseHeartbeats();
  await muted(() => streamChatClaude(reply, 'test-key-not-real', 'claude-test', [{ role: 'user', content: 'go' }], 'sys',
    [{ name: 'x_slow', description: 'slow step', input_schema: { type: 'object', properties: {} } }], 0.5,
    's-owner', 'sse-1', undefined, policy, 's-agent'));
  assert.equal(raw.flushed, true, 'headers flushed');
  assert.match(raw.head['Content-Type'], /text\/event-stream/);
  const out = raw.out;
  const iStart = out.findIndex((w) => w.includes('"type":"tool_start"'));
  const iResult = out.findIndex((w) => w.includes('"type":"tool_result"'));
  assert.ok(iStart >= 0 && iResult > iStart, 'tool frames present');
  const pingsDuringTool = out.slice(iStart + 1, iResult).filter((w) => w === ': ping\n\n').length;
  assert.ok(pingsDuringTool >= 3, `heartbeat during the slow tool step (got ${pingsDuringTool})`);
  // Comments are not data events.
  const data = out.filter((w) => w.startsWith('data: '));
  assert.ok(out.every((w) => w.startsWith('data: ') || w === ': ping\n\n'));
  // Final answer: bounded frames, well under the UI's 4,096 cap, exact text.
  const textFrames = data.map((w) => JSON.parse(w.slice(6))).filter((f) => f.type === 'text');
  assert.ok(data.length < 1000, `frames: ${data.length}`);
  for (const f of textFrames) {
    assert.ok(Buffer.byteLength(f.content) <= ANSWER_FRAME_BYTES);
    assert.doesNotMatch(f.content, LONE);
  }
  assert.equal(textFrames.map((f) => f.content).join(''), answer);
  assert.equal(JSON.parse(data.at(-1).slice(6)).type, 'done');
  // Timer cleared on end: no more pings afterwards.
  assert.equal(raw.writableEnded, true);
  assert.equal(sse.activeSseHeartbeats(), before);
  const count = out.length;
  await tick(120);
  assert.equal(out.length, count, 'no writes after end');
  sse.setSseHeartbeatMs(null);
});

test('heartbeat: one timer per stream, cleared on close as well as end', async () => {
  sse.setSseHeartbeatMs(20);
  const raw = fakeRaw();
  const before = sse.activeSseHeartbeats();
  sse.openSseStream(raw);
  sse.openSseStream(raw); // second call is a no-op
  assert.equal(sse.activeSseHeartbeats(), before + 1);
  await tick(90);
  const pings = raw.out.filter((w) => w === ': ping\n\n').length;
  assert.ok(pings >= 2, `pings: ${pings}`);
  raw.destroyed = true; raw.emit('close');
  assert.equal(sse.activeSseHeartbeats(), before);
  const n = raw.out.length;
  await tick(60);
  assert.equal(raw.out.length, n);
  sse.setSseHeartbeatMs(null);
});

test('agentic stream: a client close during a tool step aborts the turn (no further model calls)', async () => {
  slowToolMs = 150;
  claudeQueue.length = 0;
  claudeQueue.push(
    { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'tu_2', name: 'x_slow', input: {} }], usage: { input_tokens: 1, output_tokens: 1 } },
    { stop_reason: 'end_turn', content: [{ type: 'text', text: 'never sent' }], usage: { input_tokens: 1, output_tokens: 1 } },
  );
  const raw = fakeRaw();
  const policy = { kind: 'channel', channel: 'test', conversationId: 'c', allowedDestinations: [], allowedTools: new Set(['x_slow']) };
  setTimeout(() => { raw.destroyed = true; raw.emit('close'); }, 50);
  await muted(() => streamChatClaude(fakeReply(raw), 'test-key-not-real', 'claude-test', [{ role: 'user', content: 'go' }], 'sys',
    [{ name: 'x_slow', description: 'slow step', input_schema: { type: 'object', properties: {} } }], 0.5,
    's-owner', 'sse-1', undefined, policy, 's-agent'));
  assert.equal(claudeQueue.length, 1, 'the second model call was not made');
  assert.ok(!raw.out.some((w) => w.includes('never sent')));
  assert.equal(raw.writableEnded, true);
  claudeQueue.length = 0;
});

// --- 6. Ollama path ------------------------------------------------------------

test('Ollama stream error: one typed error event, no upstream text in the body or the logs', async () => {
  idem.resetChatIdempotency();
  for (const mode of ['error', 'refused']) {
    ollamaMode = mode;
    logged.length = 0;
    const res = await chat({ messages: [{ role: 'user', content: 'hello' }], chatContext: { sessionType: 'full' } });
    assert.equal(res.statusCode, 200, 'the stream was already open');
    assert.match(res.headers['content-type'], /text\/event-stream/);
    assert.ok(!res.body.includes('UPSTREAM-SECRET'), res.body);
    assert.ok(!res.body.includes('ECONNREFUSED'));
    const fs = dataFrames(res.body);
    assert.equal(fs.length, 1);
    assert.equal(fs[0].type, 'error');
    assert.equal(fs[0].error, 'Chat request failed');
    assert.equal(fs[0].code, 'model_unavailable');
    assert.ok(fs[0].runId && fs[0].messageId);
    assert.ok(!logged.some((l) => l.includes('UPSTREAM-SECRET')), 'upstream text is not logged');
    assert.ok(!logged.some((l) => l.includes('sessionType')), 'chat context is not logged');
  }
  // Non-stream: 502 with a generic body.
  ollamaMode = 'error';
  const ns = await chat({ stream: false, messages: [{ role: 'user', content: 'hello' }] });
  assert.equal(ns.statusCode, 502);
  assert.equal(ns.json().code, 'model_unavailable');
  assert.ok(!ns.body.includes('UPSTREAM-SECRET'));
  ollamaMode = 'ok';
});

test('Ollama stream: SSE headers reach the client before Ollama is contacted', async () => {
  idem.resetChatIdempotency();
  await app.listen({ host: '127.0.0.1', port: 0 });
  const { port } = app.server.address();
  let gotHeaders = false;
  let headersBeforeUpstream = null;
  let onHeaders;
  const headersSeen = new Promise((r) => { onHeaders = r; });
  beforeOllama = async () => {
    // Wait (bounded) for the client to receive the response headers.
    await Promise.race([headersSeen, tick(2000)]);
    headersBeforeUpstream = gotHeaders;
  };
  ollamaMode = 'ok';
  const body = JSON.stringify({ agentId: 's-agent', sessionId: 'sse-1', stream: true, messages: [{ role: 'user', content: 'hi' }] });
  const result = await muted(() => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: '/api/chat', method: 'POST',
      headers: { ...bearer('s-owner'), 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } }, (res) => {
      gotHeaders = true; onHeaders();
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { text += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }));
    });
    req.on('error', reject);
    req.end(body);
  }));
  beforeOllama = null;
  assert.equal(headersBeforeUpstream, true, 'headers were flushed before the model was contacted');
  assert.equal(result.status, 200);
  assert.match(result.headers['content-type'], /text\/event-stream/);
  assert.ok(result.headers['x-run-id']);
  assert.equal(dataFrames(result.text).at(-1).done, true);
});

// --- 7. CSRF wildcard ----------------------------------------------------------

test('CSRF wildcard: dots are literal and * is one leftmost host label', async () => {
  const p = 'http://*.example.com';
  assert.equal(wildcardOriginMatches(p, 'http://app.example.com'), true);
  assert.equal(wildcardOriginMatches(p, 'http://a-1.example.com'), true);
  assert.equal(wildcardOriginMatches(p, 'http://evil-example.com'), false);
  assert.equal(wildcardOriginMatches(p, 'http://aexample.com'), false);
  assert.equal(wildcardOriginMatches(p, 'http://appXexample.com'), false);
  assert.equal(wildcardOriginMatches(p, 'http://a.b.example.com'), false, 'one label only');
  assert.equal(wildcardOriginMatches(p, 'http://.example.com'), false);
  assert.equal(wildcardOriginMatches(p, 'https://app.example.com'), false, 'scheme is literal');
  assert.equal(wildcardOriginMatches(p, 'http://app.example.com.evil.test'), false);
  assert.equal(wildcardOriginMatches(p, 'http://app.example.com:8080'), false, 'port is literal');
  assert.equal(wildcardOriginMatches('http://*.example.com:3000', 'http://app.example.com:3000'), true);
  assert.equal(wildcardOriginMatches('http://*.example.com:3000', 'http://app.example.com:3001'), false);
  // Wildcards anywhere else never match.
  for (const bad of ['http://*', 'http://app*.example.com', 'http://app.*.com', '*://app.example.com', 'http://*.example.com:*', 'http://*.*.com']) {
    assert.equal(wildcardOriginMatches(bad, 'http://app.example.com'), false, bad);
    assert.equal(wildcardOriginMatches(bad, 'http://anything'), false, bad);
  }

  // Through the middleware.
  const saved = process.env.ALLOWED_ORIGINS;
  process.env.ALLOWED_ORIGINS = 'http://localhost:41522,http://*.example.com';
  const run = async (origin) => {
    let code = null;
    const reply = { code(c) { code = c; return this; }, send() { return this; } };
    await muted(() => csrfProtection({ method: 'POST', headers: { origin }, hostname: 'api.test', ip: '10.0.0.5', url: '/api/x' }, reply));
    return code;
  };
  try {
    assert.equal(await run('http://app.example.com'), null);
    assert.equal(await run('http://localhost:41522'), null);
    assert.equal(await run('http://evil-example.com'), 403);
    assert.equal(await run('http://aexample.com'), 403);
  } finally {
    if (saved === undefined) delete process.env.ALLOWED_ORIGINS; else process.env.ALLOWED_ORIGINS = saved;
  }
});
