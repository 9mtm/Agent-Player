// B2.2b-2: credentials, the credential vault and the key manager on
// PostgreSQL, end to end.
// Runs ONLY when AGENT_PLAYER_PG_TEST_URL names a THROWAWAY database on
// 127.0.0.1 that the PostgreSQL runner has already migrated (it writes test
// rows and never cleans up: drop the database afterwards). Otherwise every
// test skips. scripts/pg/integration.sh runs it.
//
// All secrets are random, test-only values. Plaintext never reaches a stored
// row: checked over every text column of credentials, vault_credentials,
// vault_keys and audit_logs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const URL_ = process.env.AGENT_PLAYER_PG_TEST_URL;
const skip = URL_ ? false : 'AGENT_PLAYER_PG_TEST_URL is not set (PostgreSQL integration test)';

let m = {};
let dir;
if (URL_) {
  dir = mkdtempSync(join(tmpdir(), 'ap-pg-credentials-'));
  mkdirSync(join(dir, '.data', 'audit'), { recursive: true });
  process.chdir(dir);
  process.env.HOME = dir; // credential JSON backups go to ~/.agent-player
  // SQLite still backs the modules that are not ported yet: a temp file, never the real .data.
  process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
  process.env.ENCRYPTION_DB_PATH = join(dir, '.data', 'encryption', 'credentials.db');
  process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
  process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
  process.env.MASTER_ENCRYPTION_KEY = randomBytes(32).toString('base64'); // throwaway, test only
  process.env.AGENT_PLAYER_DB = 'postgres';
  process.env.AGENT_PLAYER_PG_URL = URL_;
  process.env.AGENT_PLAYER_PG_POOL_MAX = '4';

  const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
  await getDatabase().initialize();
  m = {
    closeDatabase,
    pool: await import('../src/db/pg/pool.ts'),
    repos: await import('../src/repositories/index.ts'),
    pgCredentials: (await import('../src/repositories/pg/credentials.ts')).pgCredentials,
    actor: await import('../src/repositories/actor.ts'),
    users: (await import('../src/repositories/pg/users-store.ts')).pgUsersStore,
    storage: await import('../src/credentials/storage.ts'),
    manager: await import('../src/credentials/manager.ts'),
    credEncryption: await import('../src/credentials/encryption.ts'),
    crypto: await import('../src/encryption/crypto-utils.ts'),
    enc: await import('../src/encryption/index.ts'),
    rowStore: await import('../src/encryption/row-store.ts'),
    audit: await import('../src/services/audit-logger.ts'),
    securityAudit: await import('../src/audit/index.ts'),
    jwt: await import('../src/auth/jwt.ts'),
    gate: await import('../src/auth/auth-gate.ts'),
    errors: await import('../src/api/error-handler.ts'),
    encryptionRoutes: (await import('../src/api/routes/encryption.ts')).encryptionRoutes,
    Fastify: (await import('fastify')).default,
  };
}

const run = randomBytes(4).toString('hex');
const one = (sql, ...p) => m.pool.pgOne(sql, ...p);
const all = (sql, ...p) => m.pool.pgAll(sql, ...p);
const secret = (tag) => `pgtest-${tag}-${randomBytes(12).toString('hex')}`;
const plaintexts = [];
const keep = (s) => { plaintexts.push(s); return s; };
const silent = async (fn) => {
  const s = { ...console };
  console.log = () => {}; console.info = () => {}; console.warn = () => {};
  try { return await fn(); } finally { Object.assign(console, s); }
};

const u = {};
const A = {};
let app;
let km;
let vault;
const seenAccess = [];
let originalLogAccess;

