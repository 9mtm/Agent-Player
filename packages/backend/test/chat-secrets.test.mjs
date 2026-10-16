// CHAT-SECRETS-01: a secret typed in the chat goes encrypted into the key store.
//  - the raw value never reaches chat_messages, the title, the run events,
//    the model's history, search, export or the credentials JSON backup;
//  - it is in the credentials table encrypted (AES-256-GCM), owned by the user;
//  - a tool gets the value only through the reference, after the owner's
//    approval, for the owning user, and the result shows the reference again;
//  - the saved keys list/delete is per user; the cleanup of older messages
//    counts first and changes rows only when asked.
// Throwaway DB/keys; the local model is stubbed (no network).
// Run: node --import tsx --test test/chat-secrets.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-chat-secrets-'));
mkdirSync(join(dir, '.data', 'multi-agent'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.AGENT_PLAYER_CONFIG_DIR = join(dir, 'cli-config');
process.env.AGENT_PLAYER_DATA_DIR = join(dir, '.data');
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
process.env.NODE_ENV = 'test';
process.env.OLLAMA_URL = 'http://127.0.0.1:11434';
for (const k of ['AGENT_EXEC_TOOLS', 'OLLAMA_THINK', 'DEFAULT_MODEL']) delete process.env[k];

const script = [];
const bodies = [];
globalThis.fetch = async (url, init = {}) => {
  if (String(url) !== 'http://127.0.0.1:11434/api/chat') throw new Error(`unexpected network call in test: ${url}`);
  bodies.push(init.body);
  const lines = script.shift() ?? [{ message: { content: 'ok' }, done: true }];
  const enc = new TextEncoder();
  return new Response(new ReadableStream({ start(c) { for (const l of lines) c.enqueue(enc.encode(JSON.stringify(l) + '\n')); c.close(); } }), { status: 200 });
};
const logged = [];
const capture = (...a) => { logged.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')); };
console.log = capture; console.info = capture; console.warn = capture; console.error = capture;

const { getDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const { getCredentialStorage } = await import(join(backendDir, 'src/credentials/storage.ts'));
await getCredentialStorage().initialize();
const { getOrchestrator } = await import(join(backendDir, 'src/multi-agent/index.ts'));
await getOrchestrator().initialize(join(dir, '.data', 'multi-agent', 'orchestrator.db'));
for (const [id, role] of [['s-owner', 'owner'], ['s-other', 'user']]) {
  db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status, email_verified) VALUES (?, ?, ?, 'x', ?, 'active', 1)`).run(id, `${id}@example.test`, id, role);
}
db.prepare(`INSERT INTO agents_config (id, name, provider, model, is_primary) VALUES ('s-agent', 'Key Agent', 'ollama', 'qwen-test', 1)`).run();

const tools = await import(join(backendDir, 'src/tools/index.ts'));
const grants = await import(join(backendDir, 'src/tools/grants.ts'));
const approvals = await import(join(backendDir, 'src/tools/approvals.ts'));
const received = [];
tools.registerExtensionTool({ name: 'x_call_api', description: 'calls an API with a token', extensionId: 'x', requiresApproval: false,
  input_schema: { type: 'object', properties: { token: { type: 'string' } } },
  execute: async (p) => { received.push(p.token); return { content: [{ type: 'text', text: `called with ${p.token}` }] }; } });
const avail = tools.createToolsRegistry({ workspaceDir: dir }).listRegistered();
await grants.setAgentGrants('s-agent', { grants: ['x_call_api'] }, 's-owner', avail);

const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { buildServer } = await import(join(backendDir, 'src/api/app.ts'));
const { chatRuns } = await import(join(backendDir, 'src/services/chat-runs.ts'));
const { addUserMessage } = await import(join(backendDir, 'src/repositories/chat-conversations.ts'));
const { STAGE3_ROUTES } = await import(join(backendDir, 'src/api/read-only-stage.ts'));
const app = await buildServer({ logger: false });
await app.ready();
const as = (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` });
const call = (user, method, url, payload) => app.inject({ method, url, headers: as(user), ...(payload ? { payload } : {}) });
const ended = (runId) => new Promise((r) => { const run = chatRuns.get(runId); if (run.status !== 'running') r(); else run.emitter.once('end', r); });
const rid = () => `run-${randomBytes(6).toString('hex')}`;

const fakeToken = 'ghp_' + 'Z9y8X7w6V5u4T3s2R1q0P9o8N7m6L5k4J3i2';
const fakePassword = 'Hunter2-Very-Secret';
const REF = /\[SECRET:github_token:([a-z0-9]{6,32})\]/;
const allFiles = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? allFiles(p) : [p]; });

