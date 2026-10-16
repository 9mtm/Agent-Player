import { chatMemoryPath } from './chat-memory-contract.js';
import type { ChatMemory } from './chat-memory-contract.js';
import type { WireRequest, WireResponse } from './session';

const copy = <T,>(value: T): T => structuredClone(value);
async function digest(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}

type MockProposal = { id: string; conversationId: string; messageId: string; text: string; drawerId: string; status: 'pending' | 'approved' | 'rejected'; reviewHash: string };

/**
 * Fictional chat memory for offline practice and tests: "Remember this" saves
 * in memory only, secrets look like `sk-…`, and `proposeFromAgent` plays an
 * agent's memory proposal that the owner accepts or rejects with its review hash.
 */
export function createChatMemoryMock() {
  const links: (ChatMemory & { conversationId: string })[] = [];
  const proposals = new Map<string, MockProposal>();
  let serial = 0;
  const id = (p: string) => `${p}-${String(++serial).padStart(8, '0')}`;
  const now = () => '2026-10-16 10:00:00';
  const proposalBody = (p: MockProposal) => ({
    id: p.id, userId: 'mock-owner', agentId: 'sample-main', drawer: { kind: p.drawerId }, drawerId: p.drawerId,
    baseHash: '0'.repeat(64), baseRevision: 1, changes: [{ op: 'add', after: { type: 'fact', importance: 5, content: p.text } }], status: p.status,
    source: 'agent', note: null, createdBy: 'agent:sample-main', createdAt: '2026-10-16T10:00:00.000Z', decidedBy: p.status === 'pending' ? null : 'mock-owner',
    decidedAt: p.status === 'pending' ? null : '2026-10-16T10:01:00.000Z', appliedRevision: null, reasons: ['chat'], importBatchId: null, reviewHash: p.reviewHash,
  });
  const view = (conversationId: string) => links.filter(l => l.conversationId === conversationId).map(({ conversationId: _c, ...l }) => {
    const p = l.proposalId ? proposals.get(l.proposalId) : undefined;
    if (!p) return l;
    return p.status === 'approved' ? { ...l, status: 'saved' as const, memoryId: `mem-${p.id}` } : { ...l, status: p.status };
  });

  async function transport(request: Pick<WireRequest, 'method' | 'path' | 'body'>): Promise<WireResponse> {
    const conv = chatMemoryPath(request.path);
    if (conv && request.method === 'GET') return { status: 200, body: { memories: copy(view(conv)) } };
    if (conv && request.method === 'POST') {
      const b = request.body as { messageId?: string; runId?: string; content: string; drawer: string };
      const red = (b.content.match(/sk-[A-Za-z0-9]{8,}/g) ?? []).length;
      const text = b.content.replace(/sk-[A-Za-z0-9]{8,}/g, '[REDACTED:openai_key]').trim();
      if (!text.replace(/\[REDACTED:[a-z_]+\]/g, '').trim()) return { status: 400, body: { code: 'only_secrets', error: 'x' } };
      const drawerId = b.drawer === 'project' ? 'project:sample-alpha' : b.drawer;
      const memory = { id: id('link'), kind: 'remembered' as const, messageId: b.messageId ?? 'msg-from-run-0001', drawerId, text, memoryId: id('mem'), proposalId: null, status: 'saved' as const, createdAt: now() };
      links.push({ ...memory, conversationId: conv });
      return { status: 201, body: { memory, redacted: red, duplicate: false } };
    }
    const pid = /^\/api\/memory\/proposals\/([A-Za-z0-9-]{1,64})(?:\/(approve|reject))?$/.exec(request.path);
    const p = pid ? proposals.get(pid[1]) : undefined;
    if (!pid || !p) return { status: 404, body: null };
    if (request.method === 'GET' && !pid[2]) return { status: 200, body: proposalBody(p) };
    if (p.status !== 'pending') return { status: 409, body: { code: 'already_decided' } };
    if ((request.body as { expectedReviewHash?: string })?.expectedReviewHash !== p.reviewHash) return { status: 409, body: { code: 'review_changed' } };
    p.status = pid[2] === 'approve' ? 'approved' : 'rejected';
    return { status: 200, body: pid[2] === 'approve' ? { proposal: proposalBody(p), revision: 2, applied: { added: [`mem-${p.id}`], updated: [], deleted: [] } } : proposalBody(p) };
  }

  return {
    transport,
    /** Whether this mock answers the request (its own proposals and chat memory paths). */
    handles(path: string) {
      if (chatMemoryPath(path)) return true;
      const m = /^\/api\/memory\/proposals\/([A-Za-z0-9-]{1,64})/.exec(path);
      return !!m && proposals.has(m[1]);
    },
    /** An agent proposes a memory in a conversation, after the owner message `messageId`. */
    async proposeFromAgent(conversationId: string, messageId: string, text: string, drawerId = 'experience') {
      const p: MockProposal = { id: id('prop'), conversationId, messageId, text, drawerId, status: 'pending', reviewHash: '' };
      p.reviewHash = await digest(['review', p.id, text]);
      proposals.set(p.id, p);
      links.push({ id: id('link'), kind: 'proposed', messageId, drawerId, text, memoryId: null, proposalId: p.id, status: 'pending', createdAt: now(), conversationId });
      return p.id;
    },
    /** The owner's message changed the proposal meanwhile (tests the review hash). */
    async changeProposal(proposalId: string, text: string) { const p = proposals.get(proposalId)!; p.text = text; p.reviewHash = await digest(['review', p.id, text]); },
  };
}
