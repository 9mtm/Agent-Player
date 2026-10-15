import { useState, useSyncExternalStore } from 'react';
import { allPresets, allRoles, presetLabel, roleLabel } from './hire';
import type { Preset, Role } from './hire';
import type { CompanyController, CompanySize, PlannedHire } from './company';

const steps = [
  { key: 'size', label: 'Company size' }, { key: 'departments', label: 'Departments' },
  { key: 'review', label: 'Your team' }, { key: 'hiring', label: 'Hire' },
] as const;
const statusLabel: Record<PlannedHire['status'], string> = { planned: '', creating: 'Hiring…', created: 'Hired', failed: 'Not hired', unknown: 'Unknown' };

/** Build the company: size, departments, a proposed team to review, then one confirm. */
export function CompanyWizard({ controller, onClose }: { controller: CompanyController; onClose: () => void }) {
  const s = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [custom, setCustom] = useState('');
  const busy = ['loading', 'planning', 'hiring'].includes(s.phase);
  const current = s.step === 'done' ? steps.length : steps.findIndex(x => x.key === s.step);
  const known = new Set(s.catalogue?.departments.map(d => d.id) ?? []);
  const customs = s.departments.filter(d => !known.has(d));
  const chosen = s.hires.filter(h => h.include);
  const groups = [...new Set(s.hires.map(h => h.department))];
  return <section aria-label="Build your company" className="hire company">
    <div className="hire-head">
      <h3>Build your company</h3>
      <button type="button" disabled={busy} onClick={onClose}>Back to team</button>
    </div>
    <ol className="hire-steps" aria-label="Steps">{steps.map((x, i) =>
      <li key={x.key} aria-current={x.key === s.step ? 'step' : undefined} data-done={i < current ? 'true' : undefined}>
        <span className="hire-step-n" aria-hidden="true">{i + 1}</span>{x.label}
      </li>)}
    </ol>
    {(s.notice || busy) && <p role="status">{s.notice ?? (s.phase === 'loading' ? 'Reading the departments…' : s.phase === 'planning' ? 'Proposing a team…' : 'Hiring your team…')}</p>}

    {s.step === 'size' && <div className="hire-form">
      <p>Tell Dpro how big your company is. It proposes a team for each department you choose; you review every person before anyone is hired.</p>
      {!s.catalogue
        ? <div className="hire-actions"><button type="button" className="primary" disabled={busy || !s.owner} onClick={() => void controller.loadCatalogue()}>Start</button></div>
        : <fieldset className="hire-choices" disabled={busy}><legend>Company size</legend>
          {s.catalogue.sizes.map(z => <label key={z.id} className="hire-choice">
            <input type="radio" name="company-size" aria-label={z.label} checked={s.size === z.id} onChange={() => controller.chooseSize(z.id as CompanySize)}/>
            <span><strong>{z.label}</strong><small>{sizeHelp[z.id] ?? ''}</small></span>
          </label>)}
        </fieldset>}
    </div>}

    {s.step === 'departments' && s.catalogue && <div className="hire-form">
      <p>Choose the departments you want. Each one gets its own small team.</p>
      <ul className="company-departments" aria-label="Departments">{s.catalogue.departments.map(d => {
        const on = s.departments.includes(d.id);
        return <li key={d.id}><button type="button" className="company-dep" aria-pressed={on} disabled={busy} onClick={() => controller.toggleDepartment(d.id)}>
          <strong>{d.label}</strong><small>{d.summary}</small>
        </button></li>;
      })}</ul>
      {customs.length > 0 && <p className="fine-print">Your own departments: {customs.map(c => <span key={c} className="badge company-custom">{c} <button type="button" aria-label={`Remove ${c}`} onClick={() => controller.toggleDepartment(c)}>×</button></span>)}</p>}
      <form className="company-add" onSubmit={e => { e.preventDefault(); if (controller.addCustom(custom)) setCustom(''); }}>
        <label>Add your own department<input value={custom} maxLength={64} placeholder="e.g. podcast studio" disabled={busy} onChange={e => setCustom(e.target.value)}/></label>
        <button type="submit" disabled={busy || !custom.trim()}>Add</button>
      </form>
      <div className="hire-actions">
        <button type="button" disabled={busy} onClick={() => controller.back()}>Back</button>
        <button type="button" className="primary" disabled={busy || !s.departments.length} onClick={() => void controller.propose()}>Propose my team ({s.departments.length})</button>
      </div>
    </div>}

    {(s.step === 'review' || s.step === 'hiring' || s.step === 'done') && <div className="hire-form">
      {s.step === 'review' && <p>Here is the proposed team. Rename anyone, change their role or persona, or untick people you don't need. Each hire starts with memory tools only; give more permissions on the agent later.</p>}
      {s.step === 'done' && <p>{chosen.length} new {chosen.length === 1 ? 'person has' : 'people have'} joined your team.</p>}
      {groups.map(dep => {
        const list = s.hires.filter(h => h.department === dep);
        return <section key={dep} className="company-group" aria-label={list[0].departmentLabel}>
          <h4>{list[0].departmentLabel}</h4>
          <ul className="company-hires">{list.map(h => <HireRow key={h.key} hire={h} locked={busy || s.step !== 'review' || h.status === 'created'} controller={controller}/>)}</ul>
        </section>;
      })}
      <div className="hire-actions">
        {s.step === 'review' && <>
          <button type="button" disabled={busy} onClick={() => controller.back()}>Back</button>
          <button type="button" className="primary" disabled={busy || !chosen.some(h => h.status !== 'created')} onClick={() => void controller.hireAll()}>Hire {chosen.filter(h => h.status !== 'created').length} {chosen.filter(h => h.status !== 'created').length === 1 ? 'person' : 'people'}</button>
        </>}
        {(s.step === 'done' || s.phase === 'stopped') && <button type="button" className={s.step === 'done' ? 'primary' : undefined} disabled={busy} onClick={onClose}>Back to team</button>}
      </div>
    </div>}
  </section>;
}

const sizeHelp: Record<string, string> = {
  solo: 'One helper per department.',
  small: 'A lead and a specialist per department.',
  medium: 'A lead, two specialists and a reviewer per department.',
  large: 'A lead, three specialists and a reviewer per department.',
};

function HireRow({ hire, locked, controller }: { hire: PlannedHire; locked: boolean; controller: CompanyController }) {
  return <li className="company-hire" data-status={hire.status}>
    <input type="checkbox" aria-label={`Hire ${hire.name || hire.title}`} checked={hire.include} disabled={locked} onChange={e => controller.edit(hire.key, { include: e.target.checked })}/>
    <span className="team-avatar" aria-hidden="true">{(hire.name || '?').trim().slice(0, 1).toUpperCase() || '?'}</span>
    <div className="company-hire-main">
      <input className="company-name" aria-label={`Name for ${hire.title}`} value={hire.name} maxLength={80} disabled={locked} onChange={e => controller.edit(hire.key, { name: e.target.value })}/>
      <small>{hire.title}</small>
    </div>
    <select aria-label={`Role for ${hire.title}`} value={hire.role} disabled={locked} onChange={e => controller.edit(hire.key, { role: e.target.value as Role })}>
      {allRoles.map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}
    </select>
    <select aria-label={`Persona for ${hire.title}`} value={hire.preset} disabled={locked} onChange={e => controller.edit(hire.key, { preset: e.target.value as Preset })}>
      {allPresets.map(p => <option key={p} value={p}>{presetLabel[p]}</option>)}
    </select>
    <span className="company-status">{hire.status === 'planned' ? '' : <span className="badge">{statusLabel[hire.status]}{hire.note ? ` · ${hire.note}` : ''}</span>}</span>
  </li>;
}
