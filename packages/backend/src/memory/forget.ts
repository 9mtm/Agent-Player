/**
 * Forgetting (CORE-07; MEMORY_VISION "Forgetting rules v1").
 *
 * "Forget this" removes a memory completely:
 *   - the memory row (and with it its stored embedding)
 *   - the text of every version: the history rows are removed and ONE
 *     tombstone stays (memory_versions change 'forget': memory id, user,
 *     drawer, time, actor; no type, no text)
 *   - rows of the hybrid index (memory_index / memory_chunks / memory_fts /
 *     memory_relations), quality/enrichment/sharing logs and relationships
 *   - the per-memory Markdown copy (every type it ever had) and the drawer's
 *     exported files (re-exported in every agent folder where they exist)
 *   - its text in proposals (redacted); pending proposals that touch it are
 *     cancelled
 *   - its lines in stored weekly summaries (re-rendered without it; a model
 *     text that may quote it is dropped)
 *
 * A plain delete (DELETE /api/memory/:id, memory_delete) keeps the history so
 * it can be undone; forget cannot be undone. Only the memory's own user
 * forgets it (others get "not found"); forget-all and retention are owner-only.
 */

import fs from 'fs';
import path from 'path';
import { getDatabase } from '../db/index.js';
import { getMemoryStorage } from './storage.js';
import { normalizeDrawer, drawerId, type DrawerRef } from './drawers.js';
import { exportDrawerFileIfPresent } from './memory-files.js';
import { currentDrawerRevision } from './versions.js';
import { renderDigest, type WeeklyDigest } from './weekly-summary.js';
import { DEFAULT_MEMORY_CONFIG, type Memory, type MemoryType } from './types.js';
import { v4 as uuidv4 } from 'uuid';

export interface ForgetResult {
  memoryId: string;
  drawerId: string;
  forgottenAt: string;
  actor: string;
  /** Pending proposals cancelled because they touched the memory. */
  cancelledProposals: string[];
  /** Agent folders whose drawer export was rewritten. */
  reexported: string[];
}

const ID = /^[A-Za-z0-9_.@-]{1,200}$/;