test.before(async () => {
  if (!URL_) return;
  const mk = (name, role) => m.users.create({ email: `${name}-${run}@pg.test`, username: `${name}_${run}`, password: `pw-${randomBytes(8).toString('hex')}`, role });
  u.owner = await mk('cowner', 'owner');
  u.admin = await mk('cadmin', 'admin');
  u.user = await mk('cuser', 'user');
  A.owner = m.actor.userActor({ id: u.owner.id, role: 'owner' });
  A.admin = m.actor.userActor({ id: u.admin.id, role: 'admin' });
  A.user = m.actor.userActor({ id: u.user.id, role: 'user' });

  await silent(() => m.storage.getCredentialStorage().initialize());
  const r = await silent(() => m.enc.initializeEncryption());
  km = r.keyManager;
  vault = r.vault;

  app = m.Fastify();
  m.errors.registerGlobalErrorHandler(app);
  m.gate.registerAuthGate(app);
  await app.register(m.encryptionRoutes);
  await app.ready();

  const logger = m.securityAudit.getAuditLogger();
  originalLogAccess = logger.logAccess;
  logger.logAccess = function (action, actor, resource, result, ...rest) {
    seenAccess.push({ action, actor, resource, result });
    return originalLogAccess.call(this, action, actor, resource, result, ...rest);
  };
});

test.after(async () => {
  if (!URL_) return;
  m.securityAudit.getAuditLogger().logAccess = originalLogAccess;
  await app?.close();
  await m.audit.flushAuditWrites();
  m.enc.shutdownEncryption();
  await m.pool.closePgPool();
  m.closeDatabase();
  process.chdir(tmpdir());
  rmSync(dir, { recursive: true, force: true });
});

const bearer = (id) => ({ authorization: `Bearer ${m.jwt.generateToken(id, 1)}` });
const inject = (opts) => silent(() => app.inject(opts));

test('driver: credentials, vault and key manager run on PostgreSQL; no SQLite encryption files', { skip }, async () => {
  assert.equal(m.repos.repositoryDriver, 'postgres');
  assert.equal(m.repos.repositories.credentials, m.pgCredentials);
  assert.equal(km.rows, m.rowStore.pgRowStore);
  assert.equal(vault.rows, m.rowStore.pgRowStore);
  for (const t of ['credentials', 'vault_credentials', 'vault_keys', 'idx_credentials_name_user', 'idx_cred_owner', 'idx_keys_active']) {
    assert.equal((await one('SELECT to_regclass(?) IS NOT NULL AS ok', t)).ok, true, t);
  }
  const applied = (await all(`SELECT id FROM migrations WHERE id LIKE 'r%' ORDER BY id`)).map((r) => r.id);
  assert.deepEqual(applied, ['r001', 'r002', 'r003']);
  assert.equal(existsSync(join(dir, '.data', 'encryption')), false, 'no keys.db / credentials.db on PostgreSQL');
  // The SQLite main database never got the credentials rows either.
  assert.equal(m.repos.repositoriesFor('sqlite').credentials === m.pgCredentials, false);
});

test('credentials: store, reveal (server side only), masked hint; ciphertext only in PostgreSQL', { skip }, async () => {
  const value = keep(secret('own'));
  const c = await silent(() => m.pgCredentials.create(A.owner, { name: `own-${run}`, type: 'api_key', value, userId: u.admin.id }));
  assert.equal(c.userId, u.owner.id, 'the owner is always the actor (input userId ignored)');
  const row = await one('SELECT * FROM credentials WHERE id = ?', c.id);
  assert.equal(row.user_id, u.owner.id);
  assert.notEqual(row.encrypted_value, value);
  assert.ok(!row.encrypted_value.includes(value));
  assert.match(row.iv, /^[0-9a-f]+$/i);
  assert.match(row.auth_tag, /^[0-9a-f]+$/i);
  assert.match(row.created_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, 'ISO text, as on SQLite');
  // Same encryption service as SQLite decrypts the stored row.
  assert.equal(await m.credEncryption.getEncryptionService().decrypt(row.encrypted_value, row.iv, row.auth_tag), value);
  assert.equal(await m.manager.credentialManagerFor('postgres').getValue(c.id), value);
  const masked = await m.pgCredentials.maskedValue(A.owner, c.id);
  assert.equal(masked, `••••${value.slice(-4)}`);
  assert.equal(await m.pgCredentials.test(A.owner, c.id), true);
  // last_used is touched by a read
  assert.ok((await one('SELECT last_used FROM credentials WHERE id = ?', c.id)).last_used);
  // JSON backup file holds the ciphertext, never the value
  const backupDir = join(dir, '.agent-player', 'credentials', u.owner.id);
  const files = readdirSync(backupDir);
  assert.ok(files.length >= 1);
  for (const f of files) assert.ok(!readFileSync(join(backupDir, f), 'utf8').includes(value));
});

