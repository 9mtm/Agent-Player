-- Migration 001: Public Chat Rooms System
-- Creates tables for multi-user public chat rooms with AI agents

-- ══════════════════════════════════════════════════════════════════════════════
-- public_chat_rooms: Chat room definitions with AI configuration
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public_chat_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_user_id TEXT NOT NULL,

  -- AI Configuration (Room-Specific)
  model TEXT DEFAULT 'claude-sonnet-4.5',           -- AI model: claude-sonnet-4.5, gpt-4, gemini, ollama, etc.
  system_prompt TEXT,                               -- Room-specific system prompt (overrides agent)
  agent_id TEXT,                                    -- Optional: use existing agent as base
  workflow_id TEXT,                                 -- Optional: trigger workflow on messages
  skills TEXT,                                      -- JSON array of enabled skill IDs

  -- Avatar/UI Customization (Room-Specific - Separate from Personal)
  avatar_url TEXT,                                  -- Custom avatar GLB URL for this room
  avatar_gender TEXT DEFAULT 'female',              -- male/female
  bg_color TEXT DEFAULT '#09090b',                  -- Background hex color
  bg_scene TEXT DEFAULT 'none',                     -- Scene: office, living_room, env_city, etc.
  wall_text TEXT,                                   -- Text content for wall board
  wall_logo_url TEXT,                               -- Image/logo URL for wall
  wall_video_url TEXT,                              -- YouTube or video URL for wall
  wall_layout TEXT,                                 -- JSON: { text:{x,y,w,h}, logo:{}, video:{} }
  fx_state TEXT,                                    -- JSON: FX effects configuration

  -- Access Control
  is_public INTEGER DEFAULT 1,                      -- 1=public, 0=private/invite-only
  require_auth INTEGER DEFAULT 0,                   -- 0=anonymous allowed, 1=login required
  allowed_users TEXT,                               -- JSON array of user IDs (for private rooms)

  -- Chat Settings
  max_message_length INTEGER DEFAULT 1000,
  rate_limit_seconds INTEGER DEFAULT 5,             -- Min seconds between messages per user
  enable_voice INTEGER DEFAULT 1,                   -- Voice input/output
  enable_avatar INTEGER DEFAULT 1,                  -- Show avatar viewer
  enable_developer_mode INTEGER DEFAULT 0,          -- Allow room owner to use dev mode

  -- Widget Embedding
  embed_enabled INTEGER DEFAULT 1,
  embed_size TEXT DEFAULT 'medium',                 -- small, medium, large, full
  embed_theme TEXT DEFAULT 'auto',                  -- light, dark, auto

  -- Statistics
  message_count INTEGER DEFAULT 0,
  participant_count INTEGER DEFAULT 0,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents_config(id) ON DELETE SET NULL,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_public_rooms_owner ON public_chat_rooms(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_public_rooms_public ON public_chat_rooms(is_public);
CREATE INDEX IF NOT EXISTS idx_public_rooms_created ON public_chat_rooms(created_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- public_chat_messages: Chat messages in rooms
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public_chat_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT,                                     -- NULL for anonymous users
  username TEXT NOT NULL,                           -- Display name (required for anonymous)
  role TEXT NOT NULL,                               -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (room_id) REFERENCES public_chat_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_public_messages_room ON public_chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_public_messages_created ON public_chat_messages(created_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- public_chat_participants: Track active users in rooms
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public_chat_participants (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT,                                     -- NULL for anonymous
  username TEXT NOT NULL,                           -- Display name
  joined_at TEXT DEFAULT (datetime('now')),
  last_seen_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (room_id) REFERENCES public_chat_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_room_user ON public_chat_participants(room_id, user_id, username);
CREATE INDEX IF NOT EXISTS idx_participants_room ON public_chat_participants(room_id);
