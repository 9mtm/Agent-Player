-- Migration 051: fix skill_usage_log foreign keys (F-06)
-- Purpose: 040 declared `agent_id REFERENCES agents(id)`, but there is no
-- `agents` table (agents live in agents_config). With foreign keys ON every
-- INSERT into skill_usage_log and every DELETE from installed_skills failed
-- with "no such table: main.agents".
-- The table is rebuilt without that reference (agent_id stays a plain column).
-- Existing rows are kept: user ids that no longer exist become NULL (what
-- ON DELETE SET NULL would have done); rows of skills that no longer exist
-- (what ON DELETE CASCADE would have removed) cannot satisfy the skill_id
-- foreign key and are not copied.
-- Date: 2026-10-13

CREATE TABLE skill_usage_log_new (
  id TEXT PRIMARY KEY DEFAULT ('log_' || lower(hex(randomblob(16)))),
  skill_id TEXT NOT NULL,
  user_id TEXT,
  agent_id TEXT,
  used_at TEXT DEFAULT CURRENT_TIMESTAMP,
  session_context TEXT, -- What was the user trying to do?
  success INTEGER, -- 1 = success, 0 = failed
  FOREIGN KEY (skill_id) REFERENCES installed_skills(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO skill_usage_log_new (id, skill_id, user_id, agent_id, used_at, session_context, success)
SELECT
  l.id,
  l.skill_id,
  CASE WHEN l.user_id IN (SELECT id FROM users) THEN l.user_id ELSE NULL END,
  l.agent_id,
  l.used_at,
  l.session_context,
  l.success
FROM skill_usage_log l
WHERE l.skill_id IN (SELECT id FROM installed_skills);

DROP TABLE skill_usage_log;
ALTER TABLE skill_usage_log_new RENAME TO skill_usage_log;

CREATE INDEX IF NOT EXISTS idx_skill_usage_log_skill ON skill_usage_log(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_usage_log_user ON skill_usage_log(user_id);
