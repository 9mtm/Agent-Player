// CL-02 (Q-9): one-time, explicit move of legacy owner data to the owner account.
// Run: node --import tsx --test test/migrate-legacy-owner-data.test.mjs
// Throwaway DB in a temp dir only; never the real database. No network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const backendDir = process.cwd();
const require = createRequire(join(backendDir, 'package.json'));
const Database = require('better-sqlite3');
const script = join(backendDir, 'scripts/migrate-legacy-owner-data.mjs');
const { migrateLegacyOwnerData } = await import(script);

const dirs = [];
test.after(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });

function fixture({ owner = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ap-legacy-owner-'));
  dirs.push(dir);
  const dbPath = join(dir, '.data', 'agent-player.db');
  require('node:fs').mkdirSync(join(dir, '.data'));
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, role TEXT, status TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE chat_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT);
    CREATE TABLE memories (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, content TEXT);
  `);
  db.prepare(`INSERT INTO users (id, email, role, status) VALUES ('mock-user', 'system@agent-player.local', 'user', 'active')`).run();
  if (owner) db.prepare(`INSERT INTO users (id, email, role, status) VALUES ('u-owner', 'owner@example.test', 'owner', 'active')`).run();
  db.prepare(`INSERT INTO users (id, email, role, status) VALUES ('u-other', 'other@example.test', 'user', 'active')`).run();
  const s = db.prepare('INSERT INTO chat_sessions (id, user_id, title) VALUES (?, ?, ?)');
  s.run('s1', 'mock-user', 'private title one');
  s.run('s2', 'mock-user', 'private title two');
  s.run('s3', 'u-other', 'other user');
  s.run('s4', 'u-owner', 'already owner');
  const m = db.prepare('INSERT INTO memories (id, user_id, content) VALUES (?, ?, ?)');
  m.run('m1', 'mock-user', 'secret memory content');
  m.run('m2', 'default', 'x');
  m.run('m3', 'admin@agentplayer.local', 'x');
  m.run('m4', 'owner@example.test', 'x');
  m.run('m5', 'legacy-admin@example.test', 'x');
  m.run('m6', 'u-other', 'x');
  m.run('m7', 'other@example.test', 'x');
  db.close();
  return { dir, dbPath };
}

const rows = (dbPath, sql) => { const db = new Database(dbPath, { readonly: true }); try { return db.prepare(sql).all(); } finally { db.close(); } };

test('dry run (default) counts only and changes nothing, no backup', () => {
  const { dir, dbPath } = fixture();
  const out = execFileSync(process.execPath, [script, '--db', dbPath], { encoding: 'utf8', env: { ...process.env, ADMIN_EMAIL: '' } });
  assert.match(out, /dry run/);
  assert.match(out, /chat sessions: 2/);
  assert.match(out, /memories:\s+4/);
  assert.ok(!/private title|secret memory/.test(out), 'no content printed');
  assert.equal(rows(dbPath, "SELECT COUNT(*) n FROM chat_sessions WHERE user_id = 'mock-user'")[0].n, 2);
  assert.deepEqual(readdirSync(join(dir, '.data')), ['agent-player.db']);
});

test('--apply backs up first, moves only legacy keys, and is safe to re-run', () => {
  const { dir, dbPath } = fixture();
  const r = migrateLegacyOwnerData({ dbPath, apply: true, legacyEmails: ['legacy-admin@example.test'] });
  assert.equal(r.ok, true);
  assert.equal(r.applied, true);
  assert.equal(r.sessions, 2);
  assert.equal(r.memories, 5);
  assert.ok(r.backupPath.startsWith(join(dir, '.data', 'backups')));
  // Backup holds the pre-migration state.
  assert.equal(rows(r.backupPath, "SELECT COUNT(*) n FROM chat_sessions WHERE user_id = 'mock-user'")[0].n, 2);
  // Live DB: legacy rows now belong to the owner; other users untouched.
  assert.deepEqual(rows(dbPath, 'SELECT id, user_id FROM chat_sessions ORDER BY id'), [
    { id: 's1', user_id: 'u-owner' }, { id: 's2', user_id: 'u-owner' }, { id: 's3', user_id: 'u-other' }, { id: 's4', user_id: 'u-owner' },
  ]);
  assert.deepEqual(rows(dbPath, 'SELECT id, user_id FROM memories ORDER BY id').map((x) => x.user_id),
    ['u-owner', 'u-owner', 'u-owner', 'u-owner', 'u-owner', 'u-other', 'other@example.test']);
  assert.equal(rows(dbPath, "SELECT content FROM memories WHERE id = 'm1'")[0].content, 'secret memory content', 'content unchanged');

  const again = migrateLegacyOwnerData({ dbPath, apply: true, legacyEmails: ['legacy-admin@example.test'] });
  assert.deepEqual({ ok: again.ok, applied: again.applied, sessions: again.sessions, memories: again.memories },
    { ok: true, applied: false, sessions: 0, memories: 0 });
  assert.equal(readdirSync(join(dir, '.data', 'backups')).length, 1, 'no second backup when nothing to move');
});

test('refuses without an active owner and when the database is missing', () => {
  const { dbPath } = fixture({ owner: false });
  const r = migrateLegacyOwnerData({ dbPath, apply: true });
  assert.equal(r.ok, false);
  assert.match(r.reason, /no active owner/);
  assert.equal(rows(dbPath, "SELECT COUNT(*) n FROM chat_sessions WHERE user_id = 'mock-user'")[0].n, 2);
  assert.equal(migrateLegacyOwnerData({ dbPath: dbPath + '.missing' }).ok, false);
});
