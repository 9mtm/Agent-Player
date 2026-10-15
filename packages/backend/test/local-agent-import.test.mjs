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
    ? [{ title: 'Language', content: 'The owner wants answers in Arabic.', scope: 'owner' }, { title: 'Stack', content: 'The app project uses Fastify.', scope: 'project' }]
    : [{ title: 'Deploys', content: 'Deploys happen on Fridays only.', scope: 'owner' }]; };
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
