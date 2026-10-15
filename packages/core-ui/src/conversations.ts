// CHAT-REBUILD-01: the chat page's state. Saved conversations (list, open,
// rename, pin, delete), sending a message as a run, following the run's
// events (and re-attaching after a dropped connection or a reload), Stop,
// and a queue of messages typed while the agent is still working.
import { SessionFailure } from './session-failure';
import type { SessionClient } from './session';
import { MAX_MESSAGE, validRunId } from './conversation-contract.js';
import type { RunEvent, WireConversation, WireMessage } from './conversation-contract.js';
import { applyEvent, fromWire, liveTurn, userTurn } from './turns';
import type { Turn } from './turns';

export type Conversation = WireConversation;
export type AgentChoice = Readonly<{ id: string; name: string }>;
export type ConversationsState = Readonly<{
  access: 'ready' | 'denied';
  listPhase: 'idle' | 'loading' | 'ready' | 'error';
  conversations: readonly Conversation[];
  activeId: string | null;
  threadPhase: 'empty' | 'loading' | 'ready' | 'error';
  turns: readonly Turn[];
  draft: string;
  agentId: string;
  agents: readonly AgentChoice[];
  runId: string | null;
  starting: boolean;
  stopping: boolean;
  reconnecting: boolean;
  queue: readonly { key: string; text: string }[];
  /** After Stop the queue waits for the owner (Send now) instead of going on its own. */
  queuePaused: boolean;
  notice?: string;
}>;

const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const RETRY_MS = [500, 1000, 2000, 4000, 8000];

