-- Migration 038: Agent Evolution System
-- Enables agents to learn, adapt, and improve autonomously

-- Performance metrics per agent (aggregated from activity)
CREATE TABLE IF NOT EXISTS agent_performance_metrics (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  metric_type TEXT NOT NULL, -- 'task_success_rate', 'tool_efficiency', 'response_quality', 'error_rate'
  value REAL NOT NULL,
  sample_size INTEGER DEFAULT 0,
  period_start DATETIME NOT NULL,
  period_end DATETIME NOT NULL,
  metadata TEXT, -- JSON: {tool_name, task_type, context}
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents_config(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_perf_agent ON agent_performance_metrics(agent_id);
CREATE INDEX IF NOT EXISTS idx_perf_type ON agent_performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_perf_created ON agent_performance_metrics(created_at DESC);

-- Learning insights extracted from experience
CREATE TABLE IF NOT EXISTS agent_learning_insights (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  insight_type TEXT NOT NULL, -- 'success_pattern', 'failure_pattern', 'optimization', 'new_capability'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence REAL DEFAULT 0.5, -- 0-1 confidence score
  evidence TEXT, -- JSON: [{activity_id, timestamp, outcome}]
  applied BOOLEAN DEFAULT FALSE,
  applied_at DATETIME,
  impact_score REAL, -- Measured improvement after applying (0-1)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents_config(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_insights_agent ON agent_learning_insights(agent_id);
CREATE INDEX IF NOT EXISTS idx_insights_type ON agent_learning_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_insights_applied ON agent_learning_insights(applied, confidence DESC);

-- Evolution history - tracks all autonomous changes made to agents
CREATE TABLE IF NOT EXISTS agent_evolution_history (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  evolution_type TEXT NOT NULL, -- 'prompt_update', 'capability_added', 'capability_removed', 'config_change'
  change_description TEXT NOT NULL,
  before_value TEXT, -- JSON snapshot before change
  after_value TEXT, -- JSON snapshot after change
  trigger_reason TEXT NOT NULL, -- Why this evolution happened
  insight_ids TEXT, -- JSON array of insight IDs that triggered this
  performance_before REAL, -- Baseline metric before change
  performance_after REAL, -- Measured metric after change
  status TEXT DEFAULT 'active', -- 'active', 'rolled_back', 'superseded'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  rolled_back_at DATETIME,
  FOREIGN KEY (agent_id) REFERENCES agents_config(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_evolution_agent ON agent_evolution_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_evolution_type ON agent_evolution_history(evolution_type);
CREATE INDEX IF NOT EXISTS idx_evolution_status ON agent_evolution_history(status);
CREATE INDEX IF NOT EXISTS idx_evolution_created ON agent_evolution_history(created_at DESC);

-- Evolution configuration per agent
CREATE TABLE IF NOT EXISTS agent_evolution_config (
  agent_id TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT TRUE,
  min_confidence_threshold REAL DEFAULT 0.7, -- Minimum confidence to apply insights
  min_sample_size INTEGER DEFAULT 10, -- Minimum activity samples before learning
  evolution_frequency TEXT DEFAULT 'daily', -- 'hourly', 'daily', 'weekly', 'manual'
  allowed_evolutions TEXT DEFAULT '["prompt_update","capability_added"]', -- JSON array
  max_evolutions_per_cycle INTEGER DEFAULT 3,
  rollback_on_degradation BOOLEAN DEFAULT TRUE,
  degradation_threshold REAL DEFAULT 0.1, -- 10% performance drop triggers rollback
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents_config(id) ON DELETE CASCADE
);

-- Agent capability usage tracking (for learning which capabilities are actually useful)
CREATE TABLE IF NOT EXISTS agent_capability_usage (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  capability_name TEXT NOT NULL, -- 'webSearch', 'fileOperations', 'memory', etc.
  usage_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  avg_execution_time_ms REAL DEFAULT 0,
  last_used_at DATETIME,
  first_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents_config(id) ON DELETE CASCADE,
  UNIQUE(agent_id, capability_name)
);

CREATE INDEX IF NOT EXISTS idx_capability_usage_agent ON agent_capability_usage(agent_id);
CREATE INDEX IF NOT EXISTS idx_capability_usage_name ON agent_capability_usage(capability_name);

-- Initialize evolution config for existing agents
INSERT OR IGNORE INTO agent_evolution_config (agent_id)
SELECT id FROM agents_config;
