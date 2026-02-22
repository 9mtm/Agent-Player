-- Storage System: unified cache + CDN manifest
-- Zone 'cache' = temporary, auto-expires
-- Zone 'cdn'   = persistent, agent-managed assets

CREATE TABLE IF NOT EXISTS storage_files (
  id TEXT PRIMARY KEY,
  zone TEXT NOT NULL CHECK(zone IN ('cache', 'cdn')),
  category TEXT NOT NULL,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT,
  size_bytes INTEGER DEFAULT 0,
  description TEXT,
  tags TEXT,
  ttl TEXT NOT NULL DEFAULT 'persistent',
  expires_at DATETIME,
  source_url TEXT,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_accessed DATETIME,
  access_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_storage_zone_cat ON storage_files(zone, category);
CREATE INDEX IF NOT EXISTS idx_storage_expires ON storage_files(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_storage_created ON storage_files(created_at);
