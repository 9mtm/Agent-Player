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
  return <section aria-label="Agents"><h2>Agents</h2>
    <p>Read agents, select one, then edit or generate a draft. Only Save changes its name. Stable IDs never change.</p>
    <p>Editing is currently restricted to owners in this UI. Server permissions are enforced separately.</p>
    <p>{client.getSnapshot().mode === 'mock' ? 'Offline fictional agents only.' : 'Injected authenticated client. Reads and writes require explicit actions.'} Copy: English draft.</p>
    {controller ? <AgentsReview controller={controller}/> : <p>Agents are not loaded.</p>}
    {personality && <PersonalityReview controller={personality}/>}
  </section>;
}
export function AgentsReview({ controller }: { controller: AgentsController }) {
  const s = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [language, setLanguage] = useState<NamingLanguage>('en');
  const busy = ['listing', 'reading', 'saving', 'reconciling', 'generating'].includes(s.phase);
  const name = validatedDisplayName(s.draft);
  return <>
    <button disabled={busy} onClick={() => void controller.list()}>Read agents</button>
    <label>Selected agent<select value={s.selected?.id ?? ''} disabled={busy} onChange={e => void controller.select(e.target.value)}>
      <option value="">Select an agent</option>{s.agents.map(a => <option value={a.id} key={a.id}>{a.name ?? 'Name unavailable'} · {a.id}</option>)}
    </select></label>
    <p role="status">{s.notice ?? s.phase}</p>
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
