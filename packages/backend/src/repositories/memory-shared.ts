/**
 * Memory quality + sharing (B1.7, part of the memory repository):
 * quality stats/scoring/enrichment (/api/memory-quality*) and sharing,
 * team-critical marks, shared lists, deduplication and the sharing audit log
 * (/api/memory-sharing*).
 *
 * Scope (S0-Q.17, same as /api/memory* S0-Q.11): a member account
 * (owner/admin/user) acts strictly on its OWN memories; there is no
 * owner-wide view. Another user's memory -> 404 `Memory not found`. Shared
 * lists show the caller's own shared memories, public ones, and team ones of
 * teams the caller owns or belongs to; a team share needs a team the caller
 * belongs to. Guests, agent runs and channel turns are refused (403), no
 * actor 401. Input errors are MemoryShareInputError (400, the routes' own
 * messages), always checked after the ownership check (404 before 400).
 *
 * SQLite implementation over services/memory-quality-scorer.ts,
 * memory-enrichment.ts, memory-deduplication.ts and the memories /
 * memory_sharing_audit / memory_quality_history / memory_relationships /
 * memory_enrichment_log tables.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Actor } from './actor.js';
import { ScopeError } from './scope.js';
import { memberUser } from './memory-actor.js';
import { getDatabase } from '../db/index.js';
import { MemoryQualityScorer } from '../services/memory-quality-scorer.js';
import { MemoryEnrichmentService } from '../services/memory-enrichment.js';
import { findSimilarMemories, getDeduplicationStats, runDeduplication } from '../services/memory-deduplication.js';

type A = Actor | null | undefined;
type Ret<F extends (...args: any) => any> = Awaited<ReturnType<F>>;

const NOT_FOUND = 'Memory not found';
export const VISIBILITIES = ['private', 'team', 'public'] as const;
export type Visibility = typeof VISIBILITIES[number];

/** Invalid input for a permitted call (the route answers 400 with the message). */
export class MemoryShareInputError extends Error {}

export interface MemorySharedRepository {
  // quality
  qualityStats(actor: A): Promise<Ret<typeof MemoryQualityScorer.getQualityStats>>;
  lowQuality(actor: A, limit: number): Promise<any[]>;
  analyzeQuality(actor: A, id: string): Promise<Ret<typeof MemoryQualityScorer.analyzeQuality>>;
  enrich(actor: A, id: string): Promise<Ret<typeof MemoryEnrichmentService.enrichMemory>>;
  batchEnrich(actor: A, limit: number): Promise<Ret<typeof MemoryEnrichmentService.batchEnrich>>;
  qualityHistory(actor: A, id: string): Promise<any[]>;
  relationships(actor: A, id: string): Promise<any[]>;
  enrichmentLog(actor: A, id: string): Promise<any[]>;
  qualityDistribution(actor: A): Promise<{ distribution: any[]; layerDistribution: any[] }>;
  // sharing
  share(actor: A, id: string, input: { visibility: unknown; teamId?: unknown; reason?: unknown }): Promise<{ memoryId: string; visibility: Visibility; teamId: string | null }>;
  markCritical(actor: A, id: string, input: { critical: unknown; reason?: unknown }): Promise<{ memoryId: string; isTeamCritical: boolean }>;
  /** null when the sharing schema (visibility column) is missing. */
  shared(actor: A, filter: { visibility?: unknown; teamCriticalOnly?: boolean; limit: number }): Promise<any[] | null>;
  sharedByAgent(actor: A, agentId: string, limit: number): Promise<any[]>;
  runDeduplication(actor: A, threshold: unknown): Promise<Ret<typeof runDeduplication>>;
  deduplicationStats(actor: A): Promise<ReturnType<typeof getDeduplicationStats>>;
  deduplicationCandidates(actor: A, threshold: unknown): Promise<ReturnType<typeof findSimilarMemories>>;
  sharingAudit(actor: A, filter: { memoryId?: string; limit: number }): Promise<any[]>;
  /** Teams the actor owns or belongs to (empty when the team tables are missing). */
  teamIds(actor: A): Promise<string[]>;
}

const db = () => getDatabase();

/** The member's own memory row (any status), else 404. */
function ownRow(userId: string, id: unknown): { content: string; metadata: string | null; visibility?: string | null } {
  if (typeof id !== 'string' || !id) throw new ScopeError(404, NOT_FOUND);
  const row = db().prepare('SELECT user_id, content, metadata, visibility FROM memories WHERE id = ?').get(id) as
    | { user_id: string; content: string; metadata: string | null; visibility?: string | null }
    | undefined;
  if (!row || row.user_id !== userId) throw new ScopeError(404, NOT_FOUND);
  return row;
}

