// B2.2a: identity + audit + sign-in throttle on PostgreSQL, end to end.
// Runs ONLY when AGENT_PLAYER_PG_TEST_URL names a THROWAWAY database on
// 127.0.0.1 that the PostgreSQL runner has already migrated (it writes test
// rows and never cleans up: drop the database afterwards). Otherwise every
// test skips.
//
//   createdb -h 127.0.0.1 agent_player_rehearsal
//   AGENT_PLAYER_PG_URL=postgres://127.0.0.1:5432/agent_player_rehearsal node --import tsx scripts/pg/migrate-pg.mjs
//   AGENT_PLAYER_PG_TEST_URL=postgres://127.0.0.1:5432/agent_player_rehearsal \
//     node --import tsx --test test/pg-identity.integration.test.mjs
//   dropdb -h 127.0.0.1 agent_player_rehearsal
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';

const URL_ = process.env.AGENT_PLAYER_PG_TEST_URL;
const skip = URL_ ? false : 'AGENT_PLAYER_PG_TEST_URL is not set (PostgreSQL integration test)';

let m = {};
let dir;
if (URL_) {
  dir = mkdtempSync(join(tmpdir(), 'ap-pg-identity-'));
  process.chdir(dir);
  // SQLite still backs the modules that are not ported yet: a temp file, never the real .data.
  process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
  process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
  process.env.AGENT_PLAYER_DB = 'postgres';
  process.env.AGENT_PLAYER_PG_URL = URL_;
  process.env.AGENT_PLAYER_PG_POOL_MAX = '4';

  const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
  await getDatabase().initialize();
  m = {
    closeDatabase,
    pool: await import('../src/db/pg/pool.ts'),
    migrate: await import('../src/db/pg/migrate.ts'),
    types: await import('../src/db/pg/types.ts'),
    repos: await import('../src/repositories/index.ts'),
    actor: await import('../src/repositories/actor.ts'),
    users: (await import('../src/repositories/pg/users-store.ts')).pgUsersStore,
    pgIdentity: await import('../src/repositories/pg/identity.ts'),
    Fastify: (await import('fastify')).default,
    authRoutes: (await import('../src/api/routes/auth.ts')).authRoutes,
    throttle: await import('../src/auth/account-lockout.ts'),
  };
}

const TS = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?$/;
const TEXT_TS = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const run = randomBytes(4).toString('hex');
const password = `pg-slice-${randomBytes(8).toString('hex')}`;
const email = `owner-${run}@pg.test`;
const sha256 = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
const q = (sql, ...p) => m.pool.pgAll(sql, ...p);
const one = (sql, ...p) => m.pool.pgOne(sql, ...p);
let app;
let created;

