import { fixtureContext, fixtureProposal } from './memory-fixture';
import type { Entry, Proposal, MemoryContext } from './memory';
import type { WireTransport } from './session';

const copy = <T,>(value: T): T => structuredClone(value);
async function digest(value: unknown, raw = false): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw ? value as string : JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
/** Fictional in-memory contract exercise; no backend, embedding, files or persistence. */
export function createMemoryMock(options: { source?: Proposal['source']; beforeDecision?: () => Promise<void> } = {}) {
  const context: MemoryContext = { ...fixtureContext, userId: 'mock-owner' };
  let proposal = fixtureProposal(context);
  proposal.source = options.source ?? 'upload';
  let revision = 3;
  const entries = new Map<string, Entry>(proposal.changes.flatMap(c => 'before' in c ? [[c.id, copy(c.before)] as [string, Entry]] : []));
  const drawerHash = () => digest([...entries].sort(([a], [b]) => a.localeCompare(b)).map(([id, e]) => JSON.stringify([id, e.type, e.importance, e.content]) + '\n').join(''), true);
  const refresh = async () => { proposal.reviewHash = await digest(['memory-proposal-review/v1', proposal.id, proposal.drawerId, proposal.baseRevision, proposal.baseHash, proposal.source, proposal.changes]); };
  const ready = (async () => { proposal.baseHash = await drawerHash(); await refresh(); })();
  const failure = (status: number, code?: string) => ({ status, body: { error: 'Fictional contract refusal', ...(code ? { code } : {}) } });
  const transport: WireTransport = async request => {
    await ready;
    if (request.signal.aborted) throw new Error('cancelled');
    if (request.method === 'GET' && request.path === '/api/memory/files/owner?agentId=sample-main') {
      return { status: 200, body: { drawer: { kind: 'owner' }, drawerId: 'owner', agentId: 'sample-main', revision, hash: await drawerHash(), count: entries.size, path: 'fictional/owner.md', content: [...entries.values()].map(e => e.content).join('\n') } };
    }
    if (request.method === 'GET' && request.path === '/api/memory/proposals?status=pending') {
      const { changes, ...rest } = copy(proposal);
      return { status: 200, body: { proposals: proposal.status === 'pending' ? [{ ...rest, counts: { add: changes.filter(c => c.op === 'add').length, update: changes.filter(c => c.op === 'update').length, delete: changes.filter(c => c.op === 'delete').length } }] : [] } };
    }
    if (request.method === 'GET' && request.path === `/api/memory/proposals/${proposal.id}`) return { status: 200, body: copy(proposal) };
    const match = /^\/api\/memory\/proposals\/([A-Za-z0-9-]{1,64})\/(approve|reject)$/.exec(request.path);
    if (request.method !== 'POST' || !match || match[1] !== proposal.id) return failure(404);
    const body = request.body as { expectedReviewHash?: unknown; note?: unknown } | undefined;
    const check = () => {
      if (proposal.status !== 'pending') return failure(409, 'already_decided');
      if (!body || typeof body.expectedReviewHash !== 'string' || !/^[a-f0-9]{64}$/.test(body.expectedReviewHash)) return failure(400, 'review_hash_required');
      if (body.expectedReviewHash !== proposal.reviewHash) return failure(409, 'review_changed');
      return undefined;
    };
    const early = check(); if (early) return early;
    if (match[2] === 'approve') await options.beforeDecision?.();
    // Hash asynchronously, then validate/claim synchronously: competing decisions cannot both win.
    const currentHash = await drawerHash();
    const refusal = check(); if (refusal) return refusal;
    if (match[2] === 'approve') {
      const stale = proposal.source === 'file' || proposal.source === 'upload' ? currentHash !== proposal.baseHash
        : proposal.changes.some(c => c.op !== 'add' && JSON.stringify(entries.get(c.id)) !== JSON.stringify(c.before));
      if (stale) { proposal.status = 'stale'; proposal.decidedBy = context.userId; proposal.decidedAt = '2026-10-14T08:01:00.000Z'; return failure(409, 'stale'); }
    }
    proposal.status = match[2] === 'approve' ? 'approved' : 'rejected';
    proposal.decidedBy = context.userId; proposal.decidedAt = '2026-10-14T08:01:00.000Z';
    if (match[2] === 'reject') {
      if (typeof body?.note === 'string' && body.note) proposal.note = body.note.slice(0, 500);
      return { status: 200, body: copy(proposal) };
    }
    const applied = { added: [] as string[], updated: [] as string[], deleted: [] as string[] };
    for (const [index, c] of proposal.changes.entries()) {
      if (c.op === 'add') { const id = `fictional-added-${index}`; entries.set(id, copy(c.after)); applied.added.push(id); }
      else if (c.op === 'update') { entries.set(c.id, copy(c.after)); applied.updated.push(c.id); }
      else { entries.delete(c.id); applied.deleted.push(c.id); }
    }
    revision++; proposal.appliedRevision = revision;
    return { status: 200, body: { proposal: copy(proposal), revision, applied } };
  };
  return { transport, context,
    async changeEntry(id: string, entry: Entry) { await ready; entries.set(id, copy(entry)); revision++; },
    async changeReview(content: string) { await ready; const c = proposal.changes.find(c => c.op === 'add'); if (c?.op === 'add') c.after.content = content; await refresh(); },
  };
}