function parseMetadata(raw: string | null): any {
  return raw ? JSON.parse(raw) : {};
}

function teamIdsOf(userId: string): string[] {
  try {
    const rows = db().prepare(`
      SELECT id AS team_id FROM teams WHERE owner_id = ?
      UNION
      SELECT team_id FROM team_members WHERE user_id = ?
    `).all(userId, userId) as { team_id: string }[];
    return rows.map((r) => r.team_id);
  } catch {
    return [];
  }
}

/** SQL fragment + params: shared memories (alias m) the user may see. */
function visibleSharedClause(userId: string): { sql: string; params: string[] } {
  const teams = teamIdsOf(userId);
  const teamSql = teams.length ? ` OR (m.visibility = 'team' AND m.team_id IN (${teams.map(() => '?').join(',')}))` : '';
  return {
    sql: `(m.visibility IN ('team', 'public') AND (m.user_id = ? OR m.visibility = 'public'${teamSql}))`,
    params: [userId, ...teams],
  };
}

function checkReason(reason: unknown): string | null {
  if (reason === undefined || reason === null) return null;
  if (typeof reason !== 'string' || reason.length > 1000) throw new MemoryShareInputError('Invalid reason');
  return reason || null;
}

/** Similarity threshold 0.5..1 (default 0.85). */
function threshold(value: unknown): number {
  const n = value === undefined || value === null ? 0.85 : Number(value);
  if (!Number.isFinite(n) || n < 0.5 || n > 1) throw new MemoryShareInputError('similarityThreshold must be between 0.5 and 1');
  return n;
}

