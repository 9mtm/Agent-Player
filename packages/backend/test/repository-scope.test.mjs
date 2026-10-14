// B1-core: repository scope matrix. Every repository method x every actor
// kind (owner, admin, user, guest, other user, agent run with drawers,
// channel/outsider agent run, channel service turn, no actor) is allowed or
// denied by the central rules in src/repositories/scope.ts.
//
// "ok" = the scope check let the call through (it resolved, or failed later
// for a non-scope reason such as invalid input or a run in the wrong state).
// A number = it was refused with that ScopeError status (401/403/404).
//
// Run: node --import tsx --test test/repository-scope.test.mjs
// Throwaway DB + cwd, random test-only secrets, no network (fetch refused).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-repo-scope-'));
mkdirSync(join(dir, '.data', 'audit'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
process.env.NODE_ENV = 'test';
delete process.env.OUTSIDER_AGENT_MEMORY;

const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => { throw new Error(`unexpected network call in test: ${url}`); };

const quiet = { log: console.log, warn: console.warn, info: console.info, error: console.error };
console.log = () => {};
console.info = () => {};
console.warn = () => {};

const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const { getCredentialStorage } = await import(join(backendDir, 'src/credentials/storage.ts'));
await getCredentialStorage().initialize();
const { getMemoryStorage } = await import(join(backendDir, 'src/memory/storage.ts'));
await getMemoryStorage().initialize();

const addUser = (id, role) => db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', ?, 'active')`)
  .run(id, `${id}@example.test`, id, role);
addUser('rs-owner', 'owner');
addUser('rs-admin', 'admin');
addUser('rs-user', 'user');
addUser('rs-other', 'user');
addUser('rs-guest', 'guest');
db.prepare(`INSERT INTO agents_config (id, name) VALUES ('rs-agent', 'Rs Agent')`).run();
db.prepare(`INSERT INTO agents_config (id, name) VALUES ('rs-agent-2', 'Rs Agent Two')`).run();

const { repositories, withTransaction } = await import(join(backendDir, 'src/repositories/index.ts'));
const { userActor, serviceActor, actorFromToolContext, SYSTEM_ACTOR } = await import(join(backendDir, 'src/repositories/actor.ts'));
const { ScopeError } = await import(join(backendDir, 'src/repositories/scope.ts'));
const { createChannelToolPolicy } = await import(join(backendDir, 'src/tools/channel-policy.ts'));
const { CredentialType } = await import(join(backendDir, 'src/credentials/types.ts'));

console.log = quiet.log;
console.info = quiet.info;
console.warn = quiet.warn;

test.after(() => {
  globalThis.fetch = realFetch;
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

// --- actors -----------------------------------------------------------------

const DRAWERS = [{ kind: 'owner' }, { kind: 'project', key: 'alpha' }];
const ACTORS = {
  owner: userActor({ id: 'rs-owner', role: 'owner' }),
  admin: userActor({ id: 'rs-admin', role: 'admin' }),
  user: userActor({ id: 'rs-user', role: 'user' }),
  guest: userActor({ id: 'rs-guest', role: 'guest' }),
  other: userActor({ id: 'rs-other', role: 'user' }),
  agent: actorFromToolContext({ workspaceDir: dir, userId: 'rs-user', agentId: 'rs-agent', memoryDrawers: DRAWERS }),
  outsider: actorFromToolContext({ workspaceDir: dir, userId: 'rs-user', agentId: 'rs-agent', toolPolicy: createChannelToolPolicy({ channel: 'telegram' }) }),
  service: serviceActor({ channel: 'telegram', userId: 'rs-user' }),
  none: null,
};
const KINDS = Object.keys(ACTORS);

/** 'ok' when the scope check passed, else the ScopeError status. */
async function outcome(fn) {
  try {
    await fn();
    return 'ok';
  } catch (err) {
    if (err instanceof ScopeError) return err.status;
    return 'ok';
  }
}

const silent = async (fn) => {
  const s = { ...console };
  console.log = () => {}; console.info = () => {}; console.warn = () => {}; console.error = () => {};
  try { return await fn(); } finally { Object.assign(console, s); }
};

let checks = 0;
/** One matrix row: expected outcome per actor kind (same order as KINDS). */
async function row(name, run, expected) {
  assert.equal(expected.length, KINDS.length, `${name}: one expectation per actor`);
  const got = [];
  for (const kind of KINDS) got.push(await silent(() => outcome(() => run(ACTORS[kind], kind))));
  checks += KINDS.length;
  assert.deepEqual(
    Object.fromEntries(KINDS.map((k, i) => [k, got[i]])),
    Object.fromEntries(KINDS.map((k, i) => [k, expected[i]])),
    `${name}: allowed/denied per actor`,
  );
}

//                     owner  admin  user   guest  other  agent  outsdr service none
const OWNER_ONLY    = ['ok',  403,   403,   403,   403,   403,   403,   403,    401];
const ADMIN_UP      = ['ok',  'ok',  403,   403,   403,   403,   403,   403,    401];
const MEMBERS       = ['ok',  'ok',  'ok',  403,   'ok',  403,   403,   403,    401];
const ANY_ACTOR     = ['ok',  'ok',  'ok',  'ok',  'ok',  'ok',  'ok',  'ok',   401];

// --- seed data ----------------------------------------------------------------

const insertRun = (userId, status = 'completed') => {
  const id = randomUUID();
  db.prepare(`INSERT INTO task_runs (id, task_id, agent_id, user_id, status, max_steps, max_duration_ms) VALUES (?, ?, 'rs-agent', ?, ?, 10, 60000)`)
    .run(id, `task-${id}`, userId, status);
  return id;
};
const RUN_USER = insertRun('rs-user');
const RUN_OTHER = insertRun('rs-other');
const RUN_OWNER = insertRun('rs-owner');

const C = {};
for (const [k, uid, role] of [['admin', 'rs-admin', 'admin'], ['owner', 'rs-owner', 'owner']]) {
  C[k] = await silent(() => repositories.credentials.create(userActor({ id: uid, role }), { name: `cred-${k}`, type: CredentialType.API_KEY, value: `test-${randomBytes(6).toString('hex')}` }));
}
C.user = (await silent(() => repositories.credentials.saveOwnByName(ACTORS.user, { name: 'cred-user', type: CredentialType.API_KEY, value: 'test-user-value' }))).credential;

const mem = (actor, drawer, content) => silent(() => repositories.memory.create(actor, {
  id: randomUUID(), type: 'fact', content, importance: 5, memoryLayer: 'working', importanceScore: 0.5,
  consolidationStatus: 'pending', expiryTimestamp: null, status: 'active', metadata: {}, createdAt: new Date(),
  lastAccessedAt: Date.now(), accessCount: 0, drawer,
}, 'test'));
const M_USER = await mem(ACTORS.user, { kind: 'owner' }, 'user fact in owner drawer');
const M_USER_BETA = await mem(ACTORS.user, { kind: 'project', key: 'beta' }, 'user fact in project beta');
const M_OTHER = await mem(ACTORS.other, { kind: 'owner' }, 'other user fact');

const newMemory = () => ({
  id: randomUUID(), type: 'fact', content: `new ${randomUUID()}`, importance: 5, memoryLayer: 'working', importanceScore: 0.5,
  consolidationStatus: 'pending', expiryTimestamp: null, status: 'active', metadata: {}, createdAt: new Date(),
  lastAccessedAt: Date.now(), accessCount: 0, drawer: { kind: 'owner' },
});

// --- actor construction -------------------------------------------------------

test('actors are built from trusted context only', () => {
  assert.equal(ACTORS.agent.kind, 'agent');
  assert.equal(ACTORS.agent.userId, 'rs-user');
  assert.equal(ACTORS.agent.role, 'user');
  assert.deepEqual(ACTORS.agent.drawers, DRAWERS);
  assert.equal(ACTORS.outsider.channel, 'telegram');
  assert.deepEqual(ACTORS.outsider.drawers, [], 'an outsider turn opens no drawers without OUTSIDER_AGENT_MEMORY');
  assert.ok(Object.isFrozen(ACTORS.owner) && Object.isFrozen(ACTORS.agent), 'actors cannot be changed after creation');
  assert.equal(actorFromToolContext({ workspaceDir: dir }).userId, undefined, 'no run user -> no user (fail closed)');
  assert.equal(actorFromToolContext({ workspaceDir: dir, userId: 'missing-user' }).role, 'none', 'unknown user -> no role');
  assert.equal(userActor({ id: 'x', role: 'superuser' }).role, 'none', 'unknown role -> none');
});

// --- task runs ----------------------------------------------------------------

test('task runs: scope matrix', async () => {
  const T = repositories.taskRuns;
  //                                                         owner admin user guest other agent outsdr service none
  await row('taskRuns.list', (a) => T.list(a),              ['ok', 'ok', 'ok', 403, 'ok', 'ok', 403, 403, 401]);
  await row('taskRuns.get(own run of user)', (a) => T.get(a, RUN_USER),
                                                            ['ok', 404, 'ok', 403, 404, 'ok', 403, 403, 401]);
  await row('taskRuns.detail(user run)', (a) => T.detail(a, RUN_USER),
                                                            ['ok', 404, 'ok', 403, 404, 'ok', 403, 403, 401]);
  await row('taskRuns.steps(user run)', (a) => T.steps(a, RUN_USER),
                                                            ['ok', 404, 'ok', 403, 404, 'ok', 403, 403, 401]);
  // completed run: a permitted cancel fails with a state error (409), not a scope error
  await row('taskRuns.cancel(user run)', (a) => T.cancel(a, RUN_USER),
                                                            ['ok', 404, 'ok', 403, 404, 403, 403, 403, 401]);
  await row('taskRuns.resolveStep', (a) => T.resolveStep(a, RUN_USER, 0, 'done'), OWNER_ONLY);
  await row('taskRuns.review', (a) => T.review(a, RUN_USER, 'accept', 'owner', null), OWNER_ONLY);
  await row('taskRuns.get(other user run)', (a) => T.get(a, RUN_OTHER),
                                                            ['ok', 404, 404, 403, 'ok', 404, 403, 403, 401]);
});

test('task runs: list contents follow the scope; agent runs are never owner-wide', async () => {
  const T = repositories.taskRuns;
  const ids = async (a) => (await T.list(a)).map((r) => r.id).sort();
  assert.deepEqual(await ids(ACTORS.owner), [RUN_USER, RUN_OTHER, RUN_OWNER].sort());
  assert.deepEqual(await ids(ACTORS.user), [RUN_USER]);
  assert.deepEqual(await ids(ACTORS.agent), [RUN_USER]);
  const ownerAgent = actorFromToolContext({ workspaceDir: dir, userId: 'rs-owner', agentId: 'rs-agent', memoryDrawers: DRAWERS });
  assert.deepEqual(await ids(ownerAgent), [RUN_OWNER], "an agent run of the owner sees the owner's runs only");
  await assert.rejects(() => T.get(ownerAgent, RUN_USER), (e) => e instanceof ScopeError && e.status === 404);
  assert.deepEqual(await ids(SYSTEM_ACTOR), [RUN_USER, RUN_OTHER, RUN_OWNER].sort());
  checks += 6;
});

// --- agents -------------------------------------------------------------------

test('agents (grants, personality): scope matrix', async () => {
  const A = repositories.agents;
  const available = [{ name: 'memory_search' }];
  await row('agents.grantView', (a) => A.grantView(a, 'rs-agent', available), OWNER_ONLY);
  await row('agents.setGrants', (a) => A.setGrants(a, 'rs-agent', { grants: 'not-an-array' }, available), OWNER_ONLY);
  //                                                                   owner admin user guest other agent outsdr service none
  await row('agents.currentPersonality(own agent)', (a) => A.currentPersonality(a, 'rs-agent'),
                                                                      ['ok', 403, 403, 403, 403, 'ok', 'ok', 403, 401]);
  await row('agents.currentPersonality(another agent)', (a) => A.currentPersonality(a, 'rs-agent-2'), OWNER_ONLY);
  await row('agents.personalityVersions', (a) => A.personalityVersions(a, 'rs-agent'), OWNER_ONLY);
  await row('agents.savePersonality', (a) => A.savePersonality(a, 'rs-agent', { traits: 'invalid' }), OWNER_ONLY);
  await row('agents.setPersonalityLocked', (a) => A.setPersonalityLocked(a, 'missing-agent', true), OWNER_ONLY);
  await row('agents.rollbackPersonality', (a) => A.rollbackPersonality(a, 'rs-agent', 999), OWNER_ONLY);
});

test('agents (configs, naming): scope matrix', async () => {
  const A = repositories.agents;
  const SMALL = 'small-local-agent';
  await row('agents.listConfigs', (a) => A.listConfigs(a), MEMBERS);
  await row('agents.getConfig', (a) => A.getConfig(a, 'rs-agent'), MEMBERS);
  await row('agents.suggestName', (a) => A.suggestName(a, {}), ADMIN_UP);
  // invalid name: a permitted call fails with an input error, not a scope error
  await row('agents.createConfig(invalid name)', (a) => A.createConfig(a, { name: { bad: true } }), ADMIN_UP);
  await row('agents.updateConfig(missing)', (a) => A.updateConfig(a, 'missing-agent', {}), ADMIN_UP);
  await row('agents.updateConfig(reserved small agent)', (a) => A.updateConfig(a, SMALL, 'not-an-object'), OWNER_ONLY);
  await row('agents.setPrimary(missing)', (a) => A.setPrimary(a, 'missing-agent'), ADMIN_UP);
  await row('agents.setPrimary(reserved small agent, missing row)', (a) => A.setPrimary(a, SMALL).catch((e) => { if (e instanceof ScopeError) throw e; }), OWNER_ONLY);
  await row('agents.duplicateConfig(missing)', (a) => A.duplicateConfig(a, 'missing-agent'), ADMIN_UP);
  await row('agents.deleteConfig(missing)', (a) => A.deleteConfig(a, 'missing-agent'), ADMIN_UP);
  await assert.rejects(() => A.deleteConfig(ACTORS.admin, SMALL), (e) => e instanceof ScopeError && e.status === 403 && e.code === 'reserved_agent');
  // the owner creates, renames (name reserved for good) and deletes
  const created = await silent(() => A.createConfig(ACTORS.owner, { name: 'Scope Matrix Agent' }));
  assert.equal(created.name, 'Scope Matrix Agent');
  const renamed = await A.updateConfig(ACTORS.admin, created.id, { name: 'Scope Matrix Renamed', expectedVersion: created.version });
  assert.equal(renamed.name, 'Scope Matrix Renamed');
  await assert.rejects(() => A.updateConfig(ACTORS.admin, created.id, { description: 'x', expectedVersion: created.version }), (e) => e.constructor.name === 'AgentConfigConflictError');
  await silent(() => A.deleteConfig(ACTORS.owner, created.id));
  assert.equal(await A.getConfig(ACTORS.user, created.id), null);
  checks += 6;
});

// --- credentials ----------------------------------------------------------------

test('credentials: scope matrix', async () => {
  const R = repositories.credentials;
  await row('credentials.list', (a) => R.list(a), ADMIN_UP);
  await row('credentials.get(admin credential)', (a) => R.get(a, C.admin.id), ADMIN_UP);
  //                                                                   owner admin user guest other agent outsdr service none
  await row('credentials.get(user credential)', (a) => R.get(a, C.user.id), ['ok', 404, 403, 403, 403, 403, 403, 403, 401]);
  await row('credentials.get(owner credential)', (a) => R.get(a, C.owner.id), ['ok', 404, 403, 403, 403, 403, 403, 403, 401]);
  await row('credentials.maskedValue(admin credential)', (a) => R.maskedValue(a, C.admin.id), ADMIN_UP);
  await row('credentials.test(admin credential)', (a) => R.test(a, C.admin.id), ADMIN_UP);
  await row('credentials.create', (a, k) => R.create(a, { name: `new-${k}-${randomUUID()}`, type: CredentialType.API_KEY, value: 'test-v' }), ADMIN_UP);
  await row('credentials.update(admin credential)', (a) => R.update(a, C.admin.id, { description: 'changed' }), ADMIN_UP);
  await row('credentials.delete(missing)', (a) => R.delete(a, 'missing-credential'), [404, 404, 403, 403, 403, 403, 403, 403, 401]);
  await row('credentials.exportBackup', (a) => R.exportBackup(a), ADMIN_UP);
  await row('credentials.importBackup([])', (a) => R.importBackup(a, []), ADMIN_UP);
  await row('credentials.saveOwnByName', (a, k) => R.saveOwnByName(a, { name: `own-${k}`, type: CredentialType.API_KEY, value: 'test-own' }),
                                                                      ['ok', 'ok', 'ok', 403, 'ok', 'ok', 403, 403, 401]);
});

test('credentials: contents follow the scope (owner sees all, admin own, backups never carry others)', async () => {
  const R = repositories.credentials;
  const ownerIds = (await R.list(ACTORS.owner)).map((c) => c.id);
  assert.ok([C.owner.id, C.admin.id, C.user.id].every((id) => ownerIds.includes(id)));
  const adminRows = await R.list(ACTORS.admin);
  assert.ok(adminRows.every((c) => c.userId === 'rs-admin'));
  const ownerBackup = await R.exportBackup(ACTORS.owner);
  assert.ok(ownerBackup.every((c) => !c.userId || c.userId === 'rs-owner'), "the owner's backup never carries another user's ciphertext");
  // An agent run saves only for its own user.
  const saved = await silent(() => R.saveOwnByName(ACTORS.agent, { name: 'agent-saved', type: CredentialType.API_KEY, value: 'test-agent' }));
  assert.equal(saved.credential.userId, 'rs-user');
  // Import with another user's id never overwrites it.
  const before = (await R.get(ACTORS.owner, C.user.id)).encryptedValue;
  await silent(() => R.importBackup(ACTORS.admin, [{ id: C.user.id, name: 'hijack', type: 'api_key', encryptedValue: 'x', iv: 'x', authTag: 'x', userId: 'rs-user' }]));
  assert.equal((await R.get(ACTORS.owner, C.user.id)).encryptedValue, before);
  // The owner touching another user's credential is audited (ids only).
  await R.get(ACTORS.owner, C.user.id, { ip: '127.0.0.1' });
  const audit = db.prepare(`SELECT * FROM audit_logs WHERE action = 'credentials.get.other_user' ORDER BY id DESC LIMIT 1`).get();
  assert.ok(audit && audit.user_id === 'rs-owner' && audit.resource_id === C.user.id);
  assert.ok(!String(audit.metadata).includes('test-user-value'));
  checks += 7;
});

// --- memory -------------------------------------------------------------------

test('memory: scope matrix', async () => {
  const R = repositories.memory;
  //                                                                   owner admin user guest other agent outsdr service none
  await row('memory.list', (a) => R.list(a),                          ['ok', 'ok', 'ok', 403, 'ok', 'ok', 'ok', 403, 401]);
  await row('memory.drawers', (a) => R.drawers(a),                    ['ok', 'ok', 'ok', 403, 'ok', 'ok', 'ok', 403, 401]);
  await row('memory.get(user memory, open drawer)', (a) => R.get(a, M_USER.id),
                                                                      [404, 404, 'ok', 403, 404, 'ok', 403, 403, 401]);
  await row('memory.assertAccess(user memory)', (a) => R.assertAccess(a, M_USER.id),
                                                                      [404, 404, 'ok', 403, 404, 'ok', 403, 403, 401]);
  await row('memory.get(user memory, closed drawer)', (a) => R.get(a, M_USER_BETA.id),
                                                                      [404, 404, 'ok', 403, 404, 403, 403, 403, 401]);
  await row('memory.get(other user memory)', (a) => R.get(a, M_OTHER.id),
                                                                      [404, 404, 404, 403, 'ok', 404, 404, 403, 401]);
  await row('memory.create(owner drawer)', (a) => R.create(a, newMemory(), 'test'),
                                                                      ['ok', 'ok', 'ok', 403, 'ok', 'ok', 403, 403, 401]);
  await row('memory.create(closed project drawer)', (a) => R.create(a, { ...newMemory(), drawer: { kind: 'project', key: 'beta' } }, 'test'),
                                                                      ['ok', 'ok', 'ok', 403, 'ok', 403, 403, 403, 401]);
  await row('memory.update(user memory)', (a) => R.update(a, M_USER.id, { importance: 6 }, 'test'),
                                                                      [404, 404, 'ok', 403, 404, 'ok', 403, 403, 401]);
  await row('memory.versions(user memory)', (a) => R.versions(a, M_USER.id),
                                                                      [404, 404, 'ok', 403, 404, 'ok', 403, 403, 401]);
  await row('memory.versions(closed drawer)', (a) => R.versions(a, M_USER_BETA.id),
                                                                      [404, 404, 'ok', 403, 404, 403, 403, 403, 401]);
  await row('memory.delete(other user memory)', (a) => R.delete(a, M_OTHER.id, 'test'),
                                                                      [404, 404, 404, 403, 'ok', 404, 404, 403, 401]);
  await row('memory.forget(closed drawer)', (a) => R.forget(a, randomUUID()),
                                                                      ['ok', 'ok', 'ok', 403, 'ok', 'ok', 403, 403, 401]);
  await row('memory.tombstones', (a) => R.tombstones(a), MEMBERS);
  await row('memory.proposals', (a) => R.proposals(a), OWNER_ONLY);
  await row('memory.proposal(missing)', (a) => R.proposal(a, 'missing'), [404, 403, 403, 403, 403, 403, 403, 403, 401]);
  await row('memory.approveProposal(missing)', (a) => R.approveProposal(a, 'missing'), OWNER_ONLY);
  await row('memory.rejectProposal(missing)', (a) => R.rejectProposal(a, 'missing'), OWNER_ONLY);
  await row('memory.drawerHistory', (a) => R.drawerHistory(a, { kind: 'owner' }), OWNER_ONLY);
  await row('memory.drawerFile', (a) => R.drawerFile(a, 'rs-agent', { kind: 'owner' }), OWNER_ONLY);
});

test('memory: an agent run reads only open drawers; forget refuses closed drawers and outsiders', async () => {
  const R = repositories.memory;
  const agentIds = (await R.list(ACTORS.agent)).map((m) => m.id);
  assert.ok(agentIds.includes(M_USER.id) && !agentIds.includes(M_USER_BETA.id) && !agentIds.includes(M_OTHER.id));
  assert.deepEqual(await R.list(ACTORS.outsider), [], 'an outsider turn reads no memory');
  await assert.rejects(() => R.forget(ACTORS.agent, M_USER_BETA.id), (e) => e instanceof ScopeError && e.status === 403);
  await assert.rejects(() => R.forget(ACTORS.outsider, M_USER.id), (e) => e instanceof ScopeError && /someone else/.test(e.message));
  assert.equal(await R.forget(ACTORS.agent, M_OTHER.id), null, "another user's memory is simply not found");
  // the owner account has no owner-wide memory view (S0-Q.11)
  assert.ok((await R.list(ACTORS.owner)).every((m) => m.userId === 'rs-owner'));
  checks += 6;
});

// --- audit --------------------------------------------------------------------

test('audit: scope matrix', async () => {
  const R = repositories.audit;
  await row('audit.record', (a, k) => R.record(a, { event_type: 'data.read', event_category: 'data_access', action: `scope-test.${k}`, success: true }), ANY_ACTOR);
  await row('audit.status', (a) => R.status(a), ADMIN_UP);
  await row('audit.stats', (a) => R.stats(a), ADMIN_UP);
  await row('audit.query', (a) => R.query(a, { limit: 5 }), ADMIN_UP);
  await row('audit.recent', (a) => R.recent(a, 5), ADMIN_UP);
  await row('audit.get', (a) => R.get(a, 'missing'), ADMIN_UP);
  await row('audit.exportJson', (a) => R.exportJson(a, {}), ADMIN_UP);
  await row('audit.config', (a) => R.config(a), ADMIN_UP);
  await row('audit.updateConfig', (a) => R.updateConfig(a, {}), OWNER_ONLY);
  await row('audit.cleanup', (a) => R.cleanup(a), OWNER_ONLY);
  // record defaults user_id to the actor's user
  const r = db.prepare(`SELECT user_id FROM audit_logs WHERE action = 'scope-test.agent'`).get();
  assert.equal(r.user_id, 'rs-user');
  checks += 1;
});

// --- identity -----------------------------------------------------------------

test('identity: scope matrix', async () => {
  const R = repositories.identity;
  //                                                         owner admin user guest other agent outsdr service none
  await row('identity.self', (a) => R.self(a),              ['ok', 'ok', 'ok', 'ok', 'ok', 403, 403, 403, 401]);
  await row('identity.profile', (a) => R.profile(a),        ['ok', 'ok', 'ok', 'ok', 'ok', 403, 403, 403, 401]);
  await row('identity.updateProfile(no change)', (a) => R.updateProfile(a, { fullName: null, email: null, username: null, bio: null, company: null, location: null, website: null, timezone: null }), MEMBERS);
  await row('identity.get(user)', (a) => R.get(a, 'rs-user'), ['ok', 'ok', 'ok', 404, 404, 403, 403, 403, 401]);
  await row('identity.list', (a) => R.list(a), ADMIN_UP);
  await row('identity.countByRole', (a) => R.countByRole(a), MEMBERS);
  const me = await R.self(ACTORS.user);
  assert.equal(me.id, 'rs-user');
  assert.equal(me.password_hash, undefined, 'password hashes never leave the repository');
  checks += 2;
});

// --- transactions ----------------------------------------------------------------

test('withTransaction: one actor, commit or roll back, synchronous on SQLite', async () => {
  await assert.rejects(() => withTransaction(null, () => 1), (e) => e instanceof ScopeError && e.status === 401);
  const id = randomUUID();
  await assert.rejects(() => withTransaction(ACTORS.owner, () => {
    db.prepare(`INSERT INTO task_runs (id, task_id, agent_id, user_id, status, max_steps, max_duration_ms) VALUES (?, ?, 'rs-agent', 'rs-owner', 'completed', 1, 1)`).run(id, `t-${id}`);
    throw new Error('boom');
  }), /boom/);
  assert.equal(db.prepare('SELECT 1 FROM task_runs WHERE id = ?').get(id), undefined, 'rolled back');
  assert.equal(await withTransaction(ACTORS.owner, (a) => a.userId), 'rs-owner');
  await assert.rejects(() => withTransaction(ACTORS.owner, async () => 1), /synchronous/);
  checks += 4;
});

// --- static checks ------------------------------------------------------------

test('routes: no user id from body/query in the moved routes; SYSTEM_ACTOR never in routes', () => {
  const routesDir = join(backendDir, 'src/api/routes');
  const moved = ['task-runs.ts', 'agent-grants.ts', 'agent-personality.ts', 'credentials.ts', 'audit.ts', 'memory-files.ts', 'profile.ts',
    'agents-config.ts'];
  for (const f of moved) {
    const src = readFileSync(join(routesDir, f), 'utf8');
    assert.doesNotMatch(src, /(body|query)\)?(\s+as\s+[^;]*?)?\??\.userId\b/, `${f} reads a user id from the request`);
  }
  for (const f of readdirSync(routesDir)) {
    assert.doesNotMatch(readFileSync(join(routesDir, f), 'utf8'), /SYSTEM_ACTOR/, `${f} must not use SYSTEM_ACTOR`);
  }
  checks += moved.length + 1;
});

test('matrix size', () => {
  // 9 actor kinds x every repository method row above, plus content checks.
  assert.ok(checks >= 500, `matrix has ${checks} checks`);
  quiet.log(`# repository scope matrix: ${checks} checks`);
});
