// CHAT-PRO-02 F: export a conversation as Markdown.
//  - own conversation only (other users' and unknown ids: 404); signed in only;
//  - title, date, project, agent, each turn with its writer; tool calls only with tools=1;
//  - secrets redacted; size cap keeps the first turns; safe file name.
// Throwaway DB/keys; no network.
// Run: node --import tsx --test test/chat-export.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-chat-export-'));
mkdirSync(join(dir, '.data', 'multi-agent'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.AGENT_PLAYER_CONFIG_DIR = join(dir, 'cli-config');
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
process.env.NODE_ENV = 'test';
globalThis.fetch = async (url) => { throw new Error(`unexpected network call in test: ${url}`); };
const quiet = () => {};
console.log = quiet; console.info = quiet; console.warn = quiet;

const { getDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const { getCredentialStorage } = await import(join(backendDir, 'src/credentials/storage.ts'));
await getCredentialStorage().initialize();
const { getOrchestrator } = await import(join(backendDir, 'src/multi-agent/index.ts'));
await getOrchestrator().initialize(join(dir, '.data', 'multi-agent', 'orchestrator.db'));
for (const [id, role] of [['ce-owner', 'owner'], ['ce-user', 'user']]) {
  db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status, email_verified) VALUES (?, ?, ?, 'x', ?, 'active', 1)`).run(id, `${id}@example.test`, id, role);
}

const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { buildServer } = await import(join(backendDir, 'src/api/app.ts'));
const { addUserMessage, addAssistantMessage, createProject } = await import(join(backendDir, 'src/repositories/chat-conversations.ts'));
const { exportConversation, exportFilename } = await import(join(backendDir, 'src/services/chat-export.ts'));
const { STAGE3_ROUTES } = await import(join(backendDir, 'src/api/read-only-stage.ts'));
const app = await buildServer({ logger: false });
await app.ready();
const as = (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` });
const call = (user, method, url, payload) => app.inject({ method, url, headers: as(user), ...(payload ? { payload } : {}) });

const project = await createProject('ce-owner', { name: 'Launch site' });
const mine = (await call('ce-owner', 'POST', '/api/chat/conversations', { title: 'Deploy: notes / plan', projectId: project.id })).json().conversation;
const theirs = (await call('ce-user', 'POST', '/api/chat/conversations', { title: 'Private' })).json().conversation;
const fakeToken = 'ghp_' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8';
await addUserMessage(mine.id, `How do we deploy? My token is ${fakeToken}`, 'run-ce-0001');
await addAssistantMessage(mine.id, {
  runId: 'run-ce-0001', content: 'Run the **deploy** script.\n\n```sh\nnpm run deploy\n```', status: 'complete', durationMs: 1200,
  parts: [
    { kind: 'reasoning', text: 'SECRET THINKING should never be exported' },
    { kind: 'tools', step: 1, calls: [{ id: 't1', name: 'read', input: '{"path":"README.md"}', output: 'file text', ms: 40 }, { id: 't2', name: 'bash', input: '<script>x</script>', isError: true }] },
    { kind: 'text', text: 'Run the **deploy** script.' },
  ],
});
await addUserMessage(theirs.id, 'not yours', 'run-ce-0002');

test('signed in, own conversation only; unknown options refused', async () => {
  assert.equal((await app.inject({ method: 'GET', url: `/api/chat/conversations/${mine.id}/export` })).statusCode, 401);
  assert.equal((await call('ce-user', 'GET', `/api/chat/conversations/${mine.id}/export`)).statusCode, 404);
  assert.equal((await call('ce-owner', 'GET', `/api/chat/conversations/${theirs.id}/export`)).statusCode, 404);
  assert.equal((await call('ce-owner', 'GET', '/api/chat/conversations/nope-unknown-1/export')).statusCode, 404);
  assert.equal((await call('ce-owner', 'GET', `/api/chat/conversations/${mine.id}/export?tools=yes`)).statusCode, 400);
  assert.equal((await call('ce-owner', 'GET', `/api/chat/conversations/${mine.id}/export?x=1`)).statusCode, 400);
  assert.ok(STAGE3_ROUTES.has('GET /api/chat/conversations/:id/export'));
});

test('Markdown: heading, project, writers, text; no tools or reasoning by default; secrets removed', async () => {
  const res = await call('ce-owner', 'GET', `/api/chat/conversations/${mine.id}/export`);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['cache-control'], 'no-store');
  const out = res.json();
  assert.equal(out.filename, 'Deploy notes plan.md');
  assert.match(out.markdown, /^# Deploy: notes \/ plan\n/);
  assert.match(out.markdown, /- Project: Launch site/);
  assert.match(out.markdown, /### You · /);
  assert.match(out.markdown, /### Main agent · /);
  assert.match(out.markdown, /```sh\nnpm run deploy\n```/);
  assert.ok(!out.markdown.includes(fakeToken));
  assert.match(out.markdown, /\[REDACTED:github_token\]/);
  assert.ok(!out.markdown.includes('Tool calls'));
  assert.ok(!out.markdown.includes('SECRET THINKING'));
  assert.equal(out.redacted, 1);
  assert.equal(out.turns, 2);
  assert.equal(out.truncated, false);
});

test('tools=1 adds a collapsed tool summary with escaped input', async () => {
  const out = (await call('ce-owner', 'GET', `/api/chat/conversations/${mine.id}/export?tools=1`)).json();
  assert.match(out.markdown, /<details>\n<summary>Tool calls \(2\)<\/summary>/);
  assert.match(out.markdown, /- `read` — ok, 0\.0 s: \{"path":"README\.md"\}/);
  assert.match(out.markdown, /- `bash` — error: &lt;script&gt;x&lt;\/script&gt;/);
  assert.ok(!out.markdown.includes('<script>'));
});

test('size cap keeps the first turns and says so', async () => {
  const out = await exportConversation('ce-owner', mine.id, { maxBytes: 500 });
  assert.equal(out.truncated, true);
  assert.equal(out.totalTurns, 2);
  assert.ok(out.turns < 2);
  assert.match(out.markdown, /Export cut: \d of 2 turns/);
  assert.equal(await exportConversation('ce-user', mine.id), null);
});

test('file names are safe in any script', () => {
  assert.equal(exportFilename('../../etc/passwd'), 'etc passwd.md');
  assert.equal(exportFilename('خطة النشر: الجمعة'), 'خطة النشر الجمعة.md');
  assert.equal(exportFilename(null), 'conversation.md');
  assert.equal(exportFilename('   ...  '), 'conversation.md');
  assert.ok(exportFilename('x'.repeat(300)).length <= 83);
});
