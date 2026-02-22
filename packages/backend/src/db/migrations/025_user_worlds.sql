-- Migration 025: User Worlds System
-- Interactive 3D worlds that users can upload and explore

CREATE TABLE IF NOT EXISTS user_worlds (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  glb_file_id TEXT,
  thumbnail_file_id TEXT,
  is_public INTEGER DEFAULT 0,
  max_players INTEGER DEFAULT 1,
  spawn_position_x REAL DEFAULT 0,
  spawn_position_y REAL DEFAULT 0,
  spawn_position_z REAL DEFAULT 5,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_worlds_user_id ON user_worlds(user_id);
CREATE INDEX IF NOT EXISTS idx_user_worlds_public ON user_worlds(is_public);
