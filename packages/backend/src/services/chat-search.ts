/**
 * Search inside conversations (CHAT-PRO-02 D).
 *
 * Finds the caller's own conversations whose title, user messages or agent
 * replies contain the query (plain case-insensitive LIKE with % and _
 * escaped; the same SQL on SQLite and PostgreSQL). Other users'
 * conversations are never read. Hits are grouped by conversation, newest
 * first, and each hit carries a short snippet around the match with the
 * matched ranges as offsets into the snippet (plain text, never HTML).
 */

import { q } from '../repositories/sql-steps.js';
import { likeCi } from '../db/pg/dialect.js';
import { findProject } from '../repositories/chat-conversations.js';

export const QUERY_MIN = 2;
export const QUERY_MAX = 200;
/** Message hits read per search (the newest); more → `truncated`. */
export const DEFAULT_LIMIT = 60;
export const MAX_LIMIT = 200;
/** Hits shown per conversation (the rest are only counted). */
export const HITS_PER_CONVERSATION = 5;
/** Characters of context before / after the first match in a snippet. */
const BEFORE = 50;
const AFTER = 110;
/** Ranges marked in one snippet. */
const MAX_RANGES = 8;

export class ChatSearchError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}
const bad = (message: string) => new ChatSearchError(400, 'invalid_request', message);

export interface SearchHit {
  /** Where the match is: the conversation title, a user message or an agent reply. */
  kind: 'title' | 'user' | 'assistant';
  /** The message (null for a title hit). */
  messageId: string | null;
  createdAt: string;
  /** Plain text around the match ('…' marks a cut). */
  snippet: string;
  /** Matched [start, end) offsets into `snippet` (UTF-16 code units). */
  ranges: Array<[number, number]>;
}

export interface SearchResult {
  conversationId: string;
  title: string | null;
  projectId: string | null;
  updatedAt: string;
  /** Message hits in this conversation (title hit not counted). */
  matchCount: number;
  hits: SearchHit[];
}

export interface SearchResponse { query: string; results: SearchResult[]; truncated: boolean }

interface MessageRow { id: string; session_id: string; role: 'user' | 'assistant'; content: string; created_at: string; title: string | null; project_id: string | null; updated_at: string }
interface SessionRow { id: string; title: string; project_id: string | null; updated_at: string }

/** `%`, `_` and the escape character itself match literally. */
export function likePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isLowSurrogate = (code: number) => code >= 0xdc00 && code <= 0xdfff;

