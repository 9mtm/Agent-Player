-- ============================================================
-- INBOX SYSTEM - Database Migration (No Foreign Keys)
-- Created: 2026-02-16
-- Description: Smart inbox system without foreign key constraints for testing
-- ============================================================

-- Drop existing tables if any
DROP TABLE IF EXISTS inbox_messages;
DROP TABLE IF EXISTS approval_rules;
DROP VIEW IF EXISTS inbox_stats_by_user;

-- ===================
-- Table: inbox_messages
-- ===================
CREATE TABLE IF NOT EXISTS inbox_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,

  source_type TEXT NOT NULL CHECK (source_type IN (
    'whatsapp', 'telegram', 'gmail', 'github', 'discord',
    'slack', 'webhook', 'manual', 'other'
  )),
  source_id TEXT,

  message TEXT NOT NULL,
  metadata JSON DEFAULT '{}',

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'needs_approval'
  )),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  auto_executed BOOLEAN DEFAULT 0,

  approval_needed BOOLEAN DEFAULT 0,
  approval_status TEXT CHECK (approval_status IS NULL OR approval_status IN (
    'pending', 'approved', 'denied'
  )),
  approved_by TEXT,
  approved_at DATETIME,

  result JSON,
  error TEXT,

  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  completed_at DATETIME
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inbox_status ON inbox_messages(status);
CREATE INDEX IF NOT EXISTS idx_inbox_user_status ON inbox_messages(user_id, status);
CREATE INDEX IF NOT EXISTS idx_inbox_approval ON inbox_messages(approval_needed, approval_status);
CREATE INDEX IF NOT EXISTS idx_inbox_received ON inbox_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_risk ON inbox_messages(risk_level);

-- ===================
-- Table: approval_rules
-- ===================
CREATE TABLE IF NOT EXISTS approval_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,

  source_type TEXT,
  action_pattern TEXT,
  risk_level TEXT CHECK (risk_level IS NULL OR risk_level IN ('low', 'medium', 'high')),

  auto_approve BOOLEAN DEFAULT 0,
  auto_deny BOOLEAN DEFAULT 0,
  priority INTEGER DEFAULT 5,

  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT 1,

  times_applied INTEGER DEFAULT 0,
  confidence_score REAL DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CHECK (NOT (auto_approve = 1 AND auto_deny = 1)),
  CHECK (priority >= 1 AND priority <= 10)
);

CREATE INDEX IF NOT EXISTS idx_rules_user ON approval_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_rules_enabled ON approval_rules(enabled, priority DESC);
CREATE INDEX IF NOT EXISTS idx_rules_source ON approval_rules(source_type);

-- ===================
-- Migration complete
-- ===================
