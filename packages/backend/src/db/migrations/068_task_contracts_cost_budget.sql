-- Migration 068: task contracts, result verification, cost budget (R1 / R2)
-- task_contracts: the contract given when a task is created (goal, inputs,
-- expected output shape, deterministic acceptance checks, optional review,
-- budget incl. cost, allowed tools/drawers). Encrypted (inputs may be
-- private). A run pins a copy of its task's contract when it is created.
-- task_runs: verification status is separate from the execution status:
-- NULL (no contract) | verified | failed_verification | needs_review.
-- task_run_verifications: one row per verification round (durable, so a
-- resumed run replays the same verdicts instead of re-judging).
-- Cost: every model step records provider/model/tokens/cost; paid_usage is
-- the day ledger for the global daily cap on autonomous paid model calls
-- (reserved before the call at the estimated worst case, then recorded with
-- the provider's usage, or released when the call failed).
-- Date: 2026-10-14

CREATE TABLE IF NOT EXISTS task_contracts (
  task_id TEXT PRIMARY KEY,
  contract_encrypted TEXT NOT NULL,
  contract_iv TEXT NOT NULL,
  contract_tag TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE task_runs ADD COLUMN contract_encrypted TEXT;
ALTER TABLE task_runs ADD COLUMN contract_iv TEXT;
ALTER TABLE task_runs ADD COLUMN contract_tag TEXT;
ALTER TABLE task_runs ADD COLUMN verification_status TEXT
  CHECK (verification_status IS NULL OR verification_status IN ('verified', 'failed_verification', 'needs_review'));
ALTER TABLE task_runs ADD COLUMN verification_reasons TEXT;
ALTER TABLE task_runs ADD COLUMN verification_round INTEGER NOT NULL DEFAULT 0;
ALTER TABLE task_runs ADD COLUMN max_verification_retries INTEGER NOT NULL DEFAULT 0;
ALTER TABLE task_runs ADD COLUMN review_mode TEXT;
ALTER TABLE task_runs ADD COLUMN review_decision TEXT CHECK (review_decision IS NULL OR review_decision IN ('accepted', 'rejected'));
ALTER TABLE task_runs ADD COLUMN reviewed_by TEXT;
ALTER TABLE task_runs ADD COLUMN reviewer_kind TEXT;
ALTER TABLE task_runs ADD COLUMN review_note TEXT;
ALTER TABLE task_runs ADD COLUMN reviewed_at TEXT;
ALTER TABLE task_runs ADD COLUMN max_cost_cents REAL;
ALTER TABLE task_runs ADD COLUMN cost_cents REAL NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS task_run_verifications (
  run_id TEXT NOT NULL REFERENCES task_runs(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('verified', 'failed_verification', 'needs_review')),
  reasons TEXT NOT NULL,
  checks TEXT NOT NULL,
  verifier TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (run_id, round)
);

ALTER TABLE task_run_steps ADD COLUMN provider TEXT;
ALTER TABLE task_run_steps ADD COLUMN model TEXT;
ALTER TABLE task_run_steps ADD COLUMN input_tokens INTEGER;
ALTER TABLE task_run_steps ADD COLUMN output_tokens INTEGER;
ALTER TABLE task_run_steps ADD COLUMN cost_cents REAL;
ALTER TABLE task_run_steps ADD COLUMN usage_source TEXT;

CREATE TABLE IF NOT EXISTS paid_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  run_id TEXT,
  step_index INTEGER,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('reserved', 'recorded', 'released')),
  estimated_cents REAL NOT NULL,
  cost_cents REAL NOT NULL DEFAULT 0,
  input_tokens INTEGER,
  output_tokens INTEGER,
  usage_source TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_paid_usage_day ON paid_usage(day, status);
CREATE INDEX IF NOT EXISTS idx_paid_usage_run ON paid_usage(run_id, step_index);
