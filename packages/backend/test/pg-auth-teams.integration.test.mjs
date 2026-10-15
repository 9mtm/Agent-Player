// B2.2b-1: the auth gate, route guards, audit writer, teams and sign-in
// record pruning on PostgreSQL, end to end.
// Runs ONLY when AGENT_PLAYER_PG_TEST_URL names a THROWAWAY database on
// 127.0.0.1 that the PostgreSQL runner has already migrated (it writes test
// rows and never cleans up: drop the database afterwards). Otherwise every
// test skips. scripts/pg/integration.sh runs it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const URL_ = process.env.AGENT_PLAYER_PG_TEST_URL;
const skip = URL_ ? false : 'AGENT_PLAYER_PG_TEST_URL is not set (PostgreSQL integration test)';

let m = {};
let dir;
if (URL_) {
  dir = mkdtempSync(join(tmpdir(), 'ap-pg-auth-teams-'));
  process.chdir(dir);
  // SQLite still backs the modules that are not ported yet: a temp file, never the real .data.
  process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
  process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
  process.env.AGENT_PLAYER_DB = 'postgres';
  process.env.AGENT_PLAYER_PG_URL = URL_;
  process.env.AGENT_PLAYER_PG_POOL_MAX = '4';

  const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
  await getDatabase({ path: process.env.DATABASE_PATH }).initialize(); // B2.2d-17: an explicit temp SQLite file, watched for strays
  m = {
    getDatabase,
    closeDatabase,
    pool: await import('../src/db/pg/pool.ts'),
    repos: await import('../src/repositories/index.ts'),
    actor: await import('../src/repositories/actor.ts'),
    users: (await import('../src/repositories/pg/users-store.ts')).pgUsersStore,
    pgRunner: (await import('../src/repositories/pg/sql-runner.ts')).pgRunner,
    pgTeams: (await import('../src/repositories/pg/teams.ts')).pgTeams,
    teams: await import('../src/repositories/teams.ts'),
    jwt: await import('../src/auth/jwt.ts'),
    gate: await import('../src/auth/auth-gate.ts'),
    guards: await import('../src/auth/route-guards.ts'),
    errors: await import('../src/api/error-handler.ts'),
    audit: await import('../src/services/audit-logger.ts'),
    throttle: await import('../src/auth/account-lockout.ts'),
    Fastify: (await import('fastify')).default,
  };
}

const run = randomBytes(4).toString('hex');
const one = (sql, ...p) => m.pool.pgOne(sql, ...p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, what, ms = 3000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) assert.fail(`timed out waiting for ${what}`);
    await sleep(20);
  }
}

const u = {};
let gated; // app with the global error handler + auth gate
let guarded; // app with only a requireActiveRole preHandler (no gate)
let handlerRuns = 0;

const bearer = (id, v = 1) => ({ authorization: `Bearer ${m.jwt.generateToken(id, v)}` });

function assertCode(res, status, code) {
  assert.equal(res.statusCode, status, res.body);
  assert.equal(res.json().code, code, res.body);
}

test.before(async () => {
  if (!URL_) return;
  const mk = (name, role) => m.users.create({ email: `${name}-${run}@pg.test`, username: `${name}_${run}`, password: `pw-${randomBytes(8).toString('hex')}`, role });
  u.owner = await mk('owner', 'owner');
  u.member = await mk('member', 'user');
  u.other = await mk('other', 'user');
  u.off = await mk('off', 'admin');
  u.bumped = await mk('bumped', 'user');
  await m.pool.pgRun(`UPDATE users SET status = 'suspended' WHERE id = ?`, u.off.id);

  gated = m.Fastify();
  m.errors.registerGlobalErrorHandler(gated);
  m.gate.registerAuthGate(gated);
  const whoami = async (request) => {
    handlerRuns++;
    // Synchronous callers reuse the gate's async check (no SQLite lookup).
    return { id: m.jwt.getUserIdFromRequest(request), actor: request.actor, guard: m.guards.authenticateActiveUser(request) };
  };
  gated.get('/api/things', whoami);
  gated.get('/api/database/stats', whoami); // owner tier
  await gated.ready();

  guarded = m.Fastify();
  m.errors.registerGlobalErrorHandler(guarded);
  guarded.get('/guarded', { preHandler: m.guards.requireActiveRole(m.guards.OWNER_OR_ADMIN) }, async () => { handlerRuns++; return { ok: true }; });
  await guarded.ready();
});

