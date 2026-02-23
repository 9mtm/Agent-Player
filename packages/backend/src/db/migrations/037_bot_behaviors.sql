-- Migration 037: Bot Behaviors and Movement
-- Adds AI behavior types and movement patterns for world bots

-- Add behavior columns to world_bots
ALTER TABLE world_bots ADD COLUMN behavior_type TEXT NOT NULL DEFAULT 'static'
  CHECK(behavior_type IN ('static', 'random_walk', 'patrol', 'idle', 'interactive'));

ALTER TABLE world_bots ADD COLUMN patrol_path TEXT;
  -- JSON array of waypoints: [{"x":0,"y":0,"z":0}, {"x":5,"y":0,"z":5}]

ALTER TABLE world_bots ADD COLUMN movement_speed REAL NOT NULL DEFAULT 1.0;
  -- Movement speed multiplier (0.5 = slow, 1.0 = normal, 2.0 = fast)

ALTER TABLE world_bots ADD COLUMN animation_state TEXT NOT NULL DEFAULT 'idle'
  CHECK(animation_state IN ('idle', 'walk', 'run', 'sit', 'wave', 'dance'));

ALTER TABLE world_bots ADD COLUMN interaction_radius REAL NOT NULL DEFAULT 3.0;
  -- Distance at which bot can interact with player (for 'interactive' behavior)

ALTER TABLE world_bots ADD COLUMN current_waypoint INTEGER NOT NULL DEFAULT 0;
  -- Current waypoint index in patrol path (for 'patrol' behavior)

-- Create index for behavior queries
CREATE INDEX IF NOT EXISTS idx_world_bots_behavior ON world_bots(behavior_type);