let conv; let refId;

test('sending: the token goes encrypted into the key store; the chat keeps a reference only', async () => {
  conv = (await call('s-owner', 'POST', '/api/chat/conversations', {})).json().conversation;
  script.push([{ message: { content: 'Saved, I will use the reference.' } }, { done: true }]);
  const runId = rid();
  const start = await call('s-owner', 'POST', `/api/chat/conversations/${conv.id}/runs`, { runId, message: `Use my token ${fakeToken} for the deploy, password: ${fakePassword}` });
  assert.equal(start.statusCode, 202);
  assert.equal(start.json().secretsSaved, 2);
  assert.ok(!start.body.includes(fakeToken));
  assert.match(start.json().userMessage.content, REF);
  refId = REF.exec(start.json().userMessage.content)[1];
  await ended(runId);

  // chat_messages and the title: references only.
  const rows = db.prepare('SELECT content, parts FROM chat_messages').all();
  const title = db.prepare('SELECT title FROM chat_sessions WHERE id = ?').get(conv.id).title;
  for (const text of [...rows.map((r) => `${r.content} ${r.parts ?? ''}`), title]) {
    assert.ok(!text.includes(fakeToken) && !text.includes(fakePassword), 'no raw secret is stored in the chat');
  }
  assert.match(rows[0].content, /password: \[SECRET:password:[a-z0-9]+\]/);
  // The model got the reference, never the value, plus the note on how to use it.
  assert.ok(bodies.length > 0);
  for (const b of bodies) assert.ok(!b.includes(fakeToken) && !b.includes(fakePassword));
  assert.match(bodies.at(-1), /encrypted key store/);
  // Run events, messages list, search, export: no raw value.
  for (const res of [
    await call('s-owner', 'GET', `/api/chat/runs/${runId}/events`),
    await call('s-owner', 'GET', `/api/chat/conversations/${conv.id}/messages`),
    await call('s-owner', 'GET', `/api/chat/search?q=deploy`),
    await call('s-owner', 'GET', `/api/chat/search?q=${encodeURIComponent(fakeToken.slice(0, 12))}`),
    await call('s-owner', 'GET', `/api/chat/conversations/${conv.id}/export?tools=1`),
  ]) {
    assert.equal(res.statusCode, 200, res.body);
    assert.ok(!res.body.includes(fakeToken) && !res.body.includes(fakePassword), res.body.slice(0, 200));
  }
  assert.equal((await call('s-owner', 'GET', `/api/chat/search?q=${encodeURIComponent(fakeToken.slice(0, 12))}`)).json().results?.length ?? 0, 0);
  assert.match((await call('s-owner', 'GET', `/api/chat/conversations/${conv.id}/export`)).json().markdown, REF);

  // The key store: encrypted, owned by the user, linked to the conversation.
  const cred = db.prepare("SELECT * FROM credentials WHERE name = ?").get(`chat:github_token:${refId}`);
  assert.ok(cred, 'the token is in the credentials table');
  assert.equal(cred.user_id, 's-owner');
  assert.equal(cred.skill_id, 'chat');
  assert.equal(cred.description, `chat:${conv.id}`);
  assert.ok(!JSON.stringify(cred).includes(fakeToken), 'stored encrypted');
  const { getCredentialManager } = await import(join(backendDir, 'src/credentials/manager.ts'));
  assert.equal(await getCredentialManager().getValue(cred.id), fakeToken, 'decrypts back to the value');
  // Nothing on disk or in the logs holds the value in plain text.
  for (const f of allFiles(join(dir, '.data')).filter((f) => !/\.db(-wal|-shm)?$/.test(f))) assert.ok(!readFileSync(f, 'utf8').includes(fakeToken), f);
  for (const f of allFiles(join(dir, '.data')).filter((f) => /\.db(-wal)?$/.test(f))) assert.ok(!readFileSync(f).includes(Buffer.from(fakeToken)), f);
  assert.ok(!logged.some((l) => l.includes(fakeToken) || l.includes(fakePassword)), 'never logged');
});

