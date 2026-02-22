-- SEO Extension: Google Search Console Migration
-- Creates analytics and sync log tables

-- Search Console Analytics Data
CREATE TABLE IF NOT EXISTS seo_search_analytics (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL,
  date TEXT NOT NULL,
  keyword TEXT NOT NULL,
  page TEXT,
  country TEXT DEFAULT 'ALL',
  device TEXT DEFAULT 'ALL',
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr REAL DEFAULT 0,
  position REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE(domain_id, date, keyword, country, device),
  FOREIGN KEY (domain_id) REFERENCES seo_domains(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_seo_analytics_domain ON seo_search_analytics(domain_id, date);
CREATE INDEX IF NOT EXISTS idx_seo_analytics_keyword ON seo_search_analytics(keyword);
CREATE INDEX IF NOT EXISTS idx_seo_analytics_date ON seo_search_analytics(date);

-- Google Search Console Sync Log
CREATE TABLE IF NOT EXISTS seo_gsc_sync_log (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  rows_synced INTEGER DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  started_at TEXT,
  completed_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (domain_id) REFERENCES seo_domains(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_seo_gsc_sync_domain ON seo_gsc_sync_log(domain_id);
CREATE INDEX IF NOT EXISTS idx_seo_gsc_sync_status ON seo_gsc_sync_log(status);
