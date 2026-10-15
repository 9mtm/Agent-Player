// CHAT-REBUILD-01: saved conversations and runs that outlive the page.
//  - a run streams numbered events (reasoning, tools, text, end) and stores the
//    user and assistant turns with their work; the first message names the chat;
//  - a reader can re-attach with after=N; Stop keeps the partial reply ("stopped");
//  - the model gets the stored history, not a client-sent one;
//  - other users get 404; a guest is refused; a busy chat answers 409; a repeated
//    runId does not run twice.
// Throwaway DB/keys; the local model is stubbed (no network).
// Run: node --import tsx --test test/chat-runs.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-chat-runs-'));
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

// --- stubbed local model: a queue of scripted replies (NDJSON lines) ---------
const script = [];
const bodies = [];
let hold = null; // when set, the next reply waits for hold.release()
globalThis.fetch = async (url, init = {}) => {
  if (String(url) !== 'http://127.0.0.1:11434/api/chat') throw new Error(`unexpected network call in test: ${url}`);
  bodies.push(JSON.parse(init.body));
  const lines = script.shift() ?? [{ message: { content: 'ok' }, done: true }];
  const enc = new TextEncoder();
  const h = hold;
  return new Response(new ReadableStream({
    async start(c) {
      c.enqueue(enc.encode(JSON.stringify(lines[0]) + '\n'));
      if (h) await new Promise((r) => { h.release = r; init.signal?.addEventListener('abort', r); });
      if (init.signal?.aborted) { c.error(new DOMException('aborted', 'AbortError')); return; }
      for (const l of lines.slice(1)) c.enqueue(enc.encode(JSON.stringify(l) + '\n'));
      c.close();
    },
  }), { status: 200 });
};

const capture = () => {};
console.log = capture; console.info = capture; console.warn = capture;

const { getDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const { getCredentialStorage } = await import(join(backendDir, 'src/credentials/storage.ts'));
await getCredentialStorage().initialize();
const { getOrchestrator } = await import(join(backendDir, 'src/multi-agent/index.ts'));
await getOrchestrator().initialize(join(dir, '.data', 'multi-agent', 'orchestrator.db'));
for (const [id, role] of [['r-owner', 'owner'], ['r-other', 'user'], ['r-guest', 'guest']]) {
  db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status, email_verified) VALUES (?, ?, ?, 'x', ?, 'active', 1)`).run(id, `${id}@example.test`, id, role);
}
db.prepare(`INSERT INTO agents_config (id, name, provider, model, is_primary) VALUES ('r-agent', 'Run Agent', 'ollama', 'qwen-test', 1)`).run();
db.prepare(`INSERT INTO agents_config (id, name, provider, model, is_primary) VALUES ('r-claude', 'Claude Agent', 'claude', 'claude-sonnet-test', 0)`).run();

const tools = await import(join(backendDir, 'src/tools/index.ts'));
const grants = await import(join(backendDir, 'src/tools/grants.ts'));
const echoed = [];
tools.registerExtensionTool({ name: 'x_echo', description: 'echo', extensionId: 'x', requiresApproval: false,
  input_schema: { type: 'object', properties: { text: { type: 'string' } } },
  execute: async (p) => { echoed.push(p.text); return { content: [{ type: 'text', text: `echo: ${p.text}` }] }; } });
const avail = tools.createToolsRegistry({ workspaceDir: dir }).listRegistered();
await grants.setAgentGrants('r-agent', { grants: ['x_echo'] }, 'r-owner', avail);

const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { buildServer } = await import(join(backendDir, 'src/api/app.ts'));
const { chatRuns } = await import(join(backendDir, 'src/services/chat-runs.ts'));
const { historyFor } = await import(join(backendDir, 'src/api/routes/chat-conversations.ts'));
const app = await buildServer({ logger: false });
await app.ready();
const as = (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` });
const call = (user, method, url, payload) => app.inject({ method, url, headers: as(user), ...(payload ? { payload } : {}) });
const frames = (body) => body.split('\n\n').filter((b) => b.includes('data:')).map((b) => JSON.parse(b.split('\n').find((l) => l.startsWith('data:')).slice(5)));
const ended = (runId) => new Promise((r) => { const run = chatRuns.get(runId); if (run.status !== 'running') r(); else run.emitter.once('end', r); });
const rid = () => `run-${randomBytes(6).toString('hex')}`;

