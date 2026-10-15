import { useState, useSyncExternalStore } from 'react';
import type { DragEvent } from 'react';
import { allPriorities, cardsIn, matches, priorityLabel } from './board';
import type { BoardController, Card, Column } from './board';
import { Icon } from './icons';

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(w => w.slice(0, 1).toUpperCase()).join('') || '?';
const DRAG_TYPE = 'application/x-dpro-card';

/** The company task board: columns of cards, drag to move, a side panel to edit and comment. */
export function TaskBoard({ controller }: { controller: BoardController }) {
  const s = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [newColumn, setNewColumn] = useState('');
  const busy = s.phase === 'loading' || s.phase === 'saving';
  const departments = [...new Set(s.cards.flatMap(c => c.departments))].sort();
  const openCard = s.cards.find(c => c.id === s.open);
  const visible = s.cards.filter(c => matches(c, s.filter)).length;

  return <section aria-label="Task board" className="board">
    <div className="board-head">
      <div>
        <h2>{s.name ?? 'Task board'}</h2>
        <p className="fine-print">Plan the company's work: cards move from left to right, each with the agents and departments working on it.</p>
      </div>
      {s.boardId && <form className="board-add-column" onSubmit={e => { e.preventDefault(); void controller.addColumn(newColumn).then(ok => { if (ok) setNewColumn(''); }); }}>
        <input aria-label="New column name" placeholder="New column" maxLength={60} value={newColumn} disabled={busy} onChange={e => setNewColumn(e.target.value)}/>
        <button type="submit" disabled={busy || !newColumn.trim()}>Add column</button>
      </form>}
    </div>
    {(s.notice || s.phase === 'loading') && <p role="status" className="board-notice">{s.notice ?? 'Reading the board…'}</p>}
    {!s.boardId
      ? <div className="hire-actions"><button type="button" className="primary" disabled={busy || !s.owner} onClick={() => void controller.load()}>Open the board</button></div>
      : <>
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
        <div className="board-columns">
          {s.columns.map(col => <BoardColumn key={col.id} col={col} controller={controller} busy={busy}/>)}
        </div>
      </>}
    {openCard && s.draft && <CardPanel card={openCard} controller={controller} busy={busy}/>}
  </section>;
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
    <button type="button" className="board-card-open" onClick={() => void controller.openCard(card.id)} aria-label={`Open card ${card.title}`}>
      {card.departments.length > 0 && <span className="board-chips">{card.departments.map(d => <span key={d} className="board-chip">{d}</span>)}</span>}
      <span className="board-card-title">{card.title}</span>
      <span className="board-card-meta">
        {card.priority !== 'normal' && <span className={`board-priority p-${card.priority}`}>{priorityLabel[card.priority]}</span>}
        {card.dueDate && <span className={overdue ? 'board-due overdue' : 'board-due'}>Due {card.dueDate}</span>}
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
