import { chatMemoriesPath, validRemember, MAX_REMEMBER } from './chat-memory-contract.js';
import type { ChatMemory, RememberDrawer, RememberType } from './chat-memory-contract.js';
import { parseProposal } from './memory';
import type { SessionClient } from './session';

export type { ChatMemory, RememberDrawer, RememberType } from './chat-memory-contract.js';
export { MAX_REMEMBER } from './chat-memory-contract.js';

/** What the owner checks before deciding an agent's proposal: the full text and the hash it was read with. */
export type ProposalReview = Readonly<{ text: string; drawerId: string; reviewHash: string }>;
export type RememberInput = { messageId?: string; runId?: string; content: string; drawer: RememberDrawer; type?: RememberType; importance?: number };
export type ChatMemoryState = Readonly<{
  owner: boolean;
  conversationId: string | null;
  phase: 'idle' | 'loading' | 'ready' | 'error';
  memories: readonly ChatMemory[];
  /** Pending proposals read in full (by proposal id). */
  reviews: Readonly<Record<string, ProposalReview>>;
  saving: boolean;
  /** The proposal being accepted or rejected right now. */
  deciding: string | null;
  notice?: string;
}>;

const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/**
 * Chat memory (CHAT-PRO-02 E), owner only: "Remember this" on a message, the
 * agent's memory proposals with Accept / Reject, and the memories that came
 * from the open conversation. Read when a conversation opens and after each
 * reply. Deciding a proposal reads it in full first and sends its review hash
 * through the existing proposal routes; nothing is decided without it.
 */
