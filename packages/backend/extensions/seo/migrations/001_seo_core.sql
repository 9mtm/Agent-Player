-- SEO Extension: Core Tables Migration
-- Creates domains, keywords, and scraper jobs tables

-- Domains (SEO projects)
CREATE TABLE IF NOT EXISTS seo_domains (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  business_name TEXT,
  niche TEXT,
  language TEXT DEFAULT 'en-US',
  target_country TEXT DEFAULT 'US',

  -- Settings
  notification INTEGER DEFAULT 1,
  notification_interval TEXT DEFAULT 'daily',
  notification_emails TEXT,

  -- Integrations
  wordpress_url TEXT,
  wordpress_credential_id TEXT,
  gsc_site_url TEXT,
  gsc_credential_id TEXT,

  -- Focus keywords (JSON arrays)
  focus_keywords_high TEXT DEFAULT '[]',
  focus_keywords_medium TEXT DEFAULT '[]',
  focus_keywords_low TEXT DEFAULT '[]',

  -- Competitors (JSON array)
  competitors TEXT DEFAULT '[]',

  keyword_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_seo_domains_user ON seo_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_seo_domains_slug ON seo_domains(slug);

-- Keywords
CREATE TABLE IF NOT EXISTS seo_keywords (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  domain_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  device TEXT DEFAULT 'desktop',
  country TEXT DEFAULT 'US',
  city TEXT,

  -- Position tracking
  position INTEGER DEFAULT 0,
  url TEXT,
  volume INTEGER DEFAULT 0,

  -- History: JSON array of {date, position, url}
  history TEXT DEFAULT '[]',

  -- Last scrape result: JSON object
  last_result TEXT DEFAULT '{}',
  last_updated TEXT,

  -- Competitor positions: JSON {domain: position}
  competitor_positions TEXT DEFAULT '{}',

  -- Flags
  sticky INTEGER DEFAULT 1,
  updating INTEGER DEFAULT 0,
  last_update_error TEXT,

  -- Tags: JSON array
  tags TEXT DEFAULT '[]',

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (domain_id) REFERENCES seo_domains(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_seo_keywords_user ON seo_keywords(user_id);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_domain ON seo_keywords(domain_id);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_keyword ON seo_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_sticky ON seo_keywords(sticky);

-- Scraper Jobs Queue
CREATE TABLE IF NOT EXISTS seo_scraper_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  keyword_id TEXT,
  status TEXT DEFAULT 'pending',
  scraper_type TEXT NOT NULL,
  request_data TEXT,
  response_data TEXT,
  started_at TEXT,
  completed_at TEXT,
  duration_ms INTEGER,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (keyword_id) REFERENCES seo_keywords(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_seo_jobs_status ON seo_scraper_jobs(status);
CREATE INDEX IF NOT EXISTS idx_seo_jobs_user ON seo_scraper_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_seo_jobs_keyword ON seo_scraper_jobs(keyword_id);
