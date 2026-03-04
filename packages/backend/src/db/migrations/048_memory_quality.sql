-- Migration 048: High-Quality Memory Content System
-- Enhances memory storage with quality scoring, rich context, and relationships
-- Based on research: Multi-Memory Segment System
-- https://arxiv.org/html/2508.15294v3

-- Add quality score column (0-100, higher is better)
ALTER TABLE memories ADD COLUMN quality_score REAL DEFAULT 50.0 CHECK(quality_score >= 0 AND quality_score <= 100);

-- Add rich context fields
ALTER TABLE memories ADD COLUMN context TEXT; -- Situational context when memory was created
ALTER TABLE memories ADD COLUMN outcomes TEXT; -- Results or lessons learned
ALTER TABLE memories ADD COLUMN emotions TEXT; -- Emotional context (JSON array)

-- Add memory relationships
ALTER TABLE memories ADD COLUMN related_memory_ids TEXT; -- JSON array of related memory IDs

-- Add quality metadata
ALTER TABLE memories ADD COLUMN completeness_score REAL DEFAULT 0.5; -- How complete is the memory (0-1)
ALTER TABLE memories ADD COLUMN clarity_score REAL DEFAULT 0.5; -- How clear is the content (0-1)
ALTER TABLE memories ADD COLUMN usefulness_score REAL DEFAULT 0.5; -- How useful is it (0-1)

-- Add enrichment tracking
ALTER TABLE memories ADD COLUMN auto_enriched INTEGER DEFAULT 0 CHECK(auto_enriched IN (0, 1)); -- Was it auto-enriched
ALTER TABLE memories ADD COLUMN enriched_at TEXT; -- When was it enriched
ALTER TABLE memories ADD COLUMN needs_improvement INTEGER DEFAULT 0 CHECK(needs_improvement IN (0, 1)); -- Flagged for manual review

-- Create indexes for quality queries
CREATE INDEX IF NOT EXISTS idx_memories_quality_score ON memories(quality_score);
CREATE INDEX IF NOT EXISTS idx_memories_needs_improvement ON memories(needs_improvement) WHERE needs_improvement = 1;
CREATE INDEX IF NOT EXISTS idx_memories_completeness ON memories(completeness_score);
CREATE INDEX IF NOT EXISTS idx_memories_clarity ON memories(clarity_score);
CREATE INDEX IF NOT EXISTS idx_memories_usefulness ON memories(usefulness_score);

-- Memory quality history table (track quality improvements over time)
CREATE TABLE IF NOT EXISTS memory_quality_history (
  id TEXT PRIMARY KEY,
  memory_id TEXT NOT NULL,
  old_quality_score REAL,
  new_quality_score REAL,
  improvement_type TEXT CHECK(improvement_type IN ('auto_enrichment', 'manual_edit', 'consolidation', 'user_feedback')),
  changes_made TEXT, -- JSON object describing what changed
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quality_history_memory ON memory_quality_history(memory_id);
CREATE INDEX IF NOT EXISTS idx_quality_history_created ON memory_quality_history(created_at);

-- Memory relationships table (for explicit relationship tracking)
CREATE TABLE IF NOT EXISTS memory_relationships (
  id TEXT PRIMARY KEY,
  source_memory_id TEXT NOT NULL,
  target_memory_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL CHECK(relationship_type IN ('similar', 'related', 'contradicts', 'supports', 'follows', 'prerequisite')),
  strength REAL DEFAULT 0.5 CHECK(strength >= 0 AND strength <= 1), -- Relationship strength
  auto_detected INTEGER DEFAULT 0 CHECK(auto_detected IN (0, 1)), -- Auto vs manual
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (source_memory_id) REFERENCES memories(id) ON DELETE CASCADE,
  FOREIGN KEY (target_memory_id) REFERENCES memories(id) ON DELETE CASCADE,
  UNIQUE(source_memory_id, target_memory_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_memory_rel_source ON memory_relationships(source_memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_rel_target ON memory_relationships(target_memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_rel_type ON memory_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_memory_rel_strength ON memory_relationships(strength);

-- Memory enrichment log (track all auto-enrichment operations)
CREATE TABLE IF NOT EXISTS memory_enrichment_log (
  id TEXT PRIMARY KEY,
  memory_id TEXT NOT NULL,
  enrichment_type TEXT NOT NULL CHECK(enrichment_type IN ('tags', 'emotions', 'context', 'outcomes', 'relationships', 'quality_score')),
  before_value TEXT,
  after_value TEXT,
  confidence REAL DEFAULT 0.5 CHECK(confidence >= 0 AND confidence <= 1),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_enrichment_log_memory ON memory_enrichment_log(memory_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_log_type ON memory_enrichment_log(enrichment_type);
CREATE INDEX IF NOT EXISTS idx_enrichment_log_created ON memory_enrichment_log(created_at);
