import { useState } from 'react';
import { cardTypeLabel, matches, priorityLabel } from './board';
import type { BoardController, Card } from './board';
import { OVERLOAD, cardsByDue, monthGrid, sortCards, workload } from './board-views';
import type { SortKey } from './board-views';

export type BoardView = 'board' | 'table' | 'calendar' | 'workload';
export const viewLabel: Record<BoardView, string> = { board: 'Board', table: 'Table', calendar: 'Calendar', workload: 'Workload' };
const today = () => new Date().toISOString().slice(0, 10);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Board / Table / Calendar / Workload switcher. */
export function ViewSwitch({ view, onChange }: { view: BoardView; onChange: (v: BoardView) => void }) {
  return <div className="board-views" role="tablist" aria-label="Board views">{(Object.keys(viewLabel) as BoardView[]).map(v =>
    <button key={v} type="button" role="tab" aria-selected={view === v} className="board-view-tab" onClick={() => onChange(v)}>{viewLabel[v]}</button>)}
  </div>;
}

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'title', label: 'Card' }, { key: 'type', label: 'Type' }, { key: 'column', label: 'Status' }, { key: 'priority', label: 'Priority' },
  { key: 'agents', label: 'Agents' }, { key: 'start', label: 'Start' }, { key: 'due', label: 'Due' }, { key: 'checklist', label: 'Checklist' },
];

/** Every card in one sortable table; status can be changed in place; the title opens the card. */
export function TableView({ controller, busy }: { controller: BoardController; busy: boolean }) {
  const s = controller.getSnapshot();
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'column', dir: 'asc' });
  const rows = sortCards(s.cards.filter(c => matches(c, s.filter)), s.columns, sort.key, sort.dir);
  const now = today();
  const by = (key: SortKey) => setSort(cur => ({ key, dir: cur.key === key && cur.dir === 'asc' ? 'desc' : 'asc' }));
  return <div className="board-table-wrap">
    <table className="board-table">
      <thead><tr>{COLUMNS.map(c => <th key={c.key} scope="col" aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
        <button type="button" onClick={() => by(c.key)}>{c.label}{sort.key === c.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</button>
      </th>)}<th scope="col">Labels</th></tr></thead>
      <tbody>{rows.map(c => <tr key={c.id} data-priority={c.priority}>
        <td><button type="button" className="board-link" onClick={() => void controller.openCard(c.id)}>{c.title}</button>
          {c.departments.length > 0 && <small className="board-table-deps">{c.departments.join(', ')}</small>}</td>
        <td>{cardTypeLabel[c.type]}</td>
        <td><select aria-label={`Status of ${c.title}`} value={c.columnId} disabled={busy} onChange={e => void controller.move(c.id, e.target.value, null)}>
          {s.columns.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}</select></td>
        <td><span className={`board-priority p-${c.priority}`}>{priorityLabel[c.priority]}</span></td>
        <td>{c.agents.map(a => controller.agentName(a)).join(', ') || '—'}</td>
        <td>{c.startDate ?? '—'}</td>
        <td className={c.dueDate && c.dueDate < now ? 'board-due overdue' : undefined}>{c.dueDate ?? '—'}</td>
        <td>{c.checklist.total ? `${c.checklist.done}/${c.checklist.total}` : '—'}</td>
        <td><span className="board-labels">{c.labels.map(id => { const l = s.labels.find(x => x.id === id); return l ? <span key={id} className="board-label" data-color={l.color}>{l.name}</span> : null; })}</span></td>
      </tr>)}</tbody>
    </table>
    {rows.length === 0 && <p className="fine-print">No cards match.</p>}
  </div>;
}

