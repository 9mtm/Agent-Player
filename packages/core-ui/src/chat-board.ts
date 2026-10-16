import { BOARDS_PATH } from './board-contract.js';
import { chatCardsPath, validChatCard } from './chat-board-contract.js';
import type { ChatCard, ChatProgress } from './chat-board-contract.js';
import type { Priority } from './board';
import type { SessionClient } from './session';

export type { ChatCard, ChatProgress } from './chat-board-contract.js';
/** How often the open conversation reads its cards again while it has any. */
export const CHAT_CARDS_POLL_MS = 15_000;

export type BoardChoice = Readonly<{ id: string; name: string }>;
export type ColumnChoice = Readonly<{ id: string; name: string }>;
export type NewChatCard = { boardId: string; columnId?: string; title: string; description: string; priority: Priority; agents: string[] };
export type ChatCardsState = Readonly<{
  owner: boolean;
  conversationId: string | null;
  phase: 'idle' | 'loading' | 'ready' | 'error';
  cards: readonly ChatCard[];
  progress: ChatProgress;
  /** The "Add to board" form: the owner's boards and the chosen board's columns. */
  boards: readonly BoardChoice[]; columns: readonly ColumnChoice[]; saving: boolean;
  notice?: string;
}>;

const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const EMPTY: ChatProgress = Object.freeze({ running: false, agents: [] });

/**
 * Board cards made from the open conversation (CHAT-PRO-02 I step 2), owner
 * only. Reads the cards and who works on them when a conversation opens, after
 * each reply, and every 15 s while the conversation has cards (so board moves,
 * comments and "done" reach the chat). Creating a card is an explicit owner
 * action; agents can only suggest one.
 */