test.after(async () => {
  if (!URL_) return;
  await gated?.close();
  await guarded?.close();
  await m.audit.flushAuditWrites();
  await m.pool.closePgPool();
  m.closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

test('auth gate on PostgreSQL: a valid token passes; the actor and sync callers see the user', { skip }, async () => {
  const res = await gated.inject({ method: 'GET', url: '/api/things', headers: bearer(u.member.id) });
  assert.equal(res.statusCode, 200, res.body);
  const body = res.json();
  assert.equal(body.id, u.member.id);
  assert.deepEqual(body.actor, { kind: 'user', userId: u.member.id, role: 'user' });
  assert.deepEqual(body.guard, { id: u.member.id, role: 'user' });
  const owner = await gated.inject({ method: 'GET', url: '/api/database/stats', headers: bearer(u.owner.id) });
  assert.equal(owner.statusCode, 200, owner.body);
});

test('auth gate on PostgreSQL: bumped token_version -> 401 unauthenticated; inactive -> 401; wrong role -> 403 forbidden', { skip }, async () => {
  const before = handlerRuns;
  const h = bearer(u.bumped.id);
  assert.equal((await gated.inject({ method: 'GET', url: '/api/things', headers: h })).statusCode, 200);
  await m.users.incrementTokenVersion(u.bumped.id);
  assertCode(await gated.inject({ method: 'GET', url: '/api/things', headers: h }), 401, 'unauthenticated');
  // The new version signs in again.
  assert.equal((await gated.inject({ method: 'GET', url: '/api/things', headers: bearer(u.bumped.id, 2) })).statusCode, 200);

  assertCode(await gated.inject({ method: 'GET', url: '/api/things' }), 401, 'unauthenticated');
  assertCode(await gated.inject({ method: 'GET', url: '/api/things', headers: bearer(u.off.id) }), 401, 'unauthenticated');
  assertCode(await gated.inject({ method: 'GET', url: '/api/things', headers: bearer(`nobody-${run}`) }), 401, 'unauthenticated');
  assertCode(await gated.inject({ method: 'GET', url: '/api/database/stats', headers: bearer(u.member.id) }), 403, 'forbidden');
  assert.equal(handlerRuns, before + 2, 'only the two valid requests reached the handler');
});

test('route guard on PostgreSQL: unauthenticated / inactive_user / forbidden / ok', { skip }, async () => {
  const before = handlerRuns;
  assertCode(await guarded.inject({ method: 'GET', url: '/guarded' }), 401, 'unauthenticated');
  const off = await guarded.inject({ method: 'GET', url: '/guarded', headers: bearer(u.off.id) });
  assertCode(off, 403, 'inactive_user');
  assert.equal(off.json().error, 'This action requires an active owner or admin account');
  assertCode(await guarded.inject({ method: 'GET', url: '/guarded', headers: bearer(u.member.id) }), 403, 'forbidden');
  assert.equal((await guarded.inject({ method: 'GET', url: '/guarded', headers: bearer(u.owner.id) })).statusCode, 200);
  assert.equal(handlerRuns, before + 1);
});

test('auth gate and guard: a database error -> generic 500, the route never runs', { skip }, async () => {
  const real = await m.pool.getPgPool();
  const broken = { query: async () => { throw Object.assign(new Error('connection lost: SELECT secret'), { code: '57P01' }); } };
  const logged = [];
  const saved = console.error;
  console.error = (...a) => { logged.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')); };
  const before = handlerRuns;
  m.pool.setPgPool(broken);
  try {
    for (const [app, url] of [[gated, '/api/things'], [guarded, '/guarded']]) {
      const res = await app.inject({ method: 'GET', url, headers: bearer(u.owner.id) });
      assert.equal(res.statusCode, 500, res.body);
      assert.deepEqual(res.json(), { ...m.errors.INTERNAL_ERROR_BODY });
      assert.ok(!res.body.includes('secret'));
    }
  } finally {
    m.pool.setPgPool(real);
    console.error = saved;
  }
  assert.equal(handlerRuns, before, 'no handler ran');
  assert.ok(logged.length >= 2);
  assert.ok(logged.every((l) => !l.includes('secret') && !l.includes('connection lost')), 'logs carry safe fields only');
});

test('actor role on PostgreSQL: tool actors read the role from PostgreSQL; sync lookup fails closed', { skip }, async () => {
  assert.equal(await m.actor.activeRoleAsync(u.owner.id), 'owner');
  assert.equal(await m.actor.activeRoleAsync(u.off.id), 'none');
  assert.equal(await m.actor.activeRoleAsync(`nobody-${run}`), 'none');
  assert.equal((await m.actor.actorFromToolContextAsync({ userId: u.member.id, agentId: 'a1' })).role, 'user');
  // The synchronous form never reads the SQLite file on PostgreSQL.
  assert.equal(m.actor.actorFromToolContext({ userId: u.owner.id }).role, 'none');
});

test('audit writer on PostgreSQL: fire-and-forget, outside the caller transaction, errors swallowed', { skip }, async () => {
  const req = { ip: '127.0.0.1', headers: { 'user-agent': 'pg-test' }, method: 'POST', url: '/api/auth/login' };
  // Returns at once (no promise), the row lands shortly after.
  const ret = m.audit.logAuthEvent('auth.login', req, u.member.id, `member_${run}`, true);
  assert.equal(ret, undefined);
  const row = await waitFor(() => one(`SELECT * FROM audit_logs WHERE user_id = ? AND event_type = 'auth.login'`, u.member.id), 'audit row');
  assert.equal(row.success, 1);
  assert.equal(row.action, 'login');
  assert.equal(row.request_path, '/api/auth/login');

  // Inside a transaction that rolls back, the audit row still lands (own connection).
  const self = m.actor.userActor({ id: u.member.id, role: 'user' });
  await assert.rejects(m.repos.withPgActorTransaction(self, async () => {
    m.audit.logAudit({ event_type: 'data.update', event_category: 'data_modification', resource_id: `${run}-tx`, success: true });
    throw new Error('rollback');
  }), /rollback/);
  await m.audit.flushAuditWrites();
  assert.equal((await one('SELECT COUNT(*) AS n FROM audit_logs WHERE resource_id = ?', `${run}-tx`)).n, 1);

  // A failing insert (unknown user -> FK) never throws; the log has safe fields only.
  const logged = [];
  const saved = console.error;
  console.error = (...a) => { logged.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')); };
  try {
    assert.doesNotThrow(() => m.audit.logAudit({ event_type: 'data.update', event_category: 'data_modification', user_id: `no-such-${run}`, resource_id: `${run}-fk`, success: false }));
    await m.audit.flushAuditWrites();
  } finally {
    console.error = saved;
  }
  assert.equal((await one('SELECT COUNT(*) AS n FROM audit_logs WHERE resource_id = ?', `${run}-fk`)).n, 0);
  assert.equal(logged.length, 1);
  assert.match(logged[0], /Failed to log audit event/);
  assert.ok(!logged[0].includes('foreign key') && !logged[0].includes(`no-such-${run}`), logged[0]);
});

test('teams on PostgreSQL: create, list, update, invite, accept, roles, remove, delete', { skip }, async () => {
  const id = m.repos.repositories.identity;
  assert.equal(id.teams, m.pgTeams.teams, 'identity uses the PostgreSQL teams');
  const owner = m.actor.userActor({ id: u.owner.id, role: 'owner' });
  const member = m.actor.userActor({ id: u.member.id, role: 'user' });
  const other = m.actor.userActor({ id: u.other.id, role: 'user' });

  await assert.rejects(id.createTeam(owner, { name: '  ' }), m.teams.TeamInputError);
  const team = await id.createTeam(owner, { name: ` Team ${run} `, description: 'pg' });
  assert.equal(team.name, `Team ${run}`);
  assert.equal(team.owner_id, u.owner.id);
  const mine = await id.teams(owner);
  const listed = mine.find((t) => t.id === team.id);
  assert.equal(listed.my_role, 'owner');
  assert.equal(listed.member_count, 1);

  await assert.rejects(id.team(other, team.id), (e) => e.status === 403);
  assert.equal((await id.team(owner, team.id)).myRole, 'owner');
  assert.equal((await id.updateTeam(owner, team.id, { name: 'Renamed' })).name, 'Renamed');
  await assert.rejects(id.updateTeam(member, team.id, { name: 'x' }), (e) => e.status === 403);

  const inv = await id.invite(owner, team.id, { email: u.member.email, role: 'admin' });
  assert.equal(inv.mail.to, u.member.email);
  await assert.rejects(id.invite(owner, team.id, { email: u.member.email, role: 'user' }), /already sent/);
  const pending = await id.myInvitations(member);
  assert.ok(pending.some((i) => i.id === inv.invitation.id && i.team_name === 'Renamed'));
  assert.equal((await id.teamInvitations(owner, team.id)).length, 1);
  // B2.2b-2: expires_at has the SQLite row shape (the ISO string invite() wrote), not the timestamptz text.
  const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  assert.match(inv.invitation.expires_at, ISO);
  const days = (Date.parse(inv.invitation.expires_at) - Date.now()) / 86_400_000;
  assert.ok(days > 6.9 && days <= 7, `expires in about 7 days, got ${days}`);
  assert.equal(pending.find((i) => i.id === inv.invitation.id).expires_at, inv.invitation.expires_at);
  assert.equal((await id.teamInvitations(owner, team.id))[0].expires_at, inv.invitation.expires_at);
  assert.notEqual((await one('SELECT expires_at FROM team_invitations WHERE id = ?', inv.invitation.id)).expires_at, inv.invitation.expires_at, 'the raw PostgreSQL value is the timestamptz text');
  await id.acceptInvitation(member, inv.invitation.token);
  assert.equal((await one('SELECT status FROM team_invitations WHERE id = ?', inv.invitation.id)).status, 'accepted');
  const members = await id.members(owner, team.id);
  assert.deepEqual(members.map((x) => [x.user_id, x.role]), [[u.owner.id, 'owner'], [u.member.id, 'admin']]);

  await id.setMemberRole(owner, team.id, u.member.id, 'user');
  await assert.rejects(id.setMemberRole(member, team.id, u.owner.id, 'user'), (e) => e.status === 403);
  await assert.rejects(id.removeMember(owner, team.id, u.owner.id), /Cannot remove team owner/);

  // Invite + cancel (manager) and reject (invitee).
  const inv2 = await id.invite(owner, team.id, { email: u.other.email, role: 'user' });
  await id.cancelInvitation(other, inv2.invitation.id);
  assert.equal((await one('SELECT status FROM team_invitations WHERE id = ?', inv2.invitation.id)).status, 'rejected');

  // An expired invitation is marked expired and refused (timestamptz read as UTC).
  const inv3 = await id.invite(owner, team.id, { email: u.other.email, role: 'user' });
  await m.pool.pgRun(`UPDATE team_invitations SET expires_at = now() - interval '1 minute' WHERE id = ?`, inv3.invitation.id);
  assert.ok(!(await id.myInvitations(other)).some((i) => i.id === inv3.invitation.id));
  await assert.rejects(id.acceptInvitation(other, inv3.invitation.token), /expired/);
  assert.equal((await one('SELECT status FROM team_invitations WHERE id = ?', inv3.invitation.id)).status, 'expired');

  await id.removeMember(owner, team.id, u.member.id);
  assert.equal((await id.members(owner, team.id)).length, 1);
  await assert.rejects(id.deleteTeam(member, team.id), (e) => e.status === 403);
  await id.deleteTeam(owner, team.id);
  assert.equal(await one('SELECT id FROM teams WHERE id = ?', team.id), undefined);
});

test('teams on PostgreSQL: a failing statement rolls the whole write back', { skip }, async () => {
  const id = m.repos.repositories.identity;
  const owner = m.actor.userActor({ id: u.owner.id, role: 'owner' });
  const other = m.actor.userActor({ id: u.other.id, role: 'user' });

  // Runner batch: the second statement breaks a CHECK -> the first is gone too.
  const teamId = `team_rb_${run}`;
  await assert.rejects(m.pgRunner.batch(owner, [
    ['INSERT INTO teams (id, name, owner_id) VALUES (?, ?, ?)', teamId, 'rb', u.owner.id],
    [`INSERT INTO team_members (id, team_id, user_id, role) VALUES (?, ?, ?, 'no-such-role')`, `m_${run}`, teamId, u.owner.id],
  ]));
  assert.equal(await one('SELECT id FROM teams WHERE id = ?', teamId), undefined);

  // acceptInvitation: the member insert hits UNIQUE(team_id, user_id) ->
  // the invitation stays pending (its UPDATE is rolled back with it).
  const team = await id.createTeam(owner, { name: `rb-${run}` });
  const inv = await id.invite(owner, team.id, { email: u.other.email, role: 'user' });
  await m.pool.pgRun(`INSERT INTO team_members (id, team_id, user_id, role) VALUES (?, ?, ?, 'user')`, `dup_${run}`, team.id, u.other.id);
  await assert.rejects(id.acceptInvitation(other, inv.invitation.token));
  assert.equal((await one('SELECT status FROM team_invitations WHERE id = ?', inv.invitation.id)).status, 'pending');
  assert.equal((await one('SELECT COUNT(*) AS n FROM team_members WHERE team_id = ? AND user_id = ?', team.id, u.other.id)).n, 1);
  await id.deleteTeam(owner, team.id);
});

test('sign-in record pruning on PostgreSQL: the background prune goes through loginThrottle.prune', { skip }, async () => {
  const email = `prune-${run}@pg.test`;
  await m.pool.pgRun(`INSERT INTO login_attempts (email, success, ip_address, attempted_at) VALUES (?, 0, '10.0.0.1', now() - interval '40 days')`, email);
  await m.pool.pgRun(`INSERT INTO login_attempts (email, success, ip_address, attempted_at) VALUES (?, 0, '10.0.0.1', now())`, email);
  await m.pool.pgRun(`INSERT INTO login_devices (email, token_hash, expires_at) VALUES (?, ?, '2000-01-01 00:00:00')`, email, randomBytes(32).toString('hex'));
  const timer = m.repos.startLoginRecordPruning(60 * 60 * 1000);
  try {
    assert.equal(timer.hasRef(), false);
    await waitFor(async () => (await one('SELECT COUNT(*) AS n FROM login_devices WHERE email = ?', email)).n === 0, 'device prune');
    await waitFor(async () => (await one('SELECT COUNT(*) AS n FROM login_attempts WHERE email = ?', email)).n === 1, 'attempt prune');
  } finally {
    clearInterval(timer);
  }
  // Nothing was pruned from the SQLite file behind the driver's back: it never had these rows.
  assert.equal(m.getDatabase().prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE email = ?').get(email).n, 0);
});
