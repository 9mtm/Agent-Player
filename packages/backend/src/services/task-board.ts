/**
 * Task board (BOARD-01, D-COMPANY-OPS): a kanban-style board for the company.
 *
 * A board has ordered columns; a column has ordered cards. A card has a
 * title, description, priority, optional due date, the agents working on it,
 * the departments taking part, and a comment thread. Cards are archived,
 * never deleted. Card edits and moves are versioned (expectedVersion).
 *
 * The owner's first read creates a default board ("Company board") with
 * Backlog / To do / In progress / Review / Done. Step 1 is owner-only;
 * agents commenting and moving cards through a tool come in a later step.
 */

import { randomUUID } from 'node:crypto';
import { all, dialect, one, run, sql, type Step } from '../repositories/sql-steps.js';
import { nowText } from '../db/pg/dialect.js';
import { normalizeDepartment } from './personality.js';

export const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type Priority = (typeof PRIORITIES)[number];
export const DEFAULT_COLUMNS = ['Backlog', 'To do', 'In progress', 'Review', 'Done'] as const;
export const MAX_COLUMNS = 20;
export const MAX_CARDS_PER_BOARD = 5000;
export const MAX_TITLE = 200;
export const MAX_DESCRIPTION = 5000;
export const MAX_COMMENT = 4000;
export const MAX_CARD_AGENTS = 50;
export const MAX_CARD_DEPARTMENTS = 12;

export class BoardError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}
const bad = (message: string) => new BoardError(400, 'invalid_board', message);
const notFound = (what: string) => new BoardError(404, 'not_found', `${what} not found`);

