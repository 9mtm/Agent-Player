// CORE-01c (MEM-03): strict-evaluator preset, role -> default preset at agent
// creation, and owner-approved personality drift proposals with a reviewHash.
// Run: node --import tsx --test test/personality-proposals.test.mjs
// Throwaway DB + cwd, random test-only secrets, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-personality-proposals-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only

const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => { throw new Error(`unexpected network call in test: ${String(url)}`); };

const quiet = { log: console.log, warn: console.warn, info: console.info };
console.log = () => {};
console.warn = () => {};
console.info = () => {};

const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const addUser = (id, role) => db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', ?, 'active')`).run(id, `${id}@example.test`, id, role);
addUser('pp-owner', 'owner');
addUser('pp-admin', 'admin');
addUser('pp-user', 'user');
const addAgent = (id) => db.prepare(`INSERT INTO agents_config (id, name) VALUES (?, ?)`).run(id, `Agent ${id}`);
for (const id of ['pp-a', 'pp-b', 'pp-c', 'pp-d', 'pp-e', 'pp-lock', 'pp-limits', 'pp-grants']) addAgent(id);

const { registerAuthGate } = await import(join(backendDir, 'src/auth/auth-gate.ts'));
const { agentPersonalityRoutes } = await import(join(backendDir, 'src/api/routes/agent-personality.ts'));
const { agentsConfigRoutes } = await import(join(backendDir, 'src/api/routes/agents-config.ts'));
const P = await import(join(backendDir, 'src/services/personality.ts'));
const store = await import(join(backendDir, 'src/services/personality-store.ts'));
const { repositories } = await import(join(backendDir, 'src/repositories/index.ts'));
const { SYSTEM_ACTOR, actorFromToolContext } = await import(join(backendDir, 'src/repositories/actor.ts'));
const { setAgentGrants, getAgentGrantView } = await import(join(backendDir, 'src/tools/grants.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { default: Fastify } = await import('fastify');

const app = Fastify();
registerAuthGate(app);
await app.register(agentPersonalityRoutes);
await app.register(agentsConfigRoutes);
await app.ready();

console.log = quiet.log;
console.warn = quiet.warn;
console.info = quiet.info;

test.after(async () => {
  globalThis.fetch = realFetch;
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const auth = (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` });
const base = (id) => `/api/agents/${id}/personality`;
const versionsOf = (id) => db.prepare('SELECT version FROM agent_personality_versions WHERE agent_id = ? ORDER BY version').all(id).map((r) => r.version);
const propose = (id, payload, who = 'pp-owner') => app.inject({ method: 'POST', url: `${base(id)}/proposals`, headers: auth(who), payload });
const approve = (id, pid, payload, who = 'pp-owner') => app.inject({ method: 'POST', url: `${base(id)}/proposals/${pid}/approve`, headers: auth(who), payload });
const reject = (id, pid, payload, who = 'pp-owner') => app.inject({ method: 'POST', url: `${base(id)}/proposals/${pid}/reject`, headers: auth(who), payload });
const getOne = (id, pid, who = 'pp-owner') => app.inject({ method: 'GET', url: `${base(id)}/proposals/${pid}`, headers: auth(who) });
const quietly = async (fn) => { const s = { ...console }; console.log = () => {}; console.warn = () => {}; console.info = () => {}; try { return await fn(); } finally { Object.assign(console, s); } };
const createAgent = (payload, who = 'pp-owner') => quietly(() => app.inject({ method: 'POST', url: '/api/agents', headers: auth(who), payload }));

// --- presets and role mapping -------------------------------------------------

test('strict-evaluator preset exists with very high doubt and thoroughness, low creativity', async () => {
  const s = P.PRESETS['strict-evaluator'];
  assert.ok(s, 'preset exists');
  assert.equal(s.label, 'Strict evaluator');
  assert.deepEqual(s.traits, { doubt: 90, caution: 75, creativity: 15, thoroughness: 90, independence: 40, verbosity: 40, warmth: 45, curiosity: 50, persistence: 60 });
  assert.deepEqual(P.validateTraits(s.traits), s.traits);
  assert.ok(P.isPresetId('strict-evaluator'));
  assert.equal(Object.keys(P.PRESETS).length, 5);
  // Offered by the API and accepted by an owner save.
  const cur = (await app.inject({ method: 'GET', url: `${base('pp-e')}/current`, headers: auth('pp-owner') })).json();
  assert.ok(cur.presets.some((p) => p.id === 'strict-evaluator' && p.label === 'Strict evaluator'));
  const saved = await app.inject({ method: 'POST', url: `${base('pp-e')}/versions`, headers: auth('pp-owner'), payload: { preset: 'strict-evaluator' } });
  assert.equal(saved.statusCode, 200, saved.body);
  assert.deepEqual(saved.json().traits, s.traits);
});

test('defaultPresetForRole maps roles and departments (unknown -> balanced-assistant)', () => {
  const f = P.defaultPresetForRole;
  assert.equal(f({ role: 'manager', department: 'development' }), 'balanced-assistant');
  assert.equal(f({ role: 'manager' }), 'balanced-assistant');
  assert.equal(f({ role: 'specialist', department: 'development' }), 'precise-developer');
  assert.equal(f({ role: 'specialist', department: '  Development ' }), 'precise-developer');
  assert.equal(f({ role: 'specialist', department: 'marketing' }), 'bold-creative');
  assert.equal(f({ role: 'specialist', department: 'accounting' }), 'careful-auditor');
  assert.equal(f({ role: 'specialist', department: 'finance' }), 'careful-auditor');
  assert.equal(f({ role: 'specialist', department: 'SECURITY' }), 'careful-auditor');
  assert.equal(f({ role: 'specialist', department: 'legal' }), 'balanced-assistant');
  assert.equal(f({ role: 'specialist' }), 'balanced-assistant');
  assert.equal(f({ role: 'specialist', department: 42 }), 'balanced-assistant');
  assert.equal(f({ role: 'evaluator', department: 'marketing' }), 'strict-evaluator');
  assert.equal(f({ role: 'main' }), null);
  assert.equal(f({}), 'balanced-assistant');
  assert.equal(f({ role: 'emperor' }), 'balanced-assistant');
  assert.deepEqual(P.defaultPersonalityForRole({ role: 'main' }).traits, { ...P.MAIN_AGENT_V1.traits });
  assert.equal(P.normalizeDepartment('  Human   Resources '), 'human resources');
  assert.equal(P.normalizeDepartment(''), null);
  assert.throws(() => P.normalizeDepartment('x'.repeat(65)), P.PersonalityInputError);
});

test('creating an agent seeds version 1 from its role; an explicit preset wins', async () => {
  const ev = await createAgent({ name: 'Evaluator One', role: 'evaluator' });
  assert.equal(ev.statusCode, 201, ev.body);
  const evId = ev.json().agent.id;
  assert.equal(ev.json().agent.role, 'evaluator');
  const evP = store.getCurrentPersonality(evId);
  assert.equal(evP.version, 1);
  assert.equal(evP.source, 'seed');
  assert.equal(evP.preset, 'strict-evaluator');
  assert.deepEqual(evP.traits, P.PRESETS['strict-evaluator'].traits);

  const dev = await createAgent({ name: 'Dev Specialist', role: 'specialist', department: ' Development ' }, 'pp-admin');
  assert.equal(dev.statusCode, 201, dev.body);
  assert.equal(dev.json().agent.department, 'development');
  assert.equal(store.getCurrentPersonality(dev.json().agent.id).preset, 'precise-developer');

  const other = await createAgent({ name: 'Legal Specialist', role: 'specialist', department: 'legal' });
  assert.equal(store.getCurrentPersonality(other.json().agent.id).preset, 'balanced-assistant');

  // Explicit owner choice wins over the role default.
  const explicit = await createAgent({ name: 'Creative Evaluator', role: 'evaluator', personality: { preset: 'bold-creative', traits: { warmth: 20 } } });
  assert.equal(explicit.statusCode, 201, explicit.body);
  const exP = store.getCurrentPersonality(explicit.json().agent.id);
  assert.equal(exP.source, 'owner');
  assert.equal(exP.preset, 'bold-creative');
  assert.equal(exP.traits.warmth, 20);
  assert.equal(exP.traits.creativity, P.PRESETS['bold-creative'].traits.creativity);
  assert.equal(exP.createdBy, 'pp-owner');

  // ...and the owner can still change it later.
  const later = await app.inject({ method: 'POST', url: `${base(evId)}/versions`, headers: auth('pp-owner'), payload: { preset: 'balanced-assistant' } });
  assert.equal(later.statusCode, 200, later.body);
  assert.equal(later.json().version, 2);

  // No role, no personality: nothing seeded (as before CORE-01c).
  const plain = await createAgent({ name: 'Plain Agent' });
  assert.equal(plain.statusCode, 201, plain.body);
  assert.deepEqual(versionsOf(plain.json().agent.id), []);
  assert.equal(plain.json().agent.role, null);
});

test('agent creation refuses bad role/department/personality and admins cannot set a personality', async () => {
  const count = () => db.prepare('SELECT COUNT(*) AS n FROM agents_config').get().n;
  const before = count();
  for (const payload of [
    { name: 'Bad Role', role: 'emperor' },
    { name: 'Bad Dept', role: 'specialist', department: 'x'.repeat(65) },
    { name: 'Bad Dept Type', role: 'specialist', department: ['dev'] },
    { name: 'Bad Pers', personality: { preset: 'evil-genius' } },
    { name: 'Bad Pers 2', personality: { traits: { doubt: 101 } } },
    { name: 'Bad Pers 3', personality: { grants: ['exec'] } },
    { name: 'Bad Pers 4', personality: 'high' },
  ]) {
    const res = await createAgent(payload);
    assert.equal(res.statusCode, 400, `${JSON.stringify(payload).slice(0, 60)} -> ${res.body}`);
  }
  const adminTry = await createAgent({ name: 'Admin Pers', personality: { preset: 'bold-creative' } }, 'pp-admin');
  assert.equal(adminTry.statusCode, 403, adminTry.body);
  assert.equal(count(), before, 'nothing created');
});

// --- proposals -----------------------------------------------------------------

test('a proposal clamps each change to 5, skips locked traits and changes nothing yet', async () => {
  store.savePersonalityVersion('pp-a', { preset: 'balanced-assistant', lockedTraits: ['warmth'] }, 'pp-owner');
  const before = store.getCurrentPersonality('pp-a');
  const res = await propose('pp-a', { traits: { doubt: 100, creativity: 0, warmth: 0, curiosity: before.traits.curiosity + 2 }, reason: 'Too trusting in recent runs', evidence: ['run:1', 'memory:2'] });
  assert.equal(res.statusCode, 201, res.body);
  const p = res.json();
  assert.equal(p.status, 'pending');
  assert.equal(p.source, 'owner');
  assert.equal(p.createdBy, 'pp-owner');
  assert.equal(p.baseVersion, before.version);
  assert.deepEqual(p.baseTraits, before.traits);
  assert.equal(p.proposedTraits.doubt, before.traits.doubt + 5);
  assert.equal(p.proposedTraits.creativity, before.traits.creativity - 5);
  assert.equal(p.proposedTraits.warmth, before.traits.warmth, 'locked trait unchanged');
  assert.equal(p.proposedTraits.curiosity, before.traits.curiosity + 2);
  assert.deepEqual(p.delta, { doubt: 5, creativity: -5, curiosity: 2 });
  assert.deepEqual(p.evidence, ['run:1', 'memory:2']);
  // reviewHash = sha256 of the canonical review array
  const expected = createHash('sha256').update(JSON.stringify(['personality-proposal-review/v1', p.id, 'pp-a', p.baseVersion,
    Object.fromEntries(P.TRAIT_NAMES.map((n) => [n, p.proposedTraits[n]])), p.reason, p.evidence])).digest('hex');
  assert.equal(p.reviewHash, expected);
  assert.equal(store.getCurrentPersonality('pp-a').version, before.version, 'nothing applied');

  // delta form works the same way (also bounded)
  const d = await propose('pp-a', { delta: { persistence: 40, warmth: -10 }, reason: 'delta form' });
  assert.equal(d.statusCode, 201, d.body);
  assert.deepEqual(d.json().delta, { persistence: 5 });

  // only locked traits / same values -> no_change
  const none = await propose('pp-a', { traits: { warmth: 0 }, reason: 'only locked' });
  assert.equal(none.statusCode, 400);
  assert.equal(none.json().code, 'no_change');

  // list + get return the reviewHash
  const list = (await app.inject({ method: 'GET', url: `${base('pp-a')}/proposals?status=pending`, headers: auth('pp-owner') })).json();
  assert.equal(list.proposals.length, 2);
  assert.ok(list.proposals.every((x) => /^[0-9a-f]{64}$/.test(x.reviewHash)));
  assert.equal((await getOne('pp-a', p.id)).json().reviewHash, p.reviewHash);
  assert.equal((await app.inject({ method: 'GET', url: `${base('pp-a')}/proposals?status=nope`, headers: auth('pp-owner') })).statusCode, 400);
  assert.equal((await getOne('pp-b', p.id)).statusCode, 404, 'proposal of another agent');
});

test('a locked personality refuses proposals with 409 personality_locked', async () => {
  store.setPersonalityLocked('pp-lock', true, 'pp-owner');
  const res = await propose('pp-lock', { traits: { doubt: 60 }, reason: 'x' });
  assert.equal(res.statusCode, 409);
  assert.equal(res.json().code, 'personality_locked');
  await assert.rejects(() => repositories.agents.proposePersonalityDrift(SYSTEM_ACTOR, 'pp-lock', { traits: { doubt: 60 }, reason: 'x' }),
    (e) => e.code === 'personality_locked');
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM personality_proposals WHERE agent_id = 'pp-lock'`).get().n, 0);
});

test('approve with the right hash appends one version based on base_version; twice -> already_decided', async () => {
  const before = store.getCurrentPersonality('pp-a');
  const p = (await propose('pp-a', { traits: { thoroughness: 100 }, reason: 'Missed checks' })).json();
  const ok = await approve('pp-a', p.id, { expectedReviewHash: p.reviewHash });
  assert.equal(ok.statusCode, 200, ok.body);
  const body = ok.json();
  assert.equal(body.proposal.status, 'approved');
  assert.equal(body.proposal.decidedBy, 'pp-owner');
  assert.equal(body.proposal.appliedVersion, before.version + 1);
  assert.equal(body.version.version, before.version + 1);
  assert.equal(body.version.basedOnVersion, p.baseVersion);
  assert.equal(body.version.source, 'evolution');
  assert.equal(body.version.createdBy, 'pp-owner');
  assert.equal(body.version.traits.thoroughness, before.traits.thoroughness + 5);
  assert.deepEqual(body.version.lockedTraits, before.lockedTraits);
  assert.ok(body.version.behavior, 'behaviour view included');
  const after = versionsOf('pp-a');

  const again = await approve('pp-a', p.id, { expectedReviewHash: p.reviewHash });
  assert.equal(again.statusCode, 409);
  assert.equal(again.json().code, 'already_decided');
  const rej = await reject('pp-a', p.id, { expectedReviewHash: p.reviewHash });
  assert.equal(rej.json().code, 'already_decided');
  assert.deepEqual(versionsOf('pp-a'), after, 'only one version written');

  const audit = db.prepare(`SELECT * FROM audit_logs WHERE action = 'agent_personality.proposal.approve' AND success = 1`).all();
  assert.ok(audit.length >= 1);
  assert.equal(audit.at(-1).user_id, 'pp-owner');
});

test('approve after reject -> already_decided; reject keeps the personality', async () => {
  const before = versionsOf('pp-b');
  const p = (await propose('pp-b', { traits: { doubt: 70 }, reason: 'r' })).json();
  const r = await reject('pp-b', p.id, { expectedReviewHash: p.reviewHash, note: 'not now' });
  assert.equal(r.statusCode, 200, r.body);
  assert.equal(r.json().status, 'rejected');
  assert.equal(r.json().decisionNote, 'not now');
  assert.equal(r.json().decidedBy, 'pp-owner');
  const a = await approve('pp-b', p.id, { expectedReviewHash: p.reviewHash });
  assert.equal(a.statusCode, 409);
  assert.equal(a.json().code, 'already_decided');
  assert.deepEqual(versionsOf('pp-b'), before);
});

test('a changed base version -> 409 stale and the proposal becomes stale', async () => {
  const p = (await propose('pp-c', { traits: { doubt: 70 }, reason: 'r' })).json();
  store.savePersonalityVersion('pp-c', { traits: { warmth: 10 } }, 'pp-owner'); // the personality moved on
  const before = versionsOf('pp-c');
  const res = await approve('pp-c', p.id, { expectedReviewHash: p.reviewHash });
  assert.equal(res.statusCode, 409);
  assert.equal(res.json().code, 'stale');
  assert.equal((await getOne('pp-c', p.id)).json().status, 'stale');
  assert.deepEqual(versionsOf('pp-c'), before, 'nothing written');
  // A lock also moves the version: an older proposal goes stale.
  const q = (await propose('pp-c', { traits: { doubt: 70 }, reason: 'r2' })).json();
  store.setPersonalityLocked('pp-c', true, 'pp-owner');
  assert.equal((await approve('pp-c', q.id, { expectedReviewHash: q.reviewHash })).json().code, 'stale');
});

test('wrong hash -> 409 review_changed; missing hash -> 400 review_hash_required; nothing decided', async () => {
  const p = (await propose('pp-d', { traits: { doubt: 70 }, reason: 'r' })).json();
  const wrong = await approve('pp-d', p.id, { expectedReviewHash: 'a'.repeat(64) });
  assert.equal(wrong.statusCode, 409);
  assert.equal(wrong.json().code, 'review_changed');
  for (const payload of [{}, { expectedReviewHash: '' }, { expectedReviewHash: 'xyz' }, undefined]) {
    const res = await approve('pp-d', p.id, payload);
    assert.equal(res.statusCode, 400, JSON.stringify(payload));
    assert.equal(res.json().code, 'review_hash_required');
  }
  assert.equal((await reject('pp-d', p.id, {})).json().code, 'review_hash_required');
  assert.equal((await reject('pp-d', p.id, { expectedReviewHash: 'b'.repeat(64) })).json().code, 'review_changed');
  // A tampered row changes its reviewHash, so the old hash no longer approves it.
  db.prepare('UPDATE personality_proposals SET reason = ? WHERE id = ?').run('tampered', p.id);
  assert.equal((await approve('pp-d', p.id, { expectedReviewHash: p.reviewHash })).json().code, 'review_changed');
  assert.equal((await getOne('pp-d', p.id)).json().status, 'pending');
  assert.equal((await approve('pp-d', '00000000-0000-0000-0000-000000000000', { expectedReviewHash: p.reviewHash })).statusCode, 404);
});

test('only the owner may approve or reject; admin may propose; user may not', async () => {
  const p = (await propose('pp-d', { traits: { caution: 70 }, reason: 'admin idea' }, 'pp-admin'));
  assert.equal(p.statusCode, 201, p.body);
  const prop = p.json();
  assert.equal(prop.createdBy, 'pp-admin');
  assert.equal((await propose('pp-d', { traits: { caution: 70 }, reason: 'x' }, 'pp-user')).statusCode, 403);
  assert.equal((await app.inject({ method: 'POST', url: `${base('pp-d')}/proposals`, payload: { traits: { caution: 70 }, reason: 'x' } })).statusCode, 401);
  for (const who of ['pp-admin', 'pp-user']) {
    assert.equal((await approve('pp-d', prop.id, { expectedReviewHash: prop.reviewHash }, who)).statusCode, 403, `approve as ${who}`);
    assert.equal((await reject('pp-d', prop.id, { expectedReviewHash: prop.reviewHash }, who)).statusCode, 403, `reject as ${who}`);
    assert.equal((await getOne('pp-d', prop.id, who)).statusCode, 403, `get as ${who}`);
    assert.equal((await app.inject({ method: 'GET', url: `${base('pp-d')}/proposals`, headers: auth(who) })).statusCode, 403, `list as ${who}`);
  }
  assert.equal((await approve('pp-d', prop.id, { expectedReviewHash: prop.reviewHash }, null)).statusCode, 401);
  // Not even server code decides: drift needs the owner.
  await assert.rejects(() => repositories.agents.approvePersonalityProposal(SYSTEM_ACTOR, 'pp-d', prop.id, prop.reviewHash), (e) => e.status === 403);
  assert.equal((await getOne('pp-d', prop.id)).json().status, 'pending');
});

test('internal proposers: Evolution (system) and an agent run for its own agent only; ids from the actor', async () => {
  const evo = await repositories.agents.proposePersonalityDrift(SYSTEM_ACTOR, 'pp-e', { traits: { doubt: 0 }, reason: 'evolution cycle', evidence: ['run:42'], createdBy: 'x' }).catch((e) => e);
  assert.ok(evo instanceof P.PersonalityInputError, 'unknown body fields are refused (no createdBy from input)');
  const ok = await repositories.agents.proposePersonalityDrift(SYSTEM_ACTOR, 'pp-e', { traits: { doubt: 0 }, reason: 'evolution cycle', evidence: ['run:42'] });
  assert.equal(ok.source, 'evolution');
  assert.equal(ok.createdBy, 'evolution');
  const run = actorFromToolContext({ workspaceDir: dir, userId: 'pp-user', agentId: 'pp-e' });
  const mine = await repositories.agents.proposePersonalityDrift(run, 'pp-e', { delta: { curiosity: 3 }, reason: 'I keep missing related ideas' });
  assert.equal(mine.source, 'agent');
  assert.equal(mine.createdBy, 'agent:pp-e');
  await assert.rejects(() => repositories.agents.proposePersonalityDrift(run, 'pp-a', { delta: { curiosity: 3 }, reason: 'x' }), (e) => e.status === 403);
  // The agent run cannot decide its own proposal.
  await assert.rejects(() => repositories.agents.approvePersonalityProposal(run, 'pp-e', mine.id, mine.reviewHash), (e) => e.status === 403);
  // The owner can.
  const res = await approve('pp-e', mine.id, { expectedReviewHash: mine.reviewHash });
  assert.equal(res.statusCode, 200, res.body);
});

test('reason, evidence and note limits', async () => {
  const bad = [
    {}, { traits: { doubt: 60 } }, { traits: { doubt: 60 }, reason: '' }, { traits: { doubt: 60 }, reason: '   ' },
    { traits: { doubt: 60 }, reason: 'x'.repeat(1001) }, { traits: { doubt: 60 }, reason: 7 },
    { traits: { doubt: 60 }, reason: 'r', evidence: 'run:1' },
    { traits: { doubt: 60 }, reason: 'r', evidence: Array.from({ length: 21 }, (_, i) => `run:${i}`) },
    { traits: { doubt: 60 }, reason: 'r', evidence: ['x'.repeat(201)] },
    { traits: { doubt: 60 }, reason: 'r', evidence: [''] }, { traits: { doubt: 60 }, reason: 'r', evidence: [5] },
    { traits: { doubt: 60 }, reason: 'r', evidence: ['line\nbreak'] },
    { traits: { doubt: 60 }, delta: { doubt: 1 }, reason: 'both' }, { reason: 'neither' },
    { traits: { bravery: 60 }, reason: 'r' }, { traits: { doubt: 101 }, reason: 'r' }, { delta: { doubt: 1.5 }, reason: 'r' },
    { traits: { doubt: 60 }, reason: 'r', source: 'owner' }, { traits: { doubt: 60 }, reason: 'r', permissions: ['exec'] },
  ];
  for (const payload of bad) {
    const res = await propose('pp-limits', payload);
    assert.equal(res.statusCode, 400, `${JSON.stringify(payload).slice(0, 80)} -> ${res.body}`);
  }
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM personality_proposals WHERE agent_id = 'pp-limits'`).get().n, 0);
  const max = await propose('pp-limits', { traits: { doubt: 60 }, reason: 'x'.repeat(1000), evidence: Array.from({ length: 20 }, (_, i) => `run:${i}`.padEnd(200, 'z')) });
  assert.equal(max.statusCode, 201, max.body);
  const p = max.json();
  const longNote = await reject('pp-limits', p.id, { expectedReviewHash: p.reviewHash, note: 'n'.repeat(501) });
  assert.equal(longNote.statusCode, 400);
  assert.equal((await getOne('pp-limits', p.id)).json().status, 'pending');
  const okNote = await reject('pp-limits', p.id, { expectedReviewHash: p.reviewHash, note: 'n'.repeat(500) });
  assert.equal(okNote.statusCode, 200, okNote.body);
  assert.equal((await propose('ghost-agent', { traits: { doubt: 60 }, reason: 'r' })).statusCode, 404);
});

test('personality changes never alter tool grants or permissions', async () => {
  const available = [{ name: 'memory_search', execClass: false }, { name: 'web_search', execClass: false }];
  getAgentGrantView('pp-grants', available);
  setAgentGrants('pp-grants', { grants: ['memory_search'] }, 'pp-owner', available);
  const snapshot = () => ({
    grants: db.prepare('SELECT * FROM agent_tool_grants ORDER BY agent_id, tool_name').all(),
    profiles: db.prepare('SELECT * FROM agent_grant_profiles ORDER BY agent_id').all(),
    user: db.prepare(`SELECT role, status FROM users WHERE id = 'pp-user'`).get(),
  });
  const before = snapshot();
  const p = (await propose('pp-grants', { traits: { independence: 100, caution: 0 }, reason: 'be bolder' })).json();
  assert.equal((await approve('pp-grants', p.id, { expectedReviewHash: p.reviewHash })).statusCode, 200);
  assert.deepEqual(snapshot(), before);
  const src = ['src/services/personality-store.ts', 'src/services/personality.ts']
    .map((f) => readFileSync(join(backendDir, f), 'utf-8')).join('\n');
  assert.doesNotMatch(src, /agent_tool_grants|setAgentGrants|tool_approvals|approveToolCall/);
  assert.doesNotMatch(src, /export function applyPersonalityDrift/, 'drift is only reachable through an approved proposal');
});
