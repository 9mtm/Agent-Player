/**
 * Audit repository on PostgreSQL (B2.2a).
 *
 *   record      writes audit_logs in PostgreSQL (same columns and values as
 *               services/audit-logger.ts logAudit, shared SQL). Like logAudit
 *               it never fails the caller: an error is logged (safe fields only)
 *               and swallowed. Inside a transaction the insert runs in a
 *               SAVEPOINT, so a failed audit row cannot abort the caller's
 *               transaction.
 *   reads       the security event log (status, stats, query, recent, get,
 *               export, config, cleanup): the same methods and scope checks
 *               as the SQLite repository. B2.2c: audit/audit-storage.ts puts
 *               that store in the main PostgreSQL database
 *               (security_audit_events, migrations-pg r007) when the process
 *               driver is PostgreSQL.
 */

import { requireActor } from '../scope.js';
import { sqliteAudit, type AuditRepository } from '../audit.js';
import { AUDIT_INSERT_SQL, auditLogParams } from '../../services/audit-logger.js';
import { pgRun, withPgTransaction, inPgTransaction } from '../../db/pg/pool.js';
import { safeErrorFields } from '../../services/safe-error-log.js';

export const pgAudit: AuditRepository = {
  ...sqliteAudit,

  async record(actor, entry, meta) {
    const a = requireActor(actor);
    const params = auditLogParams({
      ...entry,
      user_id: entry.user_id ?? a.userId,
      ip_address: entry.ip_address ?? meta?.ip,
      user_agent: entry.user_agent ?? meta?.userAgent,
      request_method: entry.request_method ?? meta?.method,
      request_path: entry.request_path ?? meta?.path,
    });
    try {
      if (inPgTransaction()) await withPgTransaction(() => pgRun(AUDIT_INSERT_SQL, ...params));
      else await pgRun(AUDIT_INSERT_SQL, ...params);
    } catch (error: unknown) {
      // SECURITY: never fail the main operation because of audit logging.
      console.error('[AuditLogger] Failed to log audit event:', safeErrorFields(error));
    }
  },
};
