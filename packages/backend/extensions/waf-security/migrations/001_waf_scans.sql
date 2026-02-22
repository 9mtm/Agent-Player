-- WAF Security Scanner tables

CREATE TABLE IF NOT EXISTS waf_scans (
  id             TEXT PRIMARY KEY,
  target_url     TEXT NOT NULL,
  scan_type      TEXT NOT NULL DEFAULT 'external',
  waf_detected   INTEGER NOT NULL DEFAULT 0,
  waf_type       TEXT,
  waf_confidence INTEGER NOT NULL DEFAULT 0,
  total_payloads INTEGER NOT NULL DEFAULT 0,
  blocked_count  INTEGER NOT NULL DEFAULT 0,
  passed_count   INTEGER NOT NULL DEFAULT 0,
  bypass_rate    REAL NOT NULL DEFAULT 0,
  risk_level     TEXT,
  results_json   TEXT,
  status         TEXT NOT NULL DEFAULT 'pending',
  started_at     TEXT NOT NULL,
  ended_at       TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_waf_scans_created ON waf_scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waf_scans_status ON waf_scans(status);
