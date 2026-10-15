import { useEffect, useState, useSyncExternalStore } from 'react';
import type { DragEvent } from 'react';
import { allCardTypes, allPriorities, cardTypeLabel, cardsIn, matches, priorityLabel } from './board';
import type { BoardColor, BoardController, BoardSummary, Card, CardType, Column } from './board';
import { Icon } from './icons';
import { CalendarView, TableView, ViewSwitch, WorkloadView } from './BoardViews';
import type { BoardView } from './BoardViews';

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(w => w.slice(0, 1).toUpperCase()).join('') || '?';
const DRAG_TYPE = 'application/x-dpro-card';

const kindLabel = { company: 'Whole company', department: 'Department', shared: 'Shared' } as const;
const typeMark: Record<CardType, string> = { task: '✓', idea: '✦', bug: '⚑', milestone: '◆', request: '?' };
const colorLabel: Record<BoardColor, string> = { blue: 'Blue', green: 'Green', orange: 'Orange', red: 'Red', purple: 'Purple', pink: 'Pink', teal: 'Teal', gray: 'Gray' };

/** The company's boards: a list of boards (company, per department, shared), the open board's columns, and a card panel. */
export function TaskBoard({ controller, active = false }: { controller: BoardController; active?: boolean }) {
  const s = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [newColumn, setNewColumn] = useState('');
  const [mode, setMode] = useState<'board' | 'new' | 'settings'>('board');
  const [view, setView] = useState<BoardView>('board');
  const busy = s.phase === 'loading' || s.phase === 'saving';
  const departments = [...new Set(s.cards.flatMap(c => c.departments))].sort();
  const openCard = s.cards.find(c => c.id === s.open);
  const visible = s.cards.filter(c => matches(c, s.filter)).length;
  // Opening the page shows the boards at once (one read the first time the page is shown).
  useEffect(() => { if (active && s.owner && s.phase === 'idle' && !s.boardId) void controller.load(); }, [active, s.owner, s.phase, s.boardId, controller]);

  if (!s.boardId) return <section aria-label="Task board" className="board">
    <div className="board-head"><div><h2>Boards</h2><p className="fine-print">Plan the company's work on boards: one for the whole company, one per department, or shared by departments.</p></div></div>
    {(s.notice || s.phase === 'loading') && <p role="status" className="board-notice">{s.notice ?? 'Reading the boards…'}</p>}
    <div className="hire-actions"><button type="button" className="primary" disabled={busy || !s.owner} onClick={() => void controller.load()}>Open the boards</button></div>
  </section>;

  return <section aria-label="Task board" className="board board-with-rail" data-color={s.meta?.color}>
    <BoardRail controller={controller} onNew={() => setMode('new')} onPick={id => { setMode('board'); void controller.openBoard(id); }} busy={busy}/>
    <div className="board-main">
      {mode === 'new' ? <NewBoardForm controller={controller} busy={busy} onDone={() => setMode('board')}/>
        : mode === 'settings' && s.meta ? <BoardSettings controller={controller} busy={busy} onDone={() => setMode('board')}/>
        : <>
          <div className="board-head">
            <div className="board-title">
              <span className="board-swatch" data-color={s.meta?.color} aria-hidden="true"/>
              <div>
                <h2>{s.name}</h2>
                <p className="fine-print">{s.meta ? kindLabel[s.meta.kind] : ''}{s.meta?.departments.length ? ` · ${s.meta.departments.join(', ')}` : ''}{s.meta?.description ? ` · ${s.meta.description}` : ''}</p>
              </div>
            </div>
            <div className="board-head-actions">
              <form className="board-add-column" onSubmit={e => { e.preventDefault(); void controller.addColumn(newColumn).then(ok => { if (ok) setNewColumn(''); }); }}>
                <input aria-label="New column name" placeholder="New column" maxLength={60} value={newColumn} disabled={busy} onChange={e => setNewColumn(e.target.value)}/>
                <button type="submit" disabled={busy || !newColumn.trim()}>Add column</button>
              </form>
              <button type="button" disabled={busy} onClick={() => setMode('settings')}>Board settings</button>
            </div>
          </div>
          {(s.notice || s.phase === 'loading') && <p role="status" className="board-notice">{s.notice ?? 'Reading the board…'}</p>}
          <ViewSwitch view={view} onChange={setView}/>
          <div className="board-filters" role="search">
            <input aria-label="Search cards" placeholder="Search cards" value={s.filter.text} onChange={e => controller.setFilter({ text: e.target.value })}/>
            <select aria-label="Filter by agent" value={s.filter.agent} onChange={e => controller.setFilter({ agent: e.target.value })}>
              <option value="">All agents</option>
              {s.agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select aria-label="Filter by department" value={s.filter.department} onChange={e => controller.setFilter({ department: e.target.value })}>
              <option value="">All departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <span className="fine-print">{visible} of {s.cards.length} cards</span>
          </div>
          {view === 'board' && <div className="board-columns">
            {s.columns.map(col => <BoardColumn key={col.id} col={col} controller={controller} busy={busy}/>)}
          </div>}
          {view === 'table' && <TableView controller={controller} busy={busy}/>}
          {view === 'calendar' && <CalendarView controller={controller}/>}
          {view === 'workload' && <WorkloadView controller={controller}/>}
        </>}
    </div>
    {mode === 'board' && openCard && s.draft && <CardPanel card={openCard} controller={controller} busy={busy}/>}
  </section>;
}

/** Boards grouped: whole company, each department, shared by departments. */
function BoardRail({ controller, onNew, onPick, busy }: { controller: BoardController; onNew: () => void; onPick: (id: string) => void; busy: boolean }) {
  const s = controller.getSnapshot();
  const company = s.boards.filter(b => b.kind === 'company');
  const byDep = new Map<string, BoardSummary[]>();
  for (const b of s.boards.filter(x => x.kind === 'department')) byDep.set(b.departments[0], [...(byDep.get(b.departments[0]) ?? []), b]);
  const shared = s.boards.filter(b => b.kind === 'shared');
  const item = (b: BoardSummary) => <li key={b.id}>
    <button type="button" className="board-rail-item" aria-current={b.id === s.boardId ? 'page' : undefined} disabled={busy} onClick={() => onPick(b.id)} title={b.description || b.name}>
      <span className="board-swatch small" data-color={b.color} aria-hidden="true"/><span className="board-rail-name">{b.name}</span><span className="board-count">{b.cards}</span>
    </button>
  </li>;
  return <nav className="board-rail" aria-label="Boards">
    <button type="button" className="primary board-new" disabled={busy} onClick={onNew}>+ New board</button>
    {company.length > 0 && <><p className="board-rail-label">Whole company</p><ul>{company.map(item)}</ul></>}
    {[...byDep.keys()].sort().map(dep => <div key={dep}><p className="board-rail-label">{dep}</p><ul>{byDep.get(dep)!.map(item)}</ul></div>)}
    {shared.length > 0 && <><p className="board-rail-label">Shared by departments</p><ul>{shared.map(item)}</ul></>}
  </nav>;
}

function ColorPicker({ value, onChange, colors }: { value: BoardColor; onChange: (c: BoardColor) => void; colors: readonly BoardColor[] }) {
  return <div className="board-colors" role="radiogroup" aria-label="Board colour">{colors.map(c =>
    <label key={c} className="board-color" title={colorLabel[c]}>
      <input type="radio" name="board-color" aria-label={colorLabel[c]} checked={value === c} onChange={() => onChange(c)}/>
      <span className="board-swatch" data-color={c} aria-hidden="true"/>
    </label>)}
  </div>;
}

function DepartmentsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [dep, setDep] = useState('');
  const add = () => { const d = dep.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase(); if (d && !value.includes(d) && value.length < 12) onChange([...value, d]); setDep(''); };
  return <div className="board-panel-deps">
    <span className="board-chips">{value.map(x => <span key={x} className="board-chip">{x} <button type="button" aria-label={`Remove ${x}`} onClick={() => onChange(value.filter(v => v !== x))}>×</button></span>)}
      {value.length === 0 && <span className="fine-print">None — the board is for the whole company.</span>}</span>
    <div className="board-inline"><input aria-label="Add a department" placeholder="e.g. marketing" maxLength={64} value={dep} onChange={e => setDep(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}/><button type="button" disabled={!dep.trim()} onClick={add}>Add</button></div>
  </div>;
}

function NewBoardForm({ controller, busy, onDone }: { controller: BoardController; busy: boolean; onDone: () => void }) {
  const s = controller.getSnapshot();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState(s.templates[0]?.id ?? 'kanban');
  const [color, setColor] = useState<BoardColor>('blue');
  const [deps, setDeps] = useState<string[]>([]);
  return <form className="board-form" aria-label="New board" onSubmit={e => { e.preventDefault(); void controller.createBoard({ name, description, template, color, departments: deps }).then(ok => { if (ok) onDone(); }); }}>
    <h2>New board</h2>
    {s.notice && <p role="status" className="board-notice">{s.notice}</p>}
    <label>Name<input value={name} maxLength={80} placeholder="e.g. Marketing content" onChange={e => setName(e.target.value)}/></label>
    <label>Description <small className="fine-print">(optional)</small><input value={description} maxLength={500} onChange={e => setDescription(e.target.value)}/></label>
    <fieldset className="board-templates"><legend>Start from a template</legend>
      {s.templates.map(t => <label key={t.id} className="board-template" data-on={template === t.id || undefined}>
        <input type="radio" name="board-template" checked={template === t.id} onChange={() => setTemplate(t.id)}/>
        <span><strong>{t.name}</strong><small>{t.description}</small><span className="board-template-cols">{t.columns.map(c => <span key={c}>{c}</span>)}</span></span>
      </label>)}
    </fieldset>
    <fieldset className="board-fieldset"><legend>Colour</legend><ColorPicker value={color} onChange={setColor} colors={s.colors}/></fieldset>
    <fieldset className="board-fieldset"><legend>Departments</legend><p className="fine-print">One department makes it that team's board; several make it a shared board.</p><DepartmentsInput value={deps} onChange={setDeps}/></fieldset>
    <div className="hire-actions"><button type="submit" className="primary" disabled={busy || !name.trim()}>Create board</button><button type="button" disabled={busy} onClick={onDone}>Cancel</button></div>
  </form>;
}

function BoardSettings({ controller, busy, onDone }: { controller: BoardController; busy: boolean; onDone: () => void }) {
  const m = controller.getSnapshot().meta!;
  const colors = controller.getSnapshot().colors;
  const [name, setName] = useState(m.name);
  const [description, setDescription] = useState(m.description);
  const [color, setColor] = useState<BoardColor>(m.color);
  const [deps, setDeps] = useState<string[]>([...m.departments]);
  const [confirmArchive, setConfirmArchive] = useState(false);
  return <form className="board-form" aria-label="Board settings" onSubmit={e => { e.preventDefault(); void controller.updateBoard({ name, description, color, departments: deps }).then(ok => { if (ok) onDone(); }); }}>
    <h2>Board settings</h2>
    {controller.getSnapshot().notice && <p role="status" className="board-notice">{controller.getSnapshot().notice}</p>}
    <label>Name<input value={name} maxLength={80} onChange={e => setName(e.target.value)}/></label>
    <label>Description<input value={description} maxLength={500} onChange={e => setDescription(e.target.value)}/></label>
    <fieldset className="board-fieldset"><legend>Colour</legend><ColorPicker value={color} onChange={setColor} colors={colors}/></fieldset>
    <fieldset className="board-fieldset"><legend>Departments</legend><DepartmentsInput value={deps} onChange={setDeps}/></fieldset>
    <div className="hire-actions"><button type="submit" className="primary" disabled={busy}>Save</button><button type="button" disabled={busy} onClick={onDone}>Cancel</button></div>
    <fieldset className="board-fieldset danger"><legend>Archive this board</legend>
      <p className="fine-print">The board and its cards are kept but hidden from the list and from agents.</p>
      <label className="check"><input type="checkbox" checked={confirmArchive} onChange={e => setConfirmArchive(e.target.checked)}/> I want to archive “{m.name}”</label>
      <button type="button" disabled={busy || !confirmArchive} onClick={() => void controller.updateBoard({ archived: true }).then(ok => { if (ok) onDone(); })}>Archive board</button>
    </fieldset>
  </form>;
}

function BoardColumn({ col, controller, busy }: { col: Column; controller: BoardController; busy: boolean }) {
  const s = controller.getSnapshot();
  const cards = cardsIn(s.cards, col.id).filter(c => matches(c, s.filter));
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const drop = (e: DragEvent, before: string | null) => {
    e.preventDefault(); e.stopPropagation(); setOver(false);
    const id = e.dataTransfer.getData(DRAG_TYPE);
    if (id) void controller.move(id, col.id, before);
  };
  return <section className="board-column" aria-label={col.name} data-over={over || undefined}
    onDragOver={e => { if (e.dataTransfer.types.includes(DRAG_TYPE)) { e.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)} onDrop={e => drop(e, null)}>
    <header className="board-column-head">
      {renaming === null
        ? <><h3>{col.name}</h3><span className="board-count">{cards.length}</span>
          <button type="button" className="board-ghost" aria-label={`Rename ${col.name}`} disabled={busy} onClick={() => setRenaming(col.name)}>Rename</button></>
        : <form className="board-rename" onSubmit={e => { e.preventDefault(); void controller.renameColumn(col.id, renaming).then(ok => { if (ok) setRenaming(null); }); }}>
          <input aria-label="Column name" value={renaming} maxLength={60} autoFocus onChange={e => setRenaming(e.target.value)}/>
          <button type="submit" disabled={busy}>Save</button><button type="button" onClick={() => setRenaming(null)}>Cancel</button>
        </form>}
    </header>
    <ol className="board-cards">
      {cards.map(card => <li key={card.id} onDragOver={e => { if (e.dataTransfer.types.includes(DRAG_TYPE)) e.preventDefault(); }} onDrop={e => drop(e, card.id)}>
        <CardTile card={card} controller={controller}/>
      </li>)}
    </ol>
    {adding
      ? <form className="board-new-card" onSubmit={e => { e.preventDefault(); const text = title; if (!text.trim()) return;
        // Clear at once so the next title can be typed while this one saves; put it back if it was not added.
        setTitle(''); void controller.addCard(col.id, text).then(ok => { if (!ok) setTitle(cur => cur || text); }); }}>
        <textarea aria-label={`New card in ${col.name}`} placeholder="What needs to be done? (Enter adds, Esc closes)" rows={2} maxLength={200} value={title} autoFocus
          onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit(); } if (e.key === 'Escape') setAdding(false); }}/>
        <div className="board-new-actions"><button type="submit" className="primary" disabled={busy || !title.trim()}>Add card</button><button type="button" onClick={() => { setAdding(false); setTitle(''); }}>Cancel</button></div>
      </form>
      : <button type="button" className="board-add-card" disabled={busy} onClick={() => setAdding(true)}>+ Add a card</button>}
  </section>;
}