test('credentials scope: owner sees all (masked, audited); admin only own; plain user refused', { skip }, async () => {
  const adminValue = keep(secret('admin'));
  const ac = await silent(() => m.pgCredentials.create(A.admin, { name: `adm-${run}`, type: 'secret', value: adminValue, skillId: `skill-${run}` }));
  const oc = await silent(() => m.pgCredentials.create(A.owner, { name: `own2-${run}`, type: 'secret', value: keep(secret('own2')), skillId: `skill-${run}` }));

  // Owner lists everything; the touch of the admin's credential is audited (ids only).
  const meta = { ip: '127.0.0.1', path: '/api/credentials', method: 'GET' };
  const listed = await m.pgCredentials.list(A.owner, {}, meta);
  assert.ok(listed.some((c) => c.id === ac.id) && listed.some((c) => c.id === oc.id));
  const auditRow = await one(`SELECT * FROM audit_logs WHERE action = 'credentials.list.other_user' AND user_id = ? ORDER BY id DESC LIMIT 1`, u.owner.id);
  assert.ok(auditRow, 'cross-user list is audited in PostgreSQL audit_logs');
  const md = JSON.parse(auditRow.metadata);
  assert.ok(md.credentialIds.includes(ac.id));
  assert.ok(md.ownerUserIds.includes(u.admin.id));
  assert.ok(!md.credentialIds.includes(oc.id), 'own credentials are not cross-user');
  assert.equal(auditRow.ip_address, '127.0.0.1');
  assert.ok(!auditRow.metadata.includes(adminValue) && !auditRow.metadata.includes(`adm-${run}`), 'no values or names in the audit entry');

  // by skill: owner sees both, admin only own
  assert.equal((await m.pgCredentials.list(A.owner, { skillId: `skill-${run}` })).length, 2);
  const adminSkill = await m.pgCredentials.list(A.admin, { skillId: `skill-${run}` });
  assert.deepEqual(adminSkill.map((c) => c.id), [ac.id]);

  // Owner gets / masks / updates the admin's credential: masked only, audited.
  await m.pgCredentials.get(A.owner, ac.id, meta);
  assert.ok(await one(`SELECT id FROM audit_logs WHERE action = 'credentials.get.other_user' AND resource_id = ?`, ac.id));
  assert.equal(await m.pgCredentials.maskedValue(A.owner, ac.id), `••••${adminValue.slice(-4)}`);
  const newAdminValue = keep(secret('admin-new'));
  await silent(() => m.pgCredentials.update(A.owner, ac.id, { value: newAdminValue, description: 'rotated' }, meta));
  assert.ok(await one(`SELECT id FROM audit_logs WHERE action = 'credentials.update.other_user' AND resource_id = ? AND event_type = 'data.update'`, ac.id));
  assert.equal(await m.manager.credentialManagerFor('postgres').getValue(ac.id), newAdminValue);
  // a masked placeholder keeps the stored value
  await silent(() => m.pgCredentials.update(A.admin, ac.id, { value: `••••${newAdminValue.slice(-4)}` }));
  assert.equal(await m.manager.credentialManagerFor('postgres').getValue(ac.id), newAdminValue);

  // Admin: own only; the owner's credential looks missing.
  await assert.rejects(m.pgCredentials.get(A.admin, oc.id), (e) => e.status === 404);
  await assert.rejects(m.pgCredentials.maskedValue(A.admin, oc.id), (e) => e.status === 404);
  await assert.rejects(m.pgCredentials.update(A.admin, oc.id, { value: 'x' }), (e) => e.status === 404);
  await assert.rejects(m.pgCredentials.delete(A.admin, oc.id), (e) => e.status === 404);
  assert.ok((await m.pgCredentials.list(A.admin)).every((c) => c.userId === u.admin.id));
  // Plain users and no actor are refused.
  await assert.rejects(m.pgCredentials.list(A.user), (e) => e.status === 403);
  await assert.rejects(m.pgCredentials.list(null), (e) => e.status === 401 || e.status === 403);

  // Backup export: own (+ unowned for the owner), ciphertext only
  const exported = await m.pgCredentials.exportBackup(A.owner);
  assert.ok(exported.some((c) => c.id === oc.id));
  assert.ok(!exported.some((c) => c.id === ac.id), "another user's ciphertext never leaves");

  // Owner deletes the admin's credential: audited as a warning.
  await silent(() => m.pgCredentials.delete(A.owner, ac.id, meta));
  const del = await one(`SELECT severity FROM audit_logs WHERE action = 'credentials.delete.other_user' AND resource_id = ?`, ac.id);
  assert.equal(del.severity, 'warning');
  assert.equal(await one('SELECT id FROM credentials WHERE id = ?', ac.id), undefined);
});

