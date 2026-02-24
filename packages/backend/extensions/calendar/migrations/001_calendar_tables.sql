-- Migration 001: Calendar System
-- Professional calendar with Google Calendar sync and external calendar imports

-- Calendar Sources (Google Calendar, iCal, CalDAV, etc.)
CREATE TABLE IF NOT EXISTS calendar_sources (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- google, ical, caldav, webcal, manual
  url TEXT, -- iCal URL or CalDAV URL
  color TEXT DEFAULT '#3b82f6',
  is_enabled INTEGER DEFAULT 1,
  is_primary INTEGER DEFAULT 0, -- primary calendar for new events

  -- Google Calendar OAuth
  google_calendar_id TEXT, -- e.g., user@gmail.com or calendar_id@group.calendar.google.com
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expiry TEXT,

  -- Sync settings
  sync_enabled INTEGER DEFAULT 1,
  sync_interval INTEGER DEFAULT 300, -- seconds (5 minutes default)
  last_synced_at TEXT,
  sync_status TEXT DEFAULT 'pending', -- pending, syncing, success, error
  sync_error TEXT,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_calendar_sources_user ON calendar_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sources_type ON calendar_sources(type);
CREATE INDEX IF NOT EXISTS idx_calendar_sources_enabled ON calendar_sources(user_id, is_enabled);

-- Calendar Events
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  calendar_source_id TEXT, -- NULL for manual events, references calendar_sources for synced events

  -- Event details
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,

  -- Time
  start_time TEXT NOT NULL, -- ISO 8601 datetime
  end_time TEXT NOT NULL,
  is_all_day INTEGER DEFAULT 0,
  timezone TEXT DEFAULT 'UTC',

  -- Recurrence
  recurrence_rule TEXT, -- RRULE format (RFC 5545)
  recurrence_exception TEXT, -- JSON array of exception dates
  parent_event_id TEXT, -- for recurring event instances

  -- Attendees
  attendees TEXT, -- JSON array: [{email, name, status: accepted/declined/tentative/needsAction}]
  organizer TEXT, -- email

  -- Status & Type
  status TEXT DEFAULT 'confirmed', -- confirmed, tentative, cancelled
  event_type TEXT DEFAULT 'event', -- event, meeting, deadline, reminder, birthday

  -- Notifications
  reminders TEXT, -- JSON array: [{method: email/popup, minutes: 15}]

  -- External sync
  external_id TEXT, -- Google Event ID or iCal UID
  external_url TEXT, -- Link to event in external calendar
  external_etag TEXT, -- For optimistic locking

  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (calendar_source_id) REFERENCES calendar_sources(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_source ON calendar_events(calendar_source_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_time ON calendar_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_external ON calendar_events(external_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_parent ON calendar_events(parent_event_id);

-- Calendar Sync Log
CREATE TABLE IF NOT EXISTS calendar_sync_log (
  id TEXT PRIMARY KEY,
  calendar_source_id TEXT NOT NULL,

  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  status TEXT DEFAULT 'running', -- running, success, error
  error_message TEXT,

  events_added INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  events_deleted INTEGER DEFAULT 0,

  FOREIGN KEY (calendar_source_id) REFERENCES calendar_sources(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_calendar_sync_log_source ON calendar_sync_log(calendar_source_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_log_time ON calendar_sync_log(started_at);

-- Insert default manual calendar for each user
INSERT INTO calendar_sources (id, user_id, name, type, color, is_primary, sync_enabled)
SELECT
  'default-' || id,
  id,
  'My Calendar',
  'manual',
  '#3b82f6',
  1,
  0
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM calendar_sources WHERE user_id = users.id AND type = 'manual'
);
