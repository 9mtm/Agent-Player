import { useEffect, useState, useSyncExternalStore } from 'react';
import { BulkReviewController } from './memory';
import type { MemoryAdapter, MemoryContext, ProposalSummary } from './memory';

/** An imported memory is "### Title" + text; show the title in bold instead of the Markdown mark. */
export function splitMemory(content: string): { title: string; body: string } {
  const m = /^#{1,6}\s+(.+)\n+([\s\S]*)$/.exec(content.trim());
  return m ? { title: m[1].trim(), body: m[2].trim() } : { title: '', body: content.trim() };
}

/** Read many imported memories in one list and approve or reject the chosen ones (each with its own review check). */
export function MemoryBulkReview({ adapter, context, proposals, onClose }: { adapter: MemoryAdapter; context: MemoryContext; proposals: ProposalSummary[]; onClose: (changed: boolean) => void }) {
  const [c] = useState(() => new BulkReviewController(adapter, context));
  const s = useSyncExternalStore(c.subscribe, c.getSnapshot, c.getSnapshot);
  const [read, setRead] = useState(false);
  useEffect(() => { void c.load(proposals); return () => c.dispose(); }, [c]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = s.selected.length; const busy = s.phase === 'deciding';
  const all = s.items.length > 0 && n === s.items.length;
  return <section className="memory-bulk" aria-label="Imported memories to review">
    <div className="memory-bulk-head">
      <h4>Imported memories</h4>
      <button type="button" className="link-button" disabled={busy} onClick={() => onClose(s.phase === 'done')}>Close</button>
    </div>
    {s.phase === 'loading' && <p className="fine-print" role="status">Reading the imported memories…</p>}
    {s.phase === 'error' && <p className="card-notice" role="alert">They could not be read. Close and try again.</p>}
    {s.phase === 'done' && s.result && <p className="memory-status" role="status">
      {s.result.done} {s.result.action === 'approve' ? 'approved and saved' : 'rejected'}.
      {s.result.changed > 0 && ` ${s.result.changed} changed since you read them and were left as they are.`}
      {s.result.unknown > 0 && ` ${s.result.unknown} have an unknown outcome; read again to see their state.`}
      {s.result.failed > 0 && ` ${s.result.failed} could not be decided.`}
      {' '}<button type="button" className="link-button" onClick={() => onClose(true)}>Done</button></p>}
    {(s.phase === 'ready' || busy) && (s.items.length === 0 ? <p className="fine-print">No imported memories wait for review here.</p> : <>
      <p className="muted">These were written by the local model from your other agents' conversations. They are information only: they cannot change permissions or give instructions.</p>
      <label className="memory-bulk-all check"><input type="checkbox" checked={all} disabled={busy} onChange={e => c.selectAll(e.target.checked)}/>Select all ({s.items.length})</label>
      <ul className="memory-bulk-list">{s.items.map(p => <li key={p.id}>
        <label>
          <input type="checkbox" checked={s.selected.includes(p.id)} disabled={busy} onChange={() => { setRead(false); c.toggle(p.id); }}/>
          <span className="memory-bulk-text">{p.changes.map((ch, i) => { if (!('after' in ch)) return null; const { title, body } = splitMemory(ch.after.content); return <span key={i} dir="auto">{title && <strong>{title}</strong>}{body}</span>; })}</span>
          <span className="fine-print">{p.drawerId === 'owner' ? 'About you' : p.drawerId.replace(/^project:/, 'Project ')}</span>
        </label>
      </li>)}</ul>
      <label className="memory-confirm check"><input type="checkbox" checked={read} disabled={busy || !n} onChange={e => setRead(e.target.checked)}/>I read the {n} selected {n === 1 ? 'memory' : 'memories'}.</label>
      <div className="actions">
        <button type="button" className="primary" disabled={!read || !n || busy || !adapter.decide} onClick={() => { setRead(false); void c.decide('approve'); }}>{busy ? 'Saving…' : `Approve ${n}`}</button>
        <button type="button" disabled={!read || !n || busy || !adapter.decide} onClick={() => { setRead(false); void c.decide('reject'); }}>Reject {n}</button>
      </div>
    </>)}
  </section>;
}
