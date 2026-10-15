import type { SessionClient } from './session';
import { SessionFailure } from './session-failure';
import { parsePersonalityProposal, personalityAgentId, personalityProposalId, personalityResponse } from './personality-contract.js';
import type { PersonalityProposal } from './personality-contract.js';

export interface PersonalityState {
  agentId: string; owner: boolean; phase: 'idle'|'loading'|'ready'|'deciding'|'denied'|'error'|'conflict'|'unknown'|'approved'|'rejected';
  proposals: PersonalityProposal[]; detail?: PersonalityProposal; consent: boolean; notice?: string;
}
// Sent outcomes survive pane remounts and account/session changes on this client.
const uncertain = new WeakMap<SessionClient, Set<string>>();
export class PersonalityController {
  private state: PersonalityState = { agentId: '', owner: false, phase: 'idle', proposals: [], consent: false };
  private listeners = new Set<() => void>();
  private generation = 0;
  private abort = new AbortController();
  private binding = '';
  private selectedVersion?: number;
  private consentSnapshot?: string;
  private ledger: Set<string>;
  private unsubscribe: () => void;
  constructor(private client: SessionClient) {
    this.ledger = uncertain.get(client) ?? new Set(); uncertain.set(client, this.ledger);
    const sync = () => {
      const s = client.getSnapshot(); const binding = JSON.stringify([s.mode,s.epoch,s.phase,s.user?.id,s.user?.role]);
      if (binding === this.binding) return;
      this.binding = binding; this.next();
      this.publish({ agentId: '', owner: s.phase === 'authenticated' && s.user?.role === 'owner', phase: 'idle', proposals: [], consent: false });
    };
    sync(); this.unsubscribe = client.subscribe(sync);
  }
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private publish(s: PersonalityState) {
    // Freeze the entire review to prevent mutation through a subscriber snapshot.
    const freeze = (x: unknown): void => { if (x && typeof x === 'object') { Object.values(x).forEach(freeze); Object.freeze(x); } };
    freeze(s); this.state = s; this.listeners.forEach(fn => fn());
  }
  private next() { this.abort.abort(); this.abort = new AbortController(); this.consentSnapshot = undefined; return ++this.generation; }
  private root() { return `/api/agents/${this.state.agentId}/personality/proposals`; }
  private key(p: PersonalityProposal) { return JSON.stringify([this.client.getSnapshot().user?.id,p.agentId,p.id]); }
  private snapshot() { return JSON.stringify([this.binding,this.generation,this.state.agentId,this.state.detail]); }
  select(agentId: string, version?: number) {
    if (agentId === this.state.agentId && version === this.selectedVersion) return;
    this.selectedVersion = version;
    this.next(); this.publish({ agentId: personalityAgentId(agentId) ? agentId : '', owner: this.state.owner, phase: 'idle', proposals: [], consent: false });
  }
  dispose() { this.unsubscribe(); this.next(); this.publish({ agentId: '', owner: false, phase: 'idle', proposals: [], consent: false }); this.listeners.clear(); }
  private eligible() { return this.state.owner && personalityAgentId(this.state.agentId) && this.state.phase !== 'deciding'; }
  private async read(path: string, signal: AbortSignal) {
    const r = await this.client.request({ method: 'GET', path },signal);
    if (r.status !== 200) throw new Error(r.status === 401 || r.status === 403 ? 'denied' : 'error');
    return personalityResponse(path,r.status,r.body);
  }
  async list() {
    if (!this.eligible()) return;
    const path = this.root(), ticket = this.next();
    this.publish({ ...this.state, phase: 'loading', proposals: [], detail: undefined, consent: false, notice: undefined });
    try {
      const body = await this.read(path,this.abort.signal) as { proposals: PersonalityProposal[] };
      if (ticket === this.generation) this.publish({ ...this.state, phase: 'ready', proposals: body.proposals });
    } catch(e) { this.failRead(e,ticket); }
  }
  private failRead(e: unknown,ticket: number) {
    if (ticket !== this.generation) return;
    this.publish({ ...this.state, phase: e instanceof Error && e.message === 'denied' ? 'denied' : 'error', detail: undefined, proposals: [], consent: false, notice: 'Read unavailable. No decision was sent. Read again explicitly.' });
  }
  async open(id: string) {
    if (!this.eligible() || !personalityProposalId(id) || !this.state.proposals.some(p => p.id === id)) return;
    const path = `${this.root()}/${id}`, ticket = this.next();
    this.publish({ ...this.state, phase: 'loading', detail: undefined, consent: false, notice: undefined });
    try {
      const detail = parsePersonalityProposal(await this.read(path,this.abort.signal));
      if (ticket !== this.generation) return;
      const unknown = this.ledger.has(this.key(detail));
      this.publish({ ...this.state, phase: unknown ? 'unknown' : 'ready', detail, notice: unknown ? 'Earlier decision outcome is unknown. This read shows current state only; another decision is blocked.' : undefined });
    } catch(e) { this.failRead(e,ticket); }
  }
  review(checked: boolean) {
    const p = this.state.detail;
    if (!p || !this.state.owner || this.state.phase !== 'ready' || p.status !== 'pending' || this.ledger.has(this.key(p))) return;
    this.consentSnapshot = checked ? this.snapshot() : undefined;
    this.publish({ ...this.state, consent: checked });
  }
  async decide(action: 'approve'|'reject') {
    const p = this.state.detail;
    if (!['approve','reject'].includes(action) || !p || !this.state.owner || this.state.phase !== 'ready' || p.status !== 'pending'
      || !this.state.consent || this.consentSnapshot !== this.snapshot() || this.ledger.has(this.key(p))) return;
    const key = this.key(p), path = `${this.root()}/${p.id}`, ticket = this.next();
    this.ledger.add(key);
    this.publish({ ...this.state, phase: 'deciding', consent: false, notice: 'Decision in progress. Do not resend.' });
    let status: number | undefined;
    try {
      const r = await this.client.request({ method: 'POST', path: `${path}/${action}`, body: { expectedReviewHash: p.reviewHash } },this.abort.signal);
      status = r.status;
      if ([400,401,403,404,409,421,429].includes(status)) {
        this.ledger.delete(key);
        if (ticket !== this.generation) return;
        const code = (r.body as { code?: string } | null)?.code;
        this.publish({ ...this.state, phase: status === 409 ? 'conflict' : status === 401 || status === 403 ? 'denied' : 'error', detail: undefined, consent: false,
          notice: status === 409 ? `Conflict${code ? ` (${code})` : ''}. Refreshed details require a new full review; no decision is retried.` : 'Decision refused. Read again before any new decision; no automatic retry.' });
        if (status === 409) {
          try {
            const detail = parsePersonalityProposal(await this.read(path,this.abort.signal));
            if (ticket === this.generation) this.publish({ ...this.state, detail, phase: 'ready' });
          } catch { /* Keep conflict and no consent if the read fails. */ }
        }
        return;
      }
      if (status !== 200) throw Error();
      const result = personalityResponse(`${path}/${action}`,status,r.body) as PersonalityProposal | { proposal: PersonalityProposal };
      const detail = parsePersonalityProposal('proposal' in result ? result.proposal : result);
      const reviewedFields = ['id','agentId','baseVersion','baseTraits','proposedTraits','delta','reason','evidence','source','createdBy','createdAt','reviewHash'] as const;
      if (reviewedFields.some(k => JSON.stringify(p[k]) !== JSON.stringify(detail[k])) || detail.decidedBy !== this.client.getSnapshot().user?.id) throw Error();
      this.ledger.delete(key);
      if (ticket === this.generation) this.publish({ ...this.state, detail, phase: action === 'approve' ? 'approved' : 'rejected', notice: action === 'approve' ? 'Approval acknowledged; a new personality version was applied.' : 'Rejection acknowledged; personality was not changed.' });
    } catch(e) {
      if (e instanceof SessionFailure && e.code === 'blocked') this.ledger.delete(key);
      if (ticket !== this.generation) return;
      const unknown = this.ledger.has(key);
      this.publish({ ...this.state, detail: undefined, consent: false, phase: unknown ? 'unknown' : 'denied', notice: unknown ? 'Decision outcome unknown. Do not resend. Read current state explicitly; a read cannot prove this request succeeded.' : 'Decision was not sent. Access is unavailable.' });
    }
  }
}
