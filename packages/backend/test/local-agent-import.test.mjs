// MEM-IMPORT-01: conversations Claude Code and Codex saved on this computer ->
// secrets removed -> private archive -> a (fake) memory agent -> pending proposals.
// Run: node --import tsx --test test/local-agent-import.test.mjs
// Throwaway DB + HOME, fake logs, fake model, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-local-import-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex');
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex');
const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => { throw new Error(`unexpected network call in test: ${url}`); };
const quiet = { log: console.log, warn: console.warn };
console.log = () => {}; console.warn = () => {};

const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES ('li-owner', 'li@example.test', 'li', 'x', 'owner', 'active')`).run();
db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES ('li-user', 'lu@example.test', 'lu', 'x', 'user', 'active')`).run();
db.prepare('UPDATE agents_config SET is_primary = 0').run();
db.prepare(`INSERT INTO agents_config (id, name, is_primary) VALUES ('li-agent', 'Li Agent', 1)`).run();

const SECRET = `sk-ant-api03-${randomBytes(30).toString('hex')}`; // fake, test only
const app = join(dir, 'work', 'app'); mkdirSync(app, { recursive: true });
const claudeDir = join(dir, '.claude', 'projects', '-work-app'); mkdirSync(claudeDir, { recursive: true });
const line = (o) => JSON.stringify(o);
writeFileSync(join(claudeDir, 's1.jsonl'), [
  line({ type: 'user', cwd: app, timestamp: '2026-10-15T10:00:00Z', message: { role: 'user', content: `Always answer me in Arabic. My key is ${SECRET}` } }),
  line({ type: 'assistant', cwd: app, message: { role: 'assistant', content: [{ type: 'thinking', thinking: 'private' }, { type: 'text', text: 'Understood, Arabic it is.' }, { type: 'tool_use', name: 'Bash', input: {} }] } }),
  line({ type: 'user', cwd: app, message: { role: 'user', content: [{ type: 'tool_result', content: 'TOOL OUTPUT' }] } }),
  line({ type: 'user', cwd: app, isMeta: true, message: { role: 'user', content: '<system-reminder>injected</system-reminder>' } }),
  line({ type: 'user', cwd: app, isSidechain: true, message: { role: 'user', content: 'subagent text' } }),
].join('\n'));
const codexDir = join(dir, '.codex', 'sessions', '2026', '10', '16'); mkdirSync(codexDir, { recursive: true });
writeFileSync(join(codexDir, 'rollout-2026-10-16-x.jsonl'), [
  line({ type: 'session_meta', timestamp: '2026-10-16T09:00:00Z', payload: { cwd: '/elsewhere', id: 'x' } }),
  line({ type: 'response_item', payload: { type: 'message', role: 'developer', content: [{ type: 'input_text', text: 'developer rules' }] } }),
  line({ type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: '<environment_context>cwd</environment_context>' }] } }),
  line({ type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'We deploy on Fridays only.' }] } }),
  line({ type: 'response_item', payload: { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Noted.' }] } }),
].join('\n'));

const { listLocalSessions } = await import(join(backendDir, 'src/memory/import/local-agents.ts'));
const L = await import(join(backendDir, 'src/memory/import/local-import.ts'));
const { createProject } = await import(join(backendDir, 'src/repositories/chat-conversations.ts'));
const { registerAuthGate } = await import(join(backendDir, 'src/auth/auth-gate.ts'));
const { memoryImportRoutes } = await import(join(backendDir, 'src/api/routes/memory-import.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { default: Fastify } = await import('fastify');
const server = Fastify(); registerAuthGate(server); await server.register(memoryImportRoutes); await server.ready();
console.log = quiet.log; console.warn = quiet.warn;
test.after(async () => { globalThis.fetch = realFetch; await server.close(); closeDatabase(); rmSync(dir, { recursive: true, force: true }); });
const call = (method, url, payload, who = 'li-owner') => server.inject({ method, url, headers: { authorization: `Bearer ${generateToken(who, 1)}` }, payload });

test('the reader keeps only human and agent text; tool output, thinking, injected and sub-agent text stay out', async () => {
  const s = await listLocalSessions(dir);
  assert.deepEqual(s.map((x) => x.source).sort(), ['claude-code', 'codex']);
  const cc = s.find((x) => x.source === 'claude-code'); const cx = s.find((x) => x.source === 'codex');
  assert.equal(cc.cwd, app); assert.equal(cc.turns, 2);
  assert.equal(cx.cwd, '/elsewhere'); assert.match(cx.title, /deploy on Fridays/);
  assert.ok(!JSON.stringify(s).includes(dir + '/.claude'), 'no file paths leave the reader');
});

test('import: secrets removed before the archive and the model; archive is private; memories become pending proposals', async () => {
  await createProject('li-owner', { name: 'App', folder: app });
  const seen = [];
  const extract = async (text, ctx) => { seen.push(text); return ctx.source === 'claude-code'
    ? [{ title: 'Language', content: 'The owner wants answers in Arabic.', scope: 'owner', evidence: 'Always answer me in Arabic' }, { title: 'Stack', content: 'The app project uses Fastify.', scope: 'project', evidence: 'Understood, Arabic it is' }]
    : [{ title: 'Deploys', content: 'Deploys happen on Fridays only.', scope: 'owner', evidence: 'We deploy on Fridays only' }]; };
  const ids = (await listLocalSessions(dir)).map((x) => x.id);
  const job = L.startImport('li-owner', ids, { extract, home: dir });
  for (let i = 0; i < 100 && job.status === 'running'; i++) await new Promise((r) => setTimeout(r, 20));
  assert.equal(job.status, 'done', job.notice); assert.equal(job.errors, 0);
  assert.equal(job.proposed, 3);
  assert.ok(seen.every((t) => !t.includes(SECRET)) && seen.some((t) => t.includes('[REDACTED:')), 'the model never sees the secret');
  assert.ok(seen.every((t) => !t.includes('TOOL OUTPUT') && !t.includes('private') && !t.includes('subagent text')));
  const arch = join(dir, '.dpro', 'imports');
  assert.equal(statSync(arch).mode & 0o777, 0o700);
  const files = readdirSync(join(arch, 'claude-code'));
  assert.equal(statSync(join(arch, 'claude-code', files[0])).mode & 0o777, 0o600);
  assert.ok(!readFileSync(join(arch, 'claude-code', files[0]), 'utf8').includes(SECRET), 'the archive holds the redacted text only');
  const props = db.prepare("SELECT drawer_kind, drawer_key FROM memory_file_proposals WHERE status = 'pending'").all().map((r) => (r.drawer_key ? `${r.drawer_kind}:${r.drawer_key}` : r.drawer_kind)).sort();
  assert.deepEqual(props, ['owner', 'owner', 'project:app'], 'project facts go to the matching project drawer');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM memories').get().n, 0, 'nothing is remembered before approval');
  const imported = await L.importedSessions('li-owner');
  assert.equal(imported.size, 2);
});

test('routes: owner only; at most 20 opaque ids; one import at a time', async () => {
  assert.equal((await call('GET', '/api/memory/import/local', undefined, 'li-user')).statusCode, 403);
  const list = await call('GET', '/api/memory/import/local');
  assert.equal(list.statusCode, 200);
  assert.ok(list.json().sessions.every((x) => x.imported), 'already imported sessions are marked');
  assert.ok(!list.body.includes(SECRET), 'titles carry no secrets');
  assert.equal((await call('POST', '/api/memory/import/local', { sessionIds: ['../../etc'] })).statusCode, 400);
  assert.equal((await call('POST', '/api/memory/import/local', { sessionIds: Array.from({ length: 21 }, (_, i) => i.toString(16).padStart(32, '0')) })).statusCode, 400);
  assert.equal((await call('GET', '/api/memory/import/local/jobs/nope')).statusCode, 404);
});

test('wrappers and interruption notes are not human text', async () => {
  const { humanText } = await import(join(backendDir, 'src/memory/import/local-agents.ts'));
  assert.equal(humanText('<external_codex_apps_x>{"a":1}</external_codex_apps_x>'), null);
  assert.equal(humanText('[Request interrupted by user for tool use]'), null);
  assert.equal(humanText('<command-name>/clear</command-name>\n<command-args></command-args>'), null);
  assert.equal(humanText('Please keep it short <b>bold</b> ok'), 'Please keep it short <b>bold</b> ok', 'short inline tags a person typed stay');
  assert.equal(humanText('مرحبا'), 'مرحبا');
});

// ---- MEM-IMPORT-02 ----

test('speed: the model reads the owner\'s words, agent replies cut short, at most two small pieces', async () => {
  const turns = [];
  for (let i = 0; i < 400; i++) { turns.push({ role: 'user', text: `Owner rule ${i}: keep the build green and small.` }); turns.push({ role: 'assistant', text: `Long agent reply ${i} `.repeat(300) }); }
  const text = L.condensed(turns, 'Codex');
  assert.ok(text.length <= L.CHUNK_CHARS * L.MAX_CHUNKS, `condensed input is bounded (${text.length})`);
  assert.match(text, /Owner rule 0:/, 'the start of the conversation stays');
  assert.match(text, /Owner rule 399:/, 'the newest part stays');
  const small = L.condensed(turns.slice(0, 4), 'Codex');
  assert.match(small, /Owner: Owner rule 0/); assert.ok(small.split('Codex: ')[1].length < 300, 'an agent reply is cut to its first line');
  let calls = 0;
  const r = await L.extractMemories(async (chunk) => { calls++; assert.ok(chunk.length <= L.CHUNK_CHARS); return []; }, text, { source: 'codex', cwd: null }, '');
  assert.ok(calls <= L.MAX_CHUNKS, `at most ${L.MAX_CHUNKS} model calls (${calls})`);
  assert.equal(r.memories.length, 0);
});

test('dedupe: the same idea is proposed once (within a conversation and against what is known)', async () => {
  const chunk = 'Owner: merge only locally, never push without asking.\n\nOwner: keep local merges only.';
  const fake = async () => [
    { title: 'Local merges', content: 'The owner merges branches locally only.', scope: 'owner', evidence: 'merge only locally' },
    { title: 'Local-only merges', content: 'Branches are merged locally only by the owner.', scope: 'owner', evidence: 'keep local merges only' },
    { title: 'Merges stay local', content: 'The owner merges branches only locally.', scope: 'owner', evidence: 'merge only locally' },
    { title: 'Ask before push', content: 'Never push without asking the owner.', scope: 'owner', evidence: 'never push without asking' },
  ];
  const r = await L.extractMemories(fake, chunk, { source: 'codex', cwd: null }, chunk);
  assert.deepEqual(r.memories.map((m) => m.title), ['Local merges', 'Ask before push']);
  const again = await L.extractMemories(fake, chunk, { source: 'codex', cwd: null }, chunk, ['Never push to GitHub without asking the owner first.']);
  assert.deepEqual(again.memories.map((m) => m.title), ['Local merges'], 'an idea already stored or pending is not proposed again');
  assert.ok(!L.sameIdea('The owner speaks Iraqi Arabic.', 'The project uses Fastify and SQLite.'));
});

test('accuracy: a memory must rest on words in the conversation; personal details only on the owner\'s own words', async () => {
  const owner = 'Owner: please reply in Arabic, short answers.';
  const chunk = `${owner}\n\nCodex: Sure, I will reply in Arabic (Egyptian style).`;
  const fake = async () => [
    { title: 'Arabic replies', content: 'The owner wants short answers in Arabic.', scope: 'owner', evidence: 'please reply in Arabic, short answers' },
    { title: 'Egyptian dialect', content: 'The owner speaks the Egyptian dialect.', scope: 'owner', personal: true, evidence: 'the owner speaks Egyptian dialect' },
    { title: 'Dialect from agent', content: 'The owner prefers the Egyptian style.', scope: 'owner', personal: true, evidence: 'reply in Arabic (Egyptian style)' },
    { title: 'No evidence', content: 'The owner lives in Cairo.', scope: 'owner' },
  ];
  const r = await L.extractMemories(fake, chunk, { source: 'codex', cwd: null }, 'please reply in Arabic, short answers.');
  assert.deepEqual(r.memories.map((m) => m.title), ['Arabic replies'], 'guessed and agent-only personal details are dropped');
  assert.equal(r.dropped, 3);
  assert.ok(L.supported('مرحبا بك في المشروع', 'Owner: مرحبًا بك في المشروع الجديد'), 'Arabic evidence matches without diacritics');
});

test('Gemini CLI and Antigravity: read their plain-text logs; credential and settings files are never readable', async () => {
  const { listLocalSessions: list, readable, findSession, readSession } = await import(join(backendDir, 'src/memory/import/local-agents.ts'));
  const { default: Database } = await import('better-sqlite3');
  const home = join(dir, 'home2');
  const gem = join(home, '.gemini'); const proj = join(gem, 'tmp', 'abc123');
  mkdirSync(join(proj, 'chats'), { recursive: true }); mkdirSync(join(gem, 'antigravity', 'conversations'), { recursive: true });
  writeFileSync(join(gem, 'oauth_creds.json'), JSON.stringify({ access_token: SECRET }));
  writeFileSync(join(gem, 'settings.json'), '{}');
  writeFileSync(join(proj, '.project_root'), app);
  writeFileSync(join(proj, 'chats', 'session-1.json'), JSON.stringify({ sessionId: 's-1', startTime: '2026-10-16T08:00:00Z', messages: [
    { type: 'user', content: 'Use pnpm in this repo.' }, { type: 'gemini', content: [{ text: 'thinking', thought: true }, { text: 'OK, pnpm.' }] }, { type: 'info', content: 'tool noise' }] }));
  writeFileSync(join(proj, 'logs.json'), JSON.stringify([
    { sessionId: 's-1', type: 'user', message: 'Use pnpm in this repo.', timestamp: '2026-10-16T08:00:00Z' },
    { sessionId: 's-2', type: 'user', message: 'Tests run with node --test.', timestamp: '2026-10-16T09:00:00Z' },
    { sessionId: 's-2', type: 'user', message: '/quit', timestamp: '2026-10-16T09:01:00Z' }]));
  const db = new Database(join(gem, 'antigravity', 'conversation_summaries.db'));
  db.exec(`CREATE TABLE conversation_summaries (conversation_id text PRIMARY KEY, title text, last_modified_time datetime, workspace_uris text);
    CREATE VIRTUAL TABLE conversations_fts USING fts5(conversation_id UNINDEXED, chunk_index UNINDEXED, title, user_body, agent_body);`);
  db.prepare('INSERT INTO conversation_summaries VALUES (?, ?, ?, ?)').run('c-1', 'Board work', '2026-10-15 23:34:14.371508+00:00', JSON.stringify([`file://${app}`]));
  db.prepare('INSERT INTO conversations_fts VALUES (?, ?, ?, ?, ?)').run('c-1', -1, 'Board work', '', '');
  db.prepare('INSERT INTO conversations_fts VALUES (?, ?, ?, ?, ?)').run('c-1', 0, '', 'Cards need a due date.', 'Added due dates.');
  db.close();
  writeFileSync(join(gem, 'antigravity', 'conversations', 'c-1.db'), 'binary steps');

  for (const f of ['oauth_creds.json', 'google_accounts.json', 'settings.json', 'state.json']) assert.equal(readable('gemini-cli', join(gem, f), home), false, f);
  assert.equal(readable('antigravity', join(gem, 'antigravity', 'conversations', 'c-1.db'), home), false, 'binary step stores are not read');
  assert.equal(readable('gemini-cli', join(gem, 'tmp', '..', 'oauth_creds.json'), home), false);
  const s = await list(home);
  assert.deepEqual(s.map((x) => x.source).sort(), ['antigravity', 'gemini-cli', 'gemini-cli']);
  assert.ok(!JSON.stringify(s).includes(SECRET));
  const chat = s.find((x) => x.title.startsWith('Use pnpm')); assert.equal(chat.cwd, app); assert.equal(chat.turns, 2);
  assert.ok(s.some((x) => x.title.startsWith('Tests run')), 'a session only in the prompt log is listed once');
  const agy = s.find((x) => x.source === 'antigravity'); assert.equal(agy.title, 'Board work'); assert.equal(agy.cwd, app);
  const text = await readSession(await findSession(agy.id, home), home);
  assert.deepEqual(text.turns.map((t) => t.role), ['user', 'assistant']);

  const seen = [];
  const job = L.startImport('li-owner', s.map((x) => x.id), { home, extract: async (t) => { seen.push(t); return [{ title: 'Due dates', content: 'Board cards need a due date.', scope: 'project', evidence: 'Cards need a due date' }]; } });
  for (let i = 0; i < 100 && job.status === 'running'; i++) await new Promise((r) => setTimeout(r, 20));
  assert.equal(job.status, 'done', job.notice); assert.equal(job.errors, 0);
  assert.equal(job.proposed, 1, 'the same memory from three conversations is proposed once');
  assert.ok(seen.every((t) => !t.includes('tool noise') && !t.includes('thinking')));
});
