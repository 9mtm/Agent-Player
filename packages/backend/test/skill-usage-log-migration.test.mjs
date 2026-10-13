// F-06: migration 051 rebuilds skill_usage_log without the foreign key to the
// non-existent `agents` table, keeping existing rows.
// Run: node --import tsx --test test/skill-usage-log-migration.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-skill-log-mig-'));
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only

const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
const db = getDatabase();
await db.initialize();
const raw = db.getDb();

test.after(() => {
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const fkTables = () => raw.prepare(`SELECT "table" AS t FROM pragma_foreign_key_list('skill_usage_log')`).all().map((r) => r.t).sort();
const sourceId = () => raw.prepare(`SELECT id FROM skill_sources LIMIT 1`).get().id;

test('fresh DB: no reference to `agents`; usage insert and skill delete work with foreign keys on', () => {
  assert.equal(raw.pragma('foreign_keys', { simple: true }), 1);
  assert.deepEqual(fkTables(), ['installed_skills', 'users']);
  raw.prepare(`INSERT INTO installed_skills (id, source_id, skill_name, file_path) VALUES ('sk-fresh', ?, 'fresh', 'x.md')`).run(sourceId());
  raw.prepare(`INSERT INTO skill_usage_log (skill_id, agent_id, success) VALUES ('sk-fresh', 'main-agent', 1)`).run();
  raw.prepare(`DELETE FROM installed_skills WHERE id = 'sk-fresh'`).run();
  assert.equal(raw.prepare(`SELECT COUNT(*) AS n FROM skill_usage_log WHERE skill_id = 'sk-fresh'`).get().n, 0, 'cascade');
});

test('existing DB: the rebuild keeps rows and fixes the delete', async () => {
  // Recreate the pre-051 table (as created by 040) with rows written while
  // foreign keys were off, then mark 051 as not applied.
  raw.pragma('foreign_keys = OFF');
  raw.exec(`DROP TABLE skill_usage_log;
    CREATE TABLE skill_usage_log (
      id TEXT PRIMARY KEY DEFAULT ('log_' || lower(hex(randomblob(16)))),
      skill_id TEXT NOT NULL, user_id TEXT, agent_id TEXT,
      used_at TEXT DEFAULT CURRENT_TIMESTAMP, session_context TEXT, success INTEGER,
      FOREIGN KEY (skill_id) REFERENCES installed_skills(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL);`);
  raw.prepare(`INSERT INTO users (id, email, username, password_hash, role, status)
    VALUES ('mig-user', 'mig-user@example.test', 'mig-user', 'x', 'user', 'active')`).run();
  raw.prepare(`INSERT INTO installed_skills (id, source_id, skill_name, file_path) VALUES ('sk-old', ?, 'old', 'o.md')`).run(sourceId());
  const ins = raw.prepare(`INSERT INTO skill_usage_log (id, skill_id, user_id, agent_id, used_at, session_context, success) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  ins.run('log-1', 'sk-old', 'mig-user', 'main-agent', '2026-01-01 10:00:00', 'ctx one', 1);
  ins.run('log-2', 'sk-old', 'gone-user', null, '2026-01-02 10:00:00', 'ctx two', 0);
  ins.run('log-3', 'sk-missing', 'mig-user', null, '2026-01-03 10:00:00', 'orphan', 1);
  raw.prepare(`DELETE FROM migrations WHERE id = '051'`).run();
  raw.pragma('foreign_keys = ON');

  // The bug being fixed.
  assert.throws(() => raw.prepare(`DELETE FROM installed_skills WHERE id = 'sk-old'`).run(), /agents/);

  await db.initialize(); // applies the pending 051 again

  assert.deepEqual(fkTables(), ['installed_skills', 'users']);
  const rows = raw.prepare(`SELECT * FROM skill_usage_log ORDER BY id`).all();
  assert.deepEqual(rows.map((r) => r.id), ['log-1', 'log-2']);
  assert.equal(rows[0].user_id, 'mig-user');
  assert.equal(rows[0].agent_id, 'main-agent');
  assert.equal(rows[0].used_at, '2026-01-01 10:00:00');
  assert.equal(rows[0].session_context, 'ctx one');
  assert.equal(rows[1].user_id, null, 'unknown user becomes NULL');
  assert.equal(rows[1].success, 0);
  const idx = raw.prepare(`SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'skill_usage_log'`).all().map((r) => r.name);
  assert.ok(idx.includes('idx_skill_usage_log_skill') && idx.includes('idx_skill_usage_log_user'));
  assert.deepEqual(raw.pragma('foreign_key_check'), []);

  raw.prepare(`DELETE FROM installed_skills WHERE id = 'sk-old'`).run();
  assert.equal(raw.prepare(`SELECT COUNT(*) AS n FROM skill_usage_log`).get().n, 0, 'cascade after rebuild');
});
