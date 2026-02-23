-- Migration 036: Cost Analytics Tracking
-- Track model usage and cost optimization statistics

CREATE TABLE IF NOT EXISTS cost_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  model_used TEXT NOT NULL CHECK(model_used IN ('haiku', 'sonnet', 'opus')),
  task_complexity TEXT NOT NULL CHECK(task_complexity IN ('simple', 'medium', 'complex')),
  message_length INTEGER NOT NULL DEFAULT 0,
  tools_used TEXT NOT NULL DEFAULT '',
  estimated_savings_percent INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_cost_analytics_user_timestamp ON cost_analytics(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_cost_analytics_model ON cost_analytics(model_used);
CREATE INDEX IF NOT EXISTS idx_cost_analytics_complexity ON cost_analytics(task_complexity);
