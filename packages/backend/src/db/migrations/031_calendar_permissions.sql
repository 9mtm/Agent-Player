-- Migration 031: Calendar Permissions
-- Add permission levels and descriptions to calendar sources

-- Add new columns to calendar_sources
ALTER TABLE calendar_sources ADD COLUMN description TEXT;
ALTER TABLE calendar_sources ADD COLUMN permission TEXT DEFAULT 'read_write'; -- read_only, read_write
ALTER TABLE calendar_sources ADD COLUMN allow_agent_access INTEGER DEFAULT 1; -- 0 = agent cannot access, 1 = agent can access

-- Update existing calendars to have default permissions
UPDATE calendar_sources
SET
  permission = 'read_write',
  allow_agent_access = 1
WHERE permission IS NULL;
