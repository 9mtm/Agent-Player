/**
 * Safe import pipeline (CLI-02; docs/design/IMPORT.md "Release 1 minimum",
 * D-IMPORT-ROLLOUT). One pipeline for the web UI and the CLI.
 *
 *   1 select    the owner sends the chosen files' bytes (no paths are read
 *               on the server). Only UTF-8 Markdown / plain text; per-file,
 *               total and candidate limits; archives, binary, invalid UTF-8,
 *               structured exports and credential/config files are blocked.
 *   2 redact    secrets -> [REDACTED:<type>] (redact.ts). The original bytes
 *               live only in this request's memory; nothing unredacted is
 *               stored, logged or returned.
 *   3 preview   sanitized text is chunked into memory candidates with a
 *               proposed drawer + type. Each preview version is immutable and
 *               hash locked (batch id + version + content hash).
 *   4 confirm   changes (include / drawer / type) create a NEW version; the
 *               old one is never edited. Commit names the exact version+hash.
 *   5 commit    selected items become pending memory proposals (CORE-04/05
 *               pipeline, source 'import') in one transaction = quarantine.
 *               Nothing reaches recall until the owner approves a proposal.
 *
 * Recovery: cancel before commit discards the preview; after commit,
 * rollback removes the batch's not-yet-approved proposals. Approved
 * memories stay (forget them one by one on request). Source files are never
 * touched (the server never sees a path).
 */

import { createHash, randomUUID } from 'node:crypto';
import { getDatabase } from '../../db/index.js';
import { denyReason } from '../../tools/core/file-sandbox.js';
import { drawerId, DrawerInputError, parseDrawerId, type DrawerRef } from '../drawers.js';
import { getMemoryStorage } from '../storage.js';
import { classifyLearning } from '../learning.js';
import {
  createChangeProposal,
  MAX_PENDING_PROPOSALS,
  pendingProposalCount,
  resolveFileAgent,
} from '../memory-files.js';
import { isoUtc } from '../../api/timestamps.js';
import { addCounts, redactImportText, type RedactionType } from './redact.js';

// ---------------------------------------------------------------------------
// Limits (design defaults, IMPORT.md; candidates capped by the proposal queue)
// ---------------------------------------------------------------------------

export const MAX_FILES = 20;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
/** One proposal per candidate, and the review queue holds MAX_PENDING_PROPOSALS. */
export const MAX_ITEMS = MAX_PENDING_PROPOSALS;
export const MAX_ITEM_CHARS = 4000;
export const PREVIEW_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_VERSIONS = 50;

export const SOURCE_KINDS = ['claude-code', 'codex', 'chatgpt', 'text'] as const;
export type SourceKind = typeof SOURCE_KINDS[number];
const SOURCE_LABEL: Record<SourceKind, string> = {
  'claude-code': 'a Claude Code export', codex: 'a Codex export', chatgpt: 'a ChatGPT export', text: 'a text file',
};

const TEXT_EXT = /\.(md|markdown|mdown|mkd|txt|text)$/i;
const ARCHIVE_EXT = /\.(zip|tar|tgz|gz|bz2|xz|7z|rar|zst|jar|dmg|iso)$/i;
const STRUCTURED_EXT = /\.(json|jsonl|ndjson|html?|xml|csv|ya?ml|toml|ini|conf|cfg|plist|sqlite|db)$/i;
const ITEM_TYPES = ['fact', 'preference', 'insight', 'skill', 'event', 'context', 'relationship', 'task'] as const;
const OP_KEY = /^[A-Za-z0-9_-]{16,128}$/;
const BATCH_ID = /^[0-9a-f-]{36}$/;

