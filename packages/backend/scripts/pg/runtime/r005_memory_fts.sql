-- Runtime DDL (B2.2b-4): the FTS5 full-text table of the memory hybrid index
-- (SQLite, src/memory/indexer.ts INDEXER_FTS_SQL, kept equal by
-- test/pg-runtime-ddl.test.mjs). PostgreSQL has no FTS5: migrations-pg r005
-- is the hand-written override scripts/pg/overrides/r005_memory_fts.sql.

-- Full-text search index
CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
  memory_id,
  content,
  tags,
  tokenize='porter unicode61'
);
