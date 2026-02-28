-- My App Extension - Initial Migration
-- Purpose: Create database tables for My App extension

-- Main items table
CREATE TABLE IF NOT EXISTS my_app_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_myapp_items_created ON my_app_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_myapp_items_name ON my_app_items(name);