function tableExists(name: string): boolean {
  return !!getDatabase().prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`).get(name);
}

/** True when this user has a forget tombstone for the memory. */
export function isForgotten(userId: string, memoryId: string): boolean {
  return !!getDatabase().prepare(`SELECT 1 FROM memory_versions WHERE user_id = ? AND memory_id = ? AND change = 'forget'`).get(userId, memoryId);
}

/**
 * Drawer of a memory of this user: the live row's drawer, else the drawer of
 * its last version (a memory deleted earlier). Null when unknown or already
 * forgotten.
 */
export function forgettableDrawer(userId: string, memoryId: string): DrawerRef | null {
  if (typeof memoryId !== 'string' || !ID.test(memoryId)) return null;
  const live = getMemoryStorage().getOwned(userId, memoryId);
  if (live) return live.drawer ?? null;
  const last = getDatabase().prepare(`SELECT drawer_kind, drawer_key, change FROM memory_versions WHERE user_id = ? AND memory_id = ? ORDER BY version DESC LIMIT 1`).get(userId, memoryId) as { drawer_kind: string; drawer_key: string; change: string } | undefined;
  if (!last || last.change === 'forget') return null;
  try { return normalizeDrawer(last.drawer_key ? { kind: last.drawer_kind, key: last.drawer_key } : { kind: last.drawer_kind }); } catch { return null; }
}

/** Tombstones of a user (id, drawer, time, actor only). */
export function listTombstones(userId: string, limit = 200): Array<{ memoryId: string; drawerId: string; forgottenAt: string; actor: string }> {
  const rows = getDatabase().prepare(`
    SELECT memory_id, drawer_kind, drawer_key, created_at, created_by FROM memory_versions
     WHERE user_id = ? AND change = 'forget' ORDER BY created_at DESC LIMIT ?
  `).all(userId, Math.max(1, Math.min(1000, limit))) as any[];
  return rows.map((r) => ({
    memoryId: r.memory_id,
    drawerId: r.drawer_key ? `${r.drawer_kind}:${r.drawer_key}` : r.drawer_kind,
    forgottenAt: r.created_at,
    actor: r.created_by,
  }));
}

function mentions(value: unknown, id: string, texts: string[]): boolean {
  if (typeof value !== 'string') return false;
  if (value.includes(id)) return true;
  return texts.some((t) => t.length >= 3 && value.includes(t));
}

/** Redact a proposal's changes that touch the memory (by id or by its text). */
function redactChanges(changes: any[], id: string, texts: string[]): { changes: any[]; touched: boolean } {
  let touched = false;
  const textSet = new Set(texts);
  const out = changes.map((c) => {
    const hit = c?.id === id || textSet.has(c?.before?.content) || textSet.has(c?.after?.content);
    if (!hit) return c;
    touched = true;
    return { op: c.op, ...(c.id ? { id: c.id } : {}), redacted: true };
  });
  return { changes: out, touched };
}

function scrubProposals(userId: string, id: string, texts: string[], actor: string): string[] {
  const db = getDatabase();
  const cancelled: string[] = [];
  const rows = db.prepare('SELECT id, status, changes FROM memory_file_proposals WHERE user_id = ?').all(userId) as Array<{ id: string; status: string; changes: string }>;
  for (const row of rows) {
    if (!mentions(row.changes, id, texts)) continue;
    let changes: any[];
    try { changes = JSON.parse(row.changes); } catch { changes = []; }
    const r = redactChanges(Array.isArray(changes) ? changes : [], id, texts);
    if (!r.touched) continue;
    if (row.status === 'pending') {
      db.prepare(`UPDATE memory_file_proposals SET changes = ?, status = 'cancelled', decided_by = ?, decided_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), note = 'cancelled: a memory it touched was forgotten' WHERE id = ?`)
        .run(JSON.stringify(r.changes), actor, row.id);
      cancelled.push(row.id);
    } else {
      db.prepare('UPDATE memory_file_proposals SET changes = ? WHERE id = ?').run(JSON.stringify(r.changes), row.id);
    }
  }
  return cancelled;
}

function scrubSummaries(userId: string, id: string, texts: string[]): void {
  const db = getDatabase();
  const rows = db.prepare('SELECT id, digest, text, model_text FROM memory_weekly_summaries WHERE user_id = ?').all(userId) as Array<{ id: string; digest: string; text: string; model_text: string | null }>;
  const previews = texts.map((t) => t.replace(/\s+/g, ' ').trim().slice(0, 60)).filter((t) => t.length >= 3);
  for (const row of rows) {
    if (!mentions(row.digest, id, previews) && !mentions(row.text, id, previews) && !mentions(row.model_text, id, previews)) continue;
    let digest: WeeklyDigest;
    try { digest = JSON.parse(row.digest); } catch { continue; }
    for (const d of digest.drawers || []) {
      d.items = (d.items || []).filter((i) => i.memoryId !== id && !previews.some((p) => (i.preview || '').includes(p)));
    }
    db.prepare('UPDATE memory_weekly_summaries SET digest = ?, text = ?, model_text = NULL, model = NULL WHERE id = ?')
      .run(JSON.stringify(digest), renderDigest(digest), row.id);
  }
}

/** Remove the memory from the hybrid index database, when one exists on disk. */
async function removeFromIndex(id: string): Promise<void> {
  const file = path.resolve(process.cwd(), DEFAULT_MEMORY_CONFIG.dbPath);
  if (!fs.existsSync(file)) return;
  const { getMemoryIndexer } = await import('./indexer.js');
  await getMemoryIndexer().purge(id);
}

function removeRelated(id: string): void {
  const db = getDatabase();
  const del = (table: string, sql: string, ...params: string[]) => {
    if (tableExists(table)) db.prepare(sql).run(...params);
  };
  del('memory_sharing_audit', 'DELETE FROM memory_sharing_audit WHERE memory_id = ?', id);
  del('memory_quality_history', 'DELETE FROM memory_quality_history WHERE memory_id = ?', id);
  del('memory_enrichment_log', 'DELETE FROM memory_enrichment_log WHERE memory_id = ?', id);
  del('memory_relationships', 'DELETE FROM memory_relationships WHERE source_memory_id = ? OR target_memory_id = ?', id, id);
  // Other memories that list it as related.
  const cols = db.prepare('PRAGMA table_info(memories)').all() as Array<{ name: string }>;
  if (cols.some((c) => c.name === 'related_memory_ids')) {
    const rows = db.prepare(`SELECT id, related_memory_ids FROM memories WHERE related_memory_ids LIKE ?`).all(`%${id}%`) as Array<{ id: string; related_memory_ids: string }>;
    for (const r of rows) {
      let list: unknown;
      try { list = JSON.parse(r.related_memory_ids); } catch { list = []; }
      const next = Array.isArray(list) ? list.filter((x) => x !== id) : [];
      db.prepare('UPDATE memories SET related_memory_ids = ? WHERE id = ?').run(JSON.stringify(next), r.id);
    }
  }
}

/**
 * Forget one memory of this user completely. Works for a live memory and for
 * one that was deleted earlier (its history is then erased). Returns null
 * when the user has no such memory and no history of it.
 */
export async function forgetMemory(userId: string, memoryId: string, actor: string): Promise<ForgetResult | null> {
  if (typeof memoryId !== 'string' || !ID.test(memoryId)) return null;
  const db = getDatabase();
  const storage = getMemoryStorage();
  const live = storage.getOwned(userId, memoryId);
  const history = db.prepare(`SELECT drawer_kind, drawer_key, type, content, change FROM memory_versions WHERE user_id = ? AND memory_id = ? ORDER BY version`).all(userId, memoryId) as Array<{ drawer_kind: string; drawer_key: string; type: string | null; content: string | null; change: string }>;
  if (!live && (history.length === 0 || history.every((h) => h.change === 'forget'))) return null;

  let drawer: DrawerRef;
  if (live?.drawer) drawer = live.drawer;
  else {
    const h = history[history.length - 1];
    try { drawer = normalizeDrawer(h.drawer_key ? { kind: h.drawer_kind, key: h.drawer_key } : { kind: h.drawer_kind }); } catch { drawer = { kind: 'owner' }; }
  }
  const texts = [...new Set([live?.content, ...history.map((h) => h.content)].filter((t): t is string => typeof t === 'string' && t.length > 0))];
  const types = [...new Set([live?.type, ...history.map((h) => h.type)].filter((t): t is string => typeof t === 'string' && !!t))];
  const revision = currentDrawerRevision(userId, drawer);
  const forgottenAt = new Date().toISOString();
  let cancelled: string[] = [];

  // Freed pages are zeroed so deleted text does not linger in the file.
  try { db.getDb().pragma('secure_delete = ON'); } catch { /* not supported */ }
  db.getDb().transaction(() => {
    db.prepare('DELETE FROM memories WHERE id = ? AND user_id = ?').run(memoryId, userId);
    db.prepare('DELETE FROM memory_versions WHERE memory_id = ? AND user_id = ?').run(memoryId, userId);
    db.prepare(`
      INSERT INTO memory_versions (id, memory_id, user_id, drawer_kind, drawer_key, drawer_revision, version, change, type, content, importance_score, proposal_id, created_by, created_at, reason)
      VALUES (?, ?, ?, ?, ?, ?, 1, 'forget', NULL, NULL, NULL, NULL, ?, ?, NULL)
    `).run(uuidv4(), memoryId, userId, drawer.kind, drawer.key || '', revision, actor, forgottenAt);
    removeRelated(memoryId);
    cancelled = scrubProposals(userId, memoryId, texts, actor);
    scrubSummaries(userId, memoryId, texts);
  })();

  // Outside the database: index, readable copies, exports (best effort, but
  // each is attempted; the DB no longer holds the memory).
  try { await removeFromIndex(memoryId); } catch (err) { console.warn('[Memory] Index removal failed:', (err as Error).message); }
  for (const type of types) {
    await storage.removeMarkdownCopy({ id: memoryId, userId, type: type as MemoryType } as Memory);
  }
  const reexported = await exportDrawerFileIfPresent(userId, drawer);
  try { db.getDb().pragma('wal_checkpoint(TRUNCATE)'); } catch { /* busy: checkpointed later */ }

  return { memoryId, drawerId: drawerId(drawer), forgottenAt, actor, cancelledProposals: cancelled, reexported };
}

/**
 * Forget every memory of this user, or of one drawer (owner-only API).
 * Also erases the history of memories deleted earlier in that scope.
 */
export async function forgetAll(userId: string, actor: string, drawer?: DrawerRef | null): Promise<{ forgotten: number; results: ForgetResult[] }> {
  const db = getDatabase();
  const ids = new Set<string>();
  const live = drawer ? getMemoryStorage().getByDrawers(userId, [drawer]) : await getMemoryStorage().getByUser(userId);
  for (const m of live) ids.add(m.id);
  const hist = drawer
    ? db.prepare(`SELECT DISTINCT memory_id FROM memory_versions WHERE user_id = ? AND drawer_kind = ? AND drawer_key = ? AND memory_id NOT IN (SELECT memory_id FROM memory_versions WHERE user_id = ? AND change = 'forget')`).all(userId, drawer.kind, drawer.key || '', userId)
    : db.prepare(`SELECT DISTINCT memory_id FROM memory_versions WHERE user_id = ? AND memory_id NOT IN (SELECT memory_id FROM memory_versions WHERE user_id = ? AND change = 'forget')`).all(userId, userId);
  for (const r of hist as Array<{ memory_id: string }>) ids.add(r.memory_id);
  const results: ForgetResult[] = [];
  for (const id of ids) {
    const r = await forgetMemory(userId, id, actor);
    if (r) results.push(r);
  }
  return { forgotten: results.length, results };
}