test.after(async () => {
  if (!URL_) return;
  await app?.close();
  await m.pool.closePgPool();
  m.closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

test('driver: repositories are on PostgreSQL; session is UTC; int8 overflow is refused', { skip }, async () => {
  assert.equal(m.repos.repositoryDriver, 'postgres');
  assert.equal(m.repos.repositories.identity, m.pgIdentity.pgIdentity);
  assert.equal((await one('SHOW TimeZone')).TimeZone, 'UTC');
  const r = await one('SELECT COUNT(*) AS n, 9007199254740991::bigint AS max, now() AS t, ?::text AS s', 'a?b');
  assert.equal(r.n, 1);
  assert.equal(r.max, Number.MAX_SAFE_INTEGER);
  assert.match(r.t, TS);
  assert.equal(r.s, 'a?b');
  await assert.rejects(one('SELECT 9007199254740993::bigint AS n'), m.types.Int8RangeError);
});

test('runner: a second run applies nothing; ids match the files; steady-state indexes exist', { skip }, async () => {
  const pool = await m.pool.getPgPool();
  // Two runners at once: the advisory lock serializes them, nothing is applied twice.
  const [a, b] = await Promise.all([m.migrate.runPgMigrations(pool), m.migrate.runPgMigrations(pool)]);
  for (const r of [a, b]) {
    assert.equal(r.schemaApplied, false);
    assert.deepEqual(r.applied, []);
  }
  const files = m.migrate.listPgMigrations();
  const rows = await q('SELECT id, name FROM migrations ORDER BY id');
  assert.deepEqual(rows.map((x) => x.id), files.map((f) => f.id));
  assert.ok(rows.some((x) => x.id === '040b' && x.name === '040b_memories_base_table'));
  const ix = await q(`SELECT indexname FROM pg_indexes WHERE tablename = 'audit_logs' AND indexname IN ('idx_audit_logs_user', 'idx_audit_logs_created') ORDER BY 1`);
  assert.deepEqual(ix.map((x) => x.indexname), ['idx_audit_logs_created', 'idx_audit_logs_user']);
});

test('identity: create account, user lookup and SQLite-shaped rows', { skip }, async () => {
  const id = m.repos.repositories.identity;
  created = await id.createAccount(m.actor.SYSTEM_ACTOR, { email, username: `owner_${run}`, password, full_name: 'PG Owner', role: 'admin' }, () => ({ valid: true }));
  assert.equal(created.email, email);
  assert.equal('password_hash' in created, false);
  assert.equal(created.email_verified, 1);
  assert.equal(created.token_version, 1);
  assert.match(created.created_at, TS);
  await assert.rejects(
    id.createAccount(m.actor.SYSTEM_ACTOR, { email, username: `other_${run}`, password }, () => ({ valid: true })),
    (err) => err.status === 409,
  );
  const admin = m.actor.userActor({ id: created.id, role: 'admin' });
  assert.equal((await id.self(admin)).id, created.id);
  assert.equal((await id.get(admin, created.id)).username, `owner_${run}`);
  const stranger = m.actor.userActor({ id: 'someone-else', role: 'user' });
  await assert.rejects(id.get(stranger, created.id), (err) => err.status === 404);
  assert.ok((await id.list(admin)).some((u) => u.id === created.id));
  assert.ok((await id.countByRole(admin)).admin >= 1);
  await id.updateProfile(admin, { fullName: null, email: null, username: null, bio: 'hello', company: null, location: null, website: null, timezone: 'Europe/Berlin' });
  const p = await id.profile(admin);
  assert.equal(p.bio, 'hello');
  assert.equal(p.timezone, 'Europe/Berlin');
  assert.equal(p.full_name, 'PG Owner');
  // B2.2b: teams are on PostgreSQL now (pg-auth-teams.integration.test.mjs covers them).
  assert.deepEqual(await id.teams(admin), []);
});

test('identity: signIn ok / wrong password / unknown; endSessions bumps token_version', { skip }, async () => {
  const id = m.repos.repositories.identity;
  const ok = await id.signIn(email, password);
  assert.equal(ok.status, 'ok');
  assert.equal(typeof ok.token, 'string');
  assert.equal(ok.user.id, created.id);
  assert.match((await m.users.findById(created.id)).last_login_at, TS);
  assert.equal((await id.signIn(email, 'wrong-password-1')).status, 'bad_password');
  assert.equal((await id.signIn(`nobody-${run}@pg.test`, password)).status, 'unknown');
  const self = m.actor.userActor({ id: created.id, role: 'admin' });
  assert.equal((await id.endSessions(self)).username, `owner_${run}`);
  assert.equal((await m.users.findById(created.id)).token_version, 2);
});

test('login route on PostgreSQL: throttle rows, 429, device token rotation', { skip }, async () => {
  app = m.Fastify();
  await app.register(m.authRoutes);
  await app.ready();
  const login = (ip, pw, deviceToken) => app.inject({
    method: 'POST', url: '/api/auth/login', remoteAddress: ip,
    payload: deviceToken === undefined ? { email, password: pw } : { email, password: pw, deviceToken },
  });

  const ip = `127.0.${Number.parseInt(run.slice(0, 2), 16)}.${Number.parseInt(run.slice(2, 4), 16)}`;
  const first = await login(ip, password);
  assert.equal(first.statusCode, 200, first.body);
  const t1 = first.json().deviceToken;
  assert.ok(m.throttle.parseDeviceToken(t1));

  for (let i = 0; i < m.throttle.PAIR_FREE_FAILURES; i++) assert.equal((await login(ip, 'wrong-password-1')).statusCode, 401);
  const fails = await one(`SELECT COUNT(*) AS n FROM login_attempts WHERE email = ? AND ip_address = ? AND success = 0`, email, ip);
  assert.equal(fails.n, m.throttle.PAIR_FREE_FAILURES);
  const limited = await login(ip, password);
  assert.equal(limited.statusCode, 429);
  assert.equal(limited.json().code, 'rate_limited');
  const retry = Number(limited.headers['retry-after']);
  assert.ok(retry > 0 && retry <= m.throttle.BASE_DELAY_SECONDS, `retry-after ${retry}`);

  // A valid device token skips the pair bucket and rotates on success.
  const viaDevice = await login(ip, password, t1);
  assert.equal(viaDevice.statusCode, 200, viaDevice.body);
  const t2 = viaDevice.json().deviceToken;
  assert.notEqual(t2, t1);
  assert.equal(await m.repos.loginThrottle.hasValidDevice(email, t1), false);
  assert.equal(await m.repos.loginThrottle.hasValidDevice(email, t2), true);
  assert.equal((await one('SELECT COUNT(*) AS n FROM login_devices WHERE token_hash = ?', sha256(t1))).n, 0);
  const dev = await one('SELECT failed_count, expires_at, created_at, last_failed_at FROM login_devices WHERE token_hash = ?', sha256(t2));
  assert.equal(dev.failed_count, 0);
  assert.match(dev.expires_at, TEXT_TS);
  assert.match(dev.created_at, TEXT_TS);
  assert.equal(dev.last_failed_at, null);

  // A failure with the device token counts on the device, as a text timestamp.
  assert.equal((await login(ip, 'wrong-password-1', t2)).statusCode, 401);
  const dev2 = await one('SELECT failed_count, last_failed_at FROM login_devices WHERE token_hash = ?', sha256(t2));
  assert.equal(dev2.failed_count, 1);
  assert.match(dev2.last_failed_at, TEXT_TS);
  const st = await m.repos.loginThrottle.check(email, ip, t2);
  assert.equal(st.throttled, false);

  // Expired device tokens and old attempts are pruned.
  const pruned = await m.repos.loginThrottle.prune(Date.now() + (m.throttle.DEVICE_TOKEN_DAYS + 1) * 86_400_000);
  assert.ok(pruned.devices >= 1);
  assert.equal(await m.repos.loginThrottle.hasValidDevice(email, t2), false);
});

test('audit: record writes audit_logs in PostgreSQL and reads back', { skip }, async () => {
  const self = m.actor.userActor({ id: created.id, role: 'admin' });
  await m.repos.repositories.audit.record(self, {
    event_type: 'data.update', event_category: 'data_modification', resource_type: 'profile', resource_id: run,
    action: 'update', success: true, metadata: { run, n: 1 },
  }, { ip: '127.0.0.1', userAgent: 'pg-test', method: 'PUT', path: '/api/profile' });
  const row = await one('SELECT * FROM audit_logs WHERE resource_id = ?', run);
  assert.equal(typeof row.id, 'number');
  assert.equal(row.user_id, created.id);
  assert.equal(row.success, 1);
  assert.equal(row.severity, 'info');
  assert.equal(row.request_path, '/api/profile');
  assert.deepEqual(JSON.parse(row.metadata), { run, n: 1 });
  assert.match(row.created_at, TS);
  // Reads of the security event log need owner/admin (same scope as SQLite).
  await assert.rejects(m.repos.repositories.audit.recent(m.actor.userActor({ id: created.id, role: 'user' }), 5), (err) => err.status === 403);
});

test('transactions: rollback on error, savepoints for nested calls, aborted commit refused', { skip }, async () => {
  const self = m.actor.userActor({ id: created.id, role: 'admin' });
  const bio = async () => (await m.users.profile(created.id)).bio;
  const setBio = (v) => m.pool.pgRun('UPDATE users SET bio = ? WHERE id = ?', v, created.id);

  // Error -> everything rolled back, original error rethrown.
  await assert.rejects(m.repos.withPgActorTransaction(self, async () => {
    await setBio('in-tx');
    assert.equal(await bio(), 'in-tx'); // same client sees its own write
    await m.repos.repositories.audit.record(self, { event_type: 'data.update', event_category: 'data_modification', resource_id: `${run}-rb`, success: true });
    throw new Error('boom');
  }), /boom/);
  assert.equal(await bio(), 'hello');
  assert.equal((await one('SELECT COUNT(*) AS n FROM audit_logs WHERE resource_id = ?', `${run}-rb`)).n, 0);

  // Nested: the inner failure rolls back only the inner part.
  await m.repos.withPgActorTransaction(self, async () => {
    await setBio('outer');
    await assert.rejects(m.repos.withPgActorTransaction(self, async () => { await setBio('inner'); throw new Error('inner'); }), /inner/);
    assert.equal(await bio(), 'outer');
    await m.repos.withPgActorTransaction(self, async () => setBio('inner-ok'));
  });
  assert.equal(await bio(), 'inner-ok');

  // A failed audit insert (unknown user -> FK) inside a transaction is
  // swallowed in its savepoint; the caller's transaction still commits.
  await m.repos.withPgActorTransaction(self, async () => {
    await m.repos.repositories.audit.record(self, { event_type: 'data.update', event_category: 'data_modification', user_id: `no-such-user-${run}`, resource_id: `${run}-fk`, success: false });
    await setBio('after-audit-failure');
  });
  assert.equal(await bio(), 'after-audit-failure');
  assert.equal((await one('SELECT COUNT(*) AS n FROM audit_logs WHERE resource_id = ?', `${run}-fk`)).n, 0);

  // Two nested transactions at the same time on one client are refused.
  await assert.rejects(m.repos.withPgActorTransaction(self, async () => {
    await Promise.all([
      m.repos.withPgActorTransaction(self, () => setBio('a')),
      m.repos.withPgActorTransaction(self, () => setBio('b')),
    ]);
  }), m.pool.PgTransactionError);
  assert.equal(await bio(), 'after-audit-failure');

  // A statement error caught inside fn aborts the transaction: COMMIT is refused, not reported as success.
  await assert.rejects(m.repos.withPgActorTransaction(self, async () => {
    await setBio('lost');
    await m.pool.pgRun('SELECT * FROM no_such_table_b22a').catch(() => undefined);
  }), m.pool.PgTransactionError);
  assert.equal(await bio(), 'after-audit-failure');

  // Work started inside a transaction but not awaited (it runs after the
  // transaction ended) is refused instead of running on a released client.
  let late;
  await m.repos.withPgActorTransaction(self, async () => {
    late = new Promise((r) => setTimeout(r, 50)).then(() => setBio('late'));
    late.catch(() => undefined);
  });
  await assert.rejects(late, m.pool.PgTransactionError);
  assert.equal(await bio(), 'after-audit-failure');
});