test('credentials saveOwnByName: a member creates then replaces their own credential', { skip }, async () => {
  const v1 = keep(secret('save1'));
  const v2 = keep(secret('save2'));
  const first = await silent(() => m.pgCredentials.saveOwnByName(A.user, { name: `tool-${run}`, type: 'api_key', value: v1 }));
  assert.equal(first.created, true);
  assert.equal(first.credential.userId, u.user.id);
  const second = await silent(() => m.pgCredentials.saveOwnByName(A.user, { name: `tool-${run}`, type: 'api_key', value: v2 }));
  assert.equal(second.created, false);
  assert.equal(second.credential.id, first.credential.id);
  assert.equal(await m.manager.credentialManagerFor('postgres').getValue(first.credential.id), v2);
  assert.equal((await one('SELECT COUNT(*) AS n FROM credentials WHERE name = ? AND user_id = ?', `tool-${run}`, u.user.id)).n, 1);
});

test('credentials update in a transaction: a later failure rolls the change back', { skip }, async () => {
  const before = keep(secret('tx-before'));
  const c = await silent(() => m.pgCredentials.create(A.owner, { name: `tx-${run}`, type: 'secret', value: before }));
  const rowBefore = await one('SELECT encrypted_value, iv, auth_tag, updated_at FROM credentials WHERE id = ?', c.id);
  await assert.rejects(m.repos.withPgActorTransaction(A.owner, async (a) => {
    await silent(() => m.pgCredentials.update(a, c.id, { value: keep(secret('tx-after')), description: 'never' }));
    // inside the transaction the new value is visible
    assert.notEqual((await one('SELECT encrypted_value FROM credentials WHERE id = ?', c.id)).encrypted_value, rowBefore.encrypted_value);
    throw new Error('boom after update');
  }), /boom after update/);
  const rowAfter = await one('SELECT encrypted_value, iv, auth_tag, updated_at, description FROM credentials WHERE id = ?', c.id);
  assert.deepEqual({ ...rowAfter, description: undefined }, { ...rowBefore, description: undefined });
  assert.equal(rowAfter.description, null);
  assert.equal(await m.manager.credentialManagerFor('postgres').getValue(c.id), before);

  // FU-05: the JSON backup follows the commit: the rolled-back update left the old ciphertext.
  const backupFile = join(dir, '.agent-player', 'credentials', u.owner.id, `tx-${run}.json`);
  const backup = () => JSON.parse(readFileSync(backupFile, 'utf8'));
  assert.equal(backup().encryptedValue, rowBefore.encrypted_value);
  assert.equal(backup().iv, rowBefore.iv);
  assert.equal(statSync(backupFile).mode & 0o777, 0o600);
  assert.deepEqual(readdirSync(join(dir, '.agent-player', 'credentials', u.owner.id)).filter((f) => f.endsWith('.tmp')), []);

  // Inside a transaction that commits, the backup is written after COMMIT only.
  let seenInside;
  await m.repos.withPgActorTransaction(A.owner, async (a) => {
    await silent(() => m.pgCredentials.update(a, c.id, { value: keep(secret('tx-commit')) }));
    seenInside = backup().encryptedValue;
  });
  assert.equal(seenInside, rowBefore.encrypted_value, 'not written before COMMIT');
  const committed = await one('SELECT encrypted_value FROM credentials WHERE id = ?', c.id);
  assert.notEqual(committed.encrypted_value, rowBefore.encrypted_value);
  assert.equal(backup().encryptedValue, committed.encrypted_value, 'written after COMMIT');
  assert.equal(statSync(backupFile).mode & 0o777, 0o600);
  // Back to the first value (committed), for the checks below.
  await silent(() => m.manager.credentialManagerFor('postgres').update(c.id, { value: before }));

  // storage.save is itself one transaction: a failing INSERT keeps the old row.
  const storage = m.storage.credentialStorageFor('postgres');
  const cur = await storage.get(c.id);
  const backupBeforeFail = readFileSync(backupFile, 'utf8');
  await assert.rejects(storage.save({ ...cur, name: null }));
  assert.ok(await one('SELECT id FROM credentials WHERE id = ?', c.id), 'DELETE rolled back with the failed INSERT');
  assert.equal(await m.manager.credentialManagerFor('postgres').getValue(c.id), before);
  assert.equal(readFileSync(backupFile, 'utf8'), backupBeforeFail, 'a failed save never touches the backup');

  // INSERT OR REPLACE semantics as on SQLite: a new id with the same (name, user) replaces the old row.
  await silent(() => storage.save({ ...cur, id: `${c.id}-replaced` }));
  assert.equal(await one('SELECT id FROM credentials WHERE id = ?', c.id), undefined);
  assert.equal((await one('SELECT COUNT(*) AS n FROM credentials WHERE name = ? AND user_id = ?', `tx-${run}`, u.owner.id)).n, 1);
});

