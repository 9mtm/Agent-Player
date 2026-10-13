// S0-Q.17: /api/memory-sharing* and /api/memory-quality* need a valid token of
// an active user; the user comes from the token (query/body userId ignored);
// another user's memory answers 404; shared lists honour visibility/team.
// Run: node --import tsx --test test/memory-sharing-quality-auth.test.mjs
// No network: fetch is stubbed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-mem-share-'));
const cwd = join(dir, 'a', 'b');
mkdirSync(cwd, { recursive: true });
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(cwd);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only

const realFetch = globalThis.fetch;
const outbound = [];
globalThis.fetch = async (url) => { outbound.push(String(url)); throw new Error('network disabled in test'); };

const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
const db = getDatabase();
await db.initialize();
const addUser = (id, role, status = 'active') =>
  db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status, email_verified) VALUES (?, ?, ?, 'x', ?, ?, 1)`)
    .run(id, `${id}@example.test`, id, role, status);
addUser('u-owner', 'owner');
addUser('u-alice', 'user');
addUser('u-bob', 'user');
addUser('u-carol', 'user');
addUser('u-off', 'user', 'inactive');

// Team "t-ab": alice owns it, bob is a member; carol is outside.
db.prepare(`INSERT INTO teams (id, name, owner_id) VALUES ('t-ab', 'AB', 'u-alice')`).run();
db.prepare(`INSERT INTO team_members (id, team_id, user_id, role) VALUES ('tm-1', 't-ab', 'u-bob', 'user')`).run();
db.prepare(`INSERT INTO teams (id, name, owner_id) VALUES ('t-c', 'C', 'u-carol')`).run();

const { default: Fastify } = await import('fastify');
const { default: memorySharingRoutes } = await import('../src/api/routes/memory-sharing.ts');
const { default: memoryQualityRoutes } = await import('../src/api/routes/memory-quality.ts');
const { generateToken } = await import('../src/auth/jwt.ts');

const app = Fastify();
await app.register(memorySharingRoutes);
await app.register(memoryQualityRoutes);
await app.ready();

test.after(async () => {
  globalThis.fetch = realFetch;
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const bearer = (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` });
const req = (method, url, headers = {}, payload) => app.inject({ method, url, headers, payload });

const seedMemory = (id, userId, content, visibility = 'private', teamId = null, agent = null) => db.prepare(
  `INSERT INTO memories (id, user_id, type, content, memory_layer, status, metadata, importance_score, created_at, visibility, team_id, source_agent_id)
   VALUES (?, ?, 'fact', ?, 'working', 'active', '{}', 0.5, ?, ?, ?, ?)`
).run(id, userId, content, new Date().toISOString(), visibility, teamId, agent);
seedMemory('m-alice', 'u-alice', 'alice private note about tea');
seedMemory('m-alice-dup', 'u-alice', 'alice private note about tea');
seedMemory('m-bob', 'u-bob', 'bob secret note', 'private', null, 'agent-x');
seedMemory('m-bob-team', 'u-bob', 'bob team note', 'team', 't-ab', 'agent-x');
seedMemory('m-carol-team', 'u-carol', 'carol team-c note', 'team', 't-c', 'agent-x');
seedMemory('m-carol-public', 'u-carol', 'carol public note', 'public', null, 'agent-x');
seedMemory('m-carol-teamless', 'u-carol', 'carol legacy team without id', 'team', null, 'agent-x');

