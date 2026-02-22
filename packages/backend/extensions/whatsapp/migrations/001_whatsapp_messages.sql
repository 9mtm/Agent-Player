-- WhatsApp messages and configuration

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id           TEXT PRIMARY KEY,
  from_number  TEXT NOT NULL,
  to_number    TEXT NOT NULL,
  content      TEXT NOT NULL,
  media_url    TEXT,
  status       TEXT,
  timestamp    TEXT NOT NULL,
  direction    TEXT NOT NULL DEFAULT 'incoming',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from
  ON whatsapp_messages(from_number, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_to
  ON whatsapp_messages(to_number, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created
  ON whatsapp_messages(created_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_config (
  id                INTEGER PRIMARY KEY CHECK (id = 1),
  account_sid       TEXT,
  auth_token        TEXT,
  from_number       TEXT,
  webhook_url       TEXT,
  allowed_numbers   TEXT,
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
