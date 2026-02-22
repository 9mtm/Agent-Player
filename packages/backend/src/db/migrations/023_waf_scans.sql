-- Migration 023: WAF Security Scan History
-- Stores results from WAF testing scans (external sites + self-audit)

CREATE TABLE IF NOT EXISTS waf_scans (
  id              TEXT    PRIMARY KEY,
  target_url      TEXT    NOT NULL,
  scan_type       TEXT    NOT NULL DEFAULT 'external', -- 'external' | 'self'
  waf_detected    INTEGER NOT NULL DEFAULT 0,          -- boolean (0/1)
  waf_type        TEXT,                                -- e.g. 'Cloudflare', 'AWS WAF'
  waf_confidence  INTEGER NOT NULL DEFAULT 0,          -- 0-100 confidence score
  total_payloads  INTEGER NOT NULL DEFAULT 0,
  blocked_count   INTEGER NOT NULL DEFAULT 0,
  passed_count    INTEGER NOT NULL DEFAULT 0,
  bypass_rate     REAL    NOT NULL DEFAULT 0,          -- 0.0 - 1.0 (passed / total)
  risk_level      TEXT,                                -- 'low' | 'medium' | 'high' | 'critical'
  results_json    TEXT,                                -- full JSON results blob
  status          TEXT    NOT NULL DEFAULT 'pending',  -- 'running' | 'complete' | 'error'
  started_at      TEXT    NOT NULL,
  ended_at        TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_waf_scans_status  ON waf_scans(status);
CREATE INDEX IF NOT EXISTS idx_waf_scans_created ON waf_scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waf_scans_url     ON waf_scans(target_url);
