-- Migration 020: Core notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  user_id     TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  type        TEXT NOT NULL DEFAULT 'info',
  -- type: 'info' | 'success' | 'warning' | 'error' | 'agent' | 'system' | 'reminder'
  channel     TEXT NOT NULL DEFAULT 'in_app',
  -- channel: 'in_app' | 'email' | 'push' | 'whatsapp' | 'sound'
  is_read     INTEGER NOT NULL DEFAULT 0,
  action_url  TEXT,
  meta        TEXT,    -- JSON blob for extra structured data
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, is_read, created_at DESC);
