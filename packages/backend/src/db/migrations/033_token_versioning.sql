-- Migration 033: Token Versioning for Security
-- Add token_version to users table to invalidate tokens on password change
-- This fixes H-01: Token Not Invalidated on Password Change

-- Add token_version column (defaults to 1 for existing users)
ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 1;

-- Index for faster token validation lookups
CREATE INDEX IF NOT EXISTS idx_users_token_version ON users(id, token_version);

-- Update all existing users to version 1 (already set by DEFAULT)
-- This migration is idempotent and safe to run multiple times