const ROUTES = [
  ['POST', '/api/memory-sharing/m-alice/share', { visibility: 'public' }],
  ['POST', '/api/memory-sharing/m-alice/mark-critical', { critical: true }],
  ['GET', '/api/memory-sharing/shared?userId=u-alice'],
  ['GET', '/api/memory-sharing/by-agent/agent-x'],
  ['POST', '/api/memory-sharing/deduplication/run', { userId: 'u-alice' }],
  ['GET', '/api/memory-sharing/deduplication/stats?userId=u-alice'],
  ['GET', '/api/memory-sharing/deduplication/candidates?userId=u-alice'],
  ['GET', '/api/memory-sharing/audit'],
  ['GET', '/api/memory-quality/stats?userId=u-alice'],
  ['GET', '/api/memory-quality/low-quality?userId=u-alice'],
  ['GET', '/api/memory-quality/m-alice/analyze'],
  ['POST', '/api/memory-quality/m-alice/enrich'],
  ['POST', '/api/memory-quality/batch-enrich', { userId: 'u-alice' }],
  ['GET', '/api/memory-quality/m-alice/history'],
  ['GET', '/api/memory-quality/m-alice/relationships'],
  ['GET', '/api/memory-quality/m-alice/enrichment-log'],
  ['GET', '/api/memory-quality/distribution?userId=u-alice'],
];

const snapshot = () => db.prepare('SELECT id, content, visibility, team_id, is_team_critical, status, quality_score FROM memories ORDER BY id').all();

test('S0-Q.17: every route answers 401 without a valid active token, nothing changes', async () => {
  const before = snapshot();
  for (const [method, url, body] of ROUTES) {
    assert.equal((await req(method, url, {}, body)).statusCode, 401, `${method} ${url} anonymous`);
    assert.equal((await req(method, url, { authorization: 'Bearer not.a.jwt' }, body)).statusCode, 401, `${method} ${url} bad token`);
    assert.equal((await req(method, url, bearer('u-off'), body)).statusCode, 401, `${method} ${url} inactive`);
  }
  assert.deepEqual(snapshot(), before);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM memory_sharing_audit').get().n, 0);
});

test('S0-Q.17: share/mark-critical only by the memory owner; input validated; team must be the caller\'s', async () => {
  for (const id of ['u-bob', 'u-owner']) {
    assert.equal((await req('POST', '/api/memory-sharing/m-alice/share', bearer(id), { visibility: 'public' })).statusCode, 404, id);
    assert.equal((await req('POST', '/api/memory-sharing/m-alice/mark-critical', bearer(id), { critical: true })).statusCode, 404, id);
  }
  assert.equal(db.prepare(`SELECT visibility FROM memories WHERE id = 'm-alice'`).get().visibility, 'private');

  assert.equal((await req('POST', '/api/memory-sharing/m-alice/share', bearer('u-alice'), { visibility: 'everyone' })).statusCode, 400);
  assert.equal((await req('POST', '/api/memory-sharing/m-alice/share', bearer('u-alice'), { visibility: 'team', teamId: 't-c' })).statusCode, 400);
  assert.equal((await req('POST', '/api/memory-sharing/m-alice/share', bearer('u-alice'), { visibility: 'team' })).statusCode, 400);
  assert.equal((await req('POST', '/api/memory-sharing/m-alice/mark-critical', bearer('u-alice'), { critical: 'yes' })).statusCode, 400);

  const ok = await req('POST', '/api/memory-sharing/m-alice/share', bearer('u-alice'), { visibility: 'team', teamId: 't-ab', reason: 'for bob' });
  assert.equal(ok.statusCode, 200, ok.body);
  assert.deepEqual({ ...db.prepare(`SELECT visibility, team_id FROM memories WHERE id = 'm-alice'`).get() }, { visibility: 'team', team_id: 't-ab' });
  assert.equal((await req('POST', '/api/memory-sharing/m-alice/mark-critical', bearer('u-alice'), { critical: true })).statusCode, 200);
});

