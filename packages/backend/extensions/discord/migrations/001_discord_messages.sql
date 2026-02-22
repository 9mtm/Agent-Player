-- Discord messages and configuration

CREATE TABLE IF NOT EXISTS discord_messages (
  id           TEXT PRIMARY KEY,
  channel_id   TEXT NOT NULL,
  guild_id     TEXT,
  content      TEXT NOT NULL,
  author       TEXT NOT NULL,
  author_id    TEXT NOT NULL,
  timestamp    TEXT NOT NULL,
  direction    TEXT NOT NULL DEFAULT 'incoming',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_discord_messages_channel
  ON discord_messages(channel_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_discord_messages_created
  ON discord_messages(created_at DESC);

CREATE TABLE IF NOT EXISTS discord_config (
  id             INTEGER PRIMARY KEY CHECK (id = 1),
  bot_token      TEXT,
  client_id      TEXT,
  guild_id       TEXT,
  allowed_channels TEXT,
  webhook_url    TEXT,
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
