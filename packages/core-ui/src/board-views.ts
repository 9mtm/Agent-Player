// BOARD-03 step C: pure helpers for the board's Table, Calendar and Workload
// views. They only rearrange the board data the page already holds.
import type { AgentOption, Card, Column } from './board';

export type SortKey = 'title' | 'type' | 'column' | 'priority' | 'start' | 'due' | 'checklist' | 'agents';
const PRIORITY_RANK = { urgent: 0, high: 1, normal: 2, low: 3 } as const;

/** Cards sorted for the table; empty dates always go last; ties keep board order. */
export function sortCards(cards: readonly Card[], columns: readonly Column[], key: SortKey, dir: 'asc' | 'desc'): Card[] {
  const colPos = new Map(columns.map(c => [c.id, c.position]));
  const sign = dir === 'asc' ? 1 : -1;
  const value = (c: Card): string | number | null => {
    switch (key) {
      case 'title': return c.title.toLowerCase();
      case 'type': return c.type;
      case 'column': return colPos.get(c.columnId) ?? 0;
      case 'priority': return PRIORITY_RANK[c.priority];
      case 'start': return c.startDate;
      case 'due': return c.dueDate;
      case 'checklist': return c.checklist.total ? c.checklist.done / c.checklist.total : null;
      case 'agents': return c.agents.length;
    }
  };
  return [...cards].map((c, i) => ({ c, i, v: value(c) })).sort((a, b) => {
    if (a.v === null && b.v === null) return a.i - b.i;
    if (a.v === null) return 1;
    if (b.v === null) return -1;
    const cmp = a.v < b.v ? -1 : a.v > b.v ? 1 : 0;
    return cmp ? cmp * sign : a.i - b.i;
  }).map(x => x.c);
}

const pad = (n: number) => String(n).padStart(2, '0');
export const isoDay = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/**
 * The weeks (Monday first) shown for a month: each day as YYYY-MM-DD with
 * whether it belongs to the month. Always whole weeks (5 or 6 rows).
 */
export function monthGrid(year: number, month: number): { date: string; inMonth: boolean; day: number }[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = (first.getUTCDay() + 6) % 7; // days before the 1st since Monday
  const start = Date.UTC(year, month, 1 - lead);
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7;
  const weeks: { date: string; inMonth: boolean; day: number }[][] = [];
  for (let i = 0; i < cells; i++) {
    const d = new Date(start + i * 86_400_000);
    const cell = { date: isoDay(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), inMonth: d.getUTCMonth() === month, day: d.getUTCDate() };
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push(cell);
  }
  return weeks;
}

/** Cards by due date (YYYY-MM-DD) and the ones without a due date. */
export function cardsByDue(cards: readonly Card[]): { byDay: Map<string, Card[]>; undated: Card[] } {
  const byDay = new Map<string, Card[]>(); const undated: Card[] = [];
  for (const c of cards) {
    if (!c.dueDate) { undated.push(c); continue; }
    byDay.set(c.dueDate, [...(byDay.get(c.dueDate) ?? []), c]);
  }
  return { byDay, undated };
}

/** Open cards above this count mark an agent as overloaded. */
export const OVERLOAD = 5;

export type WorkloadRow = {
  key: string; agent: AgentOption | null; byColumn: Map<string, Card[]>; open: number; overdue: number; dueSoon: number; urgent: number;
};

/**
 * The workload matrix: one row per agent (and one for cards nobody has),
 * cards per board column, open = not in the last column, overdue = due
 * before today, due soon = due within the next 7 days. Most open first.
 */
export function workloadMatrix(cards: readonly Card[], columns: readonly Column[], agents: readonly AgentOption[], today: string): { rows: WorkloadRow[]; unassigned: WorkloadRow; lastColumn?: string } {
  const ordered = [...columns].sort((a, b) => a.position - b.position);
  const last = ordered.at(-1)?.id;
  const soon = new Date(`${today}T00:00:00Z`); soon.setUTCDate(soon.getUTCDate() + 7);
  const soonIso = soon.toISOString().slice(0, 10);
  const row = (key: string, agent: AgentOption | null, mine: Card[]): WorkloadRow => {
    const byColumn = new Map(ordered.map(c => [c.id, mine.filter(x => x.columnId === c.id)]));
    const open = mine.filter(c => c.columnId !== last);
    return {
      key, agent, byColumn, open: open.length,
      overdue: open.filter(c => c.dueDate !== null && c.dueDate < today).length,
      dueSoon: open.filter(c => c.dueDate !== null && c.dueDate >= today && c.dueDate <= soonIso).length,
      urgent: open.filter(c => c.priority === 'urgent' || c.priority === 'high').length,
    };
  };
  const rows = agents.map(a => row(a.id, a, cards.filter(c => c.agents.includes(a.id))))
    .sort((a, b) => b.open - a.open || b.overdue - a.overdue || a.agent!.name.localeCompare(b.agent!.name));
  return { rows, unassigned: row('none', null, cards.filter(c => c.agents.length === 0)), lastColumn: last };
}
