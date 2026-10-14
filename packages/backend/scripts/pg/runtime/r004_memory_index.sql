-- Runtime DDL (B2.2b-4): the memory hybrid index tables. On SQLite
-- src/memory/indexer.ts creates them in its own file (.data/memory/memory.db);
-- on PostgreSQL they live in the main database (src/memory/indexer-pg.ts).
-- INDEXER_TABLES_SQL must equal this file (test/pg-runtime-ddl.test.mjs);
-- translated into migrations-pg r004.

-- Memory index table
CREATE TABLE IF NOT EXISTS memory_index (
  id TEXT PRIMARY KEY,
  memory_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding BLOB,
  layer TEXT NOT NULL,
  importance INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  last_accessed TEXT,
  access_count INTEGER DEFAULT 0,
  tags TEXT,
  embedding_model TEXT,
  UNIQUE(memory_id)
);

-- Chunks table for large memories
CREATE TABLE IF NOT EXISTS memory_chunks (
  id TEXT PRIMARY KEY,
  memory_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding BLOB,
  position INTEGER NOT NULL,
  offset_start INTEGER NOT NULL,
  offset_end INTEGER NOT NULL,
  embedding_model TEXT,
  FOREIGN KEY (memory_id) REFERENCES memory_index(memory_id) ON DELETE CASCADE
);

-- Relations table
CREATE TABLE IF NOT EXISTS memory_relations (
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  strength REAL NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (source_id, target_id, relation_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_memory_layer ON memory_index(layer);
CREATE INDEX IF NOT EXISTS idx_memory_importance ON memory_index(importance);
CREATE INDEX IF NOT EXISTS idx_memory_created ON memory_index(created_at);
CREATE INDEX IF NOT EXISTS idx_chunks_memory ON memory_chunks(memory_id);
