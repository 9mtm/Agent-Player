-- Migration 036: World Bots
-- Allows placing AI agents as NPCs in worlds

CREATE TABLE IF NOT EXISTS world_bots (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  position_x REAL NOT NULL DEFAULT 0,
  position_y REAL NOT NULL DEFAULT 0,
  position_z REAL NOT NULL DEFAULT 0,
  rotation_y REAL NOT NULL DEFAULT 0,
  animation_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (world_id) REFERENCES user_worlds(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents_config(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_world_bots_world ON world_bots(world_id);
CREATE INDEX IF NOT EXISTS idx_world_bots_agent ON world_bots(agent_id);
CREATE INDEX IF NOT EXISTS idx_world_bots_active ON world_bots(is_active);
