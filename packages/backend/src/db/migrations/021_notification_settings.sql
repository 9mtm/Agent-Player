-- Migration 021: Per-user notification preferences
CREATE TABLE IF NOT EXISTS notification_settings (
  id                   TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  user_id              TEXT NOT NULL UNIQUE,

  -- ── Channels ──────────────────────────────────────────────
  channel_in_app       INTEGER NOT NULL DEFAULT 1,
  channel_email        INTEGER NOT NULL DEFAULT 0,
  channel_push         INTEGER NOT NULL DEFAULT 0,
  channel_whatsapp     INTEGER NOT NULL DEFAULT 0,
  channel_sound        INTEGER NOT NULL DEFAULT 1,

  -- ── Email config ──────────────────────────────────────────
  email_address        TEXT,
  email_digest         TEXT NOT NULL DEFAULT 'realtime',
  -- digest: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'never'

  -- ── WhatsApp config ───────────────────────────────────────
  whatsapp_phone       TEXT,

  -- ── Do Not Disturb ────────────────────────────────────────
  dnd_enabled          INTEGER NOT NULL DEFAULT 0,
  dnd_start            TEXT NOT NULL DEFAULT '22:00',  -- HH:MM
  dnd_end              TEXT NOT NULL DEFAULT '08:00',  -- HH:MM

  -- ── Event toggles ─────────────────────────────────────────
  notify_task_complete INTEGER NOT NULL DEFAULT 1,
  notify_agent_error   INTEGER NOT NULL DEFAULT 1,
  notify_skill_exec    INTEGER NOT NULL DEFAULT 0,
  notify_workflow      INTEGER NOT NULL DEFAULT 1,
  notify_security      INTEGER NOT NULL DEFAULT 1,
  notify_system        INTEGER NOT NULL DEFAULT 1,

  -- ── Push subscription (Web Push API) ─────────────────────
  push_subscription    TEXT,  -- JSON WebPushSubscription object

  updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
