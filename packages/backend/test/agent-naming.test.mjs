// CORE-02: automatic random unique agent names in the onboarding language.
// Run: node --import tsx --test test/agent-naming.test.mjs
// Throwaway DB + cwd, random test-only secrets, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-agent-naming-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only

const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => { throw new Error(`unexpected network call in test: ${url}`); };

const quiet = { log: console.log, warn: console.warn };
console.log = () => {};
console.warn = () => {};

const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const addUser = (id, role) => db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', ?, 'active')`).run(id, `${id}@example.test`, id, role);
addUser('an-owner', 'owner');
addUser('an-admin', 'admin');
addUser('an-user', 'user');
const setLang = (userId, language) => db.prepare(
  `INSERT INTO onboarding_state (user_id, answers) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET answers = excluded.answers`,
).run(userId, JSON.stringify({ userName: userId, language }));

const { registerAuthGate } = await import(join(backendDir, 'src/auth/auth-gate.ts'));
const { agentsConfigRoutes } = await import(join(backendDir, 'src/api/routes/agents-config.ts'));
const N = await import(join(backendDir, 'src/services/agent-names.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { default: Fastify } = await import('fastify');

const app = Fastify();
registerAuthGate(app);
await app.register(agentsConfigRoutes);
await app.ready();

console.log = quiet.log;
console.warn = quiet.warn;

test.after(async () => {
  globalThis.fetch = realFetch;
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const auth = (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` });
const suggest = (payload = {}, who = 'an-owner') => app.inject({ method: 'POST', url: '/api/agents/name-suggestion', headers: auth(who), payload });
const create = (payload = {}, who = 'an-owner') => app.inject({ method: 'POST', url: '/api/agents', headers: auth(who), payload });
const rename = (id, name, who = 'an-owner') => app.inject({ method: 'PUT', url: `/api/agents/${id}`, headers: auth(who), payload: { name } });
const del = (id) => app.inject({ method: 'DELETE', url: `/api/agents/${id}`, headers: auth('an-owner') });
const key = (n) => N.normalizeAgentName(n);
const inList = (lang, name) => N.AGENT_NAME_LISTS[lang].map(key).includes(key(name.replace(/\s?\d+$/, '')));

test('name lists: 12 languages, AR/EN/DE well populated, no duplicates', () => {
  assert.deepEqual(Object.keys(N.AGENT_NAME_LISTS).sort(), ['ar', 'de', 'en', 'es', 'fr', 'hi', 'ja', 'ko', 'pt-BR', 'ru', 'tr', 'zh']);
  for (const [lang, list] of Object.entries(N.AGENT_NAME_LISTS)) {
    assert.ok(list.length >= (['ar', 'en', 'de'].includes(lang) ? 60 : 20), `${lang}: ${list.length}`);
    assert.equal(new Set(list.map(key)).size, list.length, `${lang} has duplicates`);
    for (const n of list) assert.equal(N.validateAgentName(n), n);
  }
  assert.ok(N.AGENT_NAME_LISTS.ar.every((n) => /^[؀-ۿ ]+$/.test(n)));
  assert.equal(key('  أمـــلٌ '), key('امل'));
  assert.equal(key('NOVA'), key('nova'));
});

test('only owner/admin may get a suggestion', async () => {
  assert.equal((await app.inject({ method: 'POST', url: '/api/agents/name-suggestion', payload: {} })).statusCode, 401);
  assert.equal((await suggest({}, 'an-user')).statusCode, 403);
  assert.equal((await suggest({}, 'an-admin')).statusCode, 200);
  assert.equal((await suggest({}, 'an-owner')).statusCode, 200);
  assert.equal((await create({}, 'an-user')).statusCode, 403);
});

test('the suggestion follows the onboarding language (own, then owner, then English)', async () => {
  // No onboarding language anywhere: English.
  let s = (await suggest({}, 'an-admin')).json();
  assert.equal(s.language, 'en');
  assert.ok(inList('en', s.name));
  setLang('an-owner', 'ar');
  for (let i = 0; i < 20; i++) {
    s = (await suggest()).json();
    assert.equal(s.language, 'ar');
    assert.ok(inList('ar', s.name), s.name);
    assert.match(s.name, /[؀-ۿ]/);
  }
  // The admin has none of their own: the owner's (company) language.
  assert.equal((await suggest({}, 'an-admin')).json().language, 'ar');
  setLang('an-admin', 'de');
  s = (await suggest({}, 'an-admin')).json();
  assert.equal(s.language, 'de');
  assert.ok(inList('de', s.name));
  // An explicit language wins; unknown languages are refused.
  for (const lang of ['fr', 'es', 'zh', 'ja', 'ko', 'pt-BR', 'ru', 'tr', 'hi', 'en']) {
    const r = (await suggest({ language: lang })).json();
    assert.equal(r.language, lang);
    assert.ok(inList(lang, r.name), `${lang}: ${r.name}`);
  }
  assert.equal((await suggest({ language: 'xx' })).statusCode, 400);
  assert.equal((await suggest({ exclude: 'Nova' })).statusCode, 400);
  // A suggestion reserves nothing.
  const before = db.prepare('SELECT COUNT(*) AS n FROM used_agent_names').get().n;
  await suggest();
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM used_agent_names').get().n, before);
});

test('random: many draws are spread over the list; exclude skips the current draft', async () => {
  const seen = new Set();
  for (let i = 0; i < 60; i++) seen.add((await suggest({ language: 'en' })).json().name);
  assert.ok(seen.size >= 15, `only ${seen.size} different names in 60 draws`);
  const all = [...N.AGENT_NAME_LISTS.tr];
  const exclude = all.slice(1);
  assert.equal((await suggest({ language: 'tr', exclude })).json().name, all[0]);
});

test('created agents never repeat a name, also after delete and after the list runs out', async () => {
  setLang('an-owner', 'zh');
  const names = [];
  const ids = [];
  for (let i = 0; i < 30; i++) {
    const res = await create({});
    assert.equal(res.statusCode, 201, res.body);
    const { agent } = res.json();
    names.push(agent.name);
    ids.push(agent.id);
  }
  assert.equal(new Set(names.map(key)).size, names.length, 'duplicate names');
  // The 20 listed zh names are used first, then numbered variants.
  assert.equal(names.slice(0, 20).filter((n) => N.AGENT_NAME_LISTS.zh.includes(n)).length, 20);
  assert.ok(names.slice(20).every((n) => /\d+$/.test(n)));
  assert.equal((await suggest()).json().exhausted, true);

  // Delete some; their names stay retired.
  const deleted = names.slice(0, 10);
  for (const id of ids.slice(0, 10)) assert.equal((await del(id)).statusCode, 200);
  for (let i = 0; i < 20; i++) {
    const s = (await suggest()).json().name;
    assert.ok(!deleted.map(key).includes(key(s)), `deleted name offered again: ${s}`);
    const res = await create({});
    names.push(res.json().agent.name);
  }
  assert.equal(new Set(names.map(key)).size, names.length, 'duplicate names after delete');
  // A deleted agent's name cannot be taken by hand either (also spelled differently).
  const res = await create({ name: ` ${deleted[0]} ` });
  assert.equal(res.statusCode, 409);
  assert.equal(res.json().code, 'name_taken');
});

test('manual names: validated, unique, and existing agents count as used', async () => {
  for (const name of ['   ', 'x'.repeat(61), 'bad\u0000name', 'rtl‮trick', 42]) {
    assert.equal((await create({ name })).statusCode, 400, JSON.stringify(name));
  }
  const ok = await create({ name: 'Custom Helper' });
  assert.equal(ok.statusCode, 201, ok.body);
  assert.equal((await create({ name: 'custom   HELPER' })).statusCode, 409);
  // The seeded main agent's name is reserved too.
  assert.equal((await create({ name: 'Main Agent' })).statusCode, 409);
});

test('rename reserves the new name for good; owner/admin only', async () => {
  const a = (await create({ name: 'Rename Source' })).json().agent;
  const b = (await create({ name: 'Other Holder' })).json().agent;
  assert.equal((await rename(a.id, 'Other Holder')).statusCode, 409);
  assert.equal((await rename(a.id, 'Fresh Name', 'an-user')).statusCode, 403);
  const r = await rename(a.id, 'Fresh Name', 'an-admin');
  assert.equal(r.statusCode, 200, r.body);
  assert.equal(r.json().agent.name, 'Fresh Name');
  const row = db.prepare(`SELECT agent_id, reason FROM used_agent_names WHERE name_key = ?`).get(key('Fresh Name'));
  assert.deepEqual(row, { agent_id: a.id, reason: 'rename' });
  // The old name stays retired for others; the agent may take its own old name back.
  assert.equal((await rename(b.id, 'Rename Source')).statusCode, 409);
  assert.equal((await rename(a.id, 'Rename Source')).statusCode, 200);
  // Other edits without a name change do not touch the registry.
  const ed = await app.inject({ method: 'PUT', url: `/api/agents/${b.id}`, headers: auth('an-owner'), payload: { description: 'x' } });
  assert.equal(ed.statusCode, 200);
  assert.equal(ed.json().agent.name, 'Other Holder');
  // After deleting the renamed agent, its new name stays reserved.
  assert.equal((await del(a.id)).statusCode, 200);
  assert.equal((await rename(b.id, 'Fresh Name')).statusCode, 409);
});

test('a duplicated agent gets its own new unique name', async () => {
  const src = (await create({ name: 'Dup Source' })).json().agent;
  const res = await app.inject({ method: 'POST', url: `/api/agents/${src.id}/duplicate`, headers: auth('an-owner') });
  assert.equal(res.statusCode, 201, res.body);
  const copy = res.json().agent;
  assert.notEqual(key(copy.name), key(src.name));
  assert.equal(db.prepare(`SELECT agent_id FROM used_agent_names WHERE name_key = ?`).get(key(copy.name)).agent_id, copy.id);
});