test('the saved keys list and delete are per user; values are never returned', async () => {
  const list = await call('s-owner', 'GET', '/api/chat/secrets');
  assert.equal(list.statusCode, 200);
  const secrets = list.json().secrets;
  assert.equal(secrets.length, 2);
  const gh = secrets.find((s) => s.type === 'github_token');
  assert.deepEqual([gh.id, gh.ref, gh.conversationId], [refId, `[SECRET:github_token:${refId}]`, conv.id]);
  assert.ok(!list.body.includes(fakeToken) && !list.body.includes(fakePassword));
  assert.equal((await call('s-other', 'GET', '/api/chat/secrets')).json().secrets.length, 0);
  assert.equal((await call('s-other', 'DELETE', `/api/chat/secrets/${refId}`)).statusCode, 404);
  assert.equal((await app.inject({ method: 'GET', url: '/api/chat/secrets' })).statusCode, 401);
  for (const r of ['GET /api/chat/secrets', 'DELETE /api/chat/secrets/:id', 'POST /api/chat/secrets/cleanup']) assert.ok(STAGE3_ROUTES.has(r), r);
});

test('a tool gets the value through the reference only after the owner approves; the result shows the reference', async () => {
  const ref = `[SECRET:github_token:${refId}]`;
  const reg = await tools.createAgentToolsRegistry({ workspaceDir: dir, userId: 's-owner', sessionId: conv.id, agentId: 's-agent' });
  const res = await reg.execute('x_call_api', { token: ref });
  assert.equal(res.details?.status, 'pending_approval', JSON.stringify(res));
  assert.deepEqual(received, [], 'not run before approval');
  const detail = await approvals.getApprovalDetail(res.details.approvalId);
  assert.ok(!JSON.stringify(detail).includes(fakeToken), 'the approval shows the reference');
  const { result } = await approvals.approveAndRun(detail.id, 's-owner', detail.paramsHash);
  assert.deepEqual(received, [fakeToken], 'the tool got the real value');
  assert.equal(result.content[0].text, `called with ${ref}`, 'the value is put back as the reference');
  // A failing tool that echoes the value: the error and the log show the reference.
  tools.registerExtensionTool({ name: 'x_fail_api', description: 'fails', extensionId: 'x', requiresApproval: false,
    input_schema: { type: 'object', properties: { token: { type: 'string' } } },
    execute: async (p) => { throw new Error(`bad token ${p.token}`); } });
  await grants.setAgentGrants('s-agent', { grants: ['x_call_api', 'x_fail_api'] }, 's-owner', tools.createToolsRegistry({ workspaceDir: dir }).listRegistered());
  const failing = await (await tools.createAgentToolsRegistry({ workspaceDir: dir, userId: 's-owner', sessionId: conv.id, agentId: 's-agent' })).execute('x_fail_api', { token: ref });
  const fd = await approvals.getApprovalDetail(failing.details.approvalId);
  const { result: fr } = await approvals.approveAndRun(fd.id, 's-owner', fd.paramsHash);
  assert.equal(fr.error, `bad token ${ref}`);
  assert.ok(!logged.some((l) => l.includes(fakeToken)), 'the raw error is not logged');
  // Another user's run, a channel turn, an unknown reference: never resolved.
  const other = await tools.createAgentToolsRegistry({ workspaceDir: dir, userId: 's-other', agentId: 's-agent' });
  const r2 = await other.execute('x_call_api', { token: ref });
  if (r2.details?.status === 'pending_approval') {
    const d2 = await approvals.getApprovalDetail(r2.details.approvalId);
    await approvals.approveAndRun(d2.id, 's-owner', d2.paramsHash);
  }
  assert.ok(!received.slice(1).includes(fakeToken), 'another user cannot use it');
  // Memory tools keep the reference as text (the value never lands in memory).
  const { resolveSecretRefs } = await import(join(backendDir, 'src/services/chat-secrets.ts'));
  assert.deepEqual((await resolveSecretRefs('s-other', { t: ref })).used, []);
  assert.deepEqual((await resolveSecretRefs('s-owner', { t: '[SECRET:github_token:zzzzzzzz]' })).used, []);
});

