import { useEffect, useState, useSyncExternalStore } from 'react';
import { LocalImportController } from './local-import';
import type { LocalSession } from './local-import-contract.js';
import type { SessionClient } from './session';

const SOURCE: Record<string, string> = { 'claude-code': 'Claude Code', codex: 'Codex' };
const shortPath = (p: string) => { const home = p.match(/^\/Users\/[^/]+/)?.[0]; return home ? `~${p.slice(home.length)}` : p; };

/** Bring in what you told other agents: pick conversations, the local model proposes memories, you approve each one. */
export function LocalImport({ client, active, onReview }: { client: SessionClient; active: boolean; onReview: () => void }) {
  const [c] = useState(() => new LocalImportController(client));
  useEffect(() => () => c.dispose(), [c]);
  const s = useSyncExternalStore(c.subscribe, c.getSnapshot, c.getSnapshot);
  const [source, setSource] = useState<'all' | 'claude-code' | 'codex'>('all');
  const [query, setQuery] = useState('');
  const [onlyNew, setOnlyNew] = useState(true);
  useEffect(() => { if (active && s.phase === 'idle') void c.load(); }, [active, c, s.phase]);
  const q = query.trim().toLowerCase();
  const shown = s.sessions.filter(x => (source === 'all' || x.source === source) && (!onlyNew || !x.imported) && (!q || x.title.toLowerCase().includes(q) || (x.cwd ?? '').toLowerCase().includes(q)));
  const groups = new Map<string, LocalSession[]>();
  for (const x of shown.slice(0, 200)) { const k = x.cwd ? shortPath(x.cwd) : 'No folder'; groups.set(k, [...(groups.get(k) ?? []), x]); }
  const running = s.job?.status === 'running';
  return <section className="local-import" aria-label="Import from other agents">
    <div className="local-import-head">
      <div><h3>Import from other agents</h3>
        <p className="fine-print">Pick conversations you had with Claude Code or Codex on this computer. Secrets are removed first, a private copy is kept in <code>{s.archive || '~/.dpro/imports'}</code>, and the local model suggests lasting memories. Nothing is remembered until you approve each one. The original files are never changed.</p></div>
    </div>
    {s.job && <div className="local-import-job" role="status" data-status={s.job.status}>
      {running ? <>Reading {s.job.done} of {s.job.total}… <span className="local-import-bar" aria-hidden="true"><i style={{ inlineSize: `${s.job.total ? Math.round((s.job.done / s.job.total) * 100) : 0}%` }}/></span></>
        : <>{s.job.notice ?? (s.job.status === 'done' ? 'Done.' : 'The import stopped.')}{s.job.errors > 0 && ` ${s.job.errors} could not be read.`}
          {s.job.status === 'done' && s.job.proposed > 0 && <> <button type="button" className="link-button" onClick={onReview}>Review them now</button></>}</>}
    </div>}
    {s.notice && <p className="card-notice" role="alert">{s.notice}</p>}
    {s.phase === 'loading' && !s.sessions.length ? <p className="fine-print" role="status">Looking for conversations…</p>
      : s.phase === 'error' ? <p className="fine-print">{s.notice} <button type="button" className="link-button" onClick={() => void c.load()}>Try again</button></p>
      : <>
        <div className="local-import-tools">
          <div className="seg small" role="radiogroup" aria-label="Source">
            {(['all', 'claude-code', 'codex'] as const).map(k => <button key={k} type="button" role="radio" aria-checked={source === k} onClick={() => setSource(k)}>
              {k === 'all' ? 'All' : SOURCE[k]} <span className="muted">{k === 'all' ? s.sessions.length : s.sessions.filter(x => x.source === k).length}</span></button>)}
          </div>
          <input type="search" placeholder="Find by words or folder" aria-label="Find conversations" value={query} onChange={e => setQuery(e.target.value)}/>
          <label className="term-check"><input type="checkbox" checked={onlyNew} onChange={e => setOnlyNew(e.target.checked)}/>Not imported yet</label>
          <button type="button" className="primary" disabled={!s.selected.length || running} onClick={() => void c.start()}>{running ? 'Importing…' : `Import ${s.selected.length || ''} ${s.selected.length === 1 ? 'conversation' : 'conversations'}`.replace('  ', ' ')}</button>
          {s.selected.length > 0 && !running && <button type="button" className="link-button" onClick={() => c.clear()}>Clear</button>}
        </div>
        {!shown.length ? <p className="fine-print">{s.sessions.length ? 'No conversation matches.' : 'No Claude Code or Codex conversations were found on this computer.'}</p>
          : [...groups].map(([folder, list]) => <div key={folder} className="local-import-group">
            <p className="local-import-folder" dir="ltr" title={folder}>{folder}</p>
            <ul>{list.map(x => <li key={x.id}>
              <label>
                <input type="checkbox" checked={s.selected.includes(x.id)} disabled={running} onChange={() => c.toggle(x.id)}/>
                <span className="local-import-title" dir="auto">{x.title || '(no text)'}</span>
                <span className="local-import-meta">{SOURCE[x.source]} · {new Date(x.updatedAt).toLocaleDateString()} · {x.turns} {x.turns === 1 ? 'message' : 'messages'}{x.imported ? ` · imported, ${x.imported.proposed} suggested` : ''}</span>
              </label>
            </li>)}</ul>
          </div>)}
        {shown.length > 200 && <p className="fine-print">Showing the newest 200; search to find older ones.</p>}
      </>}
  </section>;
}