export class ConversationsController {
  #state: ConversationsState = Object.freeze({
    access: 'ready', listPhase: 'idle', conversations: [], activeId: null, threadPhase: 'empty', turns: [], draft: '', agentId: '', agents: [],
    runId: null, starting: false, stopping: false, reconnecting: false, queue: [], queuePaused: false,
  });
  #listeners = new Set<() => void>();
  #unsubscribe: () => void;
  #epoch: number;
  #follow?: AbortController;
  #openSeq = 0;
  #disposed = false;
  #history: string[] = [];

  constructor(private readonly client: SessionClient, private readonly newId: () => string = () => crypto.randomUUID(), private readonly now: () => number = Date.now) {
    this.#epoch = client.getSnapshot().epoch;
    if (!this.allowed()) this.#state = Object.freeze({ ...this.#state, access: 'denied' });
    this.#unsubscribe = client.subscribe(() => { if (this.#epoch !== client.getSnapshot().epoch || !this.allowed()) this.clear(); });
  }
  private allowed() { const s = this.client.getSnapshot(); return s.phase === 'authenticated' && s.user?.role !== 'guest'; }
  private live() { return !this.#disposed && this.allowed() && this.#epoch === this.client.getSnapshot().epoch; }
  getSnapshot = () => this.#state;
  subscribe = (fn: () => void) => { this.#listeners.add(fn); return () => { this.#listeners.delete(fn); }; };
  private publish(patch: Partial<ConversationsState>) { if (this.#disposed) return; this.#state = Object.freeze({ ...this.#state, ...patch }); this.#listeners.forEach(fn => fn()); }
  private clear() {
    this.#follow?.abort();
    this.publish({ access: 'denied', conversations: [], activeId: null, turns: [], draft: '', runId: null, queue: [], threadPhase: 'empty', listPhase: 'idle', notice: undefined });
  }
  dispose() { this.#follow?.abort(); this.#unsubscribe(); this.#disposed = true; this.#listeners.clear(); }

  edit(draft: string) { this.publish({ draft: draft.slice(0, MAX_MESSAGE) }); }
  selectAgent(agentId: string) { if (!this.#state.activeId) this.publish({ agentId }); }
  /** The last sent message (↑ in an empty composer). */
  recall(): string | undefined { return this.#history.at(-1); }

  private async call(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) {
    const r = await this.client.request(body === undefined ? { method, path } as never : { method, path, body } as never);
    return r;
  }

  async load() {
    if (!this.live() || this.#state.listPhase === 'loading') return;
    this.publish({ listPhase: 'loading' });
    try {
      const r = await this.call('GET', '/api/chat/conversations');
      if (!this.live()) return;
      if (r.status !== 200 || !record(r.body) || !Array.isArray(r.body.conversations)) { this.publish({ listPhase: 'error' }); return; }
      this.publish({ listPhase: 'ready', conversations: r.body.conversations as Conversation[] });
    } catch { if (this.live()) this.publish({ listPhase: 'error' }); }
    void this.loadAgents();
  }

  /** The team for the agent picker (owner only; others talk to the primary agent). */
  async loadAgents() {
    if (this.client.getSnapshot().user?.role !== 'owner' || this.#state.agents.length) return;
    try {
      const r = await this.client.request({ method: 'GET', path: '/api/agents' });
      if (!this.live() || r.status !== 200 || !record(r.body) || !Array.isArray(r.body.agents)) return;
      this.publish({ agents: (r.body.agents as { id: string; name?: string }[]).map(a => ({ id: a.id, name: a.name ?? a.id })) });
    } catch { /* the picker stays on the primary agent */ }
  }

  /** A blank conversation (created on the first message). */
  newChat() {
    this.#follow?.abort(); this.#openSeq++;
    this.publish({ activeId: null, turns: [], threadPhase: 'empty', runId: null, starting: false, stopping: false, reconnecting: false, queue: [], queuePaused: false, notice: undefined, agentId: '' });
  }

  async open(id: string) {
    if (!this.live()) return;
    this.#follow?.abort();
    const seq = ++this.#openSeq;
    const known = this.#state.conversations.find(c => c.id === id);
    this.publish({ activeId: id, turns: [], threadPhase: 'loading', runId: null, starting: false, stopping: false, reconnecting: false, queue: [], queuePaused: false, notice: undefined, agentId: known?.agentId ?? '' });
    try {
      const r = await this.call('GET', `/api/chat/conversations/${id}/messages`);
      if (!this.live() || seq !== this.#openSeq) return;
      if (r.status === 404) { this.publish({ threadPhase: 'error', notice: 'This conversation no longer exists.', conversations: this.#state.conversations.filter(c => c.id !== id) }); return; }
      if (r.status !== 200 || !record(r.body)) { this.publish({ threadPhase: 'error', notice: 'The conversation could not be loaded.' }); return; }
      const messages = r.body.messages as WireMessage[];
      const active = r.body.activeRunId as string | null;
      // A running turn is rebuilt from its events, not from a stored row.
      const turns = messages.map(fromWire);
      if (active) turns.push(liveTurn(active, this.now()));
      this.publish({ turns, threadPhase: 'ready', runId: active });
      if (active) void this.follow(active, seq);
    } catch { if (this.live() && seq === this.#openSeq) this.publish({ threadPhase: 'error', notice: 'The conversation could not be loaded.' }); }
  }

  /** Sends the draft (or `text`); while the agent works, the message waits in the queue. */
  async send(text?: string) {
    const message = (text ?? this.#state.draft).trim();
    if (!this.live() || !message || message.length > MAX_MESSAGE) return;
    if (this.#state.runId || this.#state.starting) {
      this.publish({ queue: [...this.#state.queue, { key: this.newId(), text: message }], ...(text === undefined ? { draft: '' } : {}) });
      return;
    }
    const seq = this.#openSeq;
    this.#history.push(message);
    let runId: string;
    try { runId = `run-${this.newId()}`; } catch { this.publish({ notice: 'A secure id is not available here. Nothing was sent.' }); return; }
    if (!validRunId(runId)) return;
    const optimistic = userTurn(`pending:${runId}`, message, runId, true);
    this.publish({ starting: true, notice: undefined, turns: [...this.#state.turns, optimistic], threadPhase: 'ready', ...(text === undefined ? { draft: '' } : {}) });
    try {
      let id = this.#state.activeId;
      if (!id) {
        const c = await this.call('POST', '/api/chat/conversations', this.#state.agentId ? { agentId: this.#state.agentId } : {});
        if (!this.live() || seq !== this.#openSeq) return;
        if ((c.status !== 201 && c.status !== 200) || !record(c.body) || !record(c.body.conversation)) throw new SessionFailure('unavailable');
        const conv = c.body.conversation as Conversation;
        id = conv.id;
        this.publish({ activeId: id, conversations: [conv, ...this.#state.conversations.filter(x => x.id !== id)] });
      }
      const r = await this.call('POST', `/api/chat/conversations/${id}/runs`, { runId, message });
      if (!this.live() || seq !== this.#openSeq) return;
      if (r.status === 409 && record(r.body) && r.body.code === 'conversation_busy' && typeof r.body.runId === 'string') {
        // Another tab is still answering here: wait in the queue and follow that run.
        this.publish({ starting: false, turns: this.#state.turns.filter(t => t !== optimistic), queue: [{ key: runId, text: message }, ...this.#state.queue], runId: r.body.runId, notice: undefined });
        this.publish({ turns: [...this.#state.turns, liveTurn(r.body.runId, this.now())] });
        void this.follow(r.body.runId, seq);
        return;
      }
      if (r.status !== 202 || !record(r.body)) {
        const code = record(r.body) ? r.body.code : undefined;
        this.publish({ starting: false, turns: this.#state.turns.filter(t => t !== optimistic), draft: this.#state.draft || message,
          notice: code === 'rate_limited' ? 'Too many conversations are answering right now. Your message is back in the box; send it again in a moment.' : 'The message was not sent. It is back in the box.' });
        return;
      }
      const stored = record(r.body.userMessage) ? fromWire(r.body.userMessage as WireMessage) : userTurn(`user:${runId}`, message, runId);
      this.publish({ starting: false, runId, turns: [...this.#state.turns.filter(t => t !== optimistic), stored, liveTurn(runId, this.now())] });
      void this.follow(runId, seq);
      void this.refreshList(); // the first message names the conversation
    } catch {
      if (this.live() && seq === this.#openSeq) this.publish({ starting: false, turns: this.#state.turns.filter(t => t !== optimistic), draft: this.#state.draft || message, notice: 'The message was not sent (no connection). It is back in the box.' });
    }
  }

  /** Follows a run until its end event, re-attaching after drops with the last sequence number. */
  private async follow(runId: string, openSeq: number) {
    this.#follow?.abort();
    const controller = new AbortController(); this.#follow = controller;
    let after = this.#state.turns.find(t => t.runId === runId && t.role === 'assistant')?.lastSeq ?? 0;
    let failures = 0;
    const current = () => !controller.signal.aborted && this.live() && openSeq === this.#openSeq;
    while (current()) {
      try {
        const { last, ended } = await this.client.runEvents(runId, after, e => this.onEvent(runId, e), controller.signal);
        if (!current()) return;
        if (last > after) failures = 0;
        after = last;
        if (this.#state.reconnecting) this.publish({ reconnecting: false });
        if (ended) { this.finished(); return; }
      } catch (error) {
        if (!current()) return;
        if (error instanceof SessionFailure && error.code === 'cancelled') return;
        if (failures >= RETRY_MS.length) {
          this.publish({ reconnecting: false, runId: null, notice: 'Lost the connection to this reply. It keeps running on the server; open the conversation again to see it.' });
          this.finishLive('error');
          return;
        }
        this.publish({ reconnecting: true });
        await new Promise(r => setTimeout(r, RETRY_MS[failures++]));
      }
    }
  }

  private onEvent(runId: string, e: RunEvent) {
    const turns = this.#state.turns.map(t => (t.role === 'assistant' && t.runId === runId ? applyEvent(t, e, this.now()) : t));
    this.publish({ turns });
  }

  private finishLive(status: 'error') {
    this.publish({ turns: this.#state.turns.map(t => (t.status === 'running' ? { ...t, status } : t)) });
  }

  private finished() {
    const stopped = this.#state.turns.at(-1)?.status === 'stopped';
    this.publish({ runId: null, stopping: false, reconnecting: false, queuePaused: stopped && this.#state.queue.length > 0 });
    void this.refreshList();
    if (stopped) return;
    const [next, ...rest] = this.#state.queue;
    if (next) { this.publish({ queue: rest }); void this.send(next.text); }
  }

  /** Sends a waiting message now (after a Stop paused the queue). */
  sendQueued(key: string) {
    const item = this.#state.queue.find(q => q.key === key);
    if (!item || this.#state.runId || this.#state.starting) return;
    this.publish({ queue: this.#state.queue.filter(q => q.key !== key), queuePaused: false });
    void this.send(item.text);
  }

  private async refreshList() {
    try {
      const r = await this.call('GET', '/api/chat/conversations');
      if (this.live() && r.status === 200 && record(r.body) && Array.isArray(r.body.conversations)) this.publish({ conversations: r.body.conversations as Conversation[] });
    } catch { /* the list refreshes on the next load */ }
  }

  /** Stops the running reply; what it wrote so far is kept. Queued messages stay queued until sent. */
  async stop() {
    const runId = this.#state.runId;
    if (!runId || this.#state.stopping || !this.live()) return;
    this.publish({ stopping: true });
    try { await this.call('POST', `/api/chat/runs/${runId}/stop`); } catch { this.publish({ stopping: false, notice: 'Stop did not reach the server. Try again.' }); }
  }

  removeQueued(key: string) { const queue = this.#state.queue.filter(q => q.key !== key); this.publish({ queue, queuePaused: this.#state.queuePaused && queue.length > 0 }); }
  editQueued(key: string) {
    const item = this.#state.queue.find(q => q.key === key);
    if (item) this.publish({ queue: this.#state.queue.filter(q => q.key !== key), draft: this.#state.draft ? `${this.#state.draft}\n${item.text}` : item.text });
  }

  async rename(id: string, title: string) {
    const t = title.trim().slice(0, 120);
    const r = await this.call('PUT', `/api/chat/conversations/${id}`, { title: t || null });
    if (this.live() && r.status === 200 && record(r.body) && record(r.body.conversation)) this.replace(r.body.conversation as Conversation);
  }

  async pin(id: string, pinned: boolean) {
    const r = await this.call('PUT', `/api/chat/conversations/${id}`, { pinned });
    if (this.live() && r.status === 200 && record(r.body) && record(r.body.conversation)) { this.replace(r.body.conversation as Conversation); void this.refreshList(); }
  }

  async remove(id: string) {
    const r = await this.call('DELETE', `/api/chat/conversations/${id}`);
    if (!this.live() || (r.status !== 200 && r.status !== 404)) return;
    this.publish({ conversations: this.#state.conversations.filter(c => c.id !== id) });
    if (this.#state.activeId === id) this.newChat();
  }

  private replace(c: Conversation) { this.publish({ conversations: this.#state.conversations.map(x => (x.id === c.id ? c : x)) }); }
}