test('a run streams reasoning, tools and text, then stores both turns with their work', async () => {
  const c = (await call('r-owner', 'POST', '/api/chat/conversations', {})).json().conversation;
  script.push(
    [{ message: { thinking: 'I should echo.' } }, { message: { content: '', tool_calls: [{ function: { name: 'x_echo', arguments: { text: 'hi' } } }] } }, { done: true }],
    [{ message: { content: 'All ' } }, { message: { content: 'done.' } }, { done: true }],
  );
  const runId = rid();
  const start = await call('r-owner', 'POST', `/api/chat/conversations/${c.id}/runs`, { runId, message: 'Echo hi please\nsecond line' });
  assert.equal(start.statusCode, 202);
  await ended(runId);
  const ev = frames((await call('r-owner', 'GET', `/api/chat/runs/${runId}/events`)).body);
  assert.deepEqual(ev.map((f) => f.type), ['reasoning', 'tool_start', 'tool_result', 'text', 'text', 'end']);
  assert.deepEqual(ev.map((f) => f.seq), [1, 2, 3, 4, 5, 6]);
  assert.ok(ev.every((f) => Number.isFinite(f.at) && f.at >= 0), 'every event carries its time since the run started');
  assert.equal(ev[1].tools[0].name, 'x_echo');
  assert.equal(ev[2].results[0].output, 'echo: hi');
  assert.equal(ev.at(-1).status, 'complete');
  assert.deepEqual(echoed, ['hi']);

  const after = frames((await call('r-owner', 'GET', `/api/chat/runs/${runId}/events?after=4`)).body);
  assert.deepEqual(after.map((f) => f.seq), [5, 6]);

  const m = (await call('r-owner', 'GET', `/api/chat/conversations/${c.id}/messages`)).json();
  assert.equal(m.conversation.title, 'Echo hi please');
  assert.equal(m.activeRunId, null);
  assert.deepEqual(m.messages.map((x) => [x.role, x.content, x.status]), [['user', 'Echo hi please\nsecond line', 'complete'], ['assistant', 'All done.', 'complete']]);
  assert.deepEqual(m.messages[1].parts.map((p) => p.kind), ['reasoning', 'tools', 'text']);
  assert.ok(Number.isFinite(m.messages[1].parts[0].ms), 'the thinking time is stored');
  assert.equal(m.messages[1].parts[1].calls[0].output, 'echo: hi');
  assert.ok(m.messages[1].durationMs >= 0);

  // The next turn gives the model the stored history (not anything from the client).
  script.push([{ message: { content: 'Second.' } }, { done: true }]);
  const r2 = rid();
  bodies.length = 0;
  await call('r-owner', 'POST', `/api/chat/conversations/${c.id}/runs`, { runId: r2, message: 'And again' });
  await ended(r2);
  const sent = bodies[0].messages.filter((x) => x.role !== 'system').map((x) => [x.role, x.content]);
  assert.deepEqual(sent, [['user', 'Echo hi please\nsecond line'], ['assistant', 'All done.'], ['user', 'And again']]);
  // Repeating a finished runId does not run it again.
  const again = await call('r-owner', 'POST', `/api/chat/conversations/${c.id}/runs`, { runId: r2, message: 'And again' });
  assert.equal(again.statusCode, 202);
  assert.equal(again.json().replayed, true);
  assert.equal((await call('r-owner', 'GET', `/api/chat/conversations/${c.id}/messages`)).json().messages.length, 4);
});

test('Stop keeps the partial reply as stopped; a busy chat refuses a second run', async () => {
  const c = (await call('r-owner', 'POST', '/api/chat/conversations', { title: 'Long one' })).json().conversation;
  hold = {};
  script.push([{ message: { content: 'Partial answer' } }, { message: { content: ' never sent' } }, { done: true }]);
  const runId = rid();
  await call('r-owner', 'POST', `/api/chat/conversations/${c.id}/runs`, { runId, message: 'Write a lot' });
  const h = hold;
  for (let i = 0; i < 400 && !h.release; i++) await new Promise((r) => setTimeout(r, 5));
  hold = null;
  assert.ok(h.release, 'the model was reached');
  const list = (await call('r-owner', 'GET', `/api/chat/conversations/${c.id}/messages`)).json();
  assert.equal(list.activeRunId, runId);
  const busy = await call('r-owner', 'POST', `/api/chat/conversations/${c.id}/runs`, { runId: rid(), message: 'more' });
  assert.equal(busy.statusCode, 409);
  assert.equal(busy.json().code, 'conversation_busy');
  assert.equal((await call('r-other', 'POST', `/api/chat/runs/${runId}/stop`)).statusCode, 404);
  assert.equal((await call('r-owner', 'POST', `/api/chat/runs/${runId}/stop`)).statusCode, 200);
  await ended(runId);
  const m = (await call('r-owner', 'GET', `/api/chat/conversations/${c.id}/messages`)).json();
  assert.equal(m.conversation.title, 'Long one'); // a given title is kept
  assert.deepEqual([m.messages[1].content, m.messages[1].status], ['Partial answer', 'stopped']);
  const ev = frames((await call('r-owner', 'GET', `/api/chat/runs/${runId}/events`)).body);
  assert.equal(ev.at(-1).status, 'stopped');
});

