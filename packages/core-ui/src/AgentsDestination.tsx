import { PersonalityController } from './personality';
import { PersonalityReview } from './PersonalityReview';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { AgentsController } from './agents';
import { namingLanguages, validatedDisplayName } from './naming';
import type { NamingLanguage } from './naming';
import type { SessionClient } from './session';

export function AgentsDestination({ client }: { client: SessionClient }) {
  // The effect owns subscription cleanup; construction also supports offline SSR without reads.
  const [controller, setController] = useState<AgentsController>();
  const [personality, setPersonality] = useState<PersonalityController>();
  useEffect(() => {
    const c = new AgentsController(client), p = new PersonalityController(client);
    const unsubscribe = c.subscribe(() => {
      const selected = c.getSnapshot().selected; p.select(selected?.id ?? '', selected?.version);
    });
    setController(c); setPersonality(p);
    return () => { unsubscribe(); c.dispose(); p.dispose(); };
  }, [client]);
  return <section aria-label="Agents"><h2>Your team</h2>
    <p>Each agent is a member of your staff with its own name, role, memory and personality. Load the team, pick an agent, and rename it or review its personality changes.{client.getSnapshot().mode === 'mock' ? ' Offline practice: fictional agents only.' : ''}</p>
    <p className="fine-print">Only Save changes a name; stable IDs never change. Editing is owner-only here; the server enforces permissions separately.</p>
    {controller ? <AgentsReview controller={controller}/> : <p>Agents are not loaded.</p>}
    {personality && <PersonalityReview controller={personality}/>}
  </section>;
}
/** Readable status for each controller phase (the controller keeps its own words). */
const phaseLabel: Record<string, string> = {
  idle: 'Team not loaded yet', listing: 'Loading the team…', reading: 'Opening the agent…', ready: 'Ready',
  generating: 'Suggesting a name…', saving: 'Saving…', saved: 'Saved', review: 'Changed elsewhere — review before saving',
  unknown: 'Outcome unknown — reconcile before editing', reconciling: 'Checking the latest version…', error: 'Something went wrong', denied: 'Access denied',
};
export function AgentsReview({ controller }: { controller: AgentsController }) {
  const s = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [language, setLanguage] = useState<NamingLanguage>('en');
  const busy = ['listing', 'reading', 'saving', 'reconciling', 'generating'].includes(s.phase);
  const name = validatedDisplayName(s.draft);
  return <>
    <button disabled={busy} onClick={() => void controller.list()}>{s.agents.length ? 'Reload team' : 'Load team'}</button>
    {s.agents.length > 0 && <ul className="team-grid" aria-label="Team members">{s.agents.map(a =>
      <li key={a.id}><button type="button" className="team-card" aria-pressed={s.selected?.id === a.id} disabled={busy} onClick={() => void controller.select(a.id)}>
        <span className="team-avatar" aria-hidden="true">{(a.name ?? '?').trim().slice(0, 1).toUpperCase() || '?'}</span>
        <span className="team-text"><bdi className="team-name">{a.name ?? 'Name unavailable'}</bdi><bdi className="team-id">{a.id}</bdi></span>
      </button></li>)}
    </ul>}
    <label className={s.agents.length > 0 ? 'sr-only' : undefined}>Selected agent<select value={s.selected?.id ?? ''} disabled={busy} onChange={e => void controller.select(e.target.value)}>
      <option value="">Select an agent</option>{s.agents.map(a => <option value={a.id} key={a.id}>{a.name ?? 'Name unavailable'} · {a.id}</option>)}
    </select></label>
    <p role="status">{s.notice ?? phaseLabel[s.phase] ?? s.phase}</p>
    {s.selected && <>
      <dl><dt>Stable ID</dt><dd><bdi>{s.selected.id}</bdi></dd><dt>Latest acknowledged name</dt><dd><bdi>{s.selected.name ?? 'Name unavailable'}</bdi></dd><dt>Version</dt><dd>{s.selected.version}</dd></dl>
      <label>Draft name<input value={s.draft} disabled={!s.owner || s.selected.nameUnavailable || busy || s.unknown} onChange={e => controller.edit(e.target.value)}/></label>
      <label>Suggestion language<select value={language} disabled={busy} onChange={e => setLanguage(e.target.value as NamingLanguage)}>{namingLanguages.map(l => <option key={l}>{l}</option>)}</select></label>
      <button disabled={!s.owner || s.selected.nameUnavailable || busy || s.unknown} onClick={() => void controller.generate(language)}>Generate draft</button>
      {!name && <p>Enter a name of 1–60 Unicode characters after normalization; control characters are unavailable.</p>}
      {name && name !== s.draft && <p>Normalized name to save: <bdi>{name}</bdi></p>}
      {(s.unknown || s.refreshRequired) && <button disabled={busy} onClick={() => void controller.reconcile()}>Reconcile with GET</button>}
      {s.needsReview && !s.unknown && !s.refreshRequired && <button disabled={busy} onClick={() => controller.review()}>I reviewed the latest name, version and draft</button>}
      <button className="primary" disabled={!s.owner || s.selected.nameUnavailable || busy || s.unknown || s.refreshRequired || s.needsReview || !name || name === s.selected.name} onClick={() => void controller.save()}>Save name</button>
      <button disabled={busy || s.unknown} onClick={() => controller.cancel()}>Cancel draft</button>
    </>}
  </>;
}
