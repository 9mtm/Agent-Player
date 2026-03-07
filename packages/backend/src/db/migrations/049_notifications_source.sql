-- Migration 048: Add source field to notifications table
-- Purpose: Track which extension/system created each notification for unified notification system
-- Date: 2026-03-07

-- Add source column to track notification origin (extensionId or 'system')
ALTER TABLE notifications ADD COLUMN source TEXT DEFAULT 'system';

-- Create index for efficient filtering by source
CREATE INDEX IF NOT EXISTS idx_notifications_source ON notifications(source);

-- Add comment for documentation
-- source values: 'system' (core) or extensionId (e.g., 'server-monitor', 'email-client')
