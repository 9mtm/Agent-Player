-- Migration 017: Multi-avatar collection per user
CREATE TABLE IF NOT EXISTS user_avatars (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Avatar',
  source TEXT NOT NULL DEFAULT 'url',
  glb_url TEXT,
  local_glb_path TEXT,
  preview_url TEXT,
  bg_color TEXT DEFAULT '#0a0a0a',
  bg_scene TEXT DEFAULT 'none',
  is_active INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_avatars_user_id ON user_avatars(user_id);
CREATE INDEX IF NOT EXISTS idx_user_avatars_active ON user_avatars(user_id, is_active);
