-- SEO Extension: Settings Migration
-- Creates user settings table

-- User SEO Settings
CREATE TABLE IF NOT EXISTS seo_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,

  -- Scraper configuration
  primary_scraper TEXT DEFAULT 'serper',
  fallback_scrapers TEXT DEFAULT '["serpapi","valueserp","searchapi"]',
  scrape_interval TEXT DEFAULT 'daily',

  -- Notification settings
  enable_notifications INTEGER DEFAULT 1,
  notification_channels TEXT DEFAULT '["in_app","email"]',
  notify_on_improvement INTEGER DEFAULT 1,
  notify_on_drop INTEGER DEFAULT 1,
  notify_threshold INTEGER DEFAULT 3,

  -- Advanced settings
  max_concurrent_scrapes INTEGER DEFAULT 5,
  scrape_delay_ms INTEGER DEFAULT 1000,
  retry_failed_scrapes INTEGER DEFAULT 1,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_seo_settings_user ON seo_settings(user_id);
