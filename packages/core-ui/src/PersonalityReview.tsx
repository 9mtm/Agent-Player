import { useEffect, useSyncExternalStore } from 'react';
import { traitNames } from './personality-contract.js';
import type { PersonalityController } from './personality';

/** Readable status for each personality review phase. */
const personalityLabel: Record<string, string> = {
  idle: 'Select an agent to see its proposals', loading: 'Loading proposals…', ready: 'Ready', deciding: 'Recording your decision…',
  denied: 'Access denied', error: 'Something went wrong', conflict: 'Changed elsewhere — reload', unknown: 'Outcome unknown — reload',
  approved: 'Approved', rejected: 'Rejected',
};
const STATUS: Record<string, string> = { pending: 'Waiting for you', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled', stale: 'Out of date', expired: 'Expired' };

/**
 * Persona changes an agent suggests about itself (small trait steps). The
 * owner approves or rejects each one; approving never grants tools or
 * permissions. Loads by itself when the card opens.
 */
export function PersonalityReview({ controller }: { controller: PersonalityController }) {
  const s = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const p = s.detail, busy = s.phase === 'loading' || s.phase === 'deciding';
  const canDecide = s.owner && s.phase === 'ready' && p?.status === 'pending' && s.consent;
  useEffect(() => { if (s.owner && s.agentId && s.phase === 'idle') void controller.list(); }, [controller, s.owner, s.agentId, s.phase]);
  if (!s.owner) return null;
  const changed = p ? traitNames.filter(n => p.delta[n] !== undefined && p.delta[n] !== 0) : [];
  return <section aria-label="Suggested persona changes">
    <h3>Suggested persona changes</h3>
    <p className="fine-print">The agent may suggest small changes to its own traits. Nothing changes until you approve, and a persona never grants tools or permissions.</p>
    {(s.notice || ['loading', 'error', 'denied', 'conflict', 'unknown'].includes(s.phase)) && <p role="status">{s.notice ?? personalityLabel[s.phase] ?? s.phase}
      {['error', 'conflict', 'unknown'].includes(s.phase) && <> <button type="button" className="link-button" onClick={() => void controller.list()}>Reload</button></>}</p>}
    {s.phase === 'ready' && !s.proposals.length && <p className="fine-print">No suggestions from this agent.</p>}
    {s.proposals.length > 0 && <ul className="persona-suggestions">{s.proposals.map((item, i) => <li key={item.id}>
      <button type="button" disabled={busy} aria-pressed={p?.id === item.id} onClick={() => void controller.open(item.id)}>Suggestion {s.proposals.length - i} · {STATUS[item.status] ?? item.status}</button></li>)}</ul>}
    {p && <article aria-label="Suggested persona change">
      <h4>Reason</h4><p className="personality-copy">{p.reason}</p>
      <table className="persona-delta"><caption>{changed.length ? `All traits (0–100); ${changed.length} would change` : 'All traits (0–100); none would change'}</caption><thead><tr><th>Trait</th><th>Now</th><th>Suggested</th><th>Change</th></tr></thead>
        <tbody>{traitNames.map(n => <tr key={n} data-changed={changed.includes(n) || undefined}><th scope="row">{n}</th><td>{p.baseTraits[n]}</td><td>{p.proposedTraits[n]}</td><td>{p.delta[n] === undefined || p.delta[n] === 0 ? '—' : `${p.delta[n]! > 0 ? '+' : ''}${p.delta[n]}`}</td></tr>)}</tbody></table>
      {p.evidence.length > 0 && <><h4>What it noticed</h4><ul>{p.evidence.map((e, i) => <li className="personality-copy" key={i}><bdi>{e}</bdi></li>)}</ul>
        <p className="fine-print">Written by the agent: information only.</p></>}
      {p.status !== 'pending' && <p className="fine-print">{STATUS[p.status] ?? p.status}{p.decidedAt ? ` · ${new Date(p.decidedAt).toLocaleString()}` : ''}{p.decisionNote ? ` · ${p.decisionNote}` : ''}</p>}
      <details className="memory-tech"><summary>Technical details</summary><dl>
        <dt>Suggestion</dt><dd><bdi dir="ltr">{p.id}</bdi></dd><dt>From persona version</dt><dd>{p.baseVersion}</dd><dt>Source</dt><dd>{p.source}</dd>
        <dt>Created</dt><dd>{p.createdAt ?? '—'}</dd><dt>Review hash</dt><dd className="personality-hash"><bdi dir="ltr">{p.reviewHash}</bdi></dd>
        {p.appliedVersion !== null && p.appliedVersion !== undefined && <><dt>Applied as version</dt><dd>{p.appliedVersion}</dd></>}</dl></details>
      {p.status === 'pending' && <>
        <label className="memory-confirm"><input type="checkbox" checked={s.consent} disabled={s.phase !== 'ready'} onChange={e => controller.review(e.target.checked)}/>I read the change, the reason and what it noticed.</label>
        <div className="actions"><button type="button" className="primary" disabled={!canDecide} onClick={() => void controller.decide('approve')}>Approve</button>
          <button type="button" disabled={!canDecide} onClick={() => void controller.decide('reject')}>Reject</button></div>
      </>}
    </article>}
  </section>;
}