export const sqliteMemoryShared: MemorySharedRepository = {
  async qualityStats(actor) {
    const { userId } = memberUser(actor);
    return MemoryQualityScorer.getQualityStats(userId);
  },

  async lowQuality(actor, limit) {
    const { userId } = memberUser(actor);
    return MemoryQualityScorer.getLowQualityMemories(userId, limit);
  },

  async analyzeQuality(actor, id) {
    const { userId } = memberUser(actor);
    const m = ownRow(userId, id);
    return MemoryQualityScorer.analyzeQuality(id, m.content, parseMetadata(m.metadata));
  },

  async enrich(actor, id) {
    const { userId } = memberUser(actor);
    const m = ownRow(userId, id);
    return MemoryEnrichmentService.enrichMemory(id, m.content, parseMetadata(m.metadata));
  },

  async batchEnrich(actor, limit) {
    const { userId } = memberUser(actor);
    return MemoryEnrichmentService.batchEnrich(userId, limit);
  },

  async qualityHistory(actor, id) {
    const { userId } = memberUser(actor);
    ownRow(userId, id);
    return db().prepare(`
      SELECT * FROM memory_quality_history
      WHERE memory_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(id);
  },

  async relationships(actor, id) {
    const { userId } = memberUser(actor);
    ownRow(userId, id);
    // Only targets that are the caller's own memories.
    return db().prepare(`
      SELECT
        mr.*,
        m.type as target_type,
        m.content as target_content
      FROM memory_relationships mr
      JOIN memories m ON mr.target_memory_id = m.id
      WHERE mr.source_memory_id = ? AND m.user_id = ?
      ORDER BY mr.strength DESC, mr.created_at DESC
      LIMIT 10
    `).all(id, userId);
  },

  async enrichmentLog(actor, id) {
    const { userId } = memberUser(actor);
    ownRow(userId, id);
    return db().prepare(`
      SELECT * FROM memory_enrichment_log
      WHERE memory_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(id);
  },

  async qualityDistribution(actor) {
    const { userId } = memberUser(actor);
    const distribution = db().prepare(`
      SELECT
        CASE
          WHEN quality_score >= 90 THEN '90-100'
          WHEN quality_score >= 80 THEN '80-89'
          WHEN quality_score >= 70 THEN '70-79'
          WHEN quality_score >= 60 THEN '60-69'
          WHEN quality_score >= 50 THEN '50-59'
          ELSE '0-49'
        END as range,
        COUNT(*) as count
      FROM memories
      WHERE user_id = ? AND status = 'active'
      GROUP BY range
      ORDER BY range DESC
    `).all(userId);
    const layerDistribution = db().prepare(`
      SELECT
        memory_layer,
        AVG(quality_score) as avg_quality,
        COUNT(*) as count
      FROM memories
      WHERE user_id = ? AND status = 'active'
      GROUP BY memory_layer
    `).all(userId);
    return { distribution, layerDistribution };
  },

  async share(actor, id, input) {
    const { userId } = memberUser(actor);
    const m = ownRow(userId, id);
    const visibility = input.visibility as Visibility;
    if (!VISIBILITIES.includes(visibility)) throw new MemoryShareInputError('visibility must be private, team or public');
    const reason = checkReason(input.reason);
    // A team memory must name a team the caller owns or belongs to.
    let teamId: string | null = null;
    if (visibility === 'team') {
      if (typeof input.teamId !== 'string' || !teamIdsOf(userId).includes(input.teamId)) {
        throw new MemoryShareInputError('teamId must be a team you belong to');
      }
      teamId = input.teamId;
    }
    const oldVisibility = m.visibility || 'private';
    db().prepare('UPDATE memories SET visibility = ?, team_id = ? WHERE id = ? AND user_id = ?').run(visibility, teamId, id, userId);
    db().prepare(`
      INSERT INTO memory_sharing_audit (id, memory_id, action, old_visibility, new_visibility, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), id, 'visibility_changed', oldVisibility, visibility, reason);
    return { memoryId: id, visibility, teamId };
  },

  async markCritical(actor, id, input) {
    const { userId } = memberUser(actor);
    ownRow(userId, id);
    if (typeof input.critical !== 'boolean') throw new MemoryShareInputError('critical must be true or false');
    const reason = checkReason(input.reason);
    db().prepare('UPDATE memories SET is_team_critical = ? WHERE id = ? AND user_id = ?').run(input.critical ? 1 : 0, id, userId);
    db().prepare(`
      INSERT INTO memory_sharing_audit (id, memory_id, action, reason)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), id, input.critical ? 'marked_critical' : 'unmarked_critical', reason);
    return { memoryId: id, isTeamCritical: input.critical };
  },

  async shared(actor, filter) {
    const { userId } = memberUser(actor);
    if (filter.visibility !== undefined && filter.visibility !== 'team' && filter.visibility !== 'public') {
      throw new MemoryShareInputError('visibility must be team or public');
    }
    let hasVisibility = false;
    try {
      const cols = db().prepare('PRAGMA table_info(memories)').all() as Array<{ name: string }>;
      hasVisibility = cols.some((c) => c.name === 'visibility');
    } catch {
      // table missing
    }
    if (!hasVisibility) return null;

    const visible = visibleSharedClause(userId);
    let sql = `
      SELECT m.*, u.full_name as user_name
      FROM memories m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.status = 'active'
      AND ${visible.sql}
    `;
    const params: unknown[] = [...visible.params];
    if (filter.visibility) {
      sql += ' AND m.visibility = ?';
      params.push(filter.visibility);
    }
    if (filter.teamCriticalOnly) sql += ' AND m.is_team_critical = 1';
    sql += ' ORDER BY m.is_team_critical DESC, m.importance_score DESC, m.created_at DESC LIMIT ?';
    params.push(filter.limit);
    return db().prepare(sql).all(...params);
  },

  async sharedByAgent(actor, agentId, limit) {
    const { userId } = memberUser(actor);
    const visible = visibleSharedClause(userId);
    return db().prepare(`
      SELECT m.*
      FROM memories m
      WHERE m.source_agent_id = ?
      AND m.status = 'active'
      AND ${visible.sql}
      ORDER BY m.created_at DESC
      LIMIT ?
    `).all(agentId, ...visible.params, limit);
  },

  async runDeduplication(actor, value) {
    const { userId } = memberUser(actor);
    return runDeduplication(userId, threshold(value));
  },

  async deduplicationStats(actor) {
    const { userId } = memberUser(actor);
    return getDeduplicationStats(userId);
  },

  async deduplicationCandidates(actor, value) {
    const { userId } = memberUser(actor);
    return findSimilarMemories(userId, threshold(value));
  },

  async sharingAudit(actor, filter) {
    const { userId } = memberUser(actor);
    // Only audit rows of the caller's own memories.
    let sql = `
      SELECT a.*, m.content as memory_content
      FROM memory_sharing_audit a
      JOIN memories m ON a.memory_id = m.id
      WHERE m.user_id = ?
    `;
    const params: unknown[] = [userId];
    if (filter.memoryId) {
      sql += ' AND a.memory_id = ?';
      params.push(filter.memoryId);
    }
    sql += ' ORDER BY a.created_at DESC LIMIT ?';
    params.push(filter.limit);
    return db().prepare(sql).all(...params);
  },

  async teamIds(actor) {
    const { userId } = memberUser(actor);
    return teamIdsOf(userId);
  },
};
