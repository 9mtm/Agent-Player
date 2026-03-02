-- Migration 042: Agent Evaluation Framework
-- Comprehensive agent quality assessment and monitoring system
-- Tracks 6 key metrics: Reasoning, Tool Accuracy, Latency, Cost, Safety, Success Rate

-- Evaluation sessions (aggregated evaluation runs)
CREATE TABLE IF NOT EXISTS evaluation_sessions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  evaluator_type TEXT NOT NULL CHECK(evaluator_type IN ('manual', 'automated', 'scheduled')),
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  period_start DATETIME NOT NULL,
  period_end DATETIME NOT NULL,
  status TEXT DEFAULT 'running' CHECK(status IN ('running', 'completed', 'failed')),
  overall_score REAL, -- 0-100 composite score
  metadata TEXT, -- JSON: {config, filters, context}
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents_config(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_eval_sessions_agent ON evaluation_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_eval_sessions_status ON evaluation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_eval_sessions_created ON evaluation_sessions(created_at DESC);

-- Reasoning coherence scores (LLM response quality)
CREATE TABLE IF NOT EXISTS reasoning_scores (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  message_id TEXT, -- Reference to chat message
  coherence_score REAL NOT NULL CHECK(coherence_score >= 0 AND coherence_score <= 100),
  logical_flow_score REAL, -- 0-100
  context_awareness_score REAL, -- 0-100
  completeness_score REAL, -- 0-100
  clarity_score REAL, -- 0-100
  analysis TEXT, -- Detailed reasoning analysis
  sample_text TEXT, -- Sample of analyzed text
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES evaluation_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents_config(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reasoning_session ON reasoning_scores(session_id);
CREATE INDEX IF NOT EXISTS idx_reasoning_agent ON reasoning_scores(agent_id);
CREATE INDEX IF NOT EXISTS idx_reasoning_score ON reasoning_scores(coherence_score DESC);

-- Tool selection accuracy metrics
CREATE TABLE IF NOT EXISTS tool_accuracy_metrics (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  total_uses INTEGER DEFAULT 0,
  correct_uses INTEGER DEFAULT 0, -- Used in appropriate context
  incorrect_uses INTEGER DEFAULT 0, -- Misused or unnecessary
  missed_opportunities INTEGER DEFAULT 0, -- Should have used but didn't
  accuracy_rate REAL, -- correct / (correct + incorrect)
  precision REAL, -- correct / total_uses
  recall REAL, -- correct / (correct + missed)
  avg_execution_time_ms REAL,
  success_rate REAL, -- executions without errors / total
  period_start DATETIME NOT NULL,
  period_end DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES evaluation_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents_config(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tool_accuracy_session ON tool_accuracy_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_accuracy_agent ON tool_accuracy_metrics(agent_id);
CREATE INDEX IF NOT EXISTS idx_tool_accuracy_tool ON tool_accuracy_metrics(tool_name);

-- Safety and bias checks
CREATE TABLE IF NOT EXISTS safety_checks (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  check_type TEXT NOT NULL CHECK(check_type IN ('safety', 'bias', 'toxicity', 'privacy', 'ethics')),
  severity TEXT NOT NULL CHECK(severity IN ('info', 'low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  detected_pattern TEXT, -- What pattern triggered this check
  sample_text TEXT, -- Sample of problematic content
  recommendation TEXT, -- How to fix
  auto_resolved BOOLEAN DEFAULT FALSE,
  resolved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES evaluation_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents_config(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_safety_session ON safety_checks(session_id);
CREATE INDEX IF NOT EXISTS idx_safety_agent ON safety_checks(agent_id);
CREATE INDEX IF NOT EXISTS idx_safety_severity ON safety_checks(severity);
CREATE INDEX IF NOT EXISTS idx_safety_type ON safety_checks(check_type);

-- Performance profiles (latency, throughput, resource usage)
CREATE TABLE IF NOT EXISTS performance_profiles (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  total_requests INTEGER DEFAULT 0,
  total_tokens_input INTEGER DEFAULT 0,
  total_tokens_output INTEGER DEFAULT 0,
  avg_latency_ms REAL, -- Average response time
  p50_latency_ms REAL, -- Median
  p95_latency_ms REAL, -- 95th percentile
  p99_latency_ms REAL, -- 99th percentile
  throughput_per_minute REAL, -- Requests per minute
  total_cost_usd REAL, -- Estimated total cost
  avg_cost_per_request_usd REAL,
  cache_hit_rate REAL, -- 0-1
  error_rate REAL, -- 0-1
  timeout_rate REAL, -- 0-1
  period_start DATETIME NOT NULL,
  period_end DATETIME NOT NULL,
  metadata TEXT, -- JSON: {model_distribution, tool_usage, etc}
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES evaluation_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents_config(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_perf_profile_session ON performance_profiles(session_id);
CREATE INDEX IF NOT EXISTS idx_perf_profile_agent ON performance_profiles(agent_id);
CREATE INDEX IF NOT EXISTS idx_perf_profile_created ON performance_profiles(created_at DESC);

-- Composite evaluation scores (rollup of all metrics)
CREATE TABLE IF NOT EXISTS evaluation_scores (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  overall_score REAL NOT NULL CHECK(overall_score >= 0 AND overall_score <= 100),
  reasoning_score REAL, -- 0-100
  tool_accuracy_score REAL, -- 0-100
  performance_score REAL, -- 0-100 (based on latency/throughput)
  cost_efficiency_score REAL, -- 0-100
  safety_score REAL, -- 0-100 (100 = no issues)
  success_rate REAL, -- 0-100
  grade TEXT CHECK(grade IN ('A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F')),
  strengths TEXT, -- JSON array of strengths
  weaknesses TEXT, -- JSON array of weaknesses
  recommendations TEXT, -- JSON array of improvement suggestions
  period_start DATETIME NOT NULL,
  period_end DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES evaluation_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents_config(id) ON DELETE CASCADE,
  UNIQUE(session_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_eval_scores_session ON evaluation_scores(session_id);
CREATE INDEX IF NOT EXISTS idx_eval_scores_agent ON evaluation_scores(agent_id);
CREATE INDEX IF NOT EXISTS idx_eval_scores_overall ON evaluation_scores(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_eval_scores_grade ON evaluation_scores(grade);