test('cleanup of older messages: counts first, moves only when asked, owner only', async () => {
  const old = (await call('s-owner', 'POST', '/api/chat/conversations', { title: `old ${fakeToken}` })).json().conversation;
  assert.equal(old.title, 'old [REDACTED:github_token]', 'a title never keeps a secret');
  db.prepare('UPDATE chat_sessions SET title = ? WHERE id = ?').run(`old ${fakeToken}`, old.id); // as saved before the fix
  await addUserMessage(old.id, `before the fix my key was ${fakeToken}`, 'run-old-00001');
  const dry = await call('s-owner', 'POST', '/api/chat/secrets/cleanup', { apply: false });
  assert.equal(dry.statusCode, 200);
  assert.deepEqual(dry.json().report, { conversations: 1, messages: 1, secrets: 2, applied: false });
  assert.ok(db.prepare('SELECT content FROM chat_messages WHERE session_id = ?').get(old.id).content.includes(fakeToken), 'a dry run changes nothing');
  assert.equal((await call('s-other', 'POST', '/api/chat/secrets/cleanup', { apply: true })).statusCode, 403);
  assert.equal((await call('s-owner', 'POST', '/api/chat/secrets/cleanup', {})).statusCode, 400);
  const done = await call('s-owner', 'POST', '/api/chat/secrets/cleanup', { apply: true });
  assert.equal(done.json().report.applied, true);
  const row = db.prepare('SELECT content FROM chat_messages WHERE session_id = ?').get(old.id).content;
  const title = db.prepare('SELECT title FROM chat_sessions WHERE id = ?').get(old.id).title;
  assert.ok(!row.includes(fakeToken) && !title.includes(fakeToken));
  assert.equal(REF.exec(row)[1], REF.exec(title)[1], 'one reference per value in a conversation');
  // The old value is not left readable in the database files (freed space zeroed, WAL emptied).
  for (const f of allFiles(join(dir, '.data')).filter((f) => /agent-player\.db(-wal)?$/.test(f))) assert.ok(!readFileSync(f).includes(Buffer.from(fakeToken)), f);
  assert.deepEqual((await call('s-owner', 'POST', '/api/chat/secrets/cleanup', { apply: false })).json().report.secrets, 0);
  // Delete one key: gone from the store, the reference stays in the chat.
  assert.equal((await call('s-owner', 'DELETE', `/api/chat/secrets/${refId}`)).statusCode, 200);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM credentials WHERE name = ?").get(`chat:github_token:${refId}`).n, 0);
});

test('the older POST /api/sessions/:id/messages also keeps references only', async () => {
  const c = (await call('s-owner', 'POST', '/api/chat/conversations', {})).json().conversation;
  const res = await call('s-owner', 'POST', `/api/sessions/${c.id}/messages`, { role: 'user', content: `token ${fakeToken}` });
  assert.equal(res.statusCode, 200, res.body);
  assert.ok(!res.body.includes(fakeToken));
  assert.match(db.prepare('SELECT content FROM chat_messages WHERE session_id = ?').get(c.id).content, REF);
});