test('afterPgCommit: runs after COMMIT; dropped with a rolled-back transaction or savepoint', { skip }, async () => {
  const ran = [];
  await m.pool.afterPgCommit(() => ran.push('outside'));
  assert.deepEqual(ran, ['outside'], 'outside a transaction: right away');
  await m.pool.withPgTransaction(async () => {
    await m.pool.afterPgCommit(() => ran.push('outer'));
    await m.pool.withPgTransaction(async () => { await m.pool.afterPgCommit(() => ran.push('released')); });
    await assert.rejects(m.pool.withPgTransaction(async () => {
      await m.pool.afterPgCommit(() => ran.push('savepoint-rolled-back'));
      throw new Error('inner boom');
    }), /inner boom/);
    assert.deepEqual(ran, ['outside'], 'nothing runs before COMMIT');
  });
  assert.deepEqual(ran, ['outside', 'outer', 'released']);
  await assert.rejects(m.pool.withPgTransaction(async () => {
    await m.pool.afterPgCommit(() => ran.push('rolled-back'));
    throw new Error('outer boom');
  }), /outer boom/);
  assert.deepEqual(ran, ['outside', 'outer', 'released']);
});

test('key manager: metadata rows in vault_keys (master KDF config, wrapped data keys)', { skip }, async () => {
  const master = await one(`SELECT * FROM vault_keys WHERE type = 'master' AND active = 1`);
  assert.ok(master, 'master KDF config row');
  assert.equal(master.encrypted_key, null, 'the master key itself is never stored');
  const kdf = JSON.parse(master.kdf_config);
  assert.equal(kdf.keyLength, 32);
  assert.ok(kdf.salt && kdf.iterations > 0);
  assert.ok(!master.kdf_config.includes(process.env.MASTER_ENCRYPTION_KEY));

  const data = await all(`SELECT * FROM vault_keys WHERE type = 'data' AND active = 1`);
  assert.equal(data.length, 1);
  const wrapped = JSON.parse(data[0].encrypted_key);
  assert.equal(wrapped.algorithm, 'aes-256-gcm');
  assert.equal(wrapped.keyId, 'master');
  assert.ok(wrapped.iv && wrapped.authTag && wrapped.ciphertext);
  assert.equal(data[0].active, 1, 'int8 read as a number, as on SQLite');
  assert.match(data[0].created_at, /^\d{4}-\d{2}-\d{2}T/);

  // listKeys / getKeyById are async on PostgreSQL and give KeyEntry objects
  const listed = await km.listKeys('data');
  assert.ok(listed.some((k) => k.id === data[0].id && k.active === true));
  const entry = await km.getKeyById(data[0].id);
  assert.equal(entry.id, data[0].id);
  assert.ok(entry.createdAt instanceof Date);
  // The raw data key (from the cache) is not in any row.
  const { key } = await km.getCurrentKey();
  const rawB64 = key.toString('base64');
  const rawHex = key.toString('hex');
  for (const r of await all('SELECT row_to_json(k)::text AS j FROM vault_keys k')) {
    assert.ok(!r.j.includes(rawB64) && !r.j.includes(rawHex));
  }
  const stats = km.getStats();
  assert.ok(stats.activeKeys >= 2); // master + data
});

