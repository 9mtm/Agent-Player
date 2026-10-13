/**
 * Memory version history (CORE-04/05).
 *
 * `memory_versions` is the append-only history of every memory change:
 * reviewed proposals (CORE-04) and, since CORE-05, every add/edit/delete
 * made through the API and the memory tools. Each row names the actor
 * (user id, or `agent:<agentId>`) and the reason.
 *
 * Drawer revisions count approved proposals (one approved proposal = +1).
 * A direct change is recorded at the drawer's current revision.
 *
 * Before the first recorded change of a memory that has no history yet, a
 * `baseline` row keeps its previous state, so an edit or delete can always
 * be traced back (and undone by hand) until the memory is forgotten (CORE-07).
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/index.js';
import type { Memory } from './types.js';
import type { DrawerRef } from './drawers.js';

export type VersionChange = 'baseline' | 'create' | 'update' | 'delete';

export interface VersionEntry { type: string; importance: number; content: string }

/** Actor id for an agent tool call. */
export function agentActor(agentId?: string | null): string {
  return agentId ? `agent:${agentId}` : 'agent';
}

export function importanceOf(m: Pick<Memory, 'importanceScore'>): number {
  const score = typeof m.importanceScore === 'number' ? m.importanceScore : 0.5;
  return Math.min(10, Math.max(1, Math.round(score * 10)));
}

export function versionEntryOf(m: Memory): VersionEntry {
  return { type: m.type, importance: importanceOf(m), content: m.content };
}

export function currentDrawerRevision(userId: string, drawer: DrawerRef): number {
  const row = getDatabase().prepare(
    'SELECT MAX(drawer_revision) AS rev FROM memory_versions WHERE user_id = ? AND drawer_kind = ? AND drawer_key = ?'
  ).get(userId, drawer.kind, drawer.key || '') as { rev: number | null } | undefined;
  return row?.rev ?? 0;
}

function lastVersion(memoryId: string): number | null {
  const row = getDatabase().prepare('SELECT MAX(version) AS v FROM memory_versions WHERE memory_id = ?').get(memoryId) as { v: number | null } | undefined;
  return row?.v ?? null;
}

export interface RecordVersionInput {
  memoryId: string;
  userId: string;
  drawer: DrawerRef;
  change: VersionChange;
  entry: VersionEntry | null;
  actor: string;
  reason?: string | null;
  proposalId?: string | null;
  /** Drawer revision of the row; default the drawer's current revision. */
  revision?: number;
}

/** Append one version row (synchronous; safe inside a transaction). */
export function recordVersion(input: RecordVersionInput): void {
  const v = (lastVersion(input.memoryId) ?? 0) + 1;
  const rev = input.revision ?? currentDrawerRevision(input.userId, input.drawer);
  getDatabase().prepare(`
    INSERT INTO memory_versions (id, memory_id, user_id, drawer_kind, drawer_key, drawer_revision, version, change, type, content, importance_score, proposal_id, created_by, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), input.memoryId, input.userId, input.drawer.kind, input.drawer.key || '', rev, v, input.change,
    input.entry?.type ?? null, input.entry?.content ?? null, input.entry ? input.entry.importance / 10 : null,
    input.proposalId ?? null, input.actor, typeof input.reason === 'string' ? input.reason.slice(0, 200) : null);
}

/** Record the state before the first change of a memory without history. */
export function recordBaselineIfMissing(m: Memory, actor: string, reason?: string | null, revision?: number): void {
  if (lastVersion(m.id) !== null) return;
  recordVersion({
    memoryId: m.id, userId: m.userId, drawer: m.drawer || { kind: 'owner' }, change: 'baseline',
    entry: versionEntryOf(m), actor, reason, revision,
  });
}

/** History of one memory, oldest first. */
export function memoryVersions(userId: string, memoryId: string): any[] {
  return getDatabase().prepare(`
    SELECT memory_id AS memoryId, drawer_kind AS drawerKind, drawer_key AS drawerKey, drawer_revision AS drawerRevision,
           version, change, type, content, importance_score AS importanceScore, proposal_id AS proposalId,
           created_by AS createdBy, reason, created_at AS createdAt
      FROM memory_versions WHERE user_id = ? AND memory_id = ? ORDER BY version ASC
  `).all(userId, memoryId);
}
