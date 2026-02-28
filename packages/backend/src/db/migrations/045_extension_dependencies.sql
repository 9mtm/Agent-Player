-- Migration 045: Extension Dependencies System
-- Purpose: Track and resolve extension dependencies
-- Created: 2026-02-28

-- Extension Dependencies (Explicit Dependency Relationships)
CREATE TABLE IF NOT EXISTS extension_dependencies (
  id TEXT PRIMARY KEY,
  extension_id TEXT NOT NULL, -- FK to extension_registry.id (the dependent extension)
  depends_on_id TEXT NOT NULL, -- FK to extension_registry.id (the required extension)
  min_version TEXT, -- Minimum version required
  max_version TEXT, -- Maximum version allowed (optional)
  required BOOLEAN DEFAULT 1, -- If 0, dependency is optional
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (extension_id) REFERENCES extension_registry(id) ON DELETE CASCADE,
  FOREIGN KEY (depends_on_id) REFERENCES extension_registry(id) ON DELETE CASCADE,
  UNIQUE(extension_id, depends_on_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deps_extension ON extension_dependencies(extension_id);
CREATE INDEX IF NOT EXISTS idx_deps_depends_on ON extension_dependencies(depends_on_id);
CREATE INDEX IF NOT EXISTS idx_deps_required ON extension_dependencies(required) WHERE required = 1;
