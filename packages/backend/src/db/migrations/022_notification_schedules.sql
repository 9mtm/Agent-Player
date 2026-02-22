-- Migration 022: Scheduled / time-based notifications
CREATE TABLE IF NOT EXISTS notification_schedules (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  user_id        TEXT NOT NULL,
  title          TEXT NOT NULL,
  body           TEXT NOT NULL DEFAULT '',
  type           TEXT NOT NULL DEFAULT 'reminder',

  -- ── Timing ────────────────────────────────────────────────
  schedule_type  TEXT NOT NULL DEFAULT 'daily',
  -- 'once' | 'daily' | 'weekly' | 'weekdays' | 'weekends' | 'custom'
  schedule_time  TEXT NOT NULL DEFAULT '09:00',  -- HH:MM (24h)
  schedule_days  TEXT,        -- JSON [0-6] for 'weekly'/'custom'; 0=Sun
  schedule_date  TEXT,        -- YYYY-MM-DD for 'once'

  -- ── Delivery ──────────────────────────────────────────────
  channels       TEXT NOT NULL DEFAULT '["in_app"]',  -- JSON string[]

  -- ── State ─────────────────────────────────────────────────
  is_active      INTEGER NOT NULL DEFAULT 1,
  last_fired_at  DATETIME,
  next_fire_at   DATETIME,

  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notif_schedules_next
  ON notification_schedules(is_active, next_fire_at);