test('S0-Q.17: shared lists honour visibility and team membership; userId in query ignored', async () => {
  const ids = async (who, url = '/api/memory-sharing/shared?userId=u-carol') => {
    const res = await req('GET', url, bearer(who));
    assert.equal(res.statusCode, 200, res.body);
    return res.json().memories.map(m => m.id).sort();
  };
  // bob (member of t-ab): own team memory, alice's team memory, carol's public one.
  assert.deepEqual(await ids('u-bob'), ['m-alice', 'm-bob-team', 'm-carol-public']);
  // alice (owner of t-ab): same team view.
  assert.deepEqual(await ids('u-alice'), ['m-alice', 'm-bob-team', 'm-carol-public']);
  // carol: her own shared ones (incl. legacy team w/o id) + nothing from t-ab.
  assert.deepEqual(await ids('u-carol'), ['m-carol-public', 'm-carol-team', 'm-carol-teamless']);
  // owner: only public (no owner-wide view).
  assert.deepEqual(await ids('u-owner'), ['m-carol-public']);
  // by-agent uses the same filter; bob's private memory never appears.
  assert.deepEqual(await ids('u-owner', '/api/memory-sharing/by-agent/agent-x'), ['m-carol-public']);
  assert.deepEqual(await ids('u-alice', '/api/memory-sharing/by-agent/agent-x'), ['m-bob-team', 'm-carol-public']);
  assert.equal((await req('GET', '/api/memory-sharing/shared?visibility=private', bearer('u-alice'))).statusCode, 400);
});

test('S0-Q.17: dedup and audit are scoped to the caller', async () => {
  const stats = await req('GET', '/api/memory-sharing/deduplication/stats?userId=u-alice', bearer('u-bob'));
  assert.equal(stats.statusCode, 200, stats.body);
  const cand = await req('GET', '/api/memory-sharing/deduplication/candidates?userId=u-alice', bearer('u-bob'));
  assert.equal(cand.statusCode, 200, cand.body);
  assert.doesNotMatch(cand.body, /alice private/);
  assert.equal((await req('GET', '/api/memory-sharing/deduplication/candidates?similarityThreshold=0.1', bearer('u-bob'))).statusCode, 400);

  // bob running dedup with userId=u-alice must not touch alice's duplicates.
  const run = await req('POST', '/api/memory-sharing/deduplication/run', bearer('u-bob'), { userId: 'u-alice' });
  assert.ok([200, 500].includes(run.statusCode), run.body);
  assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM memories WHERE user_id = 'u-alice' AND status = 'active'`).get().n, 2);

  const aliceAudit = await req('GET', '/api/memory-sharing/audit', bearer('u-alice'));
  assert.equal(aliceAudit.statusCode, 200);
  assert.ok(aliceAudit.json().count >= 2);
  for (const who of ['u-bob', 'u-owner']) {
    const res = await req('GET', '/api/memory-sharing/audit?memoryId=m-alice', bearer(who));
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().count, 0, who);
    assert.doesNotMatch(res.body, /alice private/);
  }
});

test('S0-Q.17: quality routes use the token user; other users\' memories answer 404', async () => {
  for (const sub of ['analyze', 'history', 'relationships', 'enrichment-log']) {
    assert.equal((await req('GET', `/api/memory-quality/m-bob/${sub}`, bearer('u-alice'))).statusCode, 404, sub);
    assert.equal((await req('GET', `/api/memory-quality/m-bob/${sub}`, bearer('u-owner'))).statusCode, 404, sub);
  }
  const bobBefore = db.prepare(`SELECT metadata, quality_score FROM memories WHERE id = 'm-bob'`).get();
  assert.equal((await req('POST', '/api/memory-quality/m-bob/enrich', bearer('u-alice'))).statusCode, 404);
  const batch = await req('POST', '/api/memory-quality/batch-enrich', bearer('u-alice'), { userId: 'u-bob', limit: 1000 });
  assert.equal(batch.statusCode, 200, batch.body);
  assert.deepEqual({ ...db.prepare(`SELECT metadata, quality_score FROM memories WHERE id = 'm-bob'`).get() }, { ...bobBefore });

  const own = await req('GET', '/api/memory-quality/m-alice/analyze', bearer('u-alice'));
  assert.equal(own.statusCode, 200, own.body);

  const low = await req('GET', '/api/memory-quality/low-quality?userId=u-bob&limit=100', bearer('u-alice'));
  assert.equal(low.statusCode, 200, low.body);
  assert.doesNotMatch(low.body, /bob secret/);
  for (const url of ['/api/memory-quality/stats?userId=u-bob', '/api/memory-quality/distribution?userId=u-bob']) {
    assert.equal((await req('GET', url, bearer('u-alice'))).statusCode, 200, url);
  }
  assert.deepEqual(outbound, []);
});
