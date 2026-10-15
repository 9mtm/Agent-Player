import { useEffect, useState, useSyncExternalStore } from 'react';
import { AgentCardController, TOOL_GROUPS, readable, toolGroup } from './agent-card';
import { CATEGORY } from './AgentCard';
import { permissionCategories, riskyCategories } from './hire-contract.js';
import type { SessionClient } from './session';
import { UiIcon } from './ui-icons';

/**
 * The chat's agent at a glance: its tools grouped by kind (connectors too),
 * what it may do on its own, and the memory it can read. Every switch saves
 * to the agent right away; risky "allow" asks for a second click.
 */
export function AgentPanel({ client, agentId }: { client: SessionClient; agentId: string }) {
  const [card, setCard] = useState<AgentCardController | null>(null);
  useEffect(() => {
    if (!agentId) { setCard(null); return; }
    const c = new AgentCardController(client, agentId, 'memory'); setCard(c); void c.load();
    return () => c.dispose();
  }, [client, agentId]);
  if (!card) return null;
  return <AgentPanelBody card={card}/>;
}

export function AgentPanelBody({ card }: { card: AgentCardController }) {
  const s = useSyncExternalStore(card.subscribe, card.getSnapshot, card.getSnapshot);
  const [open, setOpen] = useState<string | null>(null);
  const [risky, setRisky] = useState(false);
  if (s.phase === 'error') return <section className="panel-card"><h3>Agent</h3><p className="muted">{s.notice ?? 'The agent could not be loaded.'}</p></section>;
  const g = s.grants, granted = new Set(s.grantDraft ?? []), perms = s.permissionDraft;
  const save = async () => { if (card.riskyAllowed()) { setRisky(true); return; } await card.savePermissions(); };
  const groups = TOOL_GROUPS.map(name => ({ name, tools: (g?.available ?? []).filter(t => toolGroup(t.name) === name) })).filter(x => x.tools.length || x.name === 'Connectors');
  const on = (g?.available ?? []).filter(t => granted.has(t.name)).length;
  const memories = s.memories?.filter(m => readable(m, perms)).length;
  const busy = s.phase === 'saving' || s.phase === 'loading';
  return <>
    <section className="panel-card" aria-label="Skills and tools">
      <h3>Skills and tools <span className="panel-count">{g ? `${on} of ${g.available.length} on` : ''}</span></h3>
      {!g ? <p className="muted">Loading…</p> : <ul className="panel-groups">{groups.map(({ name, tools }) => {
        const n = tools.filter(t => granted.has(t.name)).length;
        const allowed = tools.filter(t => t.allowedByServer);
        if (name === 'Connectors' && !tools.length) return <li key={name} className="panel-group"><span className="panel-group-name"><UiIcon name="globe" size={12}/>Connectors</span><span className="muted">none added yet</span></li>;
        return <li key={name} className="panel-group" data-open={open === name || undefined}>
          <button type="button" className="panel-group-name" aria-expanded={open === name} onClick={() => setOpen(open === name ? null : name)}>{name}<span className="muted">{n}/{tools.length}</span></button>
          <label className="switch" title={n ? `Turn ${name.toLowerCase()} off` : `Turn ${name.toLowerCase()} on`}>
            <input type="checkbox" checked={n > 0} disabled={busy || !allowed.length} aria-label={`${name} tools`}
              onChange={e => { card.setTools(tools.map(t => t.name), e.target.checked); void save(); }}/><span aria-hidden="true"/></label>
          {open === name && <ul className="panel-tools">{tools.map(t => <li key={t.name}>
            <label title={t.description}><input type="checkbox" checked={granted.has(t.name)} disabled={busy || (!t.allowedByServer && !granted.has(t.name))}
              onChange={() => { card.toggleTool(t.name); void save(); }}/><span dir="ltr">{t.name.replace(/^mcp:/, '')}</span>{t.requiresApproval && <small className="muted">asks first</small>}</label></li>)}</ul>}
        </li>;
      })}</ul>}
    </section>
    <section className="panel-card" aria-label="What the agent may do">
      <h3>Permissions</h3>
      {!perms ? <p className="muted">Loading…</p> : <ul className="panel-modes">{permissionCategories.map(c => <li key={c}>
        <span>{CATEGORY[c] ?? c}</span>
        <select aria-label={CATEGORY[c] ?? c} value={perms.modes[c] ?? 'ask'} disabled={busy} data-mode={perms.modes[c] ?? 'ask'}
          onChange={e => { card.setMode(c, e.target.value); void save(); }}>
          <option value="off">Off</option><option value="ask">Ask me</option><option value="allow">Allowed</option>
        </select></li>)}</ul>}
      {risky && <p className="panel-confirm" role="alert">Allow {riskyCategories.filter(c => perms?.modes[c] === 'allow').map(c => (CATEGORY[c] ?? c).toLowerCase()).join(', ')} without asking?
        <button type="button" className="link-button danger" onClick={() => { setRisky(false); void card.savePermissions(true); }}>Yes, allow</button>
        <button type="button" className="link-button" onClick={() => { setRisky(false); void card.load(); }}>Cancel</button></p>}
    </section>
    <section className="panel-card" aria-label="Agent memory">
      <h3>Memory</h3>
      {!perms ? <p className="muted">Loading…</p> : <>
        <p className="panel-memory">{memories === undefined ? '…' : memories} {memories === 1 ? 'memory' : 'memories'} it can read</p>
        <p className="muted">Reads {perms.memoryRead.join(', ') || 'nothing'} · writes {perms.memoryWrite.join(', ') || 'nothing'}{perms.sharedMemory ? ' · shares with the team' : ''}</p>
      </>}
    </section>
    {(s.saved || (s.notice && s.phase !== 'loading')) && <p className={s.notice ? 'panel-notice error' : 'panel-notice'} role="status">{s.notice ?? s.saved}</p>}
  </>;
}
