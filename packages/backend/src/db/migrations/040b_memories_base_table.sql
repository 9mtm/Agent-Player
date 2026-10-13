-- Migration 040b: base memories table for fresh installs
-- The memories table used to be created only by MemoryStorage.initialize(), which runs
-- after the migrations. On a fresh database, migration 041 (indexes on memories) then
-- failed and the backend could not start. Same definition as src/memory/storage.ts;
-- a no-op on existing installs.

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding TEXT,
  memory_layer TEXT DEFAULT 'factual',
  status TEXT DEFAULT 'active',
  metadata TEXT,
  importance_score REAL DEFAULT 0.5,
  tags TEXT,
  created_at TEXT NOT NULL,
  last_accessed_at INTEGER,
  access_count INTEGER DEFAULT 0,
  expiry_timestamp INTEGER,
  consolidation_status TEXT DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
