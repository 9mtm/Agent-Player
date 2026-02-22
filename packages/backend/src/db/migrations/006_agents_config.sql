-- Migration 006: Agent configurations table
-- Stores multiple named agent profiles with custom system prompts, models, and capabilities

CREATE TABLE IF NOT EXISTS agents_config (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  emoji       TEXT DEFAULT '🤖',
  system_prompt TEXT DEFAULT '',
  model       TEXT DEFAULT 'claude-sonnet-4-5-20250929',
  provider    TEXT DEFAULT 'claude',
  is_primary  INTEGER DEFAULT 0,
  temperature REAL DEFAULT 0.7,
  max_tokens  INTEGER DEFAULT 4096,
  capabilities TEXT DEFAULT '{"webSearch":true,"fileOperations":true,"memory":true,"executeCommands":false}',
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- Default primary agent (inserted once, ignored on subsequent runs)
INSERT OR IGNORE INTO agents_config (id, name, description, emoji, system_prompt, model, provider, is_primary, capabilities)
VALUES (
  'main-agent',
  'Main Agent',
  'General purpose AI assistant for everyday tasks',
  '🤖',
  'You are a helpful, knowledgeable AI assistant. You help users with a wide range of tasks including research, writing, analysis, and problem solving. Be concise, accurate, and friendly.',
  'claude-sonnet-4-5-20250929',
  'claude',
  1,
  '{"webSearch":true,"fileOperations":true,"memory":true,"executeCommands":false}'
);