export class ImportError extends Error {
  constructor(message: string, public status = 400, public code = 'invalid') { super(message); }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FileOutcome = 'eligible' | 'blocked' | 'unsupported';

export interface PreviewFile {
  index: number;
  /** Display name only (basename, sanitized, redacted). */
  name: string;
  bytes: number;
  outcome: FileOutcome;
  reason: string | null;
  items: number;
  redactions: Partial<Record<RedactionType, number>>;
  /** sha256 of the sanitized text (never of the original bytes). */
  sanitizedSha256: string | null;
}

export interface PreviewItem {
  id: string;
  file: number;
  heading: string | null;
  content: string;
  drawer: string;
  type: string;
  include: boolean;
  status: 'eligible' | 'duplicate';
  redactions: Partial<Record<RedactionType, number>>;
  /** Learning classification reasons (people, money, ...), for the reviewer. */
  reasons: string[];
}

export interface PreviewSummary {
  files: { total: number; eligible: number; blocked: number; unsupported: number };
  items: { total: number; included: number; duplicates: number };
  redactions: Partial<Record<RedactionType, number>>;
  redactionTotal: number;
  byDrawer: Record<string, number>;
}

export interface PreviewView {
  batchId: string;
  version: number;
  latestVersion: number;
  contentHash: string;
  status: string;
  sourceKind: SourceKind;
  options: { redactEmails: boolean; redactPhones: boolean; drawer: string | null };
  createdAt: string;
  expiresAt: string;
  files: PreviewFile[];
  items: PreviewItem[];
  summary: PreviewSummary;
}

export interface ImportFileInput {
  name?: unknown;
  /** Raw file bytes, base64 (preferred: lets the server check UTF-8 itself). */
  contentBase64?: unknown;
  /** Or the text itself. */
  content?: unknown;
}

// ---------------------------------------------------------------------------
// Settings (owner): optional e-mail / phone redaction
// ---------------------------------------------------------------------------

export interface ImportSettings { redactEmails: boolean; redactPhones: boolean }

export function getImportSettings(userId: string): ImportSettings {
  const row = getDatabase().prepare('SELECT redact_emails, redact_phones FROM memory_import_settings WHERE user_id = ?').get(userId) as
    { redact_emails: number; redact_phones: number } | undefined;
  return { redactEmails: !!row?.redact_emails, redactPhones: !!row?.redact_phones };
}

export function setImportSettings(userId: string, input: Record<string, unknown>): ImportSettings {
  const cur = getImportSettings(userId);
  const next = { ...cur };
  for (const k of ['redactEmails', 'redactPhones'] as const) {
    if (input[k] === undefined) continue;
    if (typeof input[k] !== 'boolean') throw new ImportError(`${k} must be true or false`);
    next[k] = input[k] as boolean;
  }
  getDatabase().prepare(`
    INSERT INTO memory_import_settings (user_id, redact_emails, redact_phones, updated_at) VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ON CONFLICT(user_id) DO UPDATE SET redact_emails = excluded.redact_emails, redact_phones = excluded.redact_phones, updated_at = excluded.updated_at
  `).run(userId, next.redactEmails ? 1 : 0, next.redactPhones ? 1 : 0);
  return next;
}

// ---------------------------------------------------------------------------
// Stage 1: select (validate one file; nothing is stored)
// ---------------------------------------------------------------------------

/** Basename only, control characters removed, bounded. */
export function displayName(raw: unknown): string {
  const s = typeof raw === 'string' ? raw : '';
  const base = s.split(/[\\/]/).filter(Boolean).pop() ?? '';
  const clean = base.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, '').trim().slice(0, 120);
  return clean || '(unnamed)';
}

const MAGIC: Array<[number[], string]> = [
  [[0x50, 0x4b, 0x03, 0x04], 'archive'], [[0x50, 0x4b, 0x05, 0x06], 'archive'], [[0x1f, 0x8b], 'archive'],
  [[0x37, 0x7a, 0xbc, 0xaf], 'archive'], [[0x52, 0x61, 0x72, 0x21], 'archive'], [[0x42, 0x5a, 0x68], 'archive'],
  [[0xfd, 0x37, 0x7a, 0x58], 'archive'], [[0x28, 0xb5, 0x2f, 0xfd], 'archive'],
  [[0x25, 0x50, 0x44, 0x46], 'binary'], [[0x89, 0x50, 0x4e, 0x47], 'binary'], [[0xff, 0xd8, 0xff], 'binary'],
  [[0x47, 0x49, 0x46, 0x38], 'binary'], [[0x7f, 0x45, 0x4c, 0x46], 'binary'], [[0xcf, 0xfa, 0xed, 0xfe], 'binary'],
  [[0x53, 0x51, 0x4c, 0x69, 0x74, 0x65], 'binary'],
];

function magicKind(buf: Buffer): string | null {
  for (const [sig, kind] of MAGIC) if (buf.length >= sig.length && sig.every((b, i) => buf[i] === b)) return kind;
  // ustar header
  if (buf.length > 262 && buf.subarray(257, 262).toString('latin1') === 'ustar') return 'archive';
  return null;
}

function decodeBytes(f: ImportFileInput): Buffer {
  if (typeof f.contentBase64 === 'string') {
    const b64 = f.contentBase64.replace(/\s+/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64) || b64.length % 4 === 1) throw new ImportError('contentBase64 is not valid base64');
    return Buffer.from(b64, 'base64');
  }
  if (typeof f.content === 'string') return Buffer.from(f.content, 'utf8');
  throw new ImportError('Each file needs contentBase64 or content');
}

/** Lines like KEY=value make up most of the file: an environment/config file. */
function looksLikeEnvFile(text: string): boolean {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  if (lines.length < 3) return false;
  const kv = lines.filter((l) => /^(?:export\s+)?[A-Z][A-Z0-9_]{1,63}\s*=/.test(l)).length;
  return kv / lines.length >= 0.6;
}

