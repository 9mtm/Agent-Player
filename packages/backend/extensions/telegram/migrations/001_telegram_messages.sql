-- Telegram messages and configuration

CREATE TABLE IF NOT EXISTS telegram_messages (
  id           TEXT PRIMARY KEY,
  chat_id      TEXT NOT NULL,
  chat_type    TEXT,
  content      TEXT NOT NULL,
  user_id      TEXT,
  username     TEXT,
  first_name   TEXT,
  last_name    TEXT,
  timestamp    TEXT NOT NULL,
  direction    TEXT NOT NULL DEFAULT 'incoming',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_telegram_messages_chat
  ON telegram_messages(chat_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_telegram_messages_user
  ON telegram_messages(user_id);

CREATE INDEX IF NOT EXISTS idx_telegram_messages_created
  ON telegram_messages(created_at DESC);

CREATE TABLE IF NOT EXISTS telegram_config (
  id             INTEGER PRIMARY KEY CHECK (id = 1),
  bot_token      TEXT,
  webhook_url    TEXT,
  allowed_users  TEXT,
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