function CardTile({ card, controller }: { card: Card; controller: BoardController }) {
  const overdue = card.dueDate !== null && card.dueDate < new Date().toISOString().slice(0, 10);
  return <article className="board-card" data-priority={card.priority} draggable
    onDragStart={e => { e.dataTransfer.setData(DRAG_TYPE, card.id); e.dataTransfer.effectAllowed = 'move'; }}>
    {card.cover && <span className="board-cover" data-color={card.cover} aria-hidden="true"/>}
    <button type="button" className="board-card-open" onClick={() => void controller.openCard(card.id)} aria-label={`Open ${cardTypeLabel[card.type].toLowerCase()} ${card.title}`}>
      {card.labels.length > 0 && <span className="board-labels">{card.labels.map(id => { const l = controller.getSnapshot().labels.find(x => x.id === id); return l ? <span key={id} className="board-label" data-color={l.color}>{l.name}</span> : null; })}</span>}
      {card.departments.length > 0 && <span className="board-chips">{card.departments.map(d => <span key={d} className="board-chip">{d}</span>)}</span>}
      <span className="board-card-title">{card.type !== 'task' && <span className={`board-type t-${card.type}`} title={cardTypeLabel[card.type]}>{typeMark[card.type]} {cardTypeLabel[card.type]}</span>}{card.title}</span>
      <span className="board-card-meta">
        {card.priority !== 'normal' && <span className={`board-priority p-${card.priority}`}>{priorityLabel[card.priority]}</span>}
        {card.startDate && <span className="board-due">From {card.startDate}</span>}
        {card.dueDate && <span className={overdue ? 'board-due overdue' : 'board-due'}>Due {card.dueDate}</span>}
        {card.checklist.total > 0 && <span className={card.checklist.done === card.checklist.total ? 'board-check complete' : 'board-check'} aria-label={`Checklist ${card.checklist.done} of ${card.checklist.total}`}>☑ {card.checklist.done}/{card.checklist.total}</span>}
        {card.comments > 0 && <span className="board-comments" aria-label={`${card.comments} comments`}><Icon name="message-circle"/>{card.comments}</span>}
        <span className="board-avatars">{card.agents.slice(0, 4).map(a => <span key={a} className="board-avatar" title={controller.agentName(a)}>{initials(controller.agentName(a))}</span>)}
          {card.agents.length > 4 && <span className="board-avatar more">+{card.agents.length - 4}</span>}</span>
      </span>
    </button>
  </article>;
}

