import { useSyncExternalStore } from 'react';
import {
  allDialects, allPresets, allRoles, allTraits, dialectLabel, memoryTool, presetHelp, presetLabel, roleHelp, roleLabel, traitLabel,
} from './hire';
import type { HireController, Tool } from './hire';

const steps = [
  { key: 'role', label: 'Role' }, { key: 'persona', label: 'Persona' },
  { key: 'memory', label: 'Memory' }, { key: 'permissions', label: 'Permissions' },
] as const;
const phaseLabel: Record<string, string> = {
  editing: 'Draft — nothing is saved until you hire', creating: 'Hiring…', loading: 'Reading permissions…', saving: 'Saving permissions…',
  done: 'Hired', error: 'Something went wrong', unknown: 'Outcome unknown', denied: 'Owner only',
};

/** Hire an agent: role and persona become one create request; memory and permissions are one save. */
export function HireAgent({ controller, onClose }: { controller: HireController; onClose: () => void }) {
  const s = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const busy = ['creating', 'loading', 'saving'].includes(s.phase);
  const locked = !s.owner || busy || !!s.agent;
  const d = s.draft;
  const current = steps.findIndex(x => x.key === s.step);
  const memory = s.tools.filter(t => memoryTool(t.name));
  const other = s.tools.filter(t => !memoryTool(t.name));
  const who = s.agent?.name ?? 'The new agent';
  return <section aria-label="Hire an agent" className="hire">
    <div className="hire-head">
      <h3>Hire an agent</h3>
      <button type="button" disabled={busy} onClick={onClose}>Back to team</button>
    </div>
    <ol className="hire-steps" aria-label="Steps">{steps.map((x, i) =>
      <li key={x.key} aria-current={x.key === s.step ? 'step' : undefined} data-done={s.step === 'done' || i < current ? 'true' : undefined}>
        <span className="hire-step-n" aria-hidden="true">{i + 1}</span>{x.label}
      </li>)}
    </ol>
    <p role="status">{s.notice ?? phaseLabel[s.phase] ?? s.phase}</p>

    {s.step === 'role' && <form className="hire-form" onSubmit={e => { e.preventDefault(); controller.go('persona'); }}>
      <label>Name<input value={d.name} maxLength={80} disabled={locked} placeholder="Leave empty for a generated name" onChange={e => controller.edit({ name: e.target.value })}/></label>
      <fieldset className="hire-choices" disabled={locked}><legend>Role in the team</legend>
        {allRoles.map(r => <label key={r} className="hire-choice">
          <input type="radio" name="hire-role" aria-label={roleLabel[r]} checked={d.role === r} onChange={() => controller.edit({ role: r })}/>
          <span><strong>{roleLabel[r]}</strong><small>{roleHelp[r]}</small></span>
        </label>)}
      </fieldset>
      <label>Department<input value={d.department} maxLength={64} disabled={locked} placeholder="e.g. marketing, finance, development" onChange={e => controller.edit({ department: e.target.value })}/></label>
      <label>Job description<textarea value={d.description} maxLength={500} disabled={locked} placeholder="What this agent is responsible for" onChange={e => controller.edit({ description: e.target.value })}/></label>
      <div className="hire-actions"><button type="submit" className="primary" disabled={locked}>Next: persona</button></div>
    </form>}

    {s.step === 'persona' && <form className="hire-form" onSubmit={e => { e.preventDefault(); void controller.create(); }}>
      <fieldset className="hire-choices" disabled={locked}><legend>Persona</legend>
        {allPresets.map(p => <label key={p} className="hire-choice">
          <input type="radio" name="hire-preset" aria-label={presetLabel[p]} checked={d.preset === p} onChange={() => controller.edit({ preset: p })}/>
          <span><strong>{presetLabel[p]}</strong><small>{presetHelp[p]}</small></span>
        </label>)}
      </fieldset>
      <label>Speaks<select value={d.dialect} disabled={locked} onChange={e => controller.edit({ dialect: e.target.value as typeof d.dialect })}>
        <option value="">Same as the company</option>{allDialects.map(x => <option key={x} value={x}>{dialectLabel[x]}</option>)}
      </select></label>
      <details><summary>Fine-tune traits</summary>
        <p className="fine-print">Untouched traits come from the persona. Changes are saved as the first persona version.</p>
        <div className="hire-traits">{allTraits.map(t => {
          const v = d.traits[t];
          return <div key={t} className="hire-trait">
            <label>{traitLabel[t]}<input type="range" min={0} max={100} step={5} value={v ?? 50} disabled={locked} aria-valuetext={v === undefined ? 'From persona' : String(v)} onChange={e => controller.setTrait(t, Number(e.target.value))}/></label>
            <span className="hire-trait-v">{v === undefined ? 'persona' : v}</span>
            {v !== undefined && <button type="button" disabled={locked} onClick={() => controller.setTrait(t, undefined)}>Reset</button>}
          </div>;
        })}</div>
      </details>
      <div className="hire-actions">
        <button type="button" disabled={locked} onClick={() => controller.go('role')}>Back</button>
        <button type="submit" className="primary" disabled={locked || s.phase === 'unknown'}>Hire agent</button>
      </div>
    </form>}

    {s.step === 'memory' && <div className="hire-form">
      <p><bdi>{who}</bdi> is hired. Choose what it may do with memory. Memory stays inside your company.</p>
      <ToolList tools={memory} selected={s.selected} disabled={busy || s.scoped || s.phase === 'unknown'} onToggle={t => controller.toggle(t)} empty="No memory tools on this server."/>
      <div className="hire-actions"><button type="button" className="primary" disabled={busy} onClick={() => controller.next()}>Next: permissions</button></div>
    </div>}

    {s.step === 'permissions' && <div className="hire-form">
      <p>Pick the tools <bdi>{who}</bdi> may use. Tools marked “Asks you first” always wait for your approval before they act.</p>
      <ToolList tools={other} selected={s.selected} disabled={busy || s.scoped || s.phase === 'unknown'} onToggle={t => controller.toggle(t)} empty="No other tools on this server."/>
      <div className="hire-actions">
        <button type="button" disabled={busy} onClick={() => controller.back()}>Back</button>
        {s.phase === 'unknown'
          ? <button type="button" disabled={busy} onClick={() => void controller.reconcile()}>Reload permissions</button>
          : <button type="button" className="primary" disabled={busy || s.scoped || s.grantsVersion === undefined} onClick={() => void controller.save()}>Save permissions</button>}
      </div>
    </div>}

    {s.step === 'done' && <div className="hire-form">
      <p><bdi>{who}</bdi> joined your team with {s.selected.length} permission{s.selected.length === 1 ? '' : 's'}.</p>
      <div className="hire-actions">
        <button type="button" className="primary" onClick={onClose}>Back to team</button>
        <button type="button" onClick={() => controller.restart()}>Hire another</button>
      </div>
    </div>}

    {s.phase === 'error' && s.agent && s.step !== 'done' && s.grantsVersion === undefined &&
      <div className="hire-actions"><button type="button" disabled={busy} onClick={() => void controller.reloadTools()}>Read permissions again</button></div>}
  </section>;
}

function ToolList({ tools, selected, disabled, onToggle, empty }: { tools: readonly Tool[]; selected: readonly string[]; disabled: boolean; onToggle: (name: string) => void; empty: string }) {
  if (!tools.length) return <p className="fine-print">{empty}</p>;
  return <ul className="hire-tools" aria-label="Tools">{tools.map(t => {
    const on = selected.includes(t.name);
    const off = !t.allowedByServer && !on;
    return <li key={t.name}>
      <label className="check hire-tool">
        <input type="checkbox" checked={on} disabled={disabled || off} onChange={() => onToggle(t.name)}/>
        <span className="hire-tool-text">
          <code>{t.name}</code>
          {t.requiresApproval && <span className="badge">Asks you first</span>}
          {!t.allowedByServer && <span className="badge">Off on this server</span>}
          {t.description && <small>{t.description}</small>}
        </span>
      </label>
    </li>;
  })}</ul>;
}
