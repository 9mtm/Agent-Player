import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { bindMemorySession } from './session';
import type { SessionClient } from './session';
import { createMemoryAdapter, MemoryController, validDrawer } from './memory';
import { AgentsController } from './agents';
import { MemoryReview } from './MemoryDestination';

/** Sign-out on all devices behind an explicit confirmation. */
export function AccountPanel({ client }: { client: SessionClient }) {
  const state = client.getSnapshot();
  const [confirm, setConfirm] = useState(false);
  return <section className="panel" aria-label="Account"><h2>Account</h2>
    <p>Signed in as <bdi>{state.user!.username}</bdi> · {state.user!.role}</p>
    <label className="check"><input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)}/>Sign out on all devices. This revokes every session for this account.</label>
    <button disabled={!confirm} onClick={() => void client.logoutAllDevices()}>Sign out on all devices</button>
  </section>;
}
/** Readable status for each memory review phase. */
const memoryLabel: Record<string, string> = {
  idle: 'Choose an agent and drawer, then read', loading: 'Reading memory…', ready: 'Ready', deciding: 'Recording your decision…',
  rejected: 'Rejected', denied: 'Access denied', error: 'Something went wrong', stale: 'Changed elsewhere — read again',
  pending: 'Waiting for your review', expired: 'Session expired — sign in again', unavailable: 'Memory service unavailable', unknown: 'Outcome unknown — read again',
};
type DrawerKind = 'owner' | 'experience' | 'project' | 'task' | 'people';
const drawerTabs: readonly { kind: DrawerKind; label: string; help: string }[] = [
  { kind: 'owner', label: 'About you', help: 'What the agent knows about you: preferences, identity, how you like to work.' },
  { kind: 'experience', label: 'Lessons', help: 'What the agent learned from past work.' },
  { kind: 'project', label: 'Project', help: 'Memory for one project (lowercase name, e.g. website).' },
  { kind: 'task', label: 'Task', help: 'Memory for one task, by its ID.' },
  { kind: 'people', label: 'Person', help: 'What the agent knows about one person, by their ID.' },
];
/** Drawer ID for a tab and key, or '' when the key is missing or invalid. */
export function drawerId(kind: DrawerKind, key: string): string {
  if (kind === 'owner' || kind === 'experience') return kind;
  const id = `${kind}:${key.trim()}`;
  return key.trim() && validDrawer(id) ? id : '';
}
export function MemoryPanel({ client }: { client: SessionClient }) {
  const state = client.getSnapshot();
  const [agent, setAgent] = useState(state.mode === 'mock' ? 'sample-main' : '');
  const [kind, setKind] = useState<DrawerKind>('owner'); const [key, setKey] = useState('');
  const [team, setTeam] = useState<AgentsController>();
  useEffect(() => { const c = new AgentsController(client); setTeam(c); return () => c.dispose(); }, [client]);
  const controller = useMemo(() => new MemoryController(createMemoryAdapter(client.request, c => { const current = client.getSnapshot(); return current.phase === 'authenticated' && current.user?.role === 'owner' && current.user.id === c.userId && String(current.epoch) === c.session; }), {
    userId: state.user!.id, agentId: '', drawerId: 'owner', access: state.user!.role === 'owner' ? 'owner' : 'denied', session: String(state.epoch),
  }), [client, state.epoch, state.user]);
  const memory = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => bindMemorySession(client, controller), [client, controller]);
  const drawer = drawerId(kind, key);
  const busy = memory.phase === 'loading' || memory.phase === 'deciding';
  const owner = state.user!.role === 'owner';
  const tab = drawerTabs.find(t => t.kind === kind)!;
  const pick = (patch: () => void) => { patch(); controller.invalidate(); };
  return <section className="panel memory-page" aria-label="Memory review">
    <h2>Memory</h2>
    <p>What each agent remembers, and the changes it asks you to approve. Nothing is read until you pick an agent and press Read. Memory review is owner-only.{state.mode === 'mock' ? ' Offline practice: fictional memory only.' : ''}</p>

    <div className="memory-pick">
      <h3>Agent</h3>
      {team && <MemoryAgentPicker controller={team} value={agent} onPick={id => pick(() => setAgent(id))}/>}
      <details className="memory-manual"><summary>Use an agent ID</summary>
        <label>Agent ID<input value={agent} onChange={e => pick(() => setAgent(e.target.value))}/></label>
      </details>

      <h3>Drawer</h3>
      <div className="memory-tabs" role="tablist" aria-label="Memory drawers">{drawerTabs.map(t =>
        <button key={t.kind} type="button" role="tab" aria-selected={kind === t.kind} onClick={() => pick(() => setKind(t.kind))}>{t.label}</button>)}
      </div>
      <p className="fine-print">{tab.help}</p>
      {kind !== 'owner' && kind !== 'experience' && <label>{tab.label} {kind === 'project' ? 'name' : 'ID'}<input value={key} maxLength={128} onChange={e => pick(() => setKey(e.target.value))}/></label>}

      <div className="hire-actions">
        <button className="primary" disabled={!owner || !agent || !drawer || busy} onClick={() => { controller.setContext({ ...memory.context, agentId: agent, drawerId: drawer }); void controller.load(); }}>Read memory</button>
      </div>
    </div>

    <p role="status">{memory.unknownOutcome ? 'Decision outcome unknown. Reading again shows the current state only; it does not prove this request ran. No duplicate write is allowed here.' : memory.phase === 'accepted' ? (state.mode === 'mock' ? 'Fictional mock approval confirmed.' : 'Approval response confirmed.') : memoryLabel[memory.phase] ?? memory.phase}</p>
    {memory.decisionNotice && <p role="status">{memory.decisionNotice}: Consent cleared. Open the details again and review before any new decision.</p>}

    {(memory.drawer || memory.proposals.length > 0 || memory.phase === 'ready') && <div className="memory-columns">
      <section aria-label="Waiting for your review" className="memory-card">
        <h3>Waiting for your review</h3>
        {memory.proposals.length === 0 ? <p className="fine-print">No changes waiting.</p>
          : <ul className="memory-list">{memory.proposals.map(p => <li key={p.id}>
            <button type="button" aria-pressed={memory.detail?.id === p.id} disabled={memory.phase === 'deciding'} onClick={() => void controller.open(p.id)}>
              <span className="memory-list-main"><span>{sourceLabel[p.source] ?? p.source}</span><span className="badge">{p.status}</span></span>
              <bdi className="memory-list-id">{p.id}</bdi>
            </button>
          </li>)}</ul>}
      </section>
      <section aria-label="Stored memory" className="memory-card">
        <h3>Stored memory</h3>
        {memory.drawer ? <>
          <p className="fine-print">{memory.drawer.count} entr{memory.drawer.count === 1 ? 'y' : 'ies'} · revision {memory.drawer.revision}</p>
          {memory.drawer.count === 0 ? <p className="fine-print">Nothing stored in this drawer yet.</p> : <pre dir="auto">{readableDrawer(memory.drawer.content)}</pre>}
        </> : <p className="fine-print">Nothing stored in this drawer yet.</p>}
      </section>
    </div>}

    <MemoryReview key={memory.review ?? memory.phase} state={memory} locale="en" contract canDecide={!!controller.adapter.decide} onDecision={(action, reviewed) => void controller.decide(action, reviewed)}/>
  </section>;
}
/** The drawer text without the generated file header comments (display only). */
export function readableDrawer(content: string): string {
  return content.replace(/<!--[\s\S]*?-->[ \t]*\n?/g, '').replace(/^\s+/, '');
}
const sourceLabel: Record<string, string> = { file: 'Edited file', upload: 'Upload', learning: 'Learned', agent: 'Agent proposal', import: 'Import' };

/** Pick an agent from the team (an explicit read; nothing loads on its own). */
function MemoryAgentPicker({ controller, value, onPick }: { controller: AgentsController; value: string; onPick: (id: string) => void }) {
  const s = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const busy = s.phase === 'listing';
  if (!s.agents.length) return <div className="hire-actions"><button type="button" disabled={busy} onClick={() => void controller.list()}>{busy ? 'Loading the team…' : 'Load team'}</button></div>;
  return <ul className="team-grid memory-agents" aria-label="Agents">{s.agents.map(a =>
    <li key={a.id}><button type="button" className="team-card" aria-pressed={value === a.id} onClick={() => onPick(a.id)}>
      <span className="team-avatar" aria-hidden="true">{(a.name ?? '?').trim().slice(0, 1).toUpperCase() || '?'}</span>
      <span className="team-text"><bdi className="team-name">{a.name ?? 'Name unavailable'}</bdi><bdi className="team-id">{a.id}</bdi></span>
    </button></li>)}
  </ul>;
}
