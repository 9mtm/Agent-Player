-- Slack messages and configuration

CREATE TABLE IF NOT EXISTS slack_messages (
  id           TEXT PRIMARY KEY,
  channel_id   TEXT NOT NULL,
  channel_name TEXT,
  workspace_id TEXT,
  content      TEXT NOT NULL,
  user_id      TEXT NOT NULL,
  username     TEXT,
  timestamp    TEXT NOT NULL,
  thread_ts    TEXT,
  direction    TEXT NOT NULL DEFAULT 'incoming',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_slack_messages_channel
  ON slack_messages(channel_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_slack_messages_thread
  ON slack_messages(thread_ts);

CREATE INDEX IF NOT EXISTS idx_slack_messages_created
  ON slack_messages(created_at DESC);

CREATE TABLE IF NOT EXISTS slack_config (
  id                INTEGER PRIMARY KEY CHECK (id = 1),
  bot_token         TEXT,
  signing_secret    TEXT,
  app_token         TEXT,
  allowed_channels  TEXT,
  webhook_url       TEXT,
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
