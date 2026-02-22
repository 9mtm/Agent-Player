-- Migration 008: Agent activity log table
-- Tracks every tool call and task lifecycle event per agent

CREATE TABLE IF NOT EXISTS agent_activity (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  task_id TEXT,
  session_id TEXT,
  action_type TEXT NOT NULL,
  tool_name TEXT,
  summary TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_agent ON agent_activity(agent_id);
CREATE INDEX IF NOT EXISTS idx_activity_task ON agent_activity(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON agent_activity(created_at);