function CardPanel({ card, controller, busy }: { card: Card; controller: BoardController; busy: boolean }) {
  const s = controller.getSnapshot();
  const d = s.draft!;
  const [dep, setDep] = useState('');
  const [comment, setComment] = useState('');
  const [agentQuery, setAgentQuery] = useState('');
  const shownAgents = s.agents.filter(a => d.agents.includes(a.id) || !agentQuery.trim() || a.name.toLowerCase().includes(agentQuery.trim().toLowerCase())).slice(0, 60);
  const column = s.columns.find(c => c.id === card.columnId);
  return <aside className="board-panel" aria-label={`Card: ${card.title}`}>
    <div className="board-panel-head">
      <span className="fine-print">In <strong>{column?.name}</strong></span>
      <button type="button" onClick={() => controller.closeCard()}>Close</button>
    </div>
    <label>Title<input value={d.title} maxLength={200} disabled={busy} onChange={e => controller.editDraft({ title: e.target.value })}/></label>
    <label>Description<textarea rows={5} value={d.description} maxLength={5000} disabled={busy} placeholder="Details, links, acceptance…" onChange={e => controller.editDraft({ description: e.target.value })}/></label>
    <div className="board-panel-row">
      <label>Type<select value={d.type} disabled={busy} onChange={e => controller.editDraft({ type: e.target.value as CardType })}>
        {allCardTypes.map(t => <option key={t} value={t}>{cardTypeLabel[t]}</option>)}
      </select></label>
      <label>Start date<input type="date" value={d.startDate} disabled={busy} onChange={e => controller.editDraft({ startDate: e.target.value })}/></label>
      <label>Cover<select value={d.cover ?? ''} disabled={busy} onChange={e => controller.editDraft({ cover: (e.target.value || null) as BoardColor | null })}>
        <option value="">None</option>{s.colors.map(c => <option key={c} value={c}>{colorLabel[c]}</option>)}
      </select></label>
    </div>
    <LabelPicker controller={controller} selected={d.labels} busy={busy}/>
    <div className="board-panel-row">
      <label>Priority<select value={d.priority} disabled={busy} onChange={e => controller.editDraft({ priority: e.target.value as never })}>
        {allPriorities.map(p => <option key={p} value={p}>{priorityLabel[p]}</option>)}
      </select></label>
      <label>Due date<input type="date" value={d.dueDate} disabled={busy} onChange={e => controller.editDraft({ dueDate: e.target.value })}/></label>
      <label>Move to<select value={card.columnId} disabled={busy} onChange={e => void controller.move(card.id, e.target.value, null)}>
        {s.columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select></label>
    </div>
    <fieldset className="board-panel-agents" disabled={busy}><legend>Agents working on it ({d.agents.length})</legend>
      {s.agents.length > 8 && <input aria-label="Find an agent" placeholder="Find an agent" value={agentQuery} onChange={e => setAgentQuery(e.target.value)}/>}
      <ul>{shownAgents.map(a => <li key={a.id}><label className="check"><input type="checkbox" checked={d.agents.includes(a.id)} onChange={() => controller.toggleAgent(a.id)}/>{a.name}</label></li>)}</ul>
      {s.agents.length === 0 && <p className="fine-print">No agents loaded.</p>}
    </fieldset>
    <div className="board-panel-deps">
      <span>Departments taking part</span>
      <span className="board-chips">{d.departments.map(x => <span key={x} className="board-chip">{x} <button type="button" aria-label={`Remove ${x}`} onClick={() => controller.removeDepartment(x)}>×</button></span>)}</span>
      <form onSubmit={e => { e.preventDefault(); if (controller.addDepartment(dep)) setDep(''); }}>
        <input aria-label="Add a department" placeholder="e.g. marketing" maxLength={64} value={dep} onChange={e => setDep(e.target.value)}/>
        <button type="submit" disabled={!dep.trim()}>Add</button>
      </form>
    </div>
    <Checklist controller={controller} busy={busy}/>
    <div className="hire-actions">
      <button type="button" className="primary" disabled={busy} onClick={() => void controller.saveCard()}>Save card</button>
      <button type="button" disabled={busy} onClick={() => void controller.archiveCard()}>Archive</button>
    </div>
    <section className="board-thread" aria-label="Comments">
      <h4>Comments</h4>
      {s.commentsPhase === 'loading' && <p className="fine-print">Reading comments…</p>}
      {s.commentsPhase === 'error' && <p className="fine-print">Comments could not be read.</p>}
      <ol>{s.comments.map(c => <li key={c.id}>
        <span className="board-avatar">{c.authorKind === 'agent' ? initials(controller.agentName(c.authorId)) : 'You'}</span>
        <div><small>{c.authorKind === 'agent' ? controller.agentName(c.authorId) : 'You'} · {c.createdAt.replace('T', ' ').slice(0, 16)}</small><p>{c.body}</p></div>
      </li>)}</ol>
      <form onSubmit={e => { e.preventDefault(); void controller.addComment(comment).then(ok => { if (ok) setComment(''); }); }}>
        <textarea aria-label="Write a comment" rows={2} maxLength={4000} placeholder="Write a comment…" value={comment} disabled={busy} onChange={e => setComment(e.target.value)}/>
        <button type="submit" disabled={busy || !comment.trim()}>Comment</button>
      </form>
    </section>
  </aside>;
}

/** Board labels: tick to put them on the card; add a new label to the board. */
function LabelPicker({ controller, selected, busy }: { controller: BoardController; selected: readonly string[]; busy: boolean }) {
  const s = controller.getSnapshot();
  const [name, setName] = useState('');
  const [color, setColor] = useState<BoardColor>('blue');
  return <div className="board-panel-deps">
    <span>Labels</span>
    <span className="board-labels pick">{s.labels.map(l => <button key={l.id} type="button" className="board-label" data-color={l.color} aria-pressed={selected.includes(l.id)} disabled={busy} onClick={() => controller.toggleLabel(l.id)}>{l.name}</button>)}
      {s.labels.length === 0 && <span className="fine-print">This board has no labels yet.</span>}</span>
    <div className="board-inline">
      <input aria-label="New label name" placeholder="New label" maxLength={40} value={name} onChange={e => setName(e.target.value)}/>
      <select aria-label="New label colour" value={color} onChange={e => setColor(e.target.value as BoardColor)}>{s.colors.map(c => <option key={c} value={c}>{colorLabel[c]}</option>)}</select>
      <button type="button" disabled={busy || !name.trim()} onClick={() => void controller.addLabel(name, color).then(ok => { if (ok) setName(''); })}>Add label</button>
    </div>
  </div>;
}

/** The card's checklist with progress; items are saved one by one. */
function Checklist({ controller, busy }: { controller: BoardController; busy: boolean }) {
  const items = controller.getSnapshot().checklist;
  const [text, setText] = useState('');
  const done = items.filter(i => i.done).length;
  return <section className="board-checklist" aria-label="Checklist">
    <div className="board-checklist-head"><h4>Checklist</h4>{items.length > 0 && <span className="fine-print">{done} of {items.length}</span>}</div>
    {items.length > 0 && <progress className="company-progress" max={items.length} value={done} aria-label="Checklist progress"/>}
    <ul>{items.map(i => <li key={i.id}>
      <label className="check"><input type="checkbox" checked={i.done} disabled={busy} onChange={e => void controller.updateCheckItem(i.id, { done: e.target.checked })}/><span className={i.done ? 'board-done' : undefined}>{i.text}</span></label>
      <button type="button" className="board-ghost" aria-label={`Remove ${i.text}`} disabled={busy} onClick={() => void controller.updateCheckItem(i.id, { remove: true })}>×</button>
    </li>)}</ul>
    <form className="board-inline" onSubmit={e => { e.preventDefault(); const t = text; setText(''); void controller.addCheckItem(t).then(ok => { if (!ok) setText(cur => cur || t); }); }}>
      <input aria-label="New checklist item" placeholder="Add an item" maxLength={300} value={text} onChange={e => setText(e.target.value)}/>
      <button type="submit" disabled={!text.trim()}>Add</button>
    </form>
  </section>;
}
