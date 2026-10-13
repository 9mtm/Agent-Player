-- Migration 054: one-time approvals for risky agent tool calls (S1.3)
-- A tool that requires approval (send messages, delete data, spend money,
-- install skills, change credentials/settings) is not run by the agent; a
-- pending record is created instead. The owner approves (runs it once) or
-- denies (never runs). Parameters are stored encrypted (AES-256-GCM with the
-- server ENCRYPTION_KEY); only a masked preview is shown.
-- Date: 2026-10-14

CREATE TABLE IF NOT EXISTS tool_approvals (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied', 'executed', 'failed', 'expired')),
  agent_id TEXT,
  user_id TEXT,
  session_id TEXT,
  tool_name TEXT NOT NULL,
  category TEXT,
  params_encrypted TEXT NOT NULL,
  params_iv TEXT NOT NULL,
  params_tag TEXT NOT NULL,
  params_preview TEXT,
  origin TEXT,
  delegated_from TEXT,
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at TEXT,
  decided_by TEXT,
  executed_at TEXT,
  result_preview TEXT,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_tool_approvals_status ON tool_approvals(status, requested_at);
CREATE INDEX IF NOT EXISTS idx_tool_approvals_agent ON tool_approvals(agent_id, status);
