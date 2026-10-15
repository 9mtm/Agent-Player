import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { bindMemorySession } from './session';
import type { SessionClient } from './session';
import { createMemoryAdapter, MemoryController } from './memory';
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
export function MemoryPanel({ client }: { client: SessionClient }) {
  const state = client.getSnapshot();
  const [agent, setAgent] = useState(state.mode === 'mock' ? 'sample-main' : ''); const [drawer, setDrawer] = useState('owner');
  const controller = useMemo(() => new MemoryController(createMemoryAdapter(client.request, c => { const current = client.getSnapshot(); return current.phase === 'authenticated' && current.user?.role === 'owner' && current.user.id === c.userId && String(current.epoch) === c.session; }), {
    userId: state.user!.id, agentId: '', drawerId: 'owner', access: state.user!.role === 'owner' ? 'owner' : 'denied', session: String(state.epoch),
  }), [client, state.epoch, state.user]);
  const memory = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => bindMemorySession(client, controller), [client, controller]);
  return <>
    <section className="panel" aria-label="Memory review"><h2>Memory review</h2>
      <p>Supply an existing agent ID and drawer. No automatic private requests. The queue is capped at 200 pending owner records. Open full details and confirm before deciding. Offline mock decisions affect fictional memory only.</p>
      <label>Agent ID<input value={agent} onChange={e => { setAgent(e.target.value); controller.invalidate(); }}/></label>
      <label>Drawer ID<input value={drawer} onChange={e => { setDrawer(e.target.value); controller.invalidate(); }}/></label>
      <button disabled={state.user!.role !== 'owner' || !agent || memory.phase === 'loading' || memory.phase === 'deciding'} onClick={() => { controller.setContext({ ...memory.context, agentId: agent, drawerId: drawer }); void controller.load(); }}>Read selected memory</button>
      <p role="status">{memory.unknownOutcome ? 'Decision outcome unknown. GET shows current state only; it does not prove this request executed. No duplicate write is allowed here.' : memory.phase === 'accepted' ? (state.mode === 'mock' ? 'Fictional mock approval confirmed.' : 'Approval response confirmed.') : memory.phase}</p>
      {memory.decisionNotice && <p role="status">{memory.decisionNotice}: Consent cleared. Open full details again and review before any new decision.</p>}
      {memory.drawer && <pre>{memory.drawer.content}</pre>}
      {memory.proposals.map(p => <button key={p.id} onClick={() => void controller.open(p.id)}>{p.id}</button>)}
      <MemoryReview key={memory.review ?? memory.phase} state={memory} locale="en" contract canDecide={!!controller.adapter.decide} onDecision={(action, reviewed) => void controller.decide(action, reviewed)}/>
    </section>
  </>;
}