test('conversations are private; guests are refused; inputs are checked', async () => {
  const c = (await call('r-owner', 'POST', '/api/chat/conversations', {})).json().conversation;
  for (const [m, u, p] of [['GET', `/api/chat/conversations/${c.id}/messages`], ['PUT', `/api/chat/conversations/${c.id}`, { title: 'x' }],
    ['DELETE', `/api/chat/conversations/${c.id}`], ['POST', `/api/chat/conversations/${c.id}/runs`, { runId: rid(), message: 'hi' }]]) {
    assert.equal((await call('r-other', m, u, p)).statusCode, 404, `${m} ${u}`);
  }
  assert.equal((await call('r-other', 'GET', '/api/chat/conversations')).json().conversations.length, 0);
  assert.equal((await call('r-guest', 'GET', '/api/chat/conversations')).statusCode >= 401, true);
  assert.equal((await app.inject({ method: 'GET', url: '/api/chat/conversations' })).statusCode, 401);
  assert.equal((await call('r-owner', 'POST', `/api/chat/conversations/${c.id}/runs`, { runId: 'short', message: 'hi' })).statusCode, 400);
  assert.equal((await call('r-owner', 'POST', `/api/chat/conversations/${c.id}/runs`, { runId: rid(), message: '   ' })).statusCode, 400);
  // Rename, pin (pinned first), delete.
  const d = (await call('r-owner', 'POST', '/api/chat/conversations', { title: 'Pin me' })).json().conversation;
  assert.equal((await call('r-owner', 'PUT', `/api/chat/conversations/${d.id}`, { pinned: true, title: 'Pinned' })).json().conversation.pinned, true);
  assert.equal((await call('r-owner', 'GET', '/api/chat/conversations')).json().conversations[0].title, 'Pinned');
  assert.equal((await call('r-owner', 'DELETE', `/api/chat/conversations/${d.id}`)).statusCode, 200);
  assert.equal((await call('r-owner', 'GET', `/api/chat/conversations/${d.id}/messages`)).statusCode, 404);
});

test('historyFor keeps the newest turns within budget and starts with the user', () => {
  const msg = (role, content, status = 'complete') => ({ role, content, status });
  const h = historyFor([msg('assistant', 'orphan'), msg('user', 'a'.repeat(50)), msg('assistant', 'b'.repeat(50)), msg('user', 'c'.repeat(50)), msg('assistant', 'part', 'stopped'), msg('user', 'now')], 120);
  assert.deepEqual(h.map((t) => t.role), ['user', 'assistant', 'user']);
  assert.match(h[1].content, /stopped by the user/);
  assert.equal(h.at(-1).content, 'now');
});

test('an agent set to Claude with no key answers with the local model', async () => {
  const c = (await call('r-owner', 'POST', '/api/chat/conversations', { agentId: 'r-claude' })).json().conversation;
  script.push([{ message: { content: 'Local answer.' } }, { done: true }]);
  bodies.length = 0;
  const runId = rid();
  await call('r-owner', 'POST', `/api/chat/conversations/${c.id}/runs`, { runId, message: 'hello' });
  await ended(runId);
  assert.equal(bodies[0].model, 'qwen3.8:27b');
  const m = (await call('r-owner', 'GET', `/api/chat/conversations/${c.id}/messages`)).json();
  assert.equal(m.messages.at(-1).content, 'Local answer.');
});

test('a run can pick a local model; a bad model id is refused', async () => {
  const c = (await call('r-owner', 'POST', '/api/chat/conversations', { agentId: 'r-claude' })).json().conversation;
  script.push([{ message: { content: 'From the picked model.' } }, { done: true }]);
  bodies.length = 0;
  const runId = rid();
  const r = await call('r-owner', 'POST', `/api/chat/conversations/${c.id}/runs`, { runId, message: 'hi', model: 'llama3.2:3b' });
  assert.equal(r.statusCode, 202);
  await ended(runId);
  assert.equal(bodies[0].model, 'llama3.2:3b', 'the picked local model is used even for an agent set to Claude');
  assert.equal((await call('r-owner', 'POST', `/api/chat/conversations/${c.id}/runs`, { runId: rid(), message: 'x', model: '../x' })).statusCode, 400);
});