/** The matched ranges of `query` in `text` (case-insensitive). */
function matches(text: string, query: string, max = MAX_RANGES): Array<[number, number]> {
  const re = new RegExp(escapeRegExp(query), 'giu');
  const out: Array<[number, number]> = [];
  for (const m of text.matchAll(re)) {
    if (!m[0].length) break;
    out.push([m.index!, m.index! + m[0].length]);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * A short plain-text snippet around the first match, whitespace collapsed,
 * with the matches inside it as offsets. Null when the text has no match
 * (SQL LIKE and the JS match agree for the text we store; this is a guard).
 */
export function snippetFor(text: string, query: string): { snippet: string; ranges: Array<[number, number]> } | null {
  const flat = text.replace(/\s+/g, ' ').trim();
  const first = matches(flat, query, 1)[0];
  if (!first) return null;
  let start = Math.max(0, first[0] - BEFORE);
  let end = Math.min(flat.length, first[1] + AFTER);
  // Never cut a surrogate pair in half.
  if (start > 0 && isLowSurrogate(flat.charCodeAt(start))) start--;
  if (end < flat.length && isLowSurrogate(flat.charCodeAt(end))) end++;
  // Prefer to start and end on a word boundary when one is close.
  if (start > 0) { const sp = flat.indexOf(' ', start); if (sp !== -1 && sp < first[0] && sp - start < 15) start = sp + 1; }
  if (end < flat.length) { const sp = flat.lastIndexOf(' ', end); if (sp > first[1] && end - sp < 15) end = sp; }
  const snippet = `${start > 0 ? '…' : ''}${flat.slice(start, end)}${end < flat.length ? '…' : ''}`;
  return { snippet, ranges: matches(snippet, query) };
}

/** Checks and normalises the query parameters (throws a 400 ChatSearchError). */
export async function parseSearch(userId: string, raw: Record<string, unknown>): Promise<{ query: string; projectId: string | null; limit: number }> {
  const allowed = ['q', 'projectId', 'limit'];
  if (Object.keys(raw).some((k) => !allowed.includes(k))) throw bad('Unknown parameter');
  if (typeof raw.q !== 'string') throw bad('q is required');
  const query = raw.q.trim();
  const len = [...query].length;
  if (len < QUERY_MIN || len > QUERY_MAX) throw bad(`q must be ${QUERY_MIN}-${QUERY_MAX} characters`);
  let projectId: string | null = null;
  if (raw.projectId !== undefined && raw.projectId !== '') {
    if (typeof raw.projectId !== 'string' || raw.projectId.length > 128 || !(await findProject(userId, raw.projectId))) throw bad('unknown project');
    projectId = raw.projectId;
  }
  let limit = DEFAULT_LIMIT;
  if (raw.limit !== undefined) {
    const n = typeof raw.limit === 'string' && /^\d{1,4}$/.test(raw.limit) ? Number(raw.limit) : NaN;
    if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) throw bad(`limit must be 1-${MAX_LIMIT}`);
    limit = n;
  }
  return { query, projectId, limit };
}

/** The caller's conversations that contain `query`, grouped, most recently active first; newest hits first inside. */
export async function searchConversations(userId: string, query: string, opts: { projectId?: string | null; limit?: number } = {}): Promise<SearchResponse> {
  const limit = Math.min(Math.max(opts.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const like = likeCi(q.dialect);
  const pattern = likePattern(query);
  const project = opts.projectId ? ' AND s.project_id = ?' : '';
  const projectArg = opts.projectId ? [opts.projectId] : [];

  const titles = await q.all<SessionRow>(
    `SELECT s.id, s.title, s.project_id, s.updated_at FROM chat_sessions s
      WHERE s.user_id = ?${project} AND s.title ${like} ? ESCAPE '\\'
      ORDER BY s.updated_at DESC, s.id DESC LIMIT ?`,
    userId, ...projectArg, pattern, limit);
  const rows = await q.all<MessageRow>(
    `SELECT m.id, m.session_id, m.role, m.content, m.created_at, s.title, s.project_id, s.updated_at
       FROM chat_messages m JOIN chat_sessions s ON s.id = m.session_id
      WHERE s.user_id = ?${project} AND m.role IN ('user', 'assistant') AND m.content ${like} ? ESCAPE '\\'
      ORDER BY m.created_at DESC, m.id DESC LIMIT ?`,
    userId, ...projectArg, pattern, limit + 1);
  const truncated = rows.length > limit;

  const groups = new Map<string, SearchResult>();
  const group = (id: string, title: string | null, projectId: string | null, updatedAt: string) => {
    let g = groups.get(id);
    if (!g) { g = { conversationId: id, title, projectId, updatedAt, matchCount: 0, hits: [] }; groups.set(id, g); }
    return g;
  };
  for (const t of titles) {
    const s = snippetFor(t.title, query);
    if (!s) continue;
    group(t.id, t.title, t.project_id, t.updated_at).hits.push({ kind: 'title', messageId: null, createdAt: t.updated_at, ...s });
  }
  for (const r of rows.slice(0, limit)) {
    const s = snippetFor(r.content, query);
    if (!s) continue;
    const g = group(r.session_id, r.title, r.project_id, r.updated_at);
    g.matchCount++;
    if (g.hits.filter((h) => h.kind !== 'title').length < HITS_PER_CONVERSATION) {
      g.hits.push({ kind: r.role, messageId: r.id, createdAt: r.created_at, ...s });
    }
  }
  // The most recently active conversation first (like the conversation list).
  const results = [...groups.values()]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : a.conversationId < b.conversationId ? 1 : -1));
  return { query, results, truncated };
}
