-- Migration 004: WAF Campaign System
-- Professional security testing with scheduling, multi-stage scans, and before/after comparison
-- Based on enterprise security testing workflows

-- ============================================================================
-- CAMPAIGNS TABLE - Campaign containers with scheduling
-- ============================================================================

CREATE TABLE IF NOT EXISTS waf_campaigns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_domain TEXT NOT NULL,
  status TEXT DEFAULT 'idle' CHECK(status IN ('idle', 'running', 'completed', 'failed', 'scheduled')),

  -- Scheduling configuration
  schedule_enabled BOOLEAN DEFAULT 0,
  schedule_frequency TEXT CHECK(schedule_frequency IN ('daily', 'weekly', 'monthly', 'custom')),
  schedule_time TEXT, -- HH:MM format
  schedule_day_of_week INTEGER, -- 0-6 for weekly
  schedule_day_of_month INTEGER, -- 1-31 for monthly
  schedule_next_run DATETIME,
  schedule_last_run DATETIME,

  -- Campaign metrics
  total_runs INTEGER DEFAULT 0,
  successful_runs INTEGER DEFAULT 0,
  failed_runs INTEGER DEFAULT 0,
  avg_security_score REAL DEFAULT 0.0,
  last_security_score REAL DEFAULT 0.0,
  baseline_security_score REAL DEFAULT 0.0,

  -- Settings
  scan_mode TEXT DEFAULT 'full' CHECK(scan_mode IN ('quick', 'full')),
  categories TEXT, -- JSON array of categories to test

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_run_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON waf_campaigns(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON waf_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_next_run ON waf_campaigns(schedule_enabled, schedule_next_run);

-- ============================================================================
-- CAMPAIGN SCANS TABLE - Links scans to campaigns with stages
-- ============================================================================

CREATE TABLE IF NOT EXISTS waf_campaign_scans (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  scan_id TEXT NOT NULL,
  run_number INTEGER NOT NULL,

  -- Multi-stage progression
  stage INTEGER DEFAULT 1 CHECK(stage IN (1, 2, 3, 4)),
  stage_name TEXT, -- 'detection', 'baseline', 'evasion', 'verification'
  stage_status TEXT DEFAULT 'pending' CHECK(stage_status IN ('pending', 'running', 'completed', 'failed', 'skipped')),

  -- Stage metrics
  security_score REAL DEFAULT 0.0,
  vulnerabilities_found INTEGER DEFAULT 0,
  critical_issues INTEGER DEFAULT 0,
  high_issues INTEGER DEFAULT 0,
  medium_issues INTEGER DEFAULT 0,
  low_issues INTEGER DEFAULT 0,

  -- Timestamps
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (campaign_id) REFERENCES waf_campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (scan_id) REFERENCES waf_scans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campaign_scans_campaign_id ON waf_campaign_scans(campaign_id, run_number DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_scans_scan_id ON waf_campaign_scans(scan_id);
CREATE INDEX IF NOT EXISTS idx_campaign_scans_stage ON waf_campaign_scans(campaign_id, stage);

-- ============================================================================
-- CAMPAIGN COMPARISONS TABLE - Before/after comparison results
-- ============================================================================

CREATE TABLE IF NOT EXISTS waf_campaign_comparisons (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,

  -- Comparison scans
  baseline_scan_id TEXT NOT NULL,
  current_scan_id TEXT NOT NULL,
  baseline_run_number INTEGER NOT NULL,
  current_run_number INTEGER NOT NULL,

  -- Score deltas
  security_score_delta REAL DEFAULT 0.0, -- positive = improvement, negative = regression
  baseline_score REAL DEFAULT 0.0,
  current_score REAL DEFAULT 0.0,

  -- Vulnerability changes
  new_vulnerabilities INTEGER DEFAULT 0,
  fixed_vulnerabilities INTEGER DEFAULT 0,
  persistent_vulnerabilities INTEGER DEFAULT 0,
  regression_detected BOOLEAN DEFAULT 0,

  -- Detailed breakdown (JSON)
  new_issues_json TEXT, -- Array of new vulnerability objects
  fixed_issues_json TEXT, -- Array of fixed vulnerability objects
  regression_issues_json TEXT, -- Array of regression objects

  -- Comparison metadata
  comparison_type TEXT DEFAULT 'sequential' CHECK(comparison_type IN ('sequential', 'baseline', 'custom')),
  comparison_notes TEXT,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (campaign_id) REFERENCES waf_campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (baseline_scan_id) REFERENCES waf_scans(id),
  FOREIGN KEY (current_scan_id) REFERENCES waf_scans(id)
);

CREATE INDEX IF NOT EXISTS idx_comparisons_campaign_id ON waf_campaign_comparisons(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comparisons_regression ON waf_campaign_comparisons(regression_detected);

-- ============================================================================
-- CAMPAIGN STAGES REFERENCE - Stage definitions
-- ============================================================================

CREATE TABLE IF NOT EXISTS waf_campaign_stages (
  stage_number INTEGER PRIMARY KEY,
  stage_name TEXT NOT NULL,
  stage_description TEXT,
  default_mode TEXT DEFAULT 'quick',
  default_categories TEXT, -- JSON array
  default_timeout_s INTEGER DEFAULT 60
);

-- Insert stage definitions
INSERT INTO waf_campaign_stages (stage_number, stage_name, stage_description, default_mode, default_categories) VALUES
(1, 'detection', 'Identify WAF vendor and type using passive and active detection', 'quick', '["sql_injection"]'),
(2, 'baseline', 'Quick baseline test with core attack vectors (SQL + XSS only)', 'quick', '["sql_injection", "xss"]'),
(3, 'evasion', 'Full comprehensive test with all categories and evasion techniques', 'full', '["sql_injection", "xss", "xxe", "path_traversal", "command_injection", "ssrf", "lfi", "prototype_pollution", "template_injection", "insecure_deserialization", "request_smuggling"]'),
(4, 'verification', 'Re-verify critical findings to confirm true positives', 'quick', '["sql_injection", "xss", "command_injection"]');

-- ============================================================================
-- CAMPAIGN NOTIFICATIONS TABLE - Alerts for regressions and improvements
-- ============================================================================

CREATE TABLE IF NOT EXISTS waf_campaign_notifications (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  user_id TEXT NOT NULL,

  notification_type TEXT NOT NULL CHECK(notification_type IN ('regression', 'improvement', 'completion', 'failure', 'schedule')),
  severity TEXT DEFAULT 'info' CHECK(severity IN ('critical', 'high', 'medium', 'low', 'info')),

  title TEXT NOT NULL,
  message TEXT,
  metadata_json TEXT, -- Additional context

  read BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (campaign_id) REFERENCES waf_campaigns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campaign_notifications_user_id ON waf_campaign_notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_notifications_campaign_id ON waf_campaign_notifications(campaign_id);

-- ============================================================================
-- VIEWS - Convenient queries
-- ============================================================================

-- Campaign summary with latest run info
CREATE VIEW IF NOT EXISTS v_campaign_summary AS
SELECT
  c.id,
  c.user_id,
  c.name,
  c.target_domain,
  c.status,
  c.schedule_enabled,
  c.schedule_frequency,
  c.schedule_next_run,
  c.total_runs,
  c.avg_security_score,
  c.last_security_score,
  c.baseline_security_score,
  c.created_at,
  c.last_run_at,
  (SELECT COUNT(*) FROM waf_campaign_scans WHERE campaign_id = c.id) as total_scans,
  (SELECT COUNT(*) FROM waf_campaign_comparisons WHERE campaign_id = c.id AND regression_detected = 1) as total_regressions
FROM waf_campaigns c;

-- Latest comparison per campaign
CREATE VIEW IF NOT EXISTS v_latest_comparisons AS
SELECT
  cc.*,
  c.name as campaign_name,
  c.target_domain
FROM waf_campaign_comparisons cc
INNER JOIN waf_campaigns c ON cc.campaign_id = c.id
INNER JOIN (
  SELECT campaign_id, MAX(created_at) as max_created
  FROM waf_campaign_comparisons
  GROUP BY campaign_id
) latest ON cc.campaign_id = latest.campaign_id AND cc.created_at = latest.max_created;
