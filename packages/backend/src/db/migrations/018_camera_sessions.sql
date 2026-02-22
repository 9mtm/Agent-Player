-- Migration 018: Camera Sessions
-- Tracks webcam/video call sessions (AI vision, recordings, room calls)

CREATE TABLE IF NOT EXISTS camera_sessions (
  id          TEXT    PRIMARY KEY,
  room_id     TEXT    NOT NULL DEFAULT '',       -- shareable room ID for calls
  user_id     TEXT    NOT NULL DEFAULT 'local',
  agent_id    TEXT    NOT NULL DEFAULT '',       -- agent used in this session
  mode        TEXT    NOT NULL DEFAULT 'vision', -- 'vision' | 'record' | 'call'
  started_at  TEXT    NOT NULL,                  -- ISO timestamp
  ended_at    TEXT,                              -- null while active
  duration_s  INTEGER,                           -- seconds (set on end)
  file_id     TEXT,                              -- storage file ID for recorded video
  frame_count INTEGER NOT NULL DEFAULT 0,        -- frames sent to AI
  notes       TEXT    NOT NULL DEFAULT '',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_camera_sessions_room ON camera_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_camera_sessions_user ON camera_sessions(user_id);
