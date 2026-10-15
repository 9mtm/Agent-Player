import { useSyncExternalStore } from 'react';
import { traitNames } from './personality-contract.js';
import type { PersonalityController } from './personality';

export function PersonalityReview({ controller }: { controller: PersonalityController }) {
  const s = useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
  const p = s.detail, busy = s.phase === 'loading' || s.phase === 'deciding';
  const canDecide = s.owner && s.phase === 'ready' && p?.status === 'pending' && s.consent;
  return <section aria-label="Personality proposal review">
    <h3>Personality proposals</h3>
    <p>Owner review only. Personality changes never grant tools, permissions or approval bypasses. Creation and preset editing are unavailable here.</p>
    <button disabled={!s.owner || !s.agentId || busy} onClick={() => void controller.list()}>Read personality proposals</button>
    {!s.owner && <p>Sign in as an owner to review proposals.</p>}
    <p role="status">{s.notice ?? s.phase}</p>
    {s.phase === 'ready' && !s.proposals.length && <p>No personality proposals returned.</p>}
    <ul>{s.proposals.map(item => <li key={item.id}><button disabled={busy} onClick={() => void controller.open(item.id)}>Review proposal {item.id} · {item.status} · base {item.baseVersion}</button></li>)}</ul>
    {p && <article aria-label="Full personality proposal">
      <dl><dt>Agent ID</dt><dd><bdi>{p.agentId}</bdi></dd><dt>Proposal ID</dt><dd><bdi>{p.id}</bdi></dd>
        <dt>Base version</dt><dd>{p.baseVersion}</dd><dt>Status</dt><dd>{p.status}</dd><dt>Source</dt><dd>{p.source}</dd>
        <dt>Created by</dt><dd><bdi>{p.createdBy}</bdi></dd><dt>Created at</dt><dd>{p.createdAt ?? 'Unavailable'}</dd>
        <dt>Review hash</dt><dd className="personality-hash"><bdi>{p.reviewHash}</bdi></dd></dl>
      <table><caption>Complete traits and delta (0–100; at most 5 points per changed trait)</caption><thead><tr><th>Trait</th><th>Base</th><th>Proposed</th><th>Delta</th></tr></thead>
        <tbody>{traitNames.map(n => <tr key={n}><th scope="row">{n}</th><td>{p.baseTraits[n]}</td><td>{p.proposedTraits[n]}</td><td>{p.delta[n] === undefined ? 'Unchanged (0)' : `${p.delta[n]! > 0 ? '+' : ''}${p.delta[n]}`}</td></tr>)}</tbody></table>
      <h4>Reason</h4><p className="personality-copy">{p.reason}</p><h4>Evidence references (untrusted text)</h4>
      {p.evidence.length ? <ul>{p.evidence.map((e,i) => <li className="personality-copy" key={i}><bdi>{e}</bdi></li>)}</ul> : <p>No evidence references supplied.</p>}
      <dl><dt>Decided by</dt><dd>{p.decidedBy ?? 'Not decided'}</dd><dt>Decided at</dt><dd>{p.decidedAt ?? 'Not decided'}</dd><dt>Decision note</dt><dd className="personality-copy">{p.decisionNote ?? 'None'}</dd><dt>Applied version</dt><dd>{p.appliedVersion ?? 'None'}</dd></dl>
      <label><input type="checkbox" checked={s.consent} disabled={!s.owner || s.phase !== 'ready' || p.status !== 'pending'} onChange={e => controller.review(e.target.checked)}/>I reviewed all base and proposed traits, the full delta, reason and evidence for this agent and version.</label>
      <button disabled={!canDecide} onClick={() => void controller.decide('approve')}>Approve personality change</button>
      <button disabled={!canDecide} onClick={() => void controller.decide('reject')}>Reject personality proposal</button>
    </article>}
  </section>;
}