/** A month of due dates; cards without a due date are listed below. */
export function CalendarView({ controller }: { controller: BoardController }) {
  const s = controller.getSnapshot();
  const now = new Date();
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const { byDay, undated } = cardsByDue(s.cards.filter(c => matches(c, s.filter)));
  const weeks = monthGrid(month.y, month.m);
  const shift = (d: number) => setMonth(cur => { const t = new Date(cur.y, cur.m + d, 1); return { y: t.getFullYear(), m: t.getMonth() }; });
  const todayIso = today();
  const tile = (c: Card) => <li key={c.id}><button type="button" className="board-cal-card" data-priority={c.priority} data-color={c.cover ?? undefined} onClick={() => void controller.openCard(c.id)} title={c.title}>{c.title}</button></li>;
  return <div className="board-calendar">
    <div className="board-cal-head">
      <button type="button" aria-label="Previous month" onClick={() => shift(-1)}>‹</button>
      <h3>{MONTHS[month.m]} {month.y}</h3>
      <button type="button" aria-label="Next month" onClick={() => shift(1)}>›</button>
      <button type="button" onClick={() => setMonth({ y: now.getFullYear(), m: now.getMonth() })}>Today</button>
    </div>
    <div className="board-cal-grid" role="grid" aria-label={`${MONTHS[month.m]} ${month.y}`}>
      {WEEKDAYS.map(d => <div key={d} className="board-cal-weekday" role="columnheader">{d}</div>)}
      {weeks.flat().map(day => <div key={day.date} role="gridcell" className="board-cal-day" data-out={!day.inMonth || undefined} data-today={day.date === todayIso || undefined} aria-label={day.date}>
        <span className="board-cal-num">{day.day}</span>
        <ul>{(byDay.get(day.date) ?? []).map(tile)}</ul>
      </div>)}
    </div>
    {undated.length > 0 && <section className="board-cal-undated" aria-label="No due date"><h4>No due date ({undated.length})</h4><ul>{undated.map(tile)}</ul></section>}
  </div>;
}

/** Open cards per agent: who has too much, who is free. */
export function WorkloadView({ controller }: { controller: BoardController }) {
  const s = controller.getSnapshot();
  const loads = workload(s.cards, s.columns, s.agents, today());
  const max = Math.max(OVERLOAD, ...loads.map(l => l.open.length));
  const assigned = loads.filter(l => l.open.length > 0 || l.done > 0);
  const free = loads.filter(l => l.open.length === 0 && l.done === 0);
  return <div className="board-workload">
    <p className="fine-print">Open cards are the ones not yet in the last column. More than {OVERLOAD} open cards marks an agent as overloaded.</p>
    <ul className="board-load-list">{assigned.map(l => <li key={l.agent.id} className="board-load" data-over={l.open.length > OVERLOAD || undefined}>
      <div className="board-load-head"><strong>{l.agent.name}</strong>
        <span className="fine-print">{l.open.length} open{l.overdue ? ` · ${l.overdue} overdue` : ''}{l.urgent ? ` · ${l.urgent} urgent/high` : ''}{l.done ? ` · ${l.done} done` : ''}</span>
        {l.open.length > OVERLOAD && <span className="badge">Overloaded</span>}</div>
      <div className="board-load-bar" aria-hidden="true"><span style={{ inlineSize: `${(l.open.length / max) * 100}%` }}/></div>
      {l.open.length > 0 && <details><summary>Show the {l.open.length} open {l.open.length === 1 ? 'card' : 'cards'}</summary>
        <ul>{l.open.map(c => <li key={c.id}><button type="button" className="board-link" onClick={() => void controller.openCard(c.id)}>{c.title}</button>
          <small> · {s.columns.find(col => col.id === c.columnId)?.name}{c.dueDate ? ` · due ${c.dueDate}` : ''}</small></li>)}</ul>
      </details>}
    </li>)}</ul>
    {assigned.length === 0 && <p className="fine-print">No cards are assigned to agents on this board yet.</p>}
    {free.length > 0 && <p className="fine-print">Free on this board: {free.map(l => l.agent.name).join(', ')}.</p>}
  </div>;
}
