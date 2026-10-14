-- Migration 064: durable task runs (CORE-08, R2)
-- A task run executes an orchestrator task step by step. Every model call
-- and every tool call is one step with a deterministic idempotency key
-- (run id + step index + kind/tool + hash of the input). A step is stored
-- 'started' before it runs and 'completed' (result encrypted) after. On
-- resume, completed steps are replayed from the stored result and never run
-- again; a started-but-not-completed step of a non-idempotent tool is not
-- repeated: the run waits for the owner.
-- One worker per run: lease_owner + lease_expires_at (ms epoch, renewed by a
-- heartbeat) and lease_generation (fencing token, +1 on every claim). Every
-- step write checks owner + generation.
-- Budget gate: max_steps (fresh step executions) and max_duration_ms
-- (active time, summed over attempts; downtime does not count).
-- Date: 2026-10-14

CREATE TABLE IF NOT EXISTS task_runs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  user_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled')),
  status_reason TEXT,
  lease_owner TEXT,
  lease_expires_at INTEGER,
  lease_generation INTEGER NOT NULL DEFAULT 0,
  attempt INTEGER NOT NULL DEFAULT 0,
  checkpoint_step INTEGER NOT NULL DEFAULT -1,
  steps_used INTEGER NOT NULL DEFAULT 0,
  max_steps INTEGER NOT NULL,
  max_duration_ms INTEGER NOT NULL,
  active_ms INTEGER NOT NULL DEFAULT 0,
  segment_started_ms INTEGER,
  cancel_requested INTEGER NOT NULL DEFAULT 0,
  input_encrypted TEXT,
  input_iv TEXT,
  input_tag TEXT,
  output_preview TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_task_runs_status ON task_runs(status, lease_expires_at);
CREATE INDEX IF NOT EXISTS idx_task_runs_task ON task_runs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_runs_user ON task_runs(user_id);
-- At most one unfinished run per task.
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_runs_one_active ON task_runs(task_id)
  WHERE status IN ('queued', 'running', 'waiting_approval');

CREATE TABLE IF NOT EXISTS task_run_steps (
  run_id TEXT NOT NULL REFERENCES task_runs(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('model', 'tool')),
  tool_name TEXT,
  idempotency_key TEXT NOT NULL,
  idempotent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL
    CHECK (status IN ('started', 'completed', 'failed', 'unknown', 'waiting_approval', 'retry')),
  attempt INTEGER NOT NULL DEFAULT 1,
  approval_id TEXT,
  result_encrypted TEXT,
  result_iv TEXT,
  result_tag TEXT,
  error TEXT,
  resolved_by TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  PRIMARY KEY (run_id, step_index)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_task_run_steps_key ON task_run_steps(idempotency_key);

-- An approval asked from inside a run continues that run once decided.
ALTER TABLE tool_approvals ADD COLUMN run_id TEXT;
ALTER TABLE tool_approvals ADD COLUMN run_step INTEGER;
CREATE INDEX IF NOT EXISTS idx_tool_approvals_run ON tool_approvals(run_id, run_step);
