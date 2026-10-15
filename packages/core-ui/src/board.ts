import { SessionFailure } from './session-failure';
import { BOARDS_PATH, MAX_COMMENT, MAX_DESCRIPTION, MAX_TITLE, validCardEdit, validNewCard } from './board-contract.js';
import type { SessionClient } from './session';

export type Priority = 'low' | 'normal' | 'high' | 'urgent';
/** Board writes (checked against board-contract.js before sending). */
export type BoardRequest = { method: 'POST' | 'PUT'; path: string; body: Record<string, unknown> };
export type Column = Readonly<{ id: string; name: string; position: number }>;
export type Card = Readonly<{
  id: string; columnId: string; title: string; description: string; priority: Priority; position: number; dueDate: string | null;
  archived: boolean; version: number; agents: readonly string[]; departments: readonly string[]; comments: number; updatedAt: string;
}>;
export type Comment = Readonly<{ id: string; authorKind: 'user' | 'agent'; authorId: string; body: string; createdAt: string }>;
export type AgentOption = Readonly<{ id: string; name: string }>;
export type CardDraft = Readonly<{ title: string; description: string; priority: Priority; dueDate: string; agents: readonly string[]; departments: readonly string[] }>;
export type BoardState = Readonly<{
  owner: boolean;
  phase: 'idle' | 'loading' | 'ready' | 'saving' | 'error' | 'denied';
  boardId?: string; name?: string; columns: readonly Column[]; cards: readonly Card[]; agents: readonly AgentOption[];
  /** The open card (detail panel) and its editable copy and comments. */
  open?: string; draft?: CardDraft; comments: readonly Comment[]; commentsPhase: 'idle' | 'loading' | 'ready' | 'error';
  /** Filters: text search, one agent, one department. */
  filter: Readonly<{ text: string; agent: string; department: string }>;
  notice?: string;
}>;

