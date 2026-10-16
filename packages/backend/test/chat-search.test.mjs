// CHAT-PRO-02 D: search inside conversations.
//  - a signed-in user searches only their own conversations (titles, user messages, agent replies);
//  - % and _ match literally; case-insensitive; the query is 2-200 characters;
//  - optional project filter (own projects only), newest first, capped, snippets with offsets.
// Throwaway DB/keys; no network.
// Run: node --import tsx --test test/chat-search.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-chat-search-'));
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
for (const [id, role] of [['cs-owner', 'owner'], ['cs-user', 'user']]) {
  db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status, email_verified) VALUES (?, ?, ?, 'x', ?, 'active', 1)`).run(id, `${id}@example.test`, id, role);
}

const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { buildServer } = await import(join(backendDir, 'src/api/app.ts'));
const { addUserMessage, addAssistantMessage, createProject } = await import(join(backendDir, 'src/repositories/chat-conversations.ts'));
const { snippetFor, likePattern } = await import(join(backendDir, 'src/services/chat-search.ts'));
const { STAGE3_ROUTES } = await import(join(backendDir, 'src/api/read-only-stage.ts'));
const app = await buildServer({ logger: false });
await app.ready();
const as = (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` });
const call = (user, method, url, payload) => app.inject({ method, url, headers: as(user), ...(payload ? { payload } : {}) });
const search = (user, params) => call(user, 'GET', `/api/chat/search?${new URLSearchParams(params)}`);
const at = (id, when) => db.prepare('UPDATE chat_messages SET created_at = ? WHERE id = ?').run(when, id);

const project = await createProject('cs-owner', { name: 'Launch site' });
const older = (await call('cs-owner', 'POST', '/api/chat/conversations', { title: 'Deploy notes' })).json().conversation;
const newer = (await call('cs-owner', 'POST', '/api/chat/conversations', { title: 'Pricing', projectId: project.id })).json().conversation;
const theirs = (await call('cs-user', 'POST', '/api/chat/conversations', { title: 'Deploy secrets' })).json().conversation;

const u1 = await addUserMessage(older.id, 'How do we deploy the website on Friday?', 'run-cs-0001');
const a1 = await addAssistantMessage(older.id, { runId: 'run-cs-0001', content: 'Run the DEPLOY script, then check 100% of pages and the my_site folder.', parts: [], status: 'complete', durationMs: 5 });
const u2 = await addUserMessage(newer.id, 'Can the deploy wait for the pricing page?', 'run-cs-0002');
const a2 = await addAssistantMessage(newer.id, { runId: 'run-cs-0002', content: 'نعم، نؤجل النشر deploy حتى صفحة الأسعار.', parts: [], status: 'complete', durationMs: 5 });
await addUserMessage(theirs.id, 'deploy key is here', 'run-cs-0003');
at(u1.id, '2026-10-10 10:00:00'); at(a1.id, '2026-10-10 10:00:05');
at(u2.id, '2026-10-12 10:00:00'); at(a2.id, '2026-10-12 10:00:05');
db.prepare("UPDATE chat_sessions SET updated_at = '2026-10-10 10:00:05' WHERE id = ?").run(older.id);
db.prepare("UPDATE chat_sessions SET updated_at = '2026-10-12 10:00:05' WHERE id = ?").run(newer.id);

test('signed in only; other users\' conversations are never searched', async () => {
  assert.equal((await app.inject({ method: 'GET', url: '/api/chat/search?q=deploy' })).statusCode, 401);
  const mine = (await search('cs-owner', { q: 'deploy' })).json();
  assert.ok(mine.results.every((r) => r.conversationId !== theirs.id));
  const other = (await search('cs-user', { q: 'deploy' })).json();
  assert.deepEqual(other.results.map((r) => r.conversationId), [theirs.id]);
});

