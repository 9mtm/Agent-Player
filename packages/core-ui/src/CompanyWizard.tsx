import { useState, useSyncExternalStore } from 'react';
import { allPresets, allRoles, presetLabel, roleLabel } from './hire';
import type { Preset, Role } from './hire';
import { shareRoles, sharesTotal } from './company';
import type { BatchProgress, CompanyController, CompanySize, PlannedHire, Share } from './company';
import { rolesSummary } from './team-split';
import type { TeamRole } from './team-split';

const steps = [
  { key: 'size', label: 'Company size' }, { key: 'departments', label: 'Departments' },
  { key: 'review', label: 'Your team' }, { key: 'hiring', label: 'Hire' },
] as const;
const statusLabel: Record<PlannedHire['status'], string> = { planned: '', creating: 'Hiring…', created: 'Hired', failed: 'Not hired', unknown: 'Unknown' };

/** Build the company: size, departments, a proposed team to review, then one confirm. */
export function CompanyWizard({ controller, onClose }: { controller: CompanyController; onClose: () => void }) {
  const s = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const [custom, setCustom] = useState('');
  const [total, setTotal] = useState('');
  const busy = ['loading', 'planning', 'hiring'].includes(s.phase);
  const current = s.step === 'done' ? steps.length : steps.findIndex(x => x.key === s.step);
  const known = new Set(s.catalogue?.departments.map(d => d.id) ?? []);
  const customs = s.departments.filter(d => !known.has(d));
  const chosen = s.hires.filter(h => h.include);
  const groups = [...new Set(s.hires.map(h => h.department))];
  const bulk = s.total !== undefined || s.shares.length > 0 || !!s.batch;
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
    {(s.notice || busy) && <p role="status">{s.notice ?? (s.phase === 'loading' ? 'Reading the departments…' : s.phase === 'planning' ? (bulk ? 'Splitting your team…' : 'Proposing a team…') : 'Hiring your team…')}</p>}

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
      {s.catalogue && <form className="company-add company-total" onSubmit={e => { e.preventDefault(); controller.chooseTotal(Number(total)); }}>
        <label>Or enter how many people you want in total<input type="number" inputMode="numeric" min={1} max={s.catalogue.maxTotal ?? 1000} step={1} value={total} placeholder="e.g. 400" disabled={busy} onChange={e => setTotal(e.target.value)}/></label>
        <button type="submit" disabled={busy || !total.trim()}>Use this total</button>
      </form>}
      {s.open.length > 0 && <section className="company-open" aria-label="Unfinished hiring">
        <h4>Unfinished hiring</h4>
        <ul>{s.open.map(b => <li key={b.id}>
          <span>{b.created} of {b.total} hired{b.failed ? ` · ${b.failed} not hired` : ''}</span>
          <button type="button" className="primary" disabled={busy} onClick={() => void controller.resume(b.id)}>Resume</button>
        </li>)}</ul>
      </section>}
    </div>}

    {s.step === 'departments' && s.catalogue && <div className="hire-form">
      <p>{s.total !== undefined ? `Choose the departments for your ${s.total} ${s.total === 1 ? 'person' : 'people'}. Dpro splits them by the size each department usually needs; you can change every count.` : 'Choose the departments you want. Each one gets its own small team.'}</p>
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
        <button type="button" className="primary" disabled={busy || !s.departments.length} onClick={() => void controller.propose()}>{s.total !== undefined ? `Split ${s.total} people over ${s.departments.length} ${s.departments.length === 1 ? 'department' : 'departments'}` : `Propose my team (${s.departments.length})`}</button>
      </div>
    </div>}

    {bulk && s.step === 'review' && <ShareReview shares={s.shares} busy={busy} controller={controller}/>}
    {bulk && (s.step === 'hiring' || s.step === 'done') && <BatchView batch={s.batch} shares={s.shares} phase={s.phase} busy={busy} controller={controller} onClose={onClose}/>}

    {!bulk && (s.step === 'review' || s.step === 'hiring' || s.step === 'done') && <div className="hire-form">
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

const teamRoleOrder: readonly TeamRole[] = ['manager', 'specialist', 'evaluator'];
const teamRoleLabel: Record<TeamRole, string> = { manager: 'Leads', specialist: 'Specialists', evaluator: 'Reviewers' };

/** Review of a total headcount: one row per department with its count and personas; people are listed on demand. */
function ShareReview({ shares, busy, controller }: { shares: readonly Share[]; busy: boolean; controller: CompanyController }) {
  const total = sharesTotal(shares);
  return <div className="hire-form">
    <p>Here is how your {total} people are split. Change any department's count or the persona of its leads, specialists and reviewers. Names are picked when each person is hired. Each hire starts with memory tools only; give more permissions on the agent later.</p>
    <ul className="company-shares" aria-label="Departments and headcount">{shares.map(x => {
      const roles = shareRoles(x);
      return <li key={x.department} className="company-share">
        <div className="company-share-head">
          <strong>{x.departmentLabel}</strong>
          <label className="company-count">People<input type="number" inputMode="numeric" min={1} max={1000} step={1} aria-label={`People in ${x.departmentLabel}`} value={x.count} disabled={busy}
            onChange={e => { const n = Number(e.target.value); if (Number.isSafeInteger(n) && n >= 1) controller.editShare(x.department, { count: n }); }}/></label>
          <small>{rolesSummary(roles)}</small>
        </div>
        <div className="company-share-personas">{teamRoleOrder.filter(r => roles[r] > 0).map(r =>
          <label key={r}>{teamRoleLabel[r]}
            <select aria-label={`Persona for ${teamRoleLabel[r].toLowerCase()} in ${x.departmentLabel}`} value={x.presets[r]} disabled={busy} onChange={e => controller.editShare(x.department, { role: r, preset: e.target.value as Preset })}>
              {allPresets.map(p => <option key={p} value={p}>{presetLabel[p]}</option>)}
            </select>
          </label>)}
        </div>
        <details className="company-people"><summary>Show the {x.count} {x.count === 1 ? 'person' : 'people'}</summary>
          <ul>{teamRoleOrder.filter(r => roles[r] > 0).map(r => <li key={r}>{roles[r]} × {x.titles[r]} · {presetLabel[x.presets[r]]}</li>)}</ul>
        </details>
      </li>;
    })}</ul>
    <p className="company-total-line"><strong>{total}</strong> {total === 1 ? 'person' : 'people'} in total</p>
    <div className="hire-actions">
      <button type="button" disabled={busy} onClick={() => controller.back()}>Back</button>
      <button type="button" className="primary" disabled={busy || !total} onClick={() => void controller.hireBatch()}>Hire {total} {total === 1 ? 'person' : 'people'}</button>
    </div>
  </div>;
}

/** Progress of a batch hire; Continue is always safe (nobody is hired twice). */
function BatchView({ batch, shares, phase, busy, controller, onClose }: { batch?: BatchProgress; shares: readonly Share[]; phase: string; busy: boolean; controller: CompanyController; onClose: () => void }) {
  const label = (dep: string) => shares.find(x => x.department === dep)?.departmentLabel ?? dep.replace(/^./, c => c.toUpperCase());
  return <div className="hire-form">
    {batch ? <>
      <p>{batch.done && !batch.failed ? `${batch.created} new ${batch.created === 1 ? 'person has' : 'people have'} joined your team.` : `${batch.created} of ${batch.total} hired${batch.failed ? `, ${batch.failed} not hired` : ''}.`}</p>
      <progress className="company-progress" max={batch.total} value={batch.created} aria-label="Hiring progress">{batch.created} of {batch.total}</progress>
      <ul className="company-batch-deps" aria-label="Progress per department">{batch.departments.map(d =>
        <li key={d.department}><span>{label(d.department)}</span><span>{d.created} / {d.total}{d.failed ? ` · ${d.failed} not hired` : ''}</span></li>)}
      </ul>
    </> : <p>Starting the hire…</p>}
    <div className="hire-actions">
      {phase === 'stopped' && batch && batch.failed > 0 && batch.pending === 0 && <button type="button" className="primary" disabled={busy} onClick={() => void controller.retryFailed()}>Try the {batch.failed} again</button>}
      {(phase === 'stopped' || phase === 'error') && !(batch && batch.done) && <button type="button" className="primary" disabled={busy} onClick={() => void controller.continueBatch()}>Continue</button>}
      {!busy && <button type="button" className={phase === 'done' ? 'primary' : undefined} onClick={onClose}>Back to team</button>}
    </div>
  </div>;
}
