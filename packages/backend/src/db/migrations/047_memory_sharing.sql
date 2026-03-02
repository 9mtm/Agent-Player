-- Migration 047: Multi-Agent Memory Sharing
-- Enables memories to be shared between agents and teams
-- Based on research: Memory in LLM-based Multi-agent Systems
-- https://www.techrxiv.org/users/1007269/articles/1367390

-- Add visibility column (private/team/public)
ALTER TABLE memories ADD COLUMN visibility TEXT DEFAULT 'private' CHECK(visibility IN ('private', 'team', 'public'));

-- Add source_agent_id to track which agent created the memory
ALTER TABLE memories ADD COLUMN source_agent_id TEXT;

-- Add is_team_critical flag for important shared knowledge
ALTER TABLE memories ADD COLUMN is_team_critical INTEGER DEFAULT 0 CHECK(is_team_critical IN (0, 1));

-- Add team_id for team-scoped memories
ALTER TABLE memories ADD COLUMN team_id TEXT;

-- Create indexes for efficient shared memory queries
CREATE INDEX IF NOT EXISTS idx_memories_visibility ON memories(visibility);
CREATE INDEX IF NOT EXISTS idx_memories_source_agent ON memories(source_agent_id);
CREATE INDEX IF NOT EXISTS idx_memories_team_critical ON memories(is_team_critical) WHERE is_team_critical = 1;
CREATE INDEX IF NOT EXISTS idx_memories_team ON memories(team_id) WHERE team_id IS NOT NULL;

-- Memory deduplication log table
CREATE TABLE IF NOT EXISTS memory_deduplication_log (
  id TEXT PRIMARY KEY,
  run_timestamp INTEGER NOT NULL,
  duplicates_found INTEGER DEFAULT 0,
  memories_merged INTEGER DEFAULT 0,
  memories_deleted INTEGER DEFAULT 0,
  duration_ms INTEGER,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'partial')),
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dedup_log_timestamp ON memory_deduplication_log(run_timestamp);

-- Memory sharing audit log
CREATE TABLE IF NOT EXISTS memory_sharing_audit (
  id TEXT PRIMARY KEY,
  memory_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('shared', 'unshared', 'visibility_changed', 'marked_critical', 'unmarked_critical')),
  actor_agent_id TEXT,
  old_visibility TEXT,
  new_visibility TEXT,
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sharing_audit_memory ON memory_sharing_audit(memory_id);
CREATE INDEX IF NOT EXISTS idx_sharing_audit_action ON memory_sharing_audit(action);
CREATE INDEX IF NOT EXISTS idx_sharing_audit_created ON memory_sharing_audit(created_at);
