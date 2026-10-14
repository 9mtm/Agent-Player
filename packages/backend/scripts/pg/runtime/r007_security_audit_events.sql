-- Runtime DDL (B2.2c): the security audit event store. On SQLite
-- src/audit/audit-storage.ts creates it in its own file (AUDIT_DB_PATH,
-- default <data>/audit/audit.db) as `audit_events`; on PostgreSQL it lives in
-- the main database as `security_audit_events`, so one backup covers it.
-- auditEventsSchemaSql('security_audit_events') must equal this file
-- (test/pg-runtime-ddl.test.mjs); translated into migrations-pg r007.
-- Index names differ from the SQLite file (idx_audit_* already exists on
-- audit_logs in the main database).

CREATE TABLE IF NOT EXISTS security_audit_events (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  severity TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_name TEXT,
  actor_ip TEXT,
  target_type TEXT,
  target_id TEXT,
  target_name TEXT,
  result TEXT NOT NULL,
  error TEXT,
  details TEXT,
  request TEXT,
  session_id TEXT,
  correlation_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_audit_timestamp ON security_audit_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_audit_category ON security_audit_events(category);
CREATE INDEX IF NOT EXISTS idx_security_audit_severity ON security_audit_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_audit_actor ON security_audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_result ON security_audit_events(result);
CREATE INDEX IF NOT EXISTS idx_security_audit_session ON security_audit_events(session_id);
