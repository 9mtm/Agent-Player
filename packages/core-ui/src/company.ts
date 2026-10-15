import { SessionFailure } from './session-failure';
import { department as validDepartment, displayName, validCreateBody, CATALOGUE_PATH, PLAN_PATH } from './hire-contract.js';
import type { CreateBody, Preset, Role } from './hire';
import type { SessionClient } from './session';

export type CompanySize = 'solo' | 'small' | 'medium' | 'large';
export type PlanBody = { size: CompanySize; departments: string[]; language?: string };
export type CatalogueDepartment = Readonly<{ id: string; label: string; summary: string }>;
export type Catalogue = Readonly<{ sizes: readonly Readonly<{ id: CompanySize; label: string }>[]; departments: readonly CatalogueDepartment[] }>;
export type HireStatus = 'planned' | 'creating' | 'created' | 'failed' | 'unknown';
export type PlannedHire = Readonly<{
  key: string; department: string; departmentLabel: string; role: Role; title: string; description: string; preset: Preset;
  name: string; include: boolean; status: HireStatus; note?: string;
}>;
export type CompanyStep = 'size' | 'departments' | 'review' | 'hiring' | 'done';
export type CompanyState = Readonly<{
  step: CompanyStep; owner: boolean;
  phase: 'idle' | 'loading' | 'ready' | 'planning' | 'hiring' | 'done' | 'error' | 'stopped' | 'denied';
  catalogue?: Catalogue; size?: CompanySize; departments: readonly string[]; hires: readonly PlannedHire[]; notice?: string;
}>;

export const MAX_DEPARTMENTS = 12;
export const MAX_CUSTOM = 4;
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
export const normalizeDepartment = (x: string) => x.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();

/** The create body for one reviewed hire (role + persona preset), or null when invalid. */
export function hireBody(h: PlannedHire): CreateBody | null {
  const name = h.name.normalize('NFKC').replace(/\s+/g, ' ').trim();
  const body: CreateBody = { ...(name ? { name } : {}), role: h.role, department: h.department, description: h.description, personality: { preset: h.preset } };
  return validCreateBody(body) ? body : null;
}