test('vault: store, masked retrieve, owner vs non-owner, audit; rows hold ciphertext only', { skip }, async () => {
  const data = { apiKey: keep(secret('vault')), region: 'eu-test' };
  seenAccess.length = 0;
  const res = await inject({ method: 'POST', url: '/api/vault/credentials', headers: bearer(u.owner.id), payload: { name: `Vault-${run}`, type: 'api_key', service: `Svc-${run}`, data, ownerId: u.user.id, ownerType: 'system' } });
  assert.equal(res.statusCode, 200, res.body);
  const id = res.json().credential.id;
  const entry = await vault.getById(id);
  assert.equal(entry.ownerId, u.owner.id, 'owner from the actor, never the body');
  assert.equal(entry.ownerType, 'user');
  assert.equal(entry.accessCount, 0);
  assert.deepEqual(seenAccess.map((s) => [s.action, s.actor.type, s.actor.id, s.result]), [['write', 'user', u.owner.id, 'success']]);

  const row = await one('SELECT * FROM vault_credentials WHERE id = ?', id);
  assert.ok(!row.encrypted_data.includes(data.apiKey));
  const envelope = JSON.parse(row.encrypted_data);
  assert.equal(envelope.algorithm, 'aes-256-gcm');
  // The stored envelope decrypts with the unchanged crypto-utils and the key manager's key.
  const plain = m.crypto.decrypt(envelope, await km.getKey(envelope.keyId)).toString('utf8');
  assert.deepEqual(JSON.parse(plain), data);

  // Retrieve through the route: every field masked, audited, access counted.
  seenAccess.length = 0;
  const got = await inject({ method: 'POST', url: `/api/vault/credentials/${id}/retrieve`, headers: bearer(u.owner.id), payload: { requesterId: u.user.id } });
  assert.equal(got.statusCode, 200, got.body);
  assert.equal(got.json().masked, true);
  assert.equal(got.json().data.apiKey, `••••${data.apiKey.slice(-4)}`);
  assert.ok(!got.body.includes(data.apiKey));
  assert.deepEqual(seenAccess.map((s) => [s.action, s.actor.id, s.result]), [['read', u.owner.id, 'success']]);
  const after = await vault.getById(id);
  assert.equal(after.accessCount, 1);
  assert.ok(after.lastAccessedAt instanceof Date);

  // Server-side reveal returns the plaintext (never sent to a client).
  const revealed = await vault.retrieve(id);
  assert.deepEqual(revealed.data, data);

  // Vault routes are owner-only behind the gate; a non-owner gets 403 before the handler.
  const denied = await inject({ method: 'POST', url: `/api/vault/credentials/${id}/retrieve`, headers: bearer(u.user.id) });
  assert.equal(denied.statusCode, 403, denied.body);
  assert.equal((await vault.getById(id)).accessCount, 2, 'a refused read never decrypts');

  // query: case-insensitive search like SQLite LIKE, metadata only
  const q = await inject({ method: 'GET', url: `/api/vault/credentials?search=${encodeURIComponent(`svc-${run}`.toLowerCase())}`, headers: bearer(u.owner.id) });
  assert.equal(q.statusCode, 200, q.body);
  assert.deepEqual(q.json().credentials.map((c) => c.id), [id]);
  assert.ok(!q.body.includes('ciphertext'));
});

