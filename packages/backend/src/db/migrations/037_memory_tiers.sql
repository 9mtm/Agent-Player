-- Migration 037: Multi-Tier Memory System
-- Three-tier memory architecture: Working → Experiential → Factual
-- Based on research: https://arxiv.org/abs/2512.13564

-- Add memory_layer column to existing memories table
ALTER TABLE memories ADD COLUMN memory_layer TEXT DEFAULT 'factual' CHECK (memory_layer IN ('working', 'experiential', 'factual'));

-- Add expiry_timestamp for working memory (auto-expire after session)
ALTER TABLE memories ADD COLUMN expiry_timestamp INTEGER;

-- Add consolidation_status for experiential memory
ALTER TABLE memories ADD COLUMN consolidation_status TEXT DEFAULT 'pending' CHECK (consolidation_status IN ('pending', 'consolidated', 'promoted'));

-- Add importance_score for determining promotion between layers
ALTER TABLE memories ADD COLUMN importance_score REAL DEFAULT 0.5;

-- Add access_count to track how often memory is accessed
ALTER TABLE memories ADD COLUMN access_count INTEGER DEFAULT 0;

-- Add last_accessed_at timestamp
ALTER TABLE memories ADD COLUMN last_accessed_at INTEGER;

-- Create index for efficient layer-based queries
CREATE INDEX IF NOT EXISTS idx_memories_layer ON memories(memory_layer);

-- Create index for expiry_timestamp (for cleanup jobs)
CREATE INDEX IF NOT EXISTS idx_memories_expiry ON memories(expiry_timestamp) WHERE expiry_timestamp IS NOT NULL;

-- Create index for consolidation_status
CREATE INDEX IF NOT EXISTS idx_memories_consolidation ON memories(consolidation_status) WHERE memory_layer = 'experiential';

-- Create index for importance_score (for promotion queries)
CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance_score);

-- Memory consolidation log table
CREATE TABLE IF NOT EXISTS memory_consolidation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_timestamp INTEGER NOT NULL,
  memories_consolidated INTEGER DEFAULT 0,
  memories_promoted INTEGER DEFAULT 0,
  memories_expired INTEGER DEFAULT 0,
  duration_ms INTEGER,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'partial')),
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Create index for consolidation log
CREATE INDEX IF NOT EXISTS idx_consolidation_log_timestamp ON memory_consolidation_log(run_timestamp);