export class CompanyController {
  #state: CompanyState = Object.freeze({ step: 'size', owner: false, phase: 'denied', departments: [], hires: [] });
  #listeners = new Set<() => void>();
  #disposed = false; #ticket = 0; #abort?: AbortController; #identity = ''; #unsubscribe: () => void;
  constructor(readonly client: SessionClient) { this.#unsubscribe = client.subscribe(this.#sync); this.#sync(); }
  getSnapshot = () => this.#state;
  subscribe = (fn: () => void) => { this.#listeners.add(fn); return () => { this.#listeners.delete(fn); }; };
  #publish(patch: Partial<CompanyState>) { this.#state = Object.freeze({ ...this.#state, ...patch }); this.#listeners.forEach(fn => fn()); }
  #sync = () => {
    const s = this.client.getSnapshot(); const identity = `${s.mode}:${s.epoch}:${s.phase}:${s.user?.id ?? ''}:${s.user?.role ?? ''}`;
    if (identity === this.#identity) return;
    this.#identity = identity; this.#invalidate();
    const owner = s.phase === 'authenticated' && s.user?.role === 'owner';
    this.#publish({ step: 'size', owner, phase: owner ? 'idle' : 'denied', catalogue: undefined, size: undefined, departments: [], hires: [], notice: s.phase === 'authenticated' && !owner ? 'Only the owner can build the company.' : undefined });
  };
  #invalidate() { this.#ticket++; this.#abort?.abort(); }
  #begin(phase: CompanyState['phase']) { this.#invalidate(); this.#abort = new AbortController(); this.#publish({ phase, notice: undefined }); return this.#ticket; }
  #busy() { return ['loading', 'planning', 'hiring'].includes(this.#state.phase); }
  #refused(status: number, body: unknown): boolean {
    if (status === 403 && record(body) && body.code === 'read_only_stage') { this.#publish({ phase: 'error', notice: 'This test server does not accept this yet. Nothing was saved.' }); return true; }
    if (status === 401 || status === 403) { this.#invalidate(); this.#publish({ phase: 'denied', notice: 'Access denied. Sign in again as the owner.' }); return true; }
    return false;
  }
  dispose() { this.#disposed = true; this.#invalidate(); this.#unsubscribe(); this.#publish({ owner: false, phase: 'denied', hires: [] }); }

  restart() {
    if (!this.#state.owner || this.#busy()) return;
    this.#invalidate();
    this.#publish({ step: 'size', phase: this.#state.catalogue ? 'ready' : 'idle', size: undefined, departments: [], hires: [], notice: undefined });
  }

  /** Explicit read of sizes and departments (never on mount). */
  async loadCatalogue() {
    if (!this.#state.owner || this.#busy() || this.#disposed) return;
    const ticket = this.#begin('loading');
    try {
      const r = await this.client.request({ method: 'GET', path: CATALOGUE_PATH }, this.#abort!.signal);
      if (ticket !== this.#ticket) return;
      if (this.#refused(r.status, r.body)) return;
      const b = r.body as Catalogue | null;
      if (r.status !== 200 || !b || !b.sizes.length) throw Error();
      this.#publish({ catalogue: Object.freeze(b), phase: 'ready' });
    } catch { if (ticket === this.#ticket) this.#publish({ phase: 'error', notice: 'The list of departments could not be read. Try again.' }); }
  }

  chooseSize(size: CompanySize) {
    if (!this.#state.owner || this.#busy() || !this.#state.catalogue?.sizes.some(s => s.id === size)) return;
    this.#publish({ size, step: 'departments', notice: undefined });
  }
  back() {
    const s = this.#state; if (this.#busy()) return;
    if (s.step === 'departments') this.#publish({ step: 'size', notice: undefined });
    else if (s.step === 'review') this.#publish({ step: 'departments', notice: undefined });
  }
  toggleDepartment(id: string) {
    const s = this.#state; if (!s.owner || this.#busy() || s.step !== 'departments') return;
    const dep = normalizeDepartment(id);
    if (s.departments.includes(dep)) return this.#publish({ departments: Object.freeze(s.departments.filter(d => d !== dep)) });
    if (s.departments.length >= MAX_DEPARTMENTS) return this.#publish({ notice: `At most ${MAX_DEPARTMENTS} departments.` });
    this.#publish({ departments: Object.freeze([...s.departments, dep]), notice: undefined });
  }
  addCustom(name: string) {
    const s = this.#state; if (!s.owner || this.#busy() || s.step !== 'departments') return false;
    const dep = normalizeDepartment(name);
    if (!dep || !validDepartment(dep)) { this.#publish({ notice: 'Department: up to 64 letters, numbers, spaces, - or _.' }); return false; }
    const known = new Set(s.catalogue?.departments.map(d => d.id) ?? []);
    if (s.departments.filter(d => !known.has(d)).length >= MAX_CUSTOM && !known.has(dep) && !s.departments.includes(dep)) { this.#publish({ notice: `At most ${MAX_CUSTOM} custom departments.` }); return false; }
    if (!s.departments.includes(dep)) this.toggleDepartment(dep);
    return true;
  }

  /** Ask the server for a proposed team (reads only; names are not reserved). */
  async propose() {
    const s = this.#state;
    if (!s.owner || this.#busy() || !s.size || !s.departments.length) return;
    const ticket = this.#begin('planning');
    try {
      const r = await this.client.request({ method: 'POST', path: PLAN_PATH, body: { size: s.size, departments: [...s.departments] } }, this.#abort!.signal);
      if (ticket !== this.#ticket) return;
      if (this.#refused(r.status, r.body)) return;
      const b = r.body as { hires?: Omit<PlannedHire, 'key' | 'include' | 'status'>[]; code?: string } | null;
      if (r.status !== 200 || !b?.hires) return this.#publish({ phase: 'error', notice: b?.code === 'invalid_plan' ? 'The server refused these choices. Check the departments.' : 'No team could be proposed. Try again.' });
      const hires = b.hires.map((h, i) => Object.freeze({ ...h, key: `h${i}`, include: true, status: 'planned' as const }));
      this.#publish({ hires: Object.freeze(hires), step: 'review', phase: 'ready' });
    } catch (error) {
      if (ticket !== this.#ticket) return;
      this.#publish({ phase: 'error', notice: error instanceof SessionFailure && error.code === 'blocked' ? 'Nothing was sent. Check the choices.' : 'No team could be proposed. Try again.' });
    }
  }

  edit(key: string, patch: Partial<Pick<PlannedHire, 'name' | 'include' | 'preset' | 'role'>>) {
    const s = this.#state; if (!s.owner || this.#busy() || s.step !== 'review') return;
    this.#publish({ hires: Object.freeze(s.hires.map(h => h.key === key && h.status !== 'created' ? Object.freeze({ ...h, ...patch }) : h)), notice: undefined });
  }

  /**
   * Hire every included proposal, one create at a time. A refused hire is
   * marked and the rest continue; an unknown outcome stops the run and is
   * never retried automatically.
   */
  async hireAll() {
    const s = this.#state;
    if (!s.owner || this.#busy() || s.step !== 'review') return;
    const chosen = s.hires.filter(h => h.include && h.status !== 'created');
    if (!chosen.length) return this.#publish({ notice: 'Choose at least one person to hire.' });
    const invalid = chosen.find(h => !hireBody(h) || (h.name.trim() && !displayName(h.name.normalize('NFKC').replace(/\s+/g, ' ').trim())));
    if (invalid) return this.#publish({ notice: `Check the name of ${invalid.title}: up to 60 characters, no hidden characters.` });
    const ticket = this.#begin('hiring');
    this.#publish({ step: 'hiring' });
    for (const planned of chosen) {
      if (ticket !== this.#ticket || this.#disposed) return;
      this.#mark(planned.key, { status: 'creating' });
      try {
        const r = await this.client.request({ method: 'POST', path: '/api/agents', body: hireBody(planned)! }, this.#abort!.signal);
        if (ticket !== this.#ticket) return;
        if (r.status === 401 || (r.status === 403 && !(record(r.body) && r.body.code === 'read_only_stage'))) { this.#mark(planned.key, { status: 'failed', note: 'Refused' }); this.#refused(r.status, r.body); return; }
        const b = r.body as { agent?: { name?: string }; code?: string } | null;
        if (r.status === 201 && b?.agent) this.#mark(planned.key, { status: 'created', name: b.agent.name ?? planned.name });
        else this.#mark(planned.key, { status: 'failed', note: b?.code === 'name_taken' ? 'Name already used' : b?.code === 'read_only_stage' ? 'Server is read-only' : 'Refused' });
      } catch {
        if (ticket !== this.#ticket) return;
        this.#mark(planned.key, { status: 'unknown', note: 'Result unknown' });
        return this.#publish({ phase: 'stopped', notice: 'One hire has an unknown result, so the rest were not sent. Open Your team to check, then try the remaining ones.' });
      }
    }
    const failed = this.#state.hires.filter(h => h.include && h.status === 'failed').length;
    this.#publish(failed
      ? { phase: 'stopped', step: 'review', notice: `${failed} hire${failed === 1 ? '' : 's'} could not be created. Fix them and hire again; the others are already on your team.` }
      : { phase: 'done', step: 'done', notice: undefined });
  }

  #mark(key: string, patch: Partial<PlannedHire>) {
    this.#publish({ hires: Object.freeze(this.#state.hires.map(h => h.key === key ? Object.freeze({ ...h, ...patch }) : h)) });
  }
}
