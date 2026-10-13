-- Migration 056: versioned agent personality (CORE-01, D-PERSONALITY)
-- Every change is a new row (append-only); the current personality of an
-- agent is its highest version. Rollback, lock and unlock also add a version,
-- so the history is never rewritten.
--   traits         JSON object, each trait an integer 0-100 (validated in
--                  services/personality.ts before insert)
--   preset         preset the traits started from, or NULL
--   dialect        reply language/dialect, e.g. 'ar-IQ', 'ar', 'en', 'de'
--   locked         1 = no new version may be saved or rolled back to until
--                  the owner unlocks it
--   locked_traits  JSON array of trait names that slow drift (Evolution) may
--                  never change
--   source         'seed' | 'owner' | 'rollback' | 'lock' | 'unlock' | 'evolution'
-- Personality only shapes prompting and confirmation behaviour; it never
-- grants tools or permissions (those live in agent_tool_grants).
-- Date: 2026-10-14

CREATE TABLE IF NOT EXISTS agent_personality_versions (
  agent_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version >= 1),
  traits TEXT NOT NULL,
  preset TEXT,
  dialect TEXT NOT NULL,
  locked INTEGER NOT NULL DEFAULT 0 CHECK (locked IN (0, 1)),
  locked_traits TEXT NOT NULL DEFAULT '[]',
  source TEXT NOT NULL,
  based_on_version INTEGER,
  note TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (agent_id, version),
  FOREIGN KEY (agent_id) REFERENCES agents_config(id) ON DELETE CASCADE
);

-- Main agent v1 (CORE-01): careful, warm, short answers, Iraqi Arabic by default.
INSERT OR IGNORE INTO agent_personality_versions
  (agent_id, version, traits, preset, dialect, locked, locked_traits, source, note, created_by)
SELECT id, 1,
  '{"doubt":60,"caution":65,"creativity":45,"thoroughness":70,"independence":45,"verbosity":35,"warmth":70,"curiosity":55,"persistence":65}',
  NULL, 'ar-IQ', 0, '[]', 'seed', 'main-agent v1', 'system'
FROM agents_config
WHERE id = 'main-agent' OR is_primary = 1;