test('vault: update re-encrypts, expiry filters, stats, delete', { skip }, async () => {
  const stored = await vault.store({ name: `exp-${run}`, type: 'api_key', data: { k: keep(secret('exp')) }, ownerId: u.owner.id, ownerType: 'user', expiresAt: new Date(Date.now() - 60_000), tags: [`Tag${run}`] });
  const live = await vault.store({ name: `live-${run}`, type: 'password', data: { k: keep(secret('live')) }, ownerId: u.owner.id, ownerType: 'user', expiresAt: new Date(Date.now() + 3 * 86_400_000), tags: [`Tag${run}`] });
  const byTag = await vault.query({ tags: [`tag${run}`] });
  assert.deepEqual(byTag.map((c) => c.id), [live.id], 'expired excluded by default; tag match ignores case');
  assert.equal((await vault.query({ tags: [`Tag${run}`], includeExpired: true })).length, 2);
  await assert.rejects(vault.retrieve(stored.id), /expired/);
  const stats = await vault.getStats();
  assert.ok(stats.expired >= 1 && stats.expiringSoon >= 1 && stats.totalCredentials >= 3);
  assert.ok(stats.byType.api_key >= 1 && stats.byOwnerType.user >= 3);
  const status = await m.enc.getEncryptionStatus();
  assert.equal(status.initialized, true);
  assert.equal(status.vaultStats.totalCredentials, stats.totalCredentials);

  const before = (await one('SELECT encrypted_data FROM vault_credentials WHERE id = ?', live.id)).encrypted_data;
  const newData = { k: keep(secret('live-new')) };
  const updated = await vault.update(live.id, { data: newData, service: 'svc2' });
  assert.equal(updated.service, 'svc2');
  const afterRow = (await one('SELECT encrypted_data FROM vault_credentials WHERE id = ?', live.id)).encrypted_data;
  assert.notEqual(afterRow, before);
  assert.deepEqual((await vault.retrieve(live.id)).data, newData);

  assert.equal(await vault.delete(stored.id), true);
  assert.equal(await vault.delete(stored.id), false);
  assert.equal(await vault.getById(stored.id), null);
});

