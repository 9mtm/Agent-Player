-- Migration 027: Cron Scheduler System
-- Creates tables for cron jobs and execution history

-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS job_executions;
DROP TABLE IF EXISTS cron_jobs;

CREATE TABLE cron_jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cron_expression TEXT NOT NULL,
  action_type TEXT NOT NULL,
  -- 'execute-skill' | 'send-message' | 'api-call' | 'run-workflow' | 'custom'
  action_data TEXT NOT NULL,
  -- JSON stringified action configuration
  enabled INTEGER NOT NULL DEFAULT 1,
  last_run DATETIME,
  next_run DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE job_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  success INTEGER NOT NULL,
  -- 1 for success, 0 for failure
  output TEXT,
  -- JSON stringified output
  error TEXT,
  -- Error message if failed
  executed_at DATETIME NOT NULL,
  duration INTEGER,
  -- Duration in milliseconds
  FOREIGN KEY (job_id) REFERENCES cron_jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_job_executions_job_id ON job_executions(job_id);
CREATE INDEX IF NOT EXISTS idx_job_executions_executed_at ON job_executions(executed_at);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_enabled ON cron_jobs(enabled);
