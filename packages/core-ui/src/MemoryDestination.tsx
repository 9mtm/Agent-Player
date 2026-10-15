import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Locale } from './model';
import { MemoryController } from './memory';
import type { Entry, MemoryState } from './memory';
import { createFixtureMemory, fixtureContext, fixtureDrawers } from './memory-fixture';
import type { MemoryExample } from './memory-fixture';
import { memoryCatalogs } from './memory-catalogs';
import type { MemoryCatalog } from './memory-catalogs';
function EntryText({ entry, label, c }: { entry: Entry; label: string; c: MemoryCatalog }) {
  return <section className="memory-entry"><h4>{label}</h4><p>{c.type}: <bdi>{entry.type}</bdi> · {c.importance}: {entry.importance}</p><pre dir="auto">{entry.content}</pre></section>;
}
export function MemoryReview({ state, locale, canDecide = false, contract = false, onDecision }: { state: MemoryState; locale: Locale; canDecide?: boolean; contract?: boolean; onDecision?: (action: 'approve' | 'reject', reviewed: string) => void }) {
  const c = memoryCatalogs[locale]; const p = state.detail;
  const [confirmed, setConfirmed] = useState<string | null>(null);
  if (!p) return null;
  const enabled = canDecide && state.phase === 'pending' && !!state.review && confirmed === state.review;
  const metadata = [[c.id, p.id], [c.userId, p.userId], [c.agentId, p.agentId], [c.drawerId, p.drawerId], [c.createdBy, p.createdBy], [c.decidedBy, p.decidedBy], [c.importBatch, p.importBatchId], [c.source, p.source], [c.revision, String(p.baseRevision)], [c.hash, p.baseHash], ['Review SHA-256', p.reviewHash], [c.created, p.createdAt], [c.decided, p.decidedAt], [c.applied, p.appliedRevision === null ? null : String(p.appliedRevision)]];
  return <article className="memory-review" aria-labelledby="memory-detail-title">
    <h2 id="memory-detail-title">{c.detail}</h2><p className="badge">{c[p.status]}</p>
    <dl className="memory-metadata">{metadata.map(([label, value]) => value !== null && <div key={label}><dt>{label}</dt><dd><bdi dir="ltr">{value}</bdi></dd></div>)}</dl>
    <p className="muted">{c.contextNote}</p>
    {p.note !== null && <section><h3>{c.note}</h3><pre dir="auto">{p.note}</pre></section>}
    <h3>{c.reasons}</h3><ul>{p.reasons.map((reason, index) => <li key={index}><bdi>{reason}</bdi></li>)}</ul>
    <p className="muted">{c.untrusted}</p><p className="muted">{c.expiry}</p>
    <ol className="memory-changes">{p.changes.map((change, index) => <li key={index}>
      <h3>{c[change.op]} {'id' in change && <bdi dir="ltr">{change.id}</bdi>}</h3>
      <div className="memory-diff">{'before' in change && <EntryText entry={change.before} label={c.before} c={c}/>} {'after' in change && <EntryText entry={change.after} label={c.after} c={c}/>}</div>
    </li>)}</ol>
    <label className="memory-confirm"><input type="checkbox" checked={!!state.review && confirmed === state.review} disabled={!canDecide || state.phase !== 'pending'} onChange={e => setConfirmed(e.target.checked ? state.review ?? null : null)}/>{c.confirm}</label>
    <div className="actions"><button className="primary" disabled={!enabled} onClick={() => { if (state.review) { setConfirmed(null); onDecision?.('approve', state.review); } }}>{contract ? 'Approve reviewed changes' : c.approve}</button><button disabled={!enabled} onClick={() => { if (state.review) { setConfirmed(null); onDecision?.('reject', state.review); } }}>{contract ? 'Reject reviewed changes' : c.reject}</button></div>
    {!canDecide && <p>{c.disabled}</p>}
  </article>;
}
export function MemoryDestination({ locale }: { locale: Locale }) {
  const c = memoryCatalogs[locale];
  const [example, setExample] = useState<MemoryExample>('sample');
  const [controller, setController] = useState(() => new MemoryController(createFixtureMemory(), fixtureContext));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => { void controller.load(); return () => controller.invalidate(); }, [controller]);
  function selectScope(patch: Partial<typeof fixtureContext>) { controller.setContext({ ...state.context, ...patch }); void controller.load(); }
  const drawerLabels = [c.owner, c.projectAlpha, c.projectBeta, c.experience, c.task, c.people];
  return <section aria-label={c.scope} className="memory-destination">
    <p className="muted">{c.fixture}</p>
    <div className="memory-selectors">
      <label>{c.agent}<select value={state.context.agentId} onChange={e => selectScope({ agentId: e.target.value })}><option value="sample-main">{c.sampleMain}</option><option value="sample-helper">{c.sampleHelper}</option></select></label>
      <label>{c.scope}<select value={state.context.drawerId} onChange={e => selectScope({ drawerId: e.target.value })}>{fixtureDrawers.map((drawer, i) => <option key={drawer} value={drawer}>{drawerLabels[i]}</option>)}</select></label>
      <label>{c.sample}<select value={example} onChange={e => { const value = e.target.value as MemoryExample; controller.invalidate(); setExample(value); setController(new MemoryController(createFixtureMemory(value), state.context)); }}>{(['sample', 'empty', 'stale', 'expired', 'denied', 'error'] as const).map(key => <option key={key} value={key}>{c[key]}</option>)}</select></label>
    </div>
    <p className="muted">{c.isolation}</p>
    <p role="status" aria-live="polite" className={state.phase === 'error' || state.phase === 'denied' ? 'error' : ''}>{c[state.phase]}</p>
    <button disabled={state.phase === 'loading' || state.phase === 'deciding'} onClick={() => void controller.load()}>{c.refresh}</button>
    <div className="memory-panes">
      <section aria-labelledby="memory-queue"><h2 id="memory-queue">{c.queue}</h2><p className="muted">{c.queueLimit}</p>
        <ul className="memory-queue">{state.proposals.map(p => <li key={p.id}><button disabled={state.phase === 'deciding'} aria-pressed={state.detail?.id === p.id} onClick={() => void controller.open(p.id)}><span>{c.open}</span><bdi dir="ltr">{p.id}</bdi><span>{c[p.status]}</span></button></li>)}</ul>
        {state.phase === 'ready' && !state.proposals.length && <p>{c.noProposals}</p>}
        {state.drawer && <details><summary>{c.drawerContent}</summary><p>{c.revision}: {state.drawer.revision}</p><pre dir="auto">{state.drawer.content}</pre></details>}
      </section>
      <MemoryReview key={state.review ?? state.phase} state={state} locale={locale} canDecide={controller.adapter.mode === 'fixture' && !!controller.adapter.decide} onDecision={(action, reviewed) => void controller.decide(action, reviewed)}/>
    </div><p className="muted">{c.maintenance}</p>
  </section>;
}