test('titles, user messages and agent replies match case-insensitively, newest conversation first', async () => {
  const r = (await search('cs-owner', { q: 'DePlOy' })).json();
  assert.equal(r.query, 'DePlOy');
  assert.deepEqual(r.results.map((g) => g.conversationId), [newer.id, older.id]);
  const old = r.results[1];
  assert.equal(old.title, 'Deploy notes');
  assert.deepEqual(old.hits.map((h) => h.kind), ['title', 'assistant', 'user']);
  assert.equal(old.matchCount, 2);
  assert.equal(old.hits[1].messageId, a1.id);
  for (const h of r.results.flatMap((g) => g.hits)) {
    assert.ok(h.ranges.length >= 1);
    for (const [s, e] of h.ranges) assert.equal(h.snippet.slice(s, e).toLowerCase(), 'deploy');
    assert.ok(!/[<>]/.test(h.snippet));
  }
  assert.equal(r.truncated, false);
});

test('% and _ match literally', async () => {
  const pct = (await search('cs-owner', { q: '0%' })).json();
  assert.deepEqual(pct.results.map((g) => g.conversationId), [older.id]);
  assert.equal((await search('cs-owner', { q: '%%' })).json().results.length, 0);
  assert.equal((await search('cs-owner', { q: 'my_s' })).json().results.length, 1);
  assert.equal((await search('cs-owner', { q: 'my%s' })).json().results.length, 0);
  assert.equal((await search('cs-owner', { q: 'y_' })).json().results.length, 1);
  assert.equal((await search('cs-owner', { q: '__' })).json().results.length, 0);
  assert.equal(likePattern('a\\b%_'), '%a\\\\b\\%\\_%');
});

test('Arabic text, project filter and the limit', async () => {
  const ar = (await search('cs-owner', { q: 'الأسعار' })).json();
  assert.equal(ar.results.length, 1);
  assert.equal(ar.results[0].hits[0].messageId, a2.id);
  const inProject = (await search('cs-owner', { q: 'deploy', projectId: project.id })).json();
  assert.deepEqual(inProject.results.map((g) => g.conversationId), [newer.id]);
  assert.equal(inProject.results[0].projectId, project.id);
  const capped = (await search('cs-owner', { q: 'deploy', limit: '1' })).json();
  assert.equal(capped.truncated, true);
  assert.equal(capped.results.flatMap((g) => g.hits).filter((h) => h.kind !== 'title').length, 1);
});

test('bad input answers 400', async () => {
  for (const params of [{}, { q: 'a' }, { q: '  a  ' }, { q: 'x'.repeat(201) }, { q: 'deploy', limit: '0' }, { q: 'deploy', limit: '201' }, { q: 'deploy', limit: 'ten' }, { q: 'deploy', other: '1' }]) {
    assert.equal((await search('cs-owner', params)).statusCode, 400, JSON.stringify(params).slice(0, 60));
  }
  // Someone else's project is unknown.
  const theirProject = await createProject('cs-user', { name: 'Theirs' });
  assert.equal((await search('cs-owner', { q: 'deploy', projectId: theirProject.id })).statusCode, 400);
  assert.equal((await search('cs-owner', { q: 'x'.repeat(200) })).statusCode, 200);
});

test('snippets cut around the match with offsets', () => {
  const long = `${'word '.repeat(40)}the NEEDLE is here ${'tail '.repeat(60)}`;
  const s = snippetFor(long, 'needle');
  assert.ok(s.snippet.startsWith('…') && s.snippet.endsWith('…'));
  assert.ok(s.snippet.length < 200);
  assert.equal(s.snippet.slice(...s.ranges[0]), 'NEEDLE');
  assert.equal(snippetFor('line one\n\n  line two', 'one line').snippet, 'line one line two');
  assert.equal(snippetFor('nothing here', 'needle'), null);
  // A surrogate pair is never cut.
  const emoji = `${'😀'.repeat(60)}needle${'😀'.repeat(80)}`;
  const e = snippetFor(emoji, 'needle');
  assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(e.snippet));
});

test('the isolated test stage allows the search route', () => {
  assert.ok(STAGE3_ROUTES.has('GET /api/chat/search'));
});