export class ChatMemoryController {
  #state: ChatMemoryState = Object.freeze({ owner: false, conversationId: null, phase: 'idle', memories: [], reviews: {}, saving: false, deciding: null });
  #listeners = new Set<() => void>();
  #ticket = 0; #unsubscribe: () => void; #disposed = false;
  constructor(readonly client: SessionClient) { this.#unsubscribe = client.subscribe(this.#sync); this.#sync(); }
  getSnapshot = () => this.#state;
  subscribe = (fn: () => void) => { this.#listeners.add(fn); return () => { this.#listeners.delete(fn); }; };
  #publish(patch: Partial<ChatMemoryState>) { if (this.#disposed) return; this.#state = Object.freeze({ ...this.#state, ...patch }); this.#listeners.forEach(fn => fn()); }
  #sync = () => {
    const s = this.client.getSnapshot();
    const owner = s.phase === 'authenticated' && s.user?.role === 'owner';
    if (owner !== this.#state.owner) { this.#ticket++; this.#publish({ owner, memories: [], reviews: {}, phase: 'idle' }); }
  };
  dispose() { this.#ticket++; this.#unsubscribe(); this.#disposed = true; this.#listeners.clear(); }

  /** The conversation now shown in the chat (null = a new, unsaved chat). */
  setConversation(id: string | null) {
    if (id === this.#state.conversationId) return;
    this.#ticket++;
    this.#publish({ conversationId: id, memories: [], reviews: {}, phase: 'idle', notice: undefined, deciding: null });
    if (id) void this.refresh();
  }

  async refresh() {
    const id = this.#state.conversationId;
    if (!id || !this.#state.owner || this.#disposed) return;
    const ticket = ++this.#ticket;
    if (!this.#state.memories.length) this.#publish({ phase: 'loading' });
    try {
      const r = await this.client.request({ method: 'GET', path: chatMemoriesPath(id) });
      if (ticket !== this.#ticket) return;
      const b = r.body as { memories?: ChatMemory[] } | null;
      if (r.status !== 200 || !b?.memories) { this.#publish({ phase: 'error' }); return; }
      this.#publish({ phase: 'ready', memories: Object.freeze(b.memories.map(m => Object.freeze(m))) });
      for (const m of b.memories) if (m.status === 'pending' && m.proposalId && !this.#state.reviews[m.proposalId]) void this.review(m.proposalId);
    } catch { if (ticket === this.#ticket) this.#publish({ phase: 'error' }); }
  }

  /** Read a pending proposal in full (its text and review hash). */
  async review(proposalId: string): Promise<ProposalReview | null> {
    if (!this.#state.owner) return null;
    try {
      const r = await this.client.request({ method: 'GET', path: `/api/memory/proposals/${encodeURIComponent(proposalId)}` });
      if (r.status !== 200) return null;
      const p = parseProposal(r.body);
      const add = p.changes.length === 1 && p.changes[0].op === 'add' ? p.changes[0] : null;
      if (p.id !== proposalId || !add) return null;
      const review = Object.freeze({ text: add.after.content, drawerId: p.drawerId, reviewHash: p.reviewHash });
      this.#publish({ reviews: Object.freeze({ ...this.#state.reviews, [proposalId]: review }) });
      return review;
    } catch { return null; }
  }

  /** "Remember this": save (an edited copy of) a message. True when it was saved. */
  async remember(input: RememberInput): Promise<boolean> {
    const id = this.#state.conversationId;
    if (!id || !this.#state.owner || this.#state.saving) return false;
    const body: Record<string, unknown> = { content: input.content.replace(/\r\n?/g, '\n').trim(), drawer: input.drawer };
    if (input.messageId) body.messageId = input.messageId; else if (input.runId) body.runId = input.runId;
    if (input.type) body.type = input.type;
    if (input.importance !== undefined) body.importance = input.importance;
    if (!validRemember(body)) { this.#publish({ notice: `A memory needs text (1–${MAX_REMEMBER} characters) and a drawer.` }); return false; }
    this.#publish({ saving: true, notice: undefined });
    try {
      const r = await this.client.request({ method: 'POST', path: chatMemoriesPath(id), body });
      if (r.status === 201 && record(r.body)) {
        const red = typeof r.body.redacted === 'number' ? r.body.redacted : 0;
        this.#publish({ saving: false, notice: r.body.duplicate === true ? 'Already in memory; linked to this chat.' : red ? `Saved. ${red} secret ${red === 1 ? 'value was' : 'values were'} left out.` : 'Saved to memory.' });
        await this.refresh();
        return true;
      }
      const code = record(r.body) ? r.body.code : undefined;
      this.#publish({ saving: false, notice: code === 'only_secrets' ? 'Nothing is left to remember once secrets are removed.' : code === 'read_only_stage' ? 'This test server does not accept memory changes.' : code === 'not_found' ? 'This conversation no longer exists.' : 'The memory was not saved. Check the text and drawer.' });
    } catch { this.#publish({ saving: false, notice: 'The memory may not have been saved. The chat reads its memories again.' }); void this.refresh(); }
    return false;
  }

  /** Accept or reject an agent's proposal, with the review hash it was read with. True when decided. */
  async decide(memory: ChatMemory, action: 'approve' | 'reject'): Promise<boolean> {
    const pid = memory.proposalId;
    if (!pid || memory.status !== 'pending' || !this.#state.owner || this.#state.deciding) return false;
    this.#publish({ deciding: pid, notice: undefined });
    try {
      const review = this.#state.reviews[pid] ?? await this.review(pid);
      if (!review) { this.#publish({ deciding: null, notice: 'The proposal could not be read. Try again.' }); return false; }
      const r = await this.client.request({ method: 'POST', path: `/api/memory/proposals/${encodeURIComponent(pid)}/${action}`, body: { expectedReviewHash: review.reviewHash } });
      const code = record(r.body) ? r.body.code : undefined;
      this.#publish({
        deciding: null,
        notice: r.status === 200 ? (action === 'approve' ? 'Saved to memory.' : 'Not saved.') : code === 'review_changed' ? 'The proposal changed; read it again before deciding.' : code === 'already_decided' ? 'Already decided.' : code === 'stale' ? 'The memory changed meanwhile; nothing was saved.' : 'Not decided. Try again.',
        ...(code === 'review_changed' ? { reviews: Object.freeze(Object.fromEntries(Object.entries(this.#state.reviews).filter(([k]) => k !== pid))) } : {}),
      });
      await this.refresh();
      return r.status === 200;
    } catch { this.#publish({ deciding: null, notice: 'The decision may not have been saved. The chat reads its memories again.' }); void this.refresh(); return false; }
  }

  clearNotice() { if (this.#state.notice) this.#publish({ notice: undefined }); }
}

/** Where a message is found: its stored id, or (a reply that just ended) its run. */
export function messageRef(turn: { key: string; role: string; runId: string | null; pending?: boolean }): { messageId: string } | { runId: string } | null {
  if (turn.pending) return null;
  if (/^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/.test(turn.key)) return { messageId: turn.key };
  return turn.role === 'assistant' && turn.runId ? { runId: turn.runId } : null;
}

/** The text a "Remember this" form starts with: the message, cut to the limit. */
export function rememberDraft(text: string): string {
  return [...text.replace(/\r\n?/g, '\n').trim()].slice(0, MAX_REMEMBER).join('');
}

/** Agent proposals per reply: keyed by the run of the owner message that led to them. */
export function proposalsByRun(memories: readonly ChatMemory[], turns: readonly { key: string; role: string; runId: string | null }[]): Map<string, ChatMemory[]> {
  const runOf = new Map(turns.filter(t => t.role === 'user' && t.runId).map(t => [t.key, t.runId!]));
  const out = new Map<string, ChatMemory[]>();
  for (const m of memories) {
    const run = m.kind === 'proposed' && m.messageId ? runOf.get(m.messageId) : undefined;
    if (run) out.set(run, [...(out.get(run) ?? []), m]);
  }
  return out;
}