interface Checked { outcome: FileOutcome; reason: string | null; text: string | null }

function checkFile(name: string, buf: Buffer, source: SourceKind): Checked {
  const blocked = (reason: string): Checked => ({ outcome: 'blocked', reason, text: null });
  const unsupported = (reason: string): Checked => ({ outcome: 'unsupported', reason, text: null });
  const deny = denyReason(name);
  if (deny) return blocked('credential/config file type is never imported');
  if (ARCHIVE_EXT.test(name)) return blocked('archives are not supported; choose readable files');
  if (STRUCTURED_EXT.test(name)) {
    return unsupported(source === 'chatgpt' && /\.json/i.test(name)
      ? 'structured conversation exports come in a later release; choose a readable Markdown or text file'
      : 'only UTF-8 Markdown (.md) and plain text (.txt) files are supported');
  }
  if (!TEXT_EXT.test(name)) return unsupported('only UTF-8 Markdown (.md) and plain text (.txt) files are supported');
  if (buf.length > MAX_FILE_BYTES) return blocked(`file is larger than ${MAX_FILE_BYTES / 1024 / 1024} MiB`);
  if (buf.length === 0) return unsupported('file is empty');
  const magic = magicKind(buf);
  if (magic) return blocked(magic === 'archive' ? 'archive content is not supported' : 'binary content is not supported');
  if (buf.includes(0)) return blocked('binary content is not supported');
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(buf);
  } catch {
    return blocked('not valid UTF-8 text; export it as UTF-8 Markdown or plain text');
  }
  text = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const controls = (text.match(/[\u0001-\u0008\u000b\u000e-\u001a\u001c-\u001f\u007f]/g) || []).length;
  if (controls > Math.max(2, text.length / 200)) return blocked('binary content is not supported');
  text = text.replace(/[\u0001-\u0008\u000b\u000e-\u001a\u001c-\u001f\u007f]/g, '');
  if (looksLikeEnvFile(text)) return blocked('looks like an environment/config file (KEY=value lines); never imported');
  if (source === 'chatgpt' && /^\s*[[{]/.test(text)) return unsupported('structured conversation exports come in a later release; choose a readable Markdown or text file');
  if (!text.trim()) return unsupported('file has no text');
  return { outcome: 'eligible', reason: null, text };
}

// ---------------------------------------------------------------------------
// Stage 3: chunk sanitized text into candidates
// ---------------------------------------------------------------------------

interface Chunk { heading: string | null; content: string }

function splitLong(text: string): string[] {
  if (text.length <= MAX_ITEM_CHARS) return [text];
  const out: string[] = [];
  let cur = '';
  for (const para of text.split(/\n{2,}/)) {
    const p = para.trim();
    if (!p) continue;
    if (p.length > MAX_ITEM_CHARS) {
      if (cur) { out.push(cur); cur = ''; }
      for (let i = 0; i < p.length; i += MAX_ITEM_CHARS) out.push(p.slice(i, i + MAX_ITEM_CHARS));
      continue;
    }
    if (cur && cur.length + p.length + 2 > MAX_ITEM_CHARS) { out.push(cur); cur = ''; }
    cur = cur ? `${cur}\n\n${p}` : p;
  }
  if (cur) out.push(cur);
  return out;
}

/** Markdown: one candidate per heading section (code fences respected). */
export function chunkMarkdown(text: string): Chunk[] {
  const lines = text.split('\n');
  const sections: Array<{ heading: string | null; path: string[]; lines: string[] }> = [];
  const path: string[] = [];
  let cur: { heading: string | null; path: string[]; lines: string[] } = { heading: null, path: [], lines: [] };
  let fence: string | null = null;
  for (const line of lines) {
    const f = /^\s{0,3}(```+|~~~+)/.exec(line);
    if (f) {
      if (!fence) fence = f[1][0];
      else if (f[1][0] === fence) fence = null;
      cur.lines.push(line);
      continue;
    }
    const h = fence ? null : /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) {
      sections.push(cur);
      const level = h[1].length;
      path.length = Math.min(path.length, level - 1);
      path[level - 1] = h[2].slice(0, 120);
      cur = { heading: path.filter(Boolean).join(' > ').slice(0, 200), path: [...path], lines: [line] };
      continue;
    }
    cur.lines.push(line);
  }
  sections.push(cur);
  const out: Chunk[] = [];
  for (const s of sections) {
    const body = s.lines.slice(s.heading ? 1 : 0).join('\n').trim();
    if (!body.replace(/\[REDACTED:[a-z_]+\]/g, '').trim()) continue; // heading only / only redactions
    const full = s.lines.join('\n').trim();
    for (const piece of splitLong(full)) out.push({ heading: s.heading, content: piece });
  }
  return out;
}

/** Plain text: paragraphs grouped up to ~1500 characters. */
export function chunkPlain(text: string): Chunk[] {
  const out: Chunk[] = [];
  let cur = '';
  for (const para of text.split(/\n{2,}/)) {
    const p = para.trim();
    if (!p) continue;
    if (cur && cur.length + p.length + 2 > 1500) { out.push({ heading: null, content: cur }); cur = ''; }
    cur = cur ? `${cur}\n\n${p}` : p;
  }
  if (cur) out.push({ heading: null, content: cur });
  return out.flatMap((c) => splitLong(c.content).map((content) => ({ heading: null, content })))
    .filter((c) => c.content.replace(/\[REDACTED:[a-z_]+\]/g, '').trim());
}

const EXPERIENCE_HEADING = /\b(lessons?|learn(ed|ings)?|gotchas?|mistakes?|pitfalls?|tips?|experience|post-?mortem|retro(spective)?)\b|دروس|تجارب|أخطاء|\b(erfahrung(en)?|lektionen|fehler)\b/i;

function proposeDrawerAndType(fileName: string, heading: string | null, fixed: DrawerRef | null): { drawer: DrawerRef; type: string } {
  const skill = /(^|[-_.])skill\.md$/i.test(fileName);
  if (fixed) return { drawer: fixed, type: skill ? 'skill' : 'fact' };
  if (skill) return { drawer: { kind: 'experience' }, type: 'skill' };
  if (heading && EXPERIENCE_HEADING.test(heading)) return { drawer: { kind: 'experience' }, type: 'insight' };
  return { drawer: { kind: 'owner' }, type: 'fact' };
}

const norm = (s: string) => s.toLowerCase().replace(/[\s\p{P}]+/gu, ' ').trim();

// ---------------------------------------------------------------------------
// Hash lock + storage of immutable versions
// ---------------------------------------------------------------------------

export function previewHash(batchId: string, version: number, files: PreviewFile[], items: PreviewItem[]): string {
  return createHash('sha256').update(JSON.stringify({ v: 1, batchId, version, files, items })).digest('hex');
}

function summarize(files: PreviewFile[], items: PreviewItem[]): PreviewSummary {
  const redactions: Partial<Record<RedactionType, number>> = {};
  for (const f of files) addCounts(redactions, f.redactions);
  const byDrawer: Record<string, number> = {};
  for (const i of items) if (i.include) byDrawer[i.drawer] = (byDrawer[i.drawer] ?? 0) + 1;
  return {
    files: {
      total: files.length,
      eligible: files.filter((f) => f.outcome === 'eligible').length,
      blocked: files.filter((f) => f.outcome === 'blocked').length,
      unsupported: files.filter((f) => f.outcome === 'unsupported').length,
    },
    items: { total: items.length, included: items.filter((i) => i.include).length, duplicates: items.filter((i) => i.status === 'duplicate').length },
    redactions,
    redactionTotal: Object.values(redactions).reduce((a, b) => a + (b ?? 0), 0),
    byDrawer,
  };
}

function insertVersion(batchId: string, version: number, parent: number | null, files: PreviewFile[], items: PreviewItem[], by: string): string {
  const hash = previewHash(batchId, version, files, items);
  getDatabase().prepare(`
    INSERT INTO memory_import_previews (batch_id, version, parent_version, content_hash, files, items, summary, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(batchId, version, parent, hash, JSON.stringify(files), JSON.stringify(items), JSON.stringify(summarize(files, items)), by);
  return hash;
}

interface BatchRow {
  id: string; user_id: string; source_kind: SourceKind; status: string; latest_version: number; options: string;
  committed_version: number | null; committed_hash: string | null; operation_key: string | null; receipt: string | null;
  created_at: string; expires_at: string; committed_at: string | null; closed_at: string | null;
}

function batchRow(userId: string, id: string): BatchRow {
  if (typeof id !== 'string' || !BATCH_ID.test(id)) throw new ImportError('Import not found', 404, 'not_found');
  const row = getDatabase().prepare('SELECT * FROM memory_import_batches WHERE id = ? AND user_id = ?').get(id, userId) as BatchRow | undefined;
  if (!row) throw new ImportError('Import not found', 404, 'not_found');
  return row;
}

/** Previews not committed in time are expired and their sanitized text removed. */
export function sweepExpired(userId: string): number {
  const db = getDatabase();
  const now = new Date().toISOString();
  const ids = (db.prepare(`SELECT id FROM memory_import_batches WHERE user_id = ? AND status = 'preview' AND expires_at < ?`).all(userId, now) as Array<{ id: string }>).map((r) => r.id);
  for (const id of ids) {
    db.transaction(() => {
      db.prepare('DELETE FROM memory_import_previews WHERE batch_id = ?').run(id);
      db.prepare(`UPDATE memory_import_batches SET status = 'expired', closed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND status = 'preview'`).run(id);
    });
  }
  return ids.length;
}

export function getPreview(userId: string, id: string, version?: number): PreviewView {
  sweepExpired(userId);
  const b = batchRow(userId, id);
  const v = version ?? b.latest_version;
  const row = getDatabase().prepare('SELECT * FROM memory_import_previews WHERE batch_id = ? AND version = ?').get(b.id, v) as any;
  if (!row) throw new ImportError(b.status === 'preview' || b.status === 'committed' ? 'Preview version not found' : `This import is ${b.status}; its preview was removed`, 404, 'not_found');
  const files = JSON.parse(row.files) as PreviewFile[];
  const items = JSON.parse(row.items) as PreviewItem[];
  // Integrity: the stored version must still hash to its lock.
  if (previewHash(b.id, v, files, items) !== row.content_hash) throw new ImportError('Preview integrity check failed', 500, 'integrity');
  const opts = JSON.parse(b.options || '{}');
  return {
    batchId: b.id, version: v, latestVersion: b.latest_version, contentHash: row.content_hash, status: b.status,
    sourceKind: b.source_kind,
    options: { redactEmails: !!opts.redactEmails, redactPhones: !!opts.redactPhones, drawer: opts.drawer ?? null },
    createdAt: isoUtc(row.created_at) as string, expiresAt: isoUtc(b.expires_at) as string,
    files, items, summary: JSON.parse(row.summary),
  };
}

export function listImports(userId: string): any[] {
  sweepExpired(userId);
  const rows = getDatabase().prepare(`
    SELECT b.*, p.summary FROM memory_import_batches b
      LEFT JOIN memory_import_previews p ON p.batch_id = b.id AND p.version = b.latest_version
     WHERE b.user_id = ? ORDER BY b.created_at DESC LIMIT 100
  `).all(userId) as Array<BatchRow & { summary: string | null }>;
  return rows.map((r) => ({
    batchId: r.id, status: r.status, sourceKind: r.source_kind, latestVersion: r.latest_version,
    committedVersion: r.committed_version, createdAt: isoUtc(r.created_at), expiresAt: isoUtc(r.expires_at),
    committedAt: isoUtc(r.committed_at), closedAt: isoUtc(r.closed_at),
    summary: r.summary ? JSON.parse(r.summary) : null,
  }));
}

// ---------------------------------------------------------------------------
// Stages 1-3: create a preview
// ---------------------------------------------------------------------------

export interface CreatePreviewInput {
  files: unknown;
  source?: unknown;
  drawer?: unknown;
  redactEmails?: unknown;
  redactPhones?: unknown;
}

export async function createPreview(userId: string, input: CreatePreviewInput): Promise<PreviewView> {
  sweepExpired(userId);
  const source = (input.source ?? 'text') as SourceKind;
  if (!SOURCE_KINDS.includes(source)) throw new ImportError(`source must be one of ${SOURCE_KINDS.join(', ')}`);
  if (!Array.isArray(input.files) || input.files.length === 0) throw new ImportError('Choose at least one file');
  if (input.files.length > MAX_FILES) throw new ImportError(`At most ${MAX_FILES} files per import`, 413, 'too_many_files');
  let fixed: DrawerRef | null = null;
  if (input.drawer !== undefined && input.drawer !== null && input.drawer !== '') {
    try { fixed = parseDrawerId(input.drawer); } catch (err) {
      if (err instanceof DrawerInputError) throw new ImportError(`Invalid drawer: ${err.message}`);
      throw err;
    }
  }
  const settings = getImportSettings(userId);
  const opts = {
    redactEmails: typeof input.redactEmails === 'boolean' ? input.redactEmails : settings.redactEmails,
    redactPhones: typeof input.redactPhones === 'boolean' ? input.redactPhones : settings.redactPhones,
  };

  // Decode everything first so the total limit is enforced before any parsing.
  const decoded: Array<{ name: string; buf: Buffer }> = [];
  let total = 0;
  for (const raw of input.files as ImportFileInput[]) {
    if (!raw || typeof raw !== 'object') throw new ImportError('Invalid file entry');
    const buf = decodeBytes(raw);
    total += buf.length;
    if (total > MAX_TOTAL_BYTES) throw new ImportError(`The selected files are larger than ${MAX_TOTAL_BYTES / 1024 / 1024} MiB in total`, 413, 'too_large');
    // The display name is redacted too (a file name can carry a token).
    decoded.push({ name: redactImportText(displayName(raw.name)).text, buf });
  }

  const storage = getMemoryStorage();
  const files: PreviewFile[] = [];
  const items: PreviewItem[] = [];
  const seen = new Set<string>();
  const existing = new Map<string, Set<string>>();
  const existingIn = (d: DrawerRef): Set<string> => {
    const key = drawerId(d);
    let set = existing.get(key);
    if (!set) {
      set = new Set(storage.getByDrawers(userId, [d]).map((m) => norm(m.content)));
      existing.set(key, set);
    }
    return set;
  };

  for (const [index, { name, buf }] of decoded.entries()) {
    const checked = checkFile(name, buf, source);
    const file: PreviewFile = { index, name, bytes: buf.length, outcome: checked.outcome, reason: checked.reason, items: 0, redactions: {}, sanitizedSha256: null };
    files.push(file);
    if (checked.outcome !== 'eligible' || checked.text === null) continue;
    let red;
    try {
      red = redactImportText(checked.text, { emails: opts.redactEmails, phones: opts.redactPhones });
    } catch {
      // A failed scan blocks the file; it is never treated as clean.
      file.outcome = 'blocked';
      file.reason = 'secret scan failed';
      continue;
    }
    file.redactions = red.counts;
    file.sanitizedSha256 = createHash('sha256').update(red.text).digest('hex');
    const isMarkdown = !/\.(txt|text)$/i.test(name);
    const chunks = isMarkdown ? chunkMarkdown(red.text) : chunkPlain(red.text);
    for (const c of chunks) {
      if (items.length >= MAX_ITEMS) {
        throw new ImportError(`More than ${MAX_ITEMS} memory candidates; choose fewer or smaller files`, 413, 'too_many_items');
      }
      const { drawer, type } = proposeDrawerAndType(name, c.heading, fixed);
      const n = norm(c.content);
      const dup = seen.has(`${drawerId(drawer)}\u0000${n}`) || existingIn(drawer).has(n);
      seen.add(`${drawerId(drawer)}\u0000${n}`);
      const counts: Partial<Record<RedactionType, number>> = {};
      for (const m of c.content.matchAll(/\[REDACTED:([a-z_]+)\]/g)) counts[m[1] as RedactionType] = (counts[m[1] as RedactionType] ?? 0) + 1;
      const cls = classifyLearning({ content: c.content, type, drawer, origin: 'owner' });
      items.push({
        id: `i${items.length + 1}`, file: index, heading: c.heading, content: c.content, drawer: drawerId(drawer), type,
        include: !dup, status: dup ? 'duplicate' : 'eligible', redactions: counts, reasons: cls.reasons,
      });
      file.items++;
    }
  }

  const id = randomUUID();
  const db = getDatabase();
  const expires = new Date(Date.now() + PREVIEW_TTL_MS).toISOString();
  db.transaction(() => {
    db.prepare(`INSERT INTO memory_import_batches (id, user_id, source_kind, status, latest_version, options, expires_at) VALUES (?, ?, ?, 'preview', 1, ?, ?)`)
      .run(id, userId, source, JSON.stringify({ ...opts, drawer: fixed ? drawerId(fixed) : null }), expires);
    insertVersion(id, 1, null, files, items, userId);
  });
  return getPreview(userId, id, 1);
}

// ---------------------------------------------------------------------------
// Stage 4: revise -> new immutable version
// ---------------------------------------------------------------------------

function requireLatest(b: BatchRow, version: unknown, contentHash: unknown): { files: PreviewFile[]; items: PreviewItem[]; hash: string } {
  if (b.status !== 'preview') throw new ImportError(`This import is ${b.status}`, 409, 'not_preview');
  if (new Date(b.expires_at).getTime() < Date.now()) throw new ImportError('The preview expired; inspect the files again', 409, 'expired');
  if (!Number.isInteger(version) || typeof contentHash !== 'string') throw new ImportError('version and contentHash are required');
  if (version !== b.latest_version) throw new ImportError('A newer preview version exists; review it first', 409, 'superseded');
  const row = getDatabase().prepare('SELECT * FROM memory_import_previews WHERE batch_id = ? AND version = ?').get(b.id, version) as any;
  if (!row) throw new ImportError('Preview version not found', 404, 'not_found');
  const files = JSON.parse(row.files) as PreviewFile[];
  const items = JSON.parse(row.items) as PreviewItem[];
  const hash = previewHash(b.id, version as number, files, items);
  if (hash !== row.content_hash) throw new ImportError('Preview integrity check failed', 500, 'integrity');
  if (contentHash !== hash) throw new ImportError('The preview does not match what you reviewed (hash mismatch)', 409, 'hash_mismatch');
  return { files, items, hash };
}

export interface ReviseInput {
  version?: unknown;
  contentHash?: unknown;
  /** true: include every item; false: exclude every item (applied before `items`). */
  includeAll?: unknown;
  items?: unknown;
}

export function revisePreview(userId: string, id: string, input: ReviseInput): PreviewView {
  sweepExpired(userId);
  const b = batchRow(userId, id);
  const { files, items } = requireLatest(b, input.version, input.contentHash);
  if (b.latest_version >= MAX_VERSIONS) throw new ImportError(`At most ${MAX_VERSIONS} preview versions`, 409, 'too_many_versions');
  const next: PreviewItem[] = items.map((i) => ({ ...i }));
  if (input.includeAll !== undefined) {
    if (typeof input.includeAll !== 'boolean') throw new ImportError('includeAll must be true or false');
    for (const i of next) i.include = input.includeAll;
  }
  if (input.items !== undefined) {
    if (!Array.isArray(input.items) || input.items.length > MAX_ITEMS) throw new ImportError('items must be a list of item changes');
    const byId = new Map(next.map((i) => [i.id, i]));
    for (const ch of input.items as any[]) {
      const item = ch && typeof ch === 'object' ? byId.get(ch.id) : undefined;
      if (!item) throw new ImportError('Unknown item id');
      if (ch.include !== undefined) {
        if (typeof ch.include !== 'boolean') throw new ImportError('include must be true or false');
        item.include = ch.include;
      }
      if (ch.drawer !== undefined) {
        try { item.drawer = drawerId(parseDrawerId(ch.drawer)); } catch (err) {
          if (err instanceof DrawerInputError) throw new ImportError(`Invalid drawer: ${err.message}`);
          throw err;
        }
      }
      if (ch.type !== undefined) {
        if (!(ITEM_TYPES as readonly string[]).includes(ch.type)) throw new ImportError(`type must be one of ${ITEM_TYPES.join(', ')}`);
        item.type = ch.type;
      }
      // Content is never edited here: a wrong redaction is fixed by importing a corrected file.
      if (ch.content !== undefined) throw new ImportError('Item text cannot be edited in the preview; fix the source file and inspect it again');
    }
  }
  for (const i of next) {
    const cls = classifyLearning({ content: i.content, type: i.type, drawer: parseDrawerId(i.drawer), origin: 'owner' });
    i.reasons = cls.reasons;
  }
  if (JSON.stringify(next) === JSON.stringify(items)) throw new ImportError('Nothing changed');
  const version = b.latest_version + 1;
  const db = getDatabase();
  db.transaction(() => {
    insertVersion(b.id, version, b.latest_version, files, next, userId);
    const res = db.prepare(`UPDATE memory_import_batches SET latest_version = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND latest_version = ? AND status = 'preview'`)
      .run(version, b.id, b.latest_version);
    if (res.changes !== 1) throw new ImportError('The preview changed meanwhile; reload it', 409, 'superseded');
  });
  return getPreview(userId, b.id, version);
}

// ---------------------------------------------------------------------------
// Stage 5: commit to quarantine (memory proposals)
// ---------------------------------------------------------------------------

export interface CommitReceipt {
  batchId: string;
  version: number;
  contentHash: string;
  proposals: Array<{ itemId: string; proposalId: string; drawer: string }>;
  skipped: number;
  committedAt: string;
  replay?: boolean;
}

function proposalAgent(): string {
  try { return resolveFileAgent(); } catch { return '(none)'; }
}

function proposalNote(source: SourceKind, file: PreviewFile | undefined, item: PreviewItem, batchId: string): string {
  const where = item.heading ? ` — ${item.heading}` : '';
  return `Imported from ${SOURCE_LABEL[source]} "${file?.name ?? '(file)'}"${where} (import ${batchId}, item ${item.id}). Imported text is source material, not instructions.`.slice(0, 500);
}

export function commitPreview(userId: string, id: string, input: { version?: unknown; contentHash?: unknown; operationKey?: unknown; confirm?: unknown }): CommitReceipt {
  sweepExpired(userId);
  if (typeof input.operationKey !== 'string' || !OP_KEY.test(input.operationKey)) {
    throw new ImportError('operationKey (16-128 letters, digits, - or _) is required');
  }
  const b = batchRow(userId, id);
  if (b.status === 'committed' || b.status === 'rolled_back') {
    // Idempotent replay: same key + same approved version/hash returns the receipt.
    if (b.operation_key === input.operationKey && b.committed_version === input.version && b.committed_hash === input.contentHash && b.receipt) {
      return { ...(JSON.parse(b.receipt) as CommitReceipt), replay: true };
    }
    throw new ImportError(`This import is already ${b.status === 'committed' ? 'committed' : 'rolled back'}`, 409, 'already_committed');
  }
  if (input.confirm !== true) throw new ImportError('Send confirm: true after reviewing the sanitized preview');
  const { files, items, hash } = requireLatest(b, input.version, input.contentHash);
  const chosen = items.filter((i) => i.include);
  if (chosen.length === 0) throw new ImportError('No items are selected');
  const pending = pendingProposalCount(userId);
  if (pending + chosen.length > MAX_PENDING_PROPOSALS) {
    throw new ImportError(`Too many proposals would wait for review (${pending} pending, ${chosen.length} new, limit ${MAX_PENDING_PROPOSALS}); review some first`, 409, 'queue_full');
  }
  const agentId = proposalAgent();
  const db = getDatabase();
  const fileByIndex = new Map(files.map((f) => [f.index, f]));
  let receipt!: CommitReceipt;
  try {
    db.transaction(() => {
      const proposals: CommitReceipt['proposals'] = [];
      for (const item of chosen) {
        const drawer = parseDrawerId(item.drawer);
        const p = createChangeProposal({
          userId, agentId, drawer,
          changes: [{ op: 'add', after: { type: item.type, importance: 5, content: item.content } }],
          source: 'import', reasons: ['import', `import:${b.source_kind}`, ...item.reasons],
          note: proposalNote(b.source_kind, fileByIndex.get(item.file), item, b.id),
          createdBy: userId, importBatchId: b.id, skipPendingLimit: true,
        });
        proposals.push({ itemId: item.id, proposalId: p.id, drawer: item.drawer });
      }
      receipt = {
        batchId: b.id, version: b.latest_version, contentHash: hash, proposals,
        skipped: items.length - chosen.length, committedAt: new Date().toISOString(),
      };
      const res = db.prepare(`
        UPDATE memory_import_batches SET status = 'committed', committed_version = ?, committed_hash = ?, operation_key = ?, receipt = ?,
          committed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ? AND status = 'preview' AND latest_version = ?
      `).run(b.latest_version, hash, input.operationKey, JSON.stringify(receipt), b.id, b.latest_version);
      if (res.changes !== 1) throw new ImportError('The preview changed meanwhile; reload it', 409, 'superseded');
    });
  } catch (err: any) {
    if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') throw new ImportError('operationKey was already used for another import', 409, 'operation_key_reused');
    throw err;
  }
  return receipt;
}

// ---------------------------------------------------------------------------
// Recovery: cancel (before commit) / roll back (after commit)
// ---------------------------------------------------------------------------

export interface CancelResult {
  batchId: string;
  status: 'cancelled' | 'rolled_back';
  removedProposals: number;
  /** Proposals already approved stay; their memories are forgotten only on request. */
  approvedKept: Array<{ proposalId: string; memoryIds: string[] }>;
}

export function cancelImport(userId: string, id: string): CancelResult {
  sweepExpired(userId);
  const b = batchRow(userId, id);
  const db = getDatabase();
  if (b.status === 'preview') {
    db.transaction(() => {
      db.prepare('DELETE FROM memory_import_previews WHERE batch_id = ?').run(b.id);
      db.prepare(`UPDATE memory_import_batches SET status = 'cancelled', closed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND status = 'preview'`).run(b.id);
    });
    return { batchId: b.id, status: 'cancelled', removedProposals: 0, approvedKept: [] };
  }
  if (b.status !== 'committed') throw new ImportError(`This import is already ${b.status}`, 409, 'closed');
  let removed = 0;
  let approved: Array<{ id: string }> = [];
  db.transaction(() => {
    approved = db.prepare(`SELECT id FROM memory_file_proposals WHERE import_batch_id = ? AND user_id = ? AND status = 'approved'`).all(b.id, userId) as Array<{ id: string }>;
    removed = db.prepare(`DELETE FROM memory_file_proposals WHERE import_batch_id = ? AND user_id = ? AND status != 'approved'`).run(b.id, userId).changes;
    db.prepare('DELETE FROM memory_import_previews WHERE batch_id = ?').run(b.id);
    db.prepare(`UPDATE memory_import_batches SET status = 'rolled_back', closed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND status = 'committed'`).run(b.id);
  });
  const memStmt = db.prepare(`SELECT DISTINCT memory_id FROM memory_versions WHERE proposal_id = ? AND user_id = ? AND change = 'create'`);
  const approvedKept = approved.map((p) => ({ proposalId: p.id, memoryIds: (memStmt.all(p.id, userId) as Array<{ memory_id: string }>).map((r) => r.memory_id) }));
  return { batchId: b.id, status: 'rolled_back', removedProposals: removed, approvedKept };
}
