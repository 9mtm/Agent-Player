import { ChatDestination } from './ChatDestination';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { SessionClient, bindMemorySession } from './session';
import { createLoginMock } from './session-mock';
import { AgentsDestination } from './AgentsDestination';
import { createMemoryAdapter, MemoryController } from './memory';
import { MemoryReview } from './MemoryDestination';

import { retryAfterNotice } from './retry-after.js';
import { devQuickLoginAccounts } from './dev-quick-login';

const notices = {
  published_password: 'Sign-in refused because the password is a published default. Reset it from the CLI.',
  account_inactive: 'This account is unavailable for sign-in. Ask the installation owner to review its status.',
  rate_limited: 'Request rate limit reached. Try again later; no retry was sent.',
  origin_not_allowed: 'The installation refused this application origin. Its connection configuration needs review.',
  host_not_allowed: 'The installation refused this host. Its connection configuration needs review.',

  invalid: 'Sign-in refused. Check your credentials.', denied: 'Account access denied.', limited: 'Too many attempts. Try again later.',
  unavailable: 'Request unavailable. No automatic retry was sent.', expired: 'Session expired or revoked. Sign in again.',
  'logout-confirmed': 'Server confirmed sign-out on all devices.', 'logout-unknown': 'Local session cleared. Server sign-out on other devices is unconfirmed. No retry was sent.',
};
export function AuthBoundary({ client: supplied, children }: { client?: SessionClient; children: ReactNode }) {
  const fallback = useMemo(() => supplied ? undefined : new SessionClient({ mock: createLoginMock() }), [supplied]);
  const client = supplied ?? fallback!;
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot);
  useEffect(() => () => client.cancel(), [client]);
  return <div className="auth-boundary">
    <section className="auth-controls" aria-label="Session mode" lang="en" dir="ltr">
      <strong>{state.mode === 'fixture' ? 'Fixture workspace — fictional data' : state.mode === 'mock' ? 'Offline login mock — fictional identity, no network' : 'Live session — explicitly enabled deployment'}</strong>
      {state.mode === 'fixture' ? <>
        {client.canUse('mock') && <button onClick={() => client.selectMode('mock')}>Open offline login mock</button>}
        {client.canUse('live') && <button onClick={() => client.selectMode('live')}>Use live sign-in</button>}
      </> : <button disabled={state.phase === 'signing-out'} onClick={() => client.selectMode('fixture')}>Return to fixture (local session cleared)</button>}
      <span>Authentication copy: English draft.</span>
    </section>
    {state.mode === 'fixture' ? children : <SessionWorkspace key={`${state.mode}:${state.epoch}`} client={client}/>}
  </div>;
}
function SessionWorkspace({ client }: { client: SessionClient }) {
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(false);
  return <main className="auth-workspace" lang="en" dir="ltr">
    <h1>Agent Player · {state.mode === 'mock' ? 'Offline login exercise' : 'Account'}</h1>
    {state.notice && <p role="status">{notices[state.notice]}{retryAfterNotice(state.retryAfterSeconds)}</p>}
    {state.phase === 'authenticated' && state.user ? <>
      <p>Signed in as <bdi>{state.user.username}</bdi> · {state.user.role}</p>
      <label><input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)}/>Sign out on all devices. This revokes every session for this account.</label>
      <button disabled={!confirm} onClick={() => void client.logoutAllDevices()}>Sign out on all devices</button>
      <ProtectedTools client={client}/>
    </> : state.phase === 'signing-out' ? <><p role="status">Signing out on all devices…</p><button onClick={() => client.cancel()}>Clear locally; server outcome remains unknown</button></> : state.phase === 'signed-out' && state.setup !== 'login' ? <section aria-label="Setup discovery">
      <p role="status">{state.setup === 'checking' ? 'Checking installation setup…' : state.setup === 'required'
        ? 'Installation reports: Setup not finished — finish it from the CLI on the installation computer, then check again. This screen cannot create an owner.'
        : state.setup === 'unavailable' ? 'Setup status unavailable. Sign-in is withheld; no automatic retry was sent.'
        : 'Check installation setup before signing in. No request has been sent automatically.'}</p>
      <p>Discovery does not verify an account, installation identity, or system readiness.</p>
      {state.setup === 'checking' ? <button onClick={() => client.cancel()}>Cancel setup check</button>
        : <button onClick={() => void client.discoverSetup()}>{state.setup ? 'Check setup again' : 'Check setup status'}</button>}
    </section> : <form method="post" onSubmit={e => {
      e.preventDefault(); const submittedPassword = password; setPassword(''); void client.login(email, submittedPassword);
    }}>
      {state.setup === 'login' && <p>Setup reports complete. Sign in to verify your account.</p>}
      {state.mode === 'mock' && <p>Fictional credentials only: demo@example.invalid / mock-only. Never enter a real password here.</p>}
      <label htmlFor="auth-email">Email</label><input id="auth-email" type="email" name={state.mode === 'live' ? 'username' : undefined} autoComplete={state.mode === 'live' ? 'username' : 'off'} required value={email} onChange={e => setEmail(e.target.value)} disabled={state.phase === 'signing-in'}/>
      <label htmlFor="auth-password">Password</label><input id="auth-password" type="password" name={state.mode === 'live' ? 'password' : undefined} autoComplete={state.mode === 'live' ? 'current-password' : 'off'} required value={password} onChange={e => setPassword(e.target.value)} disabled={state.phase === 'signing-in'}/>
      {state.mode === 'live' && <DevQuickLogin disabled={state.phase === 'signing-in'} onFill={(a) => { setEmail(a.email); setPassword(a.password); }}/>}
      <button className="primary" disabled={state.phase === 'signing-in'}>Sign in</button>
      {state.phase === 'signing-in' && <button type="button" onClick={() => client.cancel()}>Cancel sign-in</button>}
    </form>}
    <p>Settings credentials remain masked-only; no credential values are fetched.</p>
  </main>;
}
/** Local test accounts (dev-quick-login.ts): fills the form only; local builds on a loopback host only. */
function DevQuickLogin({ disabled, onFill, hostname }: { disabled: boolean; onFill: (a: { email: string; password: string }) => void; hostname?: string }) {
  const host = hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  const accounts = devQuickLoginAccounts(host);
  if (accounts.length === 0) return null;
  return <fieldset className="dev-quick-login" aria-label="Development quick sign-in">
    <legend>Development quick sign-in — local test accounts only</legend>
    {accounts.map(a => <button key={a.email} type="button" disabled={disabled} onClick={() => onFill(a)}>Fill {a.label}</button>)}
  </fieldset>;
}
export { DevQuickLogin };
function ProtectedTools({ client }: { client: SessionClient }) {
  const state = client.getSnapshot();
  const [agent, setAgent] = useState(state.mode === 'mock' ? 'sample-main' : ''); const [drawer, setDrawer] = useState('owner');
  const controller = useMemo(() => new MemoryController(createMemoryAdapter(client.request, c => { const current = client.getSnapshot(); return current.phase === 'authenticated' && current.user?.role === 'owner' && current.user.id === c.userId && String(current.epoch) === c.session; }), {
    userId: state.user!.id, agentId: '', drawerId: 'owner', access: state.user!.role === 'owner' ? 'owner' : 'denied', session: String(state.epoch),
  }), [client, state.epoch, state.user]);
  const memory = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => bindMemorySession(client, controller), [client, controller]);
  return <>
    <ChatDestination client={client}/>
    <AgentsDestination client={client}/>
    <section aria-label="Memory review"><h2>Memory review</h2>
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
