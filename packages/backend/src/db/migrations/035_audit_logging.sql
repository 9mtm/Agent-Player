-- Migration 036: Fix Audit Logs Table
-- Drops and recreates audit_logs table with correct schema

-- Drop existing incomplete table
DROP TABLE IF EXISTS audit_logs;

-- Recreate with correct schema
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Event details
    event_type TEXT NOT NULL,
    event_category TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',

    -- User context
    user_id TEXT,
    username TEXT,

    -- Request context
    ip_address TEXT,
    user_agent TEXT,
    request_method TEXT,
    request_path TEXT,

    -- Event-specific data
    resource_type TEXT,
    resource_id TEXT,
    action TEXT,

    -- Result
    success INTEGER NOT NULL DEFAULT 1,
    error_message TEXT,

    -- Additional metadata (JSON)
    metadata TEXT,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_user_id ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_event_type ON audit_logs(event_type, created_at DESC);
CREATE INDEX idx_audit_category ON audit_logs(event_category, created_at DESC);
CREATE INDEX idx_audit_severity ON audit_logs(severity, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_ip ON audit_logs(ip_address, created_at DESC);