export interface BoardColumn { id: string; name: string; position: number }
export interface BoardCard {
  id: string; columnId: string; title: string; description: string; priority: Priority; position: number;
  dueDate: string | null; taskId: string | null; archived: boolean; version: number;
  agents: string[]; departments: string[]; comments: number; createdAt: string; updatedAt: string;
}
export interface Board { id: string; name: string; columns: BoardColumn[]; cards: BoardCard[] }
export interface BoardComment { id: string; authorKind: 'user' | 'agent'; authorId: string; body: string; createdAt: string }

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Trimmed single-line text, 1..max, no control characters. */
function line(v: unknown, field: string, max: number): string {
  if (typeof v !== 'string') throw bad(`${field} must be text`);
  const s = v.normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (!s) throw bad(`${field} is required`);
  if ([...s].length > max) throw bad(`${field} must be at most ${max} characters`);
  return s;
}
/** Multi-line text 0..max (newlines kept, other control characters refused). */
function text(v: unknown, field: string, max: number, required = false): string {
  if (typeof v !== 'string') throw bad(`${field} must be text`);
  const s = v.replace(/\r\n?/g, '\n').trim();
  if (required && !s) throw bad(`${field} is required`);
  if ([...s].length > max) throw bad(`${field} must be at most ${max} characters`);
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000B-\u001F\u007F‪-‮⁦-⁩]/.test(s)) throw bad(`${field} contains invalid characters`);
  return s;
}
function priority(v: unknown): Priority {
  if (!(PRIORITIES as readonly unknown[]).includes(v)) throw bad(`priority must be one of ${PRIORITIES.join(', ')}`);
  return v as Priority;
}
function dueDate(v: unknown): string | null {
  if (v === null) return null;
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`))) throw bad('dueDate must be YYYY-MM-DD or null');
  return v;
}
function idList(v: unknown, field: string, max: number): string[] {
  if (!Array.isArray(v) || v.length > max || !v.every((x) => typeof x === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(x))) throw bad(`${field} must be a list of at most ${max} ids`);
  return [...new Set(v as string[])];
}
function departments(v: unknown): string[] {
  if (!Array.isArray(v) || v.length > MAX_CARD_DEPARTMENTS) throw bad(`departments must be a list of at most ${MAX_CARD_DEPARTMENTS} names`);
  const out: string[] = [];
  for (const raw of v) {
    let d: string | null;
    try { d = normalizeDepartment(raw); } catch { throw bad('Each department must be a name of at most 64 characters'); }
    if (!d || !/^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u.test(d)) throw bad('Department names may use letters, numbers, spaces, - and _');
    if (!out.includes(d)) out.push(d);
  }
  return out;
}
const onlyKeys = (body: Record<string, unknown>, keys: readonly string[]) => {
  const k = Object.keys(body).find((x) => !keys.includes(x));
  if (k) throw bad(`Unknown field "${k.slice(0, 40)}"`);
};

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

function* boardRow(ownerId: string, boardId: string): Step<{ id: string; name: string }> {
  const b = yield* one<{ id: string; name: string }>('SELECT id, name FROM boards WHERE id = ? AND owner_id = ?', boardId, ownerId);
  if (!b) throw notFound('Board');
  return b;
}

function* cardsOf(boardId: string, includeArchived: boolean, onlyCard?: string): Step<BoardCard[]> {
  const rows = yield* all<{
    id: string; column_id: string; title: string; description: string; priority: Priority; position: number; due_date: string | null;
    task_id: string | null; archived: number; version: number; created_at: string; updated_at: string;
  }>(`SELECT id, column_id, title, description, priority, position, due_date, task_id, archived, version, created_at, updated_at
      FROM board_cards WHERE board_id = ?${includeArchived ? '' : ' AND archived = 0'}${onlyCard ? ' AND id = ?' : ''} ORDER BY position, created_at`,
  ...(onlyCard ? [boardId, onlyCard] : [boardId]));
  if (rows.length === 0) return [];
  const agents = yield* all<{ card_id: string; agent_id: string }>(
    'SELECT a.card_id, a.agent_id FROM board_card_agents a JOIN board_cards c ON c.id = a.card_id WHERE c.board_id = ? ORDER BY a.agent_id', boardId);
  const deps = yield* all<{ card_id: string; department: string }>(
    'SELECT d.card_id, d.department FROM board_card_departments d JOIN board_cards c ON c.id = d.card_id WHERE c.board_id = ? ORDER BY d.department', boardId);
  const counts = yield* all<{ card_id: string; n: number }>(
    'SELECT m.card_id, COUNT(*) AS n FROM board_card_comments m JOIN board_cards c ON c.id = m.card_id WHERE c.board_id = ? GROUP BY m.card_id', boardId);
  const group = <T extends { card_id: string }>(list: T[], pick: (x: T) => string) => {
    const m = new Map<string, string[]>();
    for (const x of list) m.set(x.card_id, [...(m.get(x.card_id) ?? []), pick(x)]);
    return m;
  };
  const byAgents = group(agents, (x) => x.agent_id);
  const byDeps = group(deps, (x) => x.department);
  const byCount = new Map(counts.map((x) => [x.card_id, Number(x.n)]));
  return rows.map((r) => ({
    id: r.id, columnId: r.column_id, title: r.title, description: r.description, priority: r.priority, position: Number(r.position),
    dueDate: r.due_date, taskId: r.task_id, archived: Number(r.archived) === 1, version: Number(r.version),
    agents: byAgents.get(r.id) ?? [], departments: byDeps.get(r.id) ?? [], comments: byCount.get(r.id) ?? 0,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }));
}

function* boardStep(ownerId: string, boardId: string, includeArchived = false): Step<Board> {
  const b = yield* boardRow(ownerId, boardId);
  const columns = (yield* all<BoardColumn>('SELECT id, name, position FROM board_columns WHERE board_id = ? ORDER BY position', boardId))
    .map((c) => ({ id: c.id, name: c.name, position: Number(c.position) }));
  return { id: b.id, name: b.name, columns, cards: yield* cardsOf(boardId, includeArchived) };
}

/** The owner's boards; the first call creates the default company board. */
export function listBoards(ownerId: string): Promise<Array<{ id: string; name: string }>> {
  return sql().tx(function* () {
    let rows = yield* all<{ id: string; name: string }>('SELECT id, name FROM boards WHERE owner_id = ? ORDER BY created_at, id', ownerId);
    if (rows.length === 0) {
      const d = yield* dialect();
      const id = randomUUID();
      yield* run(`INSERT INTO boards (id, owner_id, name, created_at, updated_at) VALUES (?, ?, ?, ${nowText(d)}, ${nowText(d)})`, id, ownerId, 'Company board');
      for (const [i, name] of DEFAULT_COLUMNS.entries()) {
        yield* run('INSERT INTO board_columns (id, board_id, name, position) VALUES (?, ?, ?, ?)', randomUUID(), id, name, (i + 1) * 1000);
      }
      rows = [{ id, name: 'Company board' }];
    }
    return rows;
  }, { immediate: true });
}

export function getBoard(ownerId: string, boardId: string, includeArchived = false): Promise<Board> {
  return sql().read(boardStep(ownerId, boardId, includeArchived));
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

function* columnOf(boardId: string, columnId: unknown): Step<{ id: string }> {
  if (typeof columnId !== 'string') throw bad('columnId is required');
  const c = yield* one<{ id: string }>('SELECT id FROM board_columns WHERE id = ? AND board_id = ?', columnId, boardId);
  if (!c) throw notFound('Column');
  return c;
}

function* knownAgents(ids: string[]): Step<void> {
  for (const id of ids) {
    if (!(yield* one('SELECT id FROM agents_config WHERE id = ?', id))) throw bad('Unknown agent');
  }
}

function* nextPosition(columnId: string): Step<number> {
  const r = yield* one<{ p: number | null }>('SELECT MAX(position) AS p FROM board_cards WHERE column_id = ?', columnId);
  return (r?.p === null || r?.p === undefined ? 0 : Number(r.p)) + 1000;
}

function* setLinks(cardId: string, agents: string[] | undefined, deps: string[] | undefined): Step<void> {
  if (agents) {
    yield* knownAgents(agents);
    yield* run('DELETE FROM board_card_agents WHERE card_id = ?', cardId);
    for (const a of agents) yield* run('INSERT INTO board_card_agents (card_id, agent_id) VALUES (?, ?)', cardId, a);
  }
  if (deps) {
    yield* run('DELETE FROM board_card_departments WHERE card_id = ?', cardId);
    for (const d of deps) yield* run('INSERT INTO board_card_departments (card_id, department) VALUES (?, ?)', cardId, d);
  }
}

export function addColumn(ownerId: string, boardId: string, body: Record<string, unknown>): Promise<Board> {
  onlyKeys(body, ['name']);
  const name = line(body.name, 'name', 60);
  return sql().tx(function* () {
    yield* boardRow(ownerId, boardId);
    const r = yield* one<{ n: number; p: number | null }>('SELECT COUNT(*) AS n, MAX(position) AS p FROM board_columns WHERE board_id = ?', boardId);
    if (Number(r?.n ?? 0) >= MAX_COLUMNS) throw bad(`A board can have at most ${MAX_COLUMNS} columns`);
    yield* run('INSERT INTO board_columns (id, board_id, name, position) VALUES (?, ?, ?, ?)', randomUUID(), boardId, name, (r?.p === null || r?.p === undefined ? 0 : Number(r.p)) + 1000);
    return yield* boardStep(ownerId, boardId);
  }, { immediate: true });
}

export function renameColumn(ownerId: string, boardId: string, columnId: string, body: Record<string, unknown>): Promise<Board> {
  onlyKeys(body, ['name']);
  const name = line(body.name, 'name', 60);
  return sql().tx(function* () {
    yield* boardRow(ownerId, boardId);
    yield* columnOf(boardId, columnId);
    yield* run('UPDATE board_columns SET name = ? WHERE id = ?', name, columnId);
    return yield* boardStep(ownerId, boardId);
  }, { immediate: true });
}

export function createCard(ownerId: string, boardId: string, body: Record<string, unknown>): Promise<BoardCard> {
  onlyKeys(body, ['columnId', 'title', 'description', 'priority', 'dueDate', 'agents', 'departments']);
  const title = line(body.title, 'title', MAX_TITLE);
  const description = body.description === undefined ? '' : text(body.description, 'description', MAX_DESCRIPTION);
  const prio = body.priority === undefined ? 'normal' : priority(body.priority);
  const due = body.dueDate === undefined ? null : dueDate(body.dueDate);
  const agents = body.agents === undefined ? [] : idList(body.agents, 'agents', MAX_CARD_AGENTS);
  const deps = body.departments === undefined ? [] : departments(body.departments);
  return sql().tx(function* () {
    const d = yield* dialect();
    yield* boardRow(ownerId, boardId);
    const col = yield* columnOf(boardId, body.columnId);
    const total = yield* one<{ n: number }>('SELECT COUNT(*) AS n FROM board_cards WHERE board_id = ?', boardId);
    if (Number(total?.n ?? 0) >= MAX_CARDS_PER_BOARD) throw bad(`A board can hold at most ${MAX_CARDS_PER_BOARD} cards`);
    const id = randomUUID();
    yield* run(`INSERT INTO board_cards (id, board_id, column_id, title, description, priority, position, due_date, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${nowText(d)}, ${nowText(d)})`, id, boardId, col.id, title, description, prio, yield* nextPosition(col.id), due, ownerId);
    yield* setLinks(id, agents, deps);
    return (yield* cardsOf(boardId, true, id))[0];
  }, { immediate: true });
}

/**
 * Edit or move a card. `expectedVersion` is required; a stale one gives 409
 * with the current card. Moving: `columnId` and optional `beforeCardId`
 * (null or absent = end of the column).
 */
export function updateCard(ownerId: string, boardId: string, cardId: string, body: Record<string, unknown>): Promise<BoardCard> {
  onlyKeys(body, ['expectedVersion', 'title', 'description', 'priority', 'dueDate', 'agents', 'departments', 'columnId', 'beforeCardId', 'archived']);
  const expected = body.expectedVersion;
  if (typeof expected !== 'number' || !Number.isInteger(expected) || expected < 1) throw new BoardError(400, 'invalid_version', 'expectedVersion is required');
  const sets: string[] = []; const args: Array<string | number | null> = [];
  if (body.title !== undefined) { sets.push('title = ?'); args.push(line(body.title, 'title', MAX_TITLE)); }
  if (body.description !== undefined) { sets.push('description = ?'); args.push(text(body.description, 'description', MAX_DESCRIPTION)); }
  if (body.priority !== undefined) { sets.push('priority = ?'); args.push(priority(body.priority)); }
  if (body.dueDate !== undefined) { sets.push('due_date = ?'); args.push(dueDate(body.dueDate)); }
  if (body.archived !== undefined) {
    if (typeof body.archived !== 'boolean') throw bad('archived must be true or false');
    sets.push('archived = ?'); args.push(body.archived ? 1 : 0);
  }
  const agents = body.agents === undefined ? undefined : idList(body.agents, 'agents', MAX_CARD_AGENTS);
  const deps = body.departments === undefined ? undefined : departments(body.departments);
  if (body.beforeCardId !== undefined && body.beforeCardId !== null && typeof body.beforeCardId !== 'string') throw bad('beforeCardId must be a card id or null');
  return sql().tx(function* () {
    const d = yield* dialect();
    yield* boardRow(ownerId, boardId);
    const card = yield* one<{ version: number; column_id: string }>('SELECT version, column_id FROM board_cards WHERE id = ? AND board_id = ?', cardId, boardId);
    if (!card) throw notFound('Card');
    if (Number(card.version) !== expected) {
      const current = (yield* cardsOf(boardId, true, cardId))[0];
      throw Object.assign(new BoardError(409, 'version_conflict', 'This card was changed meanwhile. Review it and try again.'), { current });
    }
    if (body.columnId !== undefined) {
      const col = yield* columnOf(boardId, body.columnId);
      let pos: number;
      const before = body.beforeCardId as string | null | undefined;
      if (before) {
        const b = yield* one<{ position: number; column_id: string }>('SELECT position, column_id FROM board_cards WHERE id = ? AND board_id = ?', before, boardId);
        if (!b || b.column_id !== col.id) throw bad('beforeCardId must be a card in that column');
        const prev = yield* one<{ p: number | null }>('SELECT MAX(position) AS p FROM board_cards WHERE column_id = ? AND position < ? AND id != ?', col.id, b.position, cardId);
        const lo = prev?.p === null || prev?.p === undefined ? Number(b.position) - 1000 : Number(prev.p);
        pos = Math.floor((lo + Number(b.position)) / 2);
        if (pos <= lo || pos >= Number(b.position)) {
          // No gap left: renumber the column, then place the card before `before`.
          const ids = (yield* all<{ id: string }>('SELECT id FROM board_cards WHERE column_id = ? AND id != ? ORDER BY position, created_at', col.id, cardId)).map((x) => x.id);
          let p = 1000;
          for (const id of ids) {
            if (id === before) { pos = p; p += 1000; }
            yield* run('UPDATE board_cards SET position = ? WHERE id = ?', p, id);
            p += 1000;
          }
        }
      } else {
        pos = yield* nextPosition(col.id);
      }
      sets.push('column_id = ?', 'position = ?'); args.push(col.id, pos);
    }
    yield* setLinks(cardId, agents, deps);
    const r = yield* run(`UPDATE board_cards SET ${[...sets, 'version = version + 1', `updated_at = ${nowText(d)}`].join(', ')} WHERE id = ? AND version = ?`, ...args, cardId, expected);
    if (r.changes !== 1) throw new BoardError(409, 'version_conflict', 'This card was changed meanwhile. Review it and try again.');
    return (yield* cardsOf(boardId, true, cardId))[0];
  }, { immediate: true });
}

export function listComments(ownerId: string, boardId: string, cardId: string): Promise<BoardComment[]> {
  return sql().read((function* () {
    yield* boardRow(ownerId, boardId);
    if (!(yield* one('SELECT id FROM board_cards WHERE id = ? AND board_id = ?', cardId, boardId))) throw notFound('Card');
    return (yield* all<{ id: string; author_kind: 'user' | 'agent'; author_id: string; body: string; created_at: string }>(
      'SELECT id, author_kind, author_id, body, created_at FROM board_card_comments WHERE card_id = ? ORDER BY created_at, id LIMIT 500', cardId))
      .map((c) => ({ id: c.id, authorKind: c.author_kind, authorId: c.author_id, body: c.body, createdAt: c.created_at }));
  })());
}

export function addComment(ownerId: string, boardId: string, cardId: string, body: Record<string, unknown>, author: { kind: 'user' | 'agent'; id: string }): Promise<BoardComment[]> {
  onlyKeys(body, ['body']);
  const textBody = text(body.body, 'body', MAX_COMMENT, true);
  return sql().tx(function* () {
    const d = yield* dialect();
    yield* boardRow(ownerId, boardId);
    if (!(yield* one('SELECT id FROM board_cards WHERE id = ? AND board_id = ?', cardId, boardId))) throw notFound('Card');
    yield* run(`INSERT INTO board_card_comments (id, card_id, author_kind, author_id, body, created_at) VALUES (?, ?, ?, ?, ?, ${nowText(d)})`,
      randomUUID(), cardId, author.kind, author.id, textBody);
    return (yield* all<{ id: string; author_kind: 'user' | 'agent'; author_id: string; body: string; created_at: string }>(
      'SELECT id, author_kind, author_id, body, created_at FROM board_card_comments WHERE card_id = ? ORDER BY created_at, id LIMIT 500', cardId))
      .map((c) => ({ id: c.id, authorKind: c.author_kind, authorId: c.author_id, body: c.body, createdAt: c.created_at }));
  }, { immediate: true });
}

// ---------------------------------------------------------------------------
// Agents on the board (BOARD-02): an agent works only on cards it is
// assigned to, on its run user's boards. Comments are signed by the agent.
// ---------------------------------------------------------------------------

export interface AgentCard { id: string; boardId: string; title: string; description: string; column: string; priority: Priority; dueDate: string | null; departments: string[] }

/** Cards the agent is assigned to (not archived), most urgent first, at most 50. */
export function agentCards(ownerId: string, agentId: string): Promise<AgentCard[]> {
  return sql().read((function* () {
    const rows = yield* all<{ id: string; board_id: string; title: string; description: string; col: string; priority: Priority; due_date: string | null }>(`
      SELECT c.id, c.board_id, c.title, c.description, col.name AS col, c.priority, c.due_date
      FROM board_cards c
      JOIN board_card_agents a ON a.card_id = c.id
      JOIN boards b ON b.id = c.board_id
      JOIN board_columns col ON col.id = c.column_id
      WHERE a.agent_id = ? AND b.owner_id = ? AND c.archived = 0
      ORDER BY CASE c.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, c.due_date IS NULL, c.due_date, c.created_at
      LIMIT 50`, agentId, ownerId);
    const out: AgentCard[] = [];
    for (const r of rows) {
      const deps = (yield* all<{ department: string }>('SELECT department FROM board_card_departments WHERE card_id = ? ORDER BY department', r.id)).map((d) => d.department);
      out.push({ id: r.id, boardId: r.board_id, title: r.title, description: r.description.slice(0, 1000), column: r.col, priority: r.priority, dueDate: r.due_date, departments: deps });
    }
    return out;
  })());
}

function* assignedCard(ownerId: string, agentId: string, cardId: unknown): Step<{ id: string; board_id: string; version: number }> {
  if (typeof cardId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(cardId)) throw bad('cardId is required');
  const card = yield* one<{ id: string; board_id: string; version: number }>(`
    SELECT c.id, c.board_id, c.version FROM board_cards c
    JOIN boards b ON b.id = c.board_id
    JOIN board_card_agents a ON a.card_id = c.id AND a.agent_id = ?
    WHERE c.id = ? AND b.owner_id = ? AND c.archived = 0`, agentId, cardId, ownerId);
  // Not assigned looks the same as missing: an agent cannot probe other cards.
  if (!card) throw notFound('Card');
  return card;
}

/** The agent adds a comment to a card it is assigned to. */
export function agentComment(ownerId: string, agentId: string, cardId: unknown, body: unknown): Promise<number> {
  const textBody = text(body, 'comment', MAX_COMMENT, true);
  return sql().tx(function* () {
    const d = yield* dialect();
    const card = yield* assignedCard(ownerId, agentId, cardId);
    yield* run(`INSERT INTO board_card_comments (id, card_id, author_kind, author_id, body, created_at) VALUES (?, ?, 'agent', ?, ?, ${nowText(d)})`,
      randomUUID(), card.id, agentId, textBody);
    const n = yield* one<{ n: number }>('SELECT COUNT(*) AS n FROM board_card_comments WHERE card_id = ?', card.id);
    return Number(n?.n ?? 0);
  }, { immediate: true });
}

/** The agent moves a card it is assigned to into another column (by name, case-insensitive), at the end. */
export function agentMove(ownerId: string, agentId: string, cardId: unknown, columnName: unknown): Promise<{ column: string }> {
  const wanted = line(columnName, 'column', 60).toLowerCase();
  return sql().tx(function* () {
    const d = yield* dialect();
    const card = yield* assignedCard(ownerId, agentId, cardId);
    const cols = yield* all<{ id: string; name: string }>('SELECT id, name FROM board_columns WHERE board_id = ? ORDER BY position', card.board_id);
    const col = cols.find((c) => c.name.toLowerCase() === wanted);
    if (!col) throw bad(`No column named "${wanted.slice(0, 60)}". Columns: ${cols.map((c) => c.name).join(', ')}`);
    const pos = yield* nextPosition(col.id);
    const r = yield* run(`UPDATE board_cards SET column_id = ?, position = ?, version = version + 1, updated_at = ${nowText(d)} WHERE id = ? AND version = ?`,
      col.id, pos, card.id, card.version);
    if (r.changes !== 1) throw new BoardError(409, 'version_conflict', 'The card was changed meanwhile; try again.');
    return { column: col.name };
  }, { immediate: true });
}
