import { SessionFailure } from './session-failure';
import { retryAfterNotice } from './retry-after.js';
import type { SessionClient } from './session';
import { validChatBody, validId, record } from './chat-protocol.js';
import type { ChatBody, ChatFrame } from './chat-protocol.js';
export type Turn = Readonly<{ key: string; prompt: string; content: string; runId?: string; messageId?: string; events: number; replayed: boolean; terminal?: 'done' | 'error'; partial: boolean; errorCode?: 'model_unavailable' }>;
export type ChatState = Readonly<{ phase: 'ready' | 'sending' | 'complete' | 'failed' | 'unknown' | 'denied'; draft: string; agentId: string; sessionId: string; turns: readonly Turn[]; notice?: string }>;
export const deadlineNotice = 'Chat time limit reached (absolute limit: 120 seconds). Outcome unknown; server execution may continue. ';
export const retryNotice = 'Retry is disabled: keys last at most 10 minutes in backend memory and may be lost on restart or eviction. Sending again could run the turn twice.';
export class ChatController {
  #state: ChatState;
  #listeners = new Set<() => void>();
  #unsubscribe: () => void;
  #abort?: AbortController;
  #generation = 0;
  #disposed = false;
  #epoch: number;
  constructor(private readonly client: SessionClient, private readonly newId: () => string = () => crypto.randomUUID()) {
    this.#epoch = client.getSnapshot().epoch;
    this.#state = Object.freeze({ phase: this.allowed() ? 'ready' : 'denied', draft: '', agentId: '', sessionId: `ui-${newId()}`, turns: [] });
    this.#unsubscribe = client.subscribe(() => {
      if (this.#epoch !== client.getSnapshot().epoch || !this.allowed()) this.clear();
    });
  }
  private allowed() { const s = this.client.getSnapshot(); return s.phase === 'authenticated' && s.user?.role !== 'guest'; }
  getSnapshot = () => this.#state;
  subscribe = (fn: () => void) => { this.#listeners.add(fn); return () => { this.#listeners.delete(fn); }; };
  private publish(patch: Partial<ChatState>) { this.#state = Object.freeze({ ...this.#state, ...patch }); this.#listeners.forEach(fn => fn()); }
  edit(draft: string) { if (!this.#disposed && this.allowed() && !['sending', 'unknown', 'denied'].includes(this.#state.phase)) this.publish({ draft: draft.slice(0, 32768) }); }
  selectAgent(agentId: string) { if (!this.#disposed && !this.#state.turns.length && this.#state.phase === 'ready' && (agentId === '' || validId(agentId))) this.publish({ agentId }); }
  private clear() { this.#generation++; this.#abort?.abort(); this.publish({ phase: 'denied', draft: '', agentId: '', sessionId: '', turns: [], notice: undefined }); }
  cancel() {
    if (this.#state.phase !== 'sending') return;
    this.#generation++; this.#abort?.abort();
    this.publish({ phase: 'unknown', draft: '', turns: [], notice: 'Reading cancelled and local messages cleared. Server execution may continue; its outcome is unknown. ' + retryNotice });
  }
  dispose() { this.#disposed = true; this.#unsubscribe(); this.clear(); this.#listeners.clear(); }
  async send() {
    if (this.#disposed || !this.allowed() || ['sending', 'unknown', 'denied'].includes(this.#state.phase) || !this.#state.draft.trim()) return;
    const messages: ChatBody['messages'] = this.#state.turns.flatMap(t => [{ role: 'user' as const, content: t.prompt }, { role: 'assistant' as const, content: t.content }]);
    messages.push({ role: 'user', content: this.#state.draft });
    const body: ChatBody = { messages, stream: true, sessionId: this.#state.sessionId, ...(this.#state.agentId ? { agentId: this.#state.agentId } : {}) };
    if (!validChatBody(body)) { this.publish({ notice: 'Conversation limit reached (64 messages / 128 KiB request). Nothing was sent; no history was silently dropped.' }); return; }
    let key: string;
    try { key = this.newId(); } catch { this.publish({ notice: 'A secure request key is unavailable. Nothing was sent.' }); return; }
    const turn: Turn = Object.freeze({ key, prompt: this.#state.draft, content: '', events: 0, replayed: false, partial: false });
    const prior = this.#state.turns;
    this.#abort = new AbortController(); const gen = ++this.#generation;
    const current = () => gen === this.#generation && !this.#disposed && this.allowed() && this.#epoch === this.client.getSnapshot().epoch;
    this.publish({ phase: 'sending', draft: '', turns: [...prior, turn], notice: undefined });
    let latest = turn;
    const update = (frame: ChatFrame) => {
      if (!current()) return;
      const text = frame.type === undefined || frame.type === 'text' ? (frame.content ?? '') : '';
      if (latest.content.length + text.length > 262144) throw Error('limit');
      latest = Object.freeze({ ...latest, runId: frame.runId, messageId: frame.messageId, content: latest.content + text,
        replayed: latest.replayed || !!frame.replayed, partial: latest.partial || !!frame.truncated || !!frame.incomplete,
        events: latest.events + (frame.type === 'tool_start' || frame.type === 'tool_result' ? 1 : 0),
        errorCode: frame.type === 'error' ? frame.code : latest.errorCode,
        terminal: frame.type === 'error' ? 'error' : frame.done || frame.type === 'done' ? 'done' : latest.terminal });
      this.publish({ turns: [...prior, latest] });
    };
    try {
      const result = await this.client.chat(body, key, update, this.#abort.signal);
      if (!current()) return;
      if (result.status !== 200) {
        const b = result.body;
        const code = record(b) && typeof b.code === 'string' ? b.code : undefined;
        if (record(b) && validId(b.runId) && validId(b.messageId)) { latest = Object.freeze({ ...latest, runId: b.runId, messageId: b.messageId }); this.publish({ turns: [...prior, latest] }); }
        // An HTTP refusal is not proof that an interrupted earlier turn never ran.
        this.publish({ phase: 'unknown', notice: (result.status === 504 ? deadlineNotice : code === 'idempotency_in_progress' ? 'This key is still running on the server.' : code === 'idempotency_key_reused' ? 'The server refused a reused key with a different request.' : `Chat was not confirmed (HTTP ${result.status}${code ? `, ${code}` : ''}).`) + (result.status === 429 ? retryAfterNotice(result.retryAfterSeconds) : '') + ' ' + retryNotice });
      } else if (latest.partial || !latest.terminal) this.publish({ phase: 'unknown', notice: 'The returned stream is incomplete or truncated. ' + retryNotice });
      else if (latest.terminal === 'error') this.publish({ phase: 'unknown', notice: (latest.errorCode === 'model_unavailable' ? 'Model unavailable or not reachable. ' : 'The server sent a typed error: Chat request failed. ') + 'Tool side effects are not reconciled; outcome unknown. ' + retryNotice });
      else this.publish({ phase: 'complete', notice: 'Server stream completed. Plain message text is not a typed success or error verdict.' });
    } catch (error) { if (current()) this.publish({ phase: 'unknown', notice: (error instanceof SessionFailure && error.code === 'deadline' ? deadlineNotice : 'Stream interrupted, malformed, or over its size/time limit (absolute limit: 120 seconds). Outcome unknown; partial text is unconfirmed and server execution may continue. ') + retryNotice }); }
  }
}
