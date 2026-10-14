-- Full text of the memory hybrid index on PostgreSQL (replaces the SQLite
-- FTS5 table memory_fts(memory_id, content, tags); src/memory/indexer-pg.ts).
-- A generated tsvector column over content and tags with the 'simple'
-- configuration (lower case, no stemming, no stop words: Arabic, German and
-- other languages are never stemmed with English rules), and a GIN index.
-- The tokens belong to the row: deleting the memory_index row removes them.

ALTER TABLE memory_index ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(content, '') || ' ' || coalesce(tags, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_memory_index_fts ON memory_index USING gin (fts);