export const priorityLabel: Record<Priority, string> = { low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent' };
export const allPriorities: readonly Priority[] = ['low', 'normal', 'high', 'urgent'];
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const normDep = (x: string) => x.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();

/** Cards of a column in board order. */
export const cardsIn = (cards: readonly Card[], columnId: string) => cards.filter(c => c.columnId === columnId).sort((a, b) => a.position - b.position);

/** Does a card pass the current filters? */
export function matches(card: Card, f: BoardState['filter']): boolean {
  const t = f.text.trim().toLowerCase();
  if (t && !card.title.toLowerCase().includes(t) && !card.description.toLowerCase().includes(t)) return false;
  if (f.agent && !card.agents.includes(f.agent)) return false;
  return !f.department || card.departments.includes(f.department);
}

const draftOf = (c: Card): CardDraft => Object.freeze({ title: c.title, description: c.description, priority: c.priority, dueDate: c.dueDate ?? '', agents: [...c.agents], departments: [...c.departments] });

/**
 * The company task board (BOARD-01): owner only. Nothing is read on mount;
 * "Open the board" reads the board and the team (for assignees). Moves and
 * edits carry the card version; a conflict shows the current card.
 */
export class BoardController {
  #state: BoardState = Object.freeze({ owner: false, phase: 'denied', columns: [], cards: [], agents: [], comments: [], commentsPhase: 'idle', filter: { text: '', agent: '', department: '' } });
  #listeners = new Set<() => void>();
  #ticket = 0; #identity = ''; #disposed = false; #unsubscribe: () => void;
  constructor(readonly client: SessionClient) { this.#unsubscribe = client.subscribe(this.#sync); this.#sync(); }
  getSnapshot = () => this.#state;
  subscribe = (fn: () => void) => { this.#listeners.add(fn); return () => { this.#listeners.delete(fn); }; };
  #publish(patch: Partial<BoardState>) { this.#state = Object.freeze({ ...this.#state, ...patch }); this.#listeners.forEach(fn => fn()); }
  #sync = () => {
    const s = this.client.getSnapshot(); const identity = `${s.mode}:${s.epoch}:${s.phase}:${s.user?.id ?? ''}:${s.user?.role ?? ''}`;
    if (identity === this.#identity) return;
    this.#identity = identity; this.#ticket++;
    const owner = s.phase === 'authenticated' && s.user?.role === 'owner';
    this.#publish({ owner, phase: owner ? 'idle' : 'denied', boardId: undefined, name: undefined, columns: [], cards: [], agents: [], open: undefined, draft: undefined, comments: [], commentsPhase: 'idle',
      notice: s.phase === 'authenticated' && !owner ? 'Only the owner can use the company board.' : undefined });
  };
  dispose() { this.#disposed = true; this.#ticket++; this.#unsubscribe(); this.#publish({ owner: false, phase: 'denied', cards: [], columns: [], comments: [] }); }
  #busy() { return this.#state.phase === 'loading' || this.#state.phase === 'saving'; }
  #refused(status: number, body: unknown): boolean {
    if (status === 403 && record(body) && body.code === 'read_only_stage') { this.#publish({ phase: 'error', notice: 'This test server does not accept board changes. Nothing was saved.' }); return true; }
    if (status === 401 || status === 403) { this.#publish({ phase: 'denied', notice: 'Access denied. Sign in again as the owner.' }); return true; }
    return false;
  }
  #applyBoard(b: { id: string; name: string; columns: Column[]; cards: Card[] }) {
    const open = this.#state.open && b.cards.some(c => c.id === this.#state.open) ? this.#state.open : undefined;
    this.#publish({ boardId: b.id, name: b.name, columns: Object.freeze(b.columns.map(c => Object.freeze(c))), cards: Object.freeze(b.cards.map(c => Object.freeze(c))),
      ...(open ? {} : { open: undefined, draft: undefined, comments: [], commentsPhase: 'idle' as const }) });
  }
  #replaceCard(card: Card) {
    const exists = this.#state.cards.some(c => c.id === card.id);
    const cards = card.archived ? this.#state.cards.filter(c => c.id !== card.id) : exists ? this.#state.cards.map(c => c.id === card.id ? Object.freeze(card) : c) : [...this.#state.cards, Object.freeze(card)];
    this.#publish({ cards: Object.freeze(cards) });
  }

  /** Explicit read: the board (created on first use) and the team for assignees. */
  async load() {
    if (!this.#state.owner || this.#busy() || this.#disposed) return;
    const ticket = ++this.#ticket;
    this.#publish({ phase: 'loading', notice: undefined });
    try {
      const list = await this.client.request({ method: 'GET', path: BOARDS_PATH });
      if (ticket !== this.#ticket) return;
      if (this.#refused(list.status, list.body)) return;
      const boards = (list.body as { boards?: { id: string }[] } | null)?.boards;
      if (list.status !== 200 || !boards?.length) throw Error();
      const r = await this.client.request({ method: 'GET', path: `${BOARDS_PATH}/${boards[0].id}` });
      if (ticket !== this.#ticket) return;
      if (this.#refused(r.status, r.body)) return;
      if (r.status !== 200 || !record(r.body)) throw Error();
      this.#applyBoard(r.body as never);
      const team = await this.client.request({ method: 'GET', path: '/api/agents' });
      if (ticket !== this.#ticket) return;
      const agents = team.status === 200 && record(team.body) && Array.isArray(team.body.agents)
        ? (team.body.agents as { id: string; name?: string }[]).map(a => Object.freeze({ id: a.id, name: a.name ?? a.id })) : [];
      this.#publish({ agents: Object.freeze(agents), phase: 'ready' });
    } catch { if (ticket === this.#ticket) this.#publish({ phase: 'error', notice: 'The board could not be read. Try again.' }); }
  }

  setFilter(patch: Partial<BoardState['filter']>) { this.#publish({ filter: Object.freeze({ ...this.#state.filter, ...patch }) }); }
  agentName = (id: string) => this.#state.agents.find(a => a.id === id)?.name ?? 'Former agent';

  async #write<T>(run: () => Promise<{ status: number; body: unknown }>, onOk: (body: T) => void, what: string): Promise<boolean> {
    if (!this.#state.owner || this.#busy() || !this.#state.boardId) return false;
    const ticket = this.#ticket;
    this.#publish({ phase: 'saving', notice: undefined });
    try {
      const r = await run();
      if (ticket !== this.#ticket) return false;
      if (this.#refused(r.status, r.body)) return false;
      const b = r.body as (Record<string, unknown> & { code?: string; card?: Card }) | null;
      if ((r.status === 200 || r.status === 201) && b) { onOk(b as T); this.#publish({ phase: 'ready' }); return true; }
      if (r.status === 409 && b?.card) {
        this.#replaceCard(b.card);
        if (this.#state.open === b.card.id) this.#publish({ draft: draftOf(b.card) });
        this.#publish({ phase: 'ready', notice: 'This card was changed meanwhile. The latest version is shown; try again.' });
        return false;
      }
      this.#publish({ phase: 'ready', notice: b?.code === 'not_found' ? `${what}: not found. Reload the board.` : `${what} was not saved. Check the fields.` });
    } catch (error) {
      if (ticket !== this.#ticket) return false;
      this.#publish({ phase: 'ready', notice: error instanceof SessionFailure && error.code === 'blocked' ? 'Nothing was sent. Check the fields.' : `${what}: the result is unknown. Reload the board to see what is stored.` });
    }
    return false;
  }

  #adds: Promise<unknown> = Promise.resolve();
  /** A new card at the end of a column (title only; details in the panel). Quick successive adds wait for each other. */
  addCard(columnId: string, title: string): Promise<boolean> {
    const run = this.#adds.then(() => this.#addCardNow(columnId, title));
    this.#adds = run.catch(() => undefined);
    return run;
  }
  async #addCardNow(columnId: string, title: string) {
    const body = { columnId, title: title.normalize('NFKC').replace(/\s+/g, ' ').trim() };
    if (!body.title || [...body.title].length > MAX_TITLE || !validNewCard(body)) { this.#publish({ notice: `A card needs a title of 1 to ${MAX_TITLE} characters.` }); return false; }
    return this.#write<Card>(() => this.client.request({ method: 'POST', path: `${BOARDS_PATH}/${this.#state.boardId}/cards`, body }), c => this.#replaceCard(c), 'The card');
  }

  async addColumn(name: string) {
    const n = name.normalize('NFKC').replace(/\s+/g, ' ').trim();
    if (!n || [...n].length > 60) { this.#publish({ notice: 'A column needs a name of 1 to 60 characters.' }); return false; }
    return this.#write<{ id: string; name: string; columns: Column[]; cards: Card[] }>(() => this.client.request({ method: 'POST', path: `${BOARDS_PATH}/${this.#state.boardId}/columns`, body: { name: n } }), b => this.#applyBoard(b), 'The column');
  }

  async renameColumn(columnId: string, name: string) {
    const n = name.normalize('NFKC').replace(/\s+/g, ' ').trim();
    if (!n || [...n].length > 60) { this.#publish({ notice: 'A column needs a name of 1 to 60 characters.' }); return false; }
    return this.#write<{ id: string; name: string; columns: Column[]; cards: Card[] }>(() => this.client.request({ method: 'PUT', path: `${BOARDS_PATH}/${this.#state.boardId}/columns/${columnId}`, body: { name: n } }), b => this.#applyBoard(b), 'The column');
  }

  /** Move a card to a column, before another card (or to the end). Optimistic in the view, confirmed by the server. */
  async move(cardId: string, columnId: string, beforeCardId: string | null) {
    const card = this.#state.cards.find(c => c.id === cardId);
    if (!card || beforeCardId === cardId) return false;
    if (card.columnId === columnId && beforeCardId === null && cardsIn(this.#state.cards, columnId).at(-1)?.id === cardId) return false;
    const body = { expectedVersion: card.version, columnId, beforeCardId };
    if (!validCardEdit(body)) return false;
    return this.#write<Card>(() => this.client.request({ method: 'PUT', path: `${BOARDS_PATH}/${this.#state.boardId}/cards/${cardId}`, body }), async c => {
      this.#replaceCard(c);
      // Other cards may have been renumbered; read the board again quietly.
      const r = await this.client.request({ method: 'GET', path: `${BOARDS_PATH}/${this.#state.boardId}` }).catch(() => null);
      if (r && r.status === 200 && record(r.body)) this.#applyBoard(r.body as never);
    }, 'The move');
  }

  // ---- Card panel ----

  async openCard(cardId: string) {
    const card = this.#state.cards.find(c => c.id === cardId);
    if (!card || !this.#state.owner) return;
    this.#publish({ open: cardId, draft: draftOf(card), comments: [], commentsPhase: 'loading', notice: undefined });
    const ticket = this.#ticket;
    try {
      const r = await this.client.request({ method: 'GET', path: `${BOARDS_PATH}/${this.#state.boardId}/cards/${cardId}/comments` });
      if (ticket !== this.#ticket || this.#state.open !== cardId) return;
      const list = (r.body as { comments?: Comment[] } | null)?.comments;
      this.#publish(r.status === 200 && list ? { comments: Object.freeze(list.map(c => Object.freeze(c))), commentsPhase: 'ready' } : { commentsPhase: 'error' });
    } catch { if (this.#state.open === cardId) this.#publish({ commentsPhase: 'error' }); }
  }
  closeCard() { this.#publish({ open: undefined, draft: undefined, comments: [], commentsPhase: 'idle', notice: undefined }); }
  editDraft(patch: Partial<CardDraft>) { if (this.#state.draft) this.#publish({ draft: Object.freeze({ ...this.#state.draft, ...patch }) }); }
  toggleAgent(id: string) {
    const d = this.#state.draft; if (!d) return;
    this.editDraft({ agents: d.agents.includes(id) ? d.agents.filter(x => x !== id) : [...d.agents, id] });
  }
  addDepartment(name: string) {
    const d = this.#state.draft; const dep = normDep(name);
    if (!d || !dep) return false;
    if (!/^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u.test(dep) || dep.length > 64) { this.#publish({ notice: 'Department: up to 64 letters, numbers, spaces, - or _.' }); return false; }
    if (!d.departments.includes(dep) && d.departments.length < 12) this.editDraft({ departments: [...d.departments, dep] });
    return true;
  }
  removeDepartment(dep: string) { const d = this.#state.draft; if (d) this.editDraft({ departments: d.departments.filter(x => x !== dep) }); }

  /** Save the panel's changes (only the fields that changed). */
  async saveCard() {
    const s = this.#state; const card = s.cards.find(c => c.id === s.open); const d = s.draft;
    if (!card || !d) return false;
    const title = d.title.normalize('NFKC').replace(/\s+/g, ' ').trim();
    const description = d.description.replace(/\r\n?/g, '\n').trim();
    if (!title || [...title].length > MAX_TITLE) { this.#publish({ notice: `The title needs 1 to ${MAX_TITLE} characters.` }); return false; }
    if ([...description].length > MAX_DESCRIPTION) { this.#publish({ notice: `The description may have at most ${MAX_DESCRIPTION} characters.` }); return false; }
    const body: Record<string, unknown> = { expectedVersion: card.version };
    if (title !== card.title) body.title = title;
    if (description !== card.description) body.description = description;
    if (d.priority !== card.priority) body.priority = d.priority;
    const due = d.dueDate || null; if (due !== card.dueDate) body.dueDate = due;
    if ([...d.agents].sort().join() !== [...card.agents].sort().join()) body.agents = [...d.agents];
    if ([...d.departments].sort().join() !== [...card.departments].sort().join()) body.departments = [...d.departments];
    if (Object.keys(body).length === 1) { this.#publish({ notice: 'Nothing changed.' }); return false; }
    if (!validCardEdit(body)) { this.#publish({ notice: 'Check the fields: the date is YYYY-MM-DD and the text may not hold hidden characters.' }); return false; }
    return this.#write<Card>(() => this.client.request({ method: 'PUT', path: `${BOARDS_PATH}/${s.boardId}/cards/${card.id}`, body: body as never }), c => {
      this.#replaceCard(c); this.#publish({ draft: draftOf(c), notice: 'Saved.' });
    }, 'The card');
  }

  async archiveCard() {
    const s = this.#state; const card = s.cards.find(c => c.id === s.open);
    if (!card) return false;
    const ok = await this.#write<Card>(() => this.client.request({ method: 'PUT', path: `${BOARDS_PATH}/${s.boardId}/cards/${card.id}`, body: { expectedVersion: card.version, archived: true } }), c => this.#replaceCard(c), 'The card');
    if (ok) this.closeCard();
    return ok;
  }

  async addComment(text: string) {
    const s = this.#state; const body = text.replace(/\r\n?/g, '\n').trim();
    if (!s.open || !body) return false;
    if ([...body].length > MAX_COMMENT) { this.#publish({ notice: `A comment may have at most ${MAX_COMMENT} characters.` }); return false; }
    const cardId = s.open;
    return this.#write<{ comments: Comment[] }>(() => this.client.request({ method: 'POST', path: `${BOARDS_PATH}/${s.boardId}/cards/${cardId}/comments`, body: { body } }), b => {
      if (this.#state.open === cardId) this.#publish({ comments: Object.freeze(b.comments.map(c => Object.freeze(c))), commentsPhase: 'ready' });
      const card = this.#state.cards.find(c => c.id === cardId);
      if (card) this.#replaceCard({ ...card, comments: b.comments.length });
    }, 'The comment');
  }
}
