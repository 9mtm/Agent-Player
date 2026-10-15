-- Runtime DDL (B2.2d-15): the multi-agent orchestrator store. On SQLite
-- src/multi-agent/orchestrator.ts creates it in its own file
-- (<data>/multi-agent/orchestrator.db, tables agents/teams/tasks); on
-- PostgreSQL the tables live in the main database under orchestrator_* names
-- (the main schema already has a different `teams` table), so one backup
-- covers them. orchestratorSchemaSql(orchestratorTablesFor('postgres')) must
-- equal this file (test/pg-runtime-ddl.test.mjs); translated into
-- migrations-pg r009.

CREATE TABLE IF NOT EXISTS orchestrator_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  role TEXT NOT NULL,
  capabilities TEXT NOT NULL,
  model TEXT,
  system_prompt TEXT,
  max_concurrent_tasks INTEGER DEFAULT 3,
  metadata TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orchestrator_teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  objective TEXT NOT NULL,
  agent_ids TEXT NOT NULL,
  leader_id TEXT,
  communication_style TEXT DEFAULT 'flat',
  shared_memory INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS orchestrator_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending',
  required_capabilities TEXT,
  assigned_to TEXT,
  team_id TEXT,
  parent_id TEXT,
  subtasks TEXT,
  dependencies TEXT,
  input TEXT,
  output TEXT,
  progress INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  deadline TEXT,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 2,
  spawn_depth INTEGER DEFAULT 0,
  spawned_by TEXT,
  origin TEXT
);

CREATE INDEX IF NOT EXISTS idx_orchestrator_tasks_status ON orchestrator_tasks(status);
CREATE INDEX IF NOT EXISTS idx_orchestrator_tasks_assigned ON orchestrator_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_orchestrator_tasks_team ON orchestrator_tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_orchestrator_tasks_parent ON orchestrator_tasks(parent_id);
