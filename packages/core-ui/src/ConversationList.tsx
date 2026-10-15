import { useState, useSyncExternalStore } from 'react';
import type { ConversationsController, Conversation } from './conversations';
import { UiIcon } from './ui-icons';

/** Rows shown before the list offers a filter box. */
export const FILTER_AFTER = 8;

/**
 * Saved conversations in the sidebar: pinned first, then recent. Each row
 * opens its conversation; hover shows pin and a small menu (rename,
 * delete with a confirm step). The running conversation carries a dot.
 */
export function ConversationList({ controller, onOpen }: { controller: ConversationsController; onOpen: () => void }) {
  const s = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const inProject = s.projectFilter ? s.conversations.filter(c => c.projectId === s.projectFilter) : s.conversations;
  const rows = q ? inProject.filter(c => (c.title ?? '').toLowerCase().includes(q) || c.preview.toLowerCase().includes(q)) : inProject;
  const pinned = rows.filter(c => c.pinned), recent = rows.filter(c => !c.pinned);
  const picker = <ProjectPicker controller={controller}/>;
  if (s.listPhase === 'loading' && !s.conversations.length) return <p className="session-empty">Loading conversations…</p>;
  if (s.listPhase === 'error' && !s.conversations.length) return <p className="session-empty">Conversations could not be loaded. <button type="button" className="link-button" onClick={() => void controller.load()}>Try again</button></p>;
  if (!s.conversations.length) return <div className="conversations">{picker}<p className="session-empty">No conversations yet. Your chats are saved here.</p></div>;
  const row = (c: Conversation) => <Row key={c.id} c={c} active={c.id === s.activeId} running={c.id === s.activeId && !!s.runId}
    onOpen={() => { void controller.open(c.id); onOpen(); }} controller={controller}/>;
  return <div className="conversations">
    {picker}
    {s.conversations.length > FILTER_AFTER && <input className="conversation-filter" type="search" placeholder="Filter conversations" aria-label="Filter conversations" value={query} onChange={e => setQuery(e.target.value)}/>}
    {pinned.length > 0 && <><p className="conversation-group">Pinned</p>{pinned.map(row)}</>}
    {recent.length > 0 && <>{pinned.length > 0 && <p className="conversation-group">Recent</p>}{recent.map(row)}</>}
    {rows.length === 0 && <p className="session-empty">{q ? 'No match.' : 'No conversations in this project yet.'}</p>}
  </div>;
}

function Row({ c, active, running, onOpen, controller }: { c: Conversation; active: boolean; running: boolean; onOpen: () => void; controller: ConversationsController }) {
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [name, setName] = useState(c.title ?? '');
  const title = c.title || c.preview || 'New chat';
  if (renaming) return <form className="session-row editing" onSubmit={e => { e.preventDefault(); void controller.rename(c.id, name); setRenaming(false); }}>
    <input autoFocus aria-label="Conversation name" value={name} maxLength={120} onChange={e => setName(e.target.value)}
      onBlur={() => setRenaming(false)} onKeyDown={e => { if (e.key === 'Escape') setRenaming(false); }}/>
  </form>;
  return <div className="session-row" aria-current={active ? 'true' : undefined} data-menu={menu || confirm || undefined}>
    <button type="button" className="session-open" onClick={onOpen} title={title}>
      <span className="dot" data-running={running || undefined} aria-hidden="true"/>
      <span className="session-title" dir="auto">{title}</span>
    </button>
    {confirm
      ? <span className="session-confirm">Delete?
        <button type="button" className="link-button danger" onClick={() => { setConfirm(false); void controller.remove(c.id); }}>Yes</button>
        <button type="button" className="link-button" onClick={() => setConfirm(false)}>No</button></span>
      : <span className="session-actions">
        <button type="button" className="row-tool" aria-label={c.pinned ? 'Unpin' : 'Pin'} aria-pressed={c.pinned} onClick={() => void controller.pin(c.id, !c.pinned)}><UiIcon name="pin" size={12}/></button>
        <button type="button" className="row-tool" aria-label="More" aria-expanded={menu} onClick={() => setMenu(v => !v)}><UiIcon name="more" size={12}/></button>
      </span>}
    {menu && <div className="row-menu" role="menu" onMouseLeave={() => setMenu(false)}>
      <button type="button" role="menuitem" onClick={() => { setMenu(false); setName(c.title ?? ''); setRenaming(true); }}>Rename</button>
      {controller.getSnapshot().projects.length > 0 && <label className="row-menu-select"><span>Project</span>
        <select value={c.projectId ?? ''} onChange={e => { setMenu(false); void controller.moveToProject(c.id, e.target.value); }}>
          <option value="">No project</option>
          {controller.getSnapshot().projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select></label>}
      <button type="button" role="menuitem" className="danger" onClick={() => { setMenu(false); setConfirm(true); }}>Delete</button>
    </div>}
  </div>;
}

/** Project switcher above the conversations, with a small form for a new project. */
function ProjectPicker({ controller }: { controller: ConversationsController }) {
  const s = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', folder: '', repoUrl: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (s.access === 'denied') return null;
  if (adding) return <form className="project-form" onSubmit={async e => {
    e.preventDefault(); setBusy(true); const err = await controller.createProject(form); setBusy(false);
    if (err) setError(err); else { setAdding(false); setForm({ name: '', folder: '', repoUrl: '' }); setError(null); }
  }}>
    <input autoFocus placeholder="Project name" aria-label="Project name" value={form.name} maxLength={80} onChange={e => setForm({ ...form, name: e.target.value })}/>
    <input placeholder="Folder, e.g. ~/Projects/app" aria-label="Project folder" value={form.folder} onChange={e => setForm({ ...form, folder: e.target.value })} dir="ltr"/>
    <input placeholder="Git repo (optional)" aria-label="Git repository" value={form.repoUrl} onChange={e => setForm({ ...form, repoUrl: e.target.value })} dir="ltr"/>
    {error && <p className="project-error" role="alert">{error}</p>}
    <div className="project-form-actions">
      <button type="submit" className="link-button" disabled={busy || !form.name.trim()}>Create</button>
      <button type="button" className="link-button" onClick={() => { setAdding(false); setError(null); }}>Cancel</button>
    </div>
  </form>;
  return <div className="project-picker">
    <select aria-label="Project" value={s.projectFilter} onChange={e => { if (e.target.value === '__new') setAdding(true); else { controller.filterProject(e.target.value); controller.newChat(); } }}>
      <option value="">All chats</option>
      {s.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      <option value="__new">+ New project…</option>
    </select>
  </div>;
}
