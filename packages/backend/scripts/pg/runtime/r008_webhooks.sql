-- Runtime DDL (B2.2c): the webhook store. On SQLite src/webhooks/manager.ts
-- creates it in its own file (<data>/webhooks/webhooks.db); on PostgreSQL the
-- tables live in the main database, so one backup covers them.
-- WEBHOOKS_SCHEMA_SQL must equal this file (test/pg-runtime-ddl.test.mjs);
-- translated into migrations-pg r008.

CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'POST',
  events TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  auth TEXT,
  headers TEXT,
  retry TEXT NOT NULL,
  secret TEXT,
  filters TEXT,
  transform TEXT,
  timeout INTEGER DEFAULT 30000,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  owner_id TEXT,
  tags TEXT,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS inbound_webhooks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  path TEXT NOT NULL UNIQUE,
  secret TEXT NOT NULL,
  allowed_ips TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  handler TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_triggered TEXT,
  trigger_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  webhook_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  url TEXT NOT NULL,
  method TEXT NOT NULL,
  request_headers TEXT,
  request_body TEXT,
  response_status INTEGER,
  response_headers TEXT,
  response_body TEXT,
  status TEXT NOT NULL,
  attempt INTEGER NOT NULL,
  duration INTEGER,
  error TEXT,
  timestamp TEXT NOT NULL,
  next_retry TEXT,
  FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_webhooks_status ON webhooks(status);
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks(events);
CREATE INDEX IF NOT EXISTS idx_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_timestamp ON webhook_deliveries(timestamp);
CREATE INDEX IF NOT EXISTS idx_inbound_path ON inbound_webhooks(path);
