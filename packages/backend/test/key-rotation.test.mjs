// FU-05: key rotation really moves vault data to the new key, SQLite expiry
// comparisons are correct within the expiry day, and credential JSON backups
// follow committed state only (atomic write, mode 0600, ciphertext only).
//
// Run: node --import tsx --test test/key-rotation.test.mjs
// SQLite only, in a throwaway directory (cwd + HOME); random test-only secrets.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, readdirSync, statSync, mkdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-key-rotation-'));
mkdirSync(join(dir, '.data', 'audit'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.ENCRYPTION_DB_PATH = join(dir, '.data', 'encryption', 'credentials.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
process.env.MASTER_ENCRYPTION_KEY = randomBytes(32).toString('base64'); // throwaway, test only
process.env.NODE_ENV = 'test';

const silent = async (fn) => {
  const s = { ...console };
  console.log = () => {}; console.info = () => {}; console.warn = () => {}; console.error = () => {};
  try { return await fn(); } finally { Object.assign(console, s); }
};
const secret = (tag) => `krtest-${tag}-${randomBytes(12).toString('hex')}`;

const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
const { KeyManager } = await import('../src/encryption/key-manager.ts');
const { CredentialVault } = await import('../src/encryption/credential-vault.ts');
const { decrypt } = await import('../src/encryption/crypto-utils.ts');
const { CredentialStorage } = await import('../src/credentials/storage.ts');
const { sqliteRunner } = await import('../src/repositories/sql-runner.ts');
const { CredentialManager } = await import('../src/credentials/manager.ts');

const db = getDatabase();
await silent(() => db.initialize());

const km = new KeyManager({}, 'sqlite');
const vault = new CredentialVault('sqlite', km);
await silent(() => vault.initialize(process.env.ENCRYPTION_DB_PATH));

test.after(() => {
  vault.close();
  closeDatabase();
  process.chdir(tmpdir());
  rmSync(dir, { recursive: true, force: true });
});

const iso = (ms) => new Date(Date.now() + ms).toISOString();
const HOUR = 3_600_000;
const activeDataKeys = () => km.rows.all(`SELECT id FROM keys WHERE type = 'data' AND active = 1`).map((r) => r.id);
const envelopeOf = (id) => JSON.parse(vault.rows.one('SELECT encrypted_data FROM credentials WHERE id = ?', id).encrypted_data);

test('rotation + reEncryptAll: every row moves to the new key and still decrypts', async () => {
  const entries = [];
  for (let i = 0; i < 3; i++) {
    const data = { k: secret(`rot${i}`) };
    const e = await vault.store({ name: `rot-${i}`, type: 'api_key', data, ownerId: 'u1', ownerType: 'user' });
    entries.push({ id: e.id, data });
  }
  const { keyId: oldKeyId } = await km.getCurrentKey();
  for (const e of entries) assert.equal(envelopeOf(e.id).keyId, oldKeyId);

  // Warm the cache with the old key (as a decryption does), then rotate.
  await km.getKey(oldKeyId);
  const fresh = await silent(() => km.rotateKeys());
  assert.notEqual(fresh.id, oldKeyId);
  assert.deepEqual(activeDataKeys(), [fresh.id]);

  // getCurrentKey names the new active key, not any cached one (the FU-05 bug).
  assert.equal((await km.getCurrentKey()).keyId, fresh.id);

  // Before re-encryption, old-key rows are still readable (old key by id).
  for (const e of entries) {
    assert.equal(envelopeOf(e.id).keyId, oldKeyId);
    assert.deepEqual((await vault.retrieve(e.id)).data, e.data);
  }
  // Reading the old key again (it re-enters the cache) does not change the current key.
  assert.equal((await km.getCurrentKey()).keyId, fresh.id);

  // New writes use the new key.
  const newer = await vault.store({ name: 'rot-new', type: 'api_key', data: { k: secret('rotnew') }, ownerId: 'u1', ownerType: 'user' });
  assert.equal(envelopeOf(newer.id).keyId, fresh.id);

  const n = await silent(() => vault.reEncryptAll());
  const all = vault.rows.all('SELECT id, encrypted_data FROM credentials');
  assert.equal(n, all.length);
  for (const row of all) assert.equal(JSON.parse(row.encrypted_data).keyId, fresh.id, `row ${row.id} on the new key`);
  for (const e of entries) {
    const env = envelopeOf(e.id);
    // Decrypts with the new key directly, and through the vault.
    assert.deepEqual(JSON.parse(decrypt(env, await km.getKey(fresh.id)).toString('utf8')), e.data);
    assert.deepEqual((await vault.retrieve(e.id)).data, e.data);
  }
  // The old key is deactivated, not deleted (existing semantics).
  assert.equal(km.rows.one('SELECT active FROM keys WHERE id = ?', oldKeyId).active, 0);
});

test('getCurrentKey prefers the newest active key', async () => {
  const before = (await km.getCurrentKey()).keyId;
  const second = await km.generateDataKey(); // a second active key (no deactivation)
  km.rows.run('UPDATE keys SET created_at = ? WHERE id = ?', iso(-HOUR), before);
  assert.equal((await km.getCurrentKey()).keyId, second.id);
  // Deactivating the newest falls back to the other active key.
  await silent(() => km.deactivateKey(second.id));
  assert.equal((await km.getCurrentKey()).keyId, before);
});

test('key expiry within the same day: now+1h is current, now-1h is not', async () => {
  const current = (await km.getCurrentKey()).keyId;
  km.rows.run('UPDATE keys SET expires_at = ? WHERE id = ?', iso(HOUR), current);
  assert.equal((await km.getCurrentKey()).keyId, current, 'expires in an hour: still the active key');

  km.rows.run('UPDATE keys SET expires_at = ? WHERE id = ?', iso(-HOUR), current);
  const next = (await silent(() => km.getCurrentKey())).keyId;
  assert.notEqual(next, current, 'expired an hour ago: never used for new ciphertext');
  // Expired keys count as expired in the stats.
  await silent(() => km.rotateKeys());
  assert.ok(km.getStats().expiredKeys >= 1);
});

test('vault expiry within the same day: query and stats', async () => {
  const soon = await vault.store({ name: 'exp-soon', type: 'api_key', data: { k: secret('soon') }, ownerId: 'u2', ownerType: 'user', expiresAt: new Date(Date.now() + HOUR) });
  const gone = await vault.store({ name: 'exp-gone', type: 'api_key', data: { k: secret('gone') }, ownerId: 'u2', ownerType: 'user', expiresAt: new Date(Date.now() - HOUR) });
  const ids = vault.query({ ownerId: 'u2' }).map((c) => c.id);
  assert.ok(ids.includes(soon.id), 'now+1h is not expired');
  assert.ok(!ids.includes(gone.id), 'now-1h is expired');
  assert.equal(vault.query({ ownerId: 'u2', includeExpired: true }).length, 2);
  const stats = vault.getStats();
  assert.ok(stats.expired >= 1, 'now-1h counts as expired');
  assert.ok(stats.expiringSoon >= 1, 'now+1h counts as expiring soon');
  // Exactly: one expired, one expiring among this owner's rows.
  const t = (sql, ...p) => vault.rows.one(sql, ...p).n;
  assert.equal(t(`SELECT COUNT(*) AS n FROM credentials WHERE owner_id = 'u2' AND julianday(expires_at) < julianday('now')`), 1);
  // Legacy `YYYY-MM-DD HH:MM:SS` text compares correctly too.
  vault.rows.run('UPDATE credentials SET expires_at = ? WHERE id = ?', iso(HOUR).replace('T', ' ').slice(0, 19), gone.id);
  assert.ok(vault.query({ ownerId: 'u2' }).some((c) => c.id === gone.id));
});

test('credential backups: committed state only, atomic, mode 0600, ciphertext only', async () => {
  const backupRoot = join(dir, 'creds');
  const storage = new CredentialStorage(backupRoot, sqliteRunner);
  await silent(() => storage.initialize());
  const manager = new CredentialManager(storage);
  const v1 = secret('backup-v1');
  const v2 = secret('backup-v2');
  const v3 = secret('backup-v3');

  const c = await silent(() => manager.create({ name: 'bk-cred', type: 'api_key', value: v1 }));
  const file = join(backupRoot, 'global', 'bk-cred.json');
  const read = () => JSON.parse(readFileSync(file, 'utf8'));
  const row = () => db.prepare('SELECT encrypted_value, iv, auth_tag FROM credentials WHERE id = ?').get(c.id);
  const mode = () => statSync(file).mode & 0o777;

  const r1 = row();
  assert.equal(read().encryptedValue, r1.encrypted_value);
  assert.equal(mode(), 0o600);
  assert.ok(!readFileSync(file, 'utf8').includes(v1), 'no plaintext in the backup');

  // A rolled-back update leaves the old ciphertext in the backup.
  db.exec('BEGIN');
  await silent(() => manager.update(c.id, { value: v2 }));
  assert.notEqual(row().encrypted_value, r1.encrypted_value, 'inside the transaction the new value is visible');
  db.exec('ROLLBACK');
  assert.deepEqual(row(), r1);
  assert.equal(read().encryptedValue, r1.encrypted_value, 'backup still holds the committed (old) ciphertext');
  assert.equal(read().iv, r1.iv);
  assert.equal(await manager.getValue(c.id), v1);

  // A better-sqlite3 transaction that rolls back (synchronous write, then a throw).
  const storageSave = storage.save.bind(storage);
  let pending;
  assert.throws(() => db.transaction(() => {
    pending = storageSave({ ...c, encryptedValue: 'deadbeef', iv: '00', authTag: '00', updatedAt: new Date() });
    throw new Error('boom');
  }), /boom/);
  await silent(() => pending);
  assert.deepEqual(row(), r1);
  assert.equal(read().encryptedValue, r1.encrypted_value);

  // A committed update rewrites it atomically: a new file (rename), still 0600.
  chmodSync(file, 0o644); // an older backup with a wider mode is replaced by a 0600 file
  const inoBefore = statSync(file).ino;
  await silent(() => manager.update(c.id, { value: v3 }));
  const r3 = row();
  assert.notEqual(r3.encrypted_value, r1.encrypted_value);
  assert.equal(read().encryptedValue, r3.encrypted_value);
  assert.equal(mode(), 0o600);
  assert.notEqual(statSync(file).ino, inoBefore, 'written to a temp file and renamed over the backup');
  assert.deepEqual(readdirSync(join(backupRoot, 'global')).filter((f) => f.endsWith('.tmp')), [], 'no temp file left');
  const text = readFileSync(file, 'utf8');
  for (const p of [v1, v2, v3]) assert.ok(!text.includes(p), 'no plaintext in the backup');

  // A rolled-back delete keeps the backup; a committed one removes it.
  db.exec('BEGIN');
  await silent(() => storage.delete(c.id));
  db.exec('ROLLBACK');
  assert.equal(read().encryptedValue, r3.encrypted_value);
  await silent(() => storage.delete(c.id));
  assert.deepEqual(readdirSync(join(backupRoot, 'global')).filter((f) => f === 'bk-cred.json'), []);
});

test('no plaintext and no raw key material in the key table', async () => {
  const { key } = await km.getCurrentKey();
  for (const r of km.rows.all('SELECT * FROM keys')) {
    const j = JSON.stringify(r);
    assert.ok(!j.includes(key.toString('base64')) && !j.includes(key.toString('hex')));
    assert.ok(!j.includes(process.env.MASTER_ENCRYPTION_KEY));
  }
});
