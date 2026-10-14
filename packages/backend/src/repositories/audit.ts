/**
 * Audit repository (B1-core): writing audit entries and reading the security
 * audit log. Scope rules (scope.ts):
 *
 *   record                       every actor (user, agent run, channel turn,
 *                                system); user_id defaults to the actor's user
 *   status / stats / query /
 *   recent / get / export /
 *   alerts / activity / config   owner or admin (whole security audit log)
 *   updateConfig / cleanup       owner only (cleanup erases the trail)
 *
 * Agent runs and channel turns can write entries but never read the log.
 * SQLite implementation over services/audit-logger.ts (`audit_logs`) and
 * audit/ (security events store). B2.2c: the security event store follows the
 * process driver itself (audit/audit-storage.ts: its own SQLite file, or the
 * security_audit_events table in the main PostgreSQL database), so these read
 * methods serve both drivers.
 */

import type { FastifyRequest } from 'fastify';
import type { Actor } from './actor.js';
import { actorLabel } from './actor.js';
import { requireActor, requireAdmin, requireOwner } from './scope.js';
import { logAudit, type AuditLogEntry } from '../services/audit-logger.js';
import {
  getAuditLogger,
  getAuditStatus,
  getAuditStorage,
  type AuditActor,
  type AuditConfig,
  type AuditEvent,
  type AuditQuery,
  type AuditStats,
} from '../audit/index.js';

/** Request facts an audit entry carries (never bodies or secrets). */
export interface RequestMeta {
  ip?: string;
  userAgent?: string;
  method?: string;
  path?: string;
}

export function requestMeta(request: FastifyRequest): RequestMeta {
  return {
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    method: request.method,
    path: request.routeOptions?.url ?? undefined,
  };
}

export type AuditRecord = Omit<AuditLogEntry, 'ip_address' | 'user_agent' | 'request_method' | 'request_path'>
  & Partial<Pick<AuditLogEntry, 'ip_address' | 'user_agent' | 'request_method' | 'request_path'>>;

export interface AuditRepository {
  record(actor: Actor | null | undefined, entry: AuditRecord, meta?: RequestMeta): Promise<void>;
  status(actor: Actor | null | undefined): Promise<Awaited<ReturnType<typeof getAuditStatus>>>;
  stats(actor: Actor | null | undefined): Promise<AuditStats>;
  query(actor: Actor | null | undefined, filters: AuditQuery): Promise<AuditEvent[]>;
  recent(actor: Actor | null | undefined, limit: number): Promise<AuditEvent[]>;
  get(actor: Actor | null | undefined, id: string): Promise<AuditEvent | null>;
  exportJson(actor: Actor | null | undefined, filters: AuditQuery): Promise<string>;
  config(actor: Actor | null | undefined): Promise<AuditConfig>;
  updateConfig(actor: Actor | null | undefined, config: Partial<AuditConfig>, meta?: RequestMeta): Promise<AuditConfig>;
  cleanup(actor: Actor | null | undefined): Promise<number>;
}

/** The security-audit actor of an Actor (who really made a change; B1.6). */
export function auditActorOf(actor: Actor, meta?: RequestMeta): AuditActor {
  const ip = meta?.ip ? { ip: meta.ip } : {};
  if (actor.kind === 'user') return { type: 'user', id: actor.userId ?? 'unknown', ...ip };
  if (actor.kind === 'agent') return { type: 'agent', id: actor.agentId ?? 'unknown', name: actorLabel(actor), ...ip };
  if (actor.kind === 'system') return { type: 'system', id: 'system', ...ip };
  return { type: 'api', id: actorLabel(actor), ...ip };
}

/**
 * The security-audit actor of a request's actor (B1.7: routes that wrote the
 * literal `api/admin`). Behind the auth gate these routes always have a
 * signed-in account; without one (plugin mounted without the gate) the entry
 * says `api/anonymous`, never a made-up admin.
 */
export function requestAuditActor(actor: Actor | null | undefined, meta?: RequestMeta): AuditActor {
  if (actor) return auditActorOf(actor, meta);
  return { type: 'api', id: 'anonymous', ...(meta?.ip ? { ip: meta.ip } : {}) };
}

export const sqliteAudit: AuditRepository = {
  // Synchronous insert inside: an un-awaited call has already written the row.
  async record(actor, entry, meta) {
    const a = requireActor(actor);
    logAudit({
      ...entry,
      user_id: entry.user_id ?? a.userId,
      ip_address: entry.ip_address ?? meta?.ip,
      user_agent: entry.user_agent ?? meta?.userAgent,
      request_method: entry.request_method ?? meta?.method,
      request_path: entry.request_path ?? meta?.path,
    });
  },

  async status(actor) {
    requireAdmin(actor);
    return getAuditStatus();
  },

  async stats(actor) {
    requireAdmin(actor);
    return getAuditStorage().getStats();
  },

  async query(actor, filters) {
    requireAdmin(actor);
    return getAuditStorage().query(filters);
  },

  async recent(actor, limit) {
    requireAdmin(actor);
    return getAuditStorage().getRecent(limit);
  },

  async get(actor, id) {
    requireAdmin(actor);
    return getAuditStorage().getById(id);
  },

  async exportJson(actor, filters) {
    requireAdmin(actor);
    return getAuditStorage().exportToJson(filters);
  },

  async config(actor) {
    requireAdmin(actor);
    return getAuditLogger().getConfig();
  },

  async updateConfig(actor, config, meta) {
    const a = requireOwner(actor);
    const logger = getAuditLogger();
    logger.updateConfig(config);
    // B1.6: the real actor (the owner account), no longer 'api/admin'.
    logger.logConfigChange(
      auditActorOf(a, meta),
      { type: 'config', id: 'audit', name: 'Audit Configuration' },
      { after: config },
    );
    return logger.getConfig();
  },

  async cleanup(actor) {
    requireOwner(actor);
    return getAuditStorage().cleanup();
  },
};