test('key rotation: one transaction; a failure keeps the old key active; old ciphertext stays readable', { skip }, async () => {
  const entry = await vault.store({ name: `rot-${run}`, type: 'api_key', data: { k: keep(secret('rot')) }, ownerId: u.owner.id, ownerType: 'user' });
  const activeBefore = (await all(`SELECT id FROM vault_keys WHERE type = 'data' AND active = 1 ORDER BY id`)).map((r) => r.id);
  const countBefore = (await one('SELECT COUNT(*) AS n FROM vault_keys')).n;

  // Make the INSERT of the new key fail: the deactivation before it must roll back.
  const realRows = km.rows;
  km.rows = { ...realRows, run: (sql, ...p) => (/INSERT INTO vault_keys/.test(sql) ? Promise.reject(new Error('insert refused (test)')) : realRows.run(sql, ...p)) };
  try {
    await assert.rejects(silent(() => km.rotateKeys()), /insert refused/);
  } finally {
    km.rows = realRows;
  }
  assert.deepEqual((await all(`SELECT id FROM vault_keys WHERE type = 'data' AND active = 1 ORDER BY id`)).map((r) => r.id), activeBefore);
  assert.equal((await one('SELECT COUNT(*) AS n FROM vault_keys')).n, countBefore);

  // A real rotation: exactly one new active data key, the old ones inactive.
  const fresh = await silent(() => km.rotateKeys());
  const activeAfter = (await all(`SELECT id FROM vault_keys WHERE type = 'data' AND active = 1`)).map((r) => r.id);
  assert.deepEqual(activeAfter, [fresh.id]);
  for (const id of activeBefore) assert.equal((await one('SELECT active FROM vault_keys WHERE id = ?', id)).active, 0);
  // Entries encrypted with the old key still decrypt (key looked up by id).
  assert.equal(typeof (await vault.retrieve(entry.id)).data.k, 'string');

  // FU-05: getCurrentKey names the new active key even with the old one cached.
  assert.equal(JSON.parse((await one('SELECT encrypted_data FROM vault_credentials WHERE id = ?', entry.id)).encrypted_data).keyId, activeBefore[0]);
  await km.getKey(activeBefore[0]);
  assert.equal((await km.getCurrentKey()).keyId, fresh.id);

  // Re-encryption moves every entry to the new key; they still decrypt afterwards.
  const beforeRe = (await one('SELECT encrypted_data FROM vault_credentials WHERE id = ?', entry.id)).encrypted_data;
  const n = await silent(() => vault.reEncryptAll());
  const rows = await all('SELECT id, encrypted_data FROM vault_credentials');
  assert.equal(n, rows.length);
  for (const r of rows) assert.equal(JSON.parse(r.encrypted_data).keyId, fresh.id, `row ${r.id} on the new key`);
  assert.notEqual((await one('SELECT encrypted_data FROM vault_credentials WHERE id = ?', entry.id)).encrypted_data, beforeRe);
  assert.equal(typeof (await vault.retrieve(entry.id)).data.k, 'string');
});

test('expiry within the same day: now+1h live, now-1h expired (vault and keys)', { skip }, async () => {
  const H = 3_600_000;
  const soon = await vault.store({ name: `day-soon-${run}`, type: 'api_key', data: { k: keep(secret('day-soon')) }, ownerId: `day-${run}`, ownerType: 'user', expiresAt: new Date(Date.now() + H) });
  const gone = await vault.store({ name: `day-gone-${run}`, type: 'api_key', data: { k: keep(secret('day-gone')) }, ownerId: `day-${run}`, ownerType: 'user', expiresAt: new Date(Date.now() - H) });
  assert.deepEqual((await vault.query({ ownerId: `day-${run}` })).map((c) => c.id), [soon.id]);
  assert.equal((await vault.query({ ownerId: `day-${run}`, includeExpired: true })).length, 2);
  assert.ok(gone.id);

  const current = (await km.getCurrentKey()).keyId;
  await m.pool.pgRun('UPDATE vault_keys SET expires_at = ? WHERE id = ?', new Date(Date.now() + H).toISOString(), current);
  assert.equal((await km.getCurrentKey()).keyId, current);
  await m.pool.pgRun('UPDATE vault_keys SET expires_at = ? WHERE id = ?', new Date(Date.now() - H).toISOString(), current);
  assert.notEqual((await silent(() => km.getCurrentKey())).keyId, current, 'an expired key is never used for new ciphertext');
  await silent(() => km.rotateKeys()); // back to exactly one active data key
});

test('no plaintext secret appears in any stored PostgreSQL row', { skip }, async () => {
  await m.audit.flushAuditWrites();
  assert.ok(plaintexts.length >= 10);
  for (const table of ['credentials', 'vault_credentials', 'vault_keys', 'audit_logs']) {
    const rows = await all(`SELECT row_to_json(t)::text AS j FROM ${table} t`);
    for (const r of rows) {
      for (const p of plaintexts) assert.ok(!r.j.includes(p), `plaintext found in ${table}`);
    }
  }
});