export class ChatCardsController {
  #state: ChatCardsState = Object.freeze({ owner: false, conversationId: null, phase: 'idle', cards: [], progress: EMPTY, boards: [], columns: [], saving: false });
  #listeners = new Set<() => void>();
  #ticket = 0; #timer: ReturnType<typeof setInterval> | undefined; #unsubscribe: () => void; #disposed = false;
  constructor(readonly client: SessionClient, readonly pollMs = CHAT_CARDS_POLL_MS) { this.#unsubscribe = client.subscribe(this.#sync); this.#sync(); }
  getSnapshot = () => this.#state;
  subscribe = (fn: () => void) => { this.#listeners.add(fn); return () => { this.#listeners.delete(fn); }; };
  #publish(patch: Partial<ChatCardsState>) { this.#state = Object.freeze({ ...this.#state, ...patch }); this.#listeners.forEach(fn => fn()); }
  #sync = () => {
    const s = this.client.getSnapshot();
    const owner = s.phase === 'authenticated' && s.user?.role === 'owner';
    if (owner !== this.#state.owner) { this.#ticket++; this.#publish({ owner, cards: [], progress: EMPTY, boards: [], columns: [], phase: 'idle' }); }
  };
  dispose() { this.#disposed = true; this.#ticket++; this.#stopPolling(); this.#unsubscribe(); }

  /** The conversation now shown in the chat (null = a new, unsaved chat). */
  setConversation(id: string | null) {
    if (id === this.#state.conversationId) return;
    this.#ticket++; this.#stopPolling();
    this.#publish({ conversationId: id, cards: [], progress: EMPTY, phase: 'idle', notice: undefined });
    if (id) void this.refresh();
  }

  async refresh() {
    const id = this.#state.conversationId;
    if (!id || !this.#state.owner || this.#disposed) return;
    const ticket = ++this.#ticket;
    if (!this.#state.cards.length) this.#publish({ phase: 'loading' });
    try {
      const r = await this.client.request({ method: 'GET', path: chatCardsPath(id) });
      if (ticket !== this.#ticket) return;
      const b = r.body as { cards?: ChatCard[]; progress?: ChatProgress } | null;
      if (r.status !== 200 || !b?.cards) { this.#publish({ phase: 'error' }); return; }
      this.#publish({ phase: 'ready', cards: Object.freeze(b.cards.map(c => Object.freeze(c))), progress: b.progress ?? EMPTY });
      if (b.cards.some(c => !c.archived)) this.#startPolling(); else this.#stopPolling();
    } catch { if (ticket === this.#ticket) this.#publish({ phase: 'error' }); }
  }

  #startPolling() {
    if (this.#timer || this.pollMs <= 0) return;
    this.#timer = setInterval(() => { if (typeof document === 'undefined' || document.visibilityState !== 'hidden') void this.refresh(); }, this.pollMs);
  }
  #stopPolling() { if (this.#timer) clearInterval(this.#timer); this.#timer = undefined; }

  /** The owner's boards for the form (the chosen board's columns load with `pickBoard`). */
  async loadBoards(): Promise<string | null> {
    if (!this.#state.owner) return null;
    try {
      const r = await this.client.request({ method: 'GET', path: BOARDS_PATH });
      const list = record(r.body) && Array.isArray(r.body.boards) ? (r.body.boards as { id: string; name: string; archived?: boolean }[]).filter(b => !b.archived) : [];
      this.#publish({ boards: Object.freeze(list.map(b => Object.freeze({ id: b.id, name: b.name }))) });
      const first = list[0]?.id ?? null;
      if (first) await this.pickBoard(first);
      return first;
    } catch { this.#publish({ notice: 'The boards could not be read. Try again.' }); return null; }
  }
  async pickBoard(boardId: string) {
    this.#publish({ columns: [] });
    try {
      const r = await this.client.request({ method: 'GET', path: `${BOARDS_PATH}/${boardId}` });
      const cols = record(r.body) && Array.isArray(r.body.columns) ? (r.body.columns as { id: string; name: string }[]) : [];
      this.#publish({ columns: Object.freeze(cols.map(c => Object.freeze({ id: c.id, name: c.name }))) });
    } catch { this.#publish({ notice: 'The board could not be read. Try again.' }); }
  }

  /** Create the card from this conversation. True when it was created. */
  async create(input: NewChatCard): Promise<boolean> {
    const id = this.#state.conversationId;
    if (!id || !this.#state.owner || this.#state.saving) return false;
    const body: Record<string, unknown> = { boardId: input.boardId, title: input.title.normalize('NFKC').replace(/\s+/g, ' ').trim(), priority: input.priority };
    if (input.columnId) body.columnId = input.columnId;
    const description = input.description.replace(/\r\n?/g, '\n').trim(); if (description) body.description = description;
    if (input.agents.length) body.agents = [...new Set(input.agents)];
    if (!validChatCard(body)) { this.#publish({ notice: 'A card needs a title (1–200 characters, one line) and a board.' }); return false; }
    this.#publish({ saving: true, notice: undefined });
    try {
      const r = await this.client.request({ method: 'POST', path: chatCardsPath(id), body });
      if (r.status === 201) { this.#publish({ saving: false }); await this.refresh(); return true; }
      const code = record(r.body) ? r.body.code : undefined;
      this.#publish({ saving: false, notice: code === 'not_found' ? 'That board or column is gone. Pick another one.' : code === 'read_only_stage' ? 'This test server does not accept board changes.' : 'The card was not created. Check the fields.' });
    } catch { this.#publish({ saving: false, notice: 'The card may not have been created. The chat reads its cards again.' }); void this.refresh(); }
    return false;
  }
}

/** A short description for a new card from the chat: the newest owner request, cut to fit. */
export function cardDraftFrom(turns: readonly { role: string; content: string }[], title: string | null): { title: string; description: string } {
  const lastUser = [...turns].reverse().find(t => t.role === 'user' && t.content.trim());
  const text = lastUser?.content.replace(/\r\n?/g, '\n').trim() ?? '';
  const firstLine = text.split('\n')[0].replace(/\s+/g, ' ').trim();
  return {
    title: [...((title?.trim() || firstLine) ?? '')].slice(0, 120).join('') || 'Task from the chat',
    description: text ? `From the chat:\n\n${[...text].slice(0, 2000).join('')}` : '',
  };
}

/** One line for an activity entry, as the chat shows it. */
export function activityLine(a: ChatCard['activity'][number], nameOf: (agentId: string) => string): string {
  const who = a.actorKind === 'agent' ? nameOf(a.actorId) : 'You';
  switch (a.kind) {
    case 'created': return `${who} added it to ${a.detail || 'the board'}`;
    case 'moved': return `${who} moved it to ${a.detail}`;
    case 'done': return `${who} marked it done (${a.detail})`;
    case 'comment': return `${who}: “${a.detail}”`;
    case 'archived': return `${who} archived it`;
    case 'restored': return `${who} restored it`;
  }
}
