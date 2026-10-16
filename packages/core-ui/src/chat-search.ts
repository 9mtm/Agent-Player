// CHAT-PRO-02 D: search inside conversations. One controller per view (the
// sidebar box and the ⌘K box each keep their own): the query is sent after a
// short pause, only the newest answer is kept, and a hit's snippet is split
// into plain text pieces with the matches marked (never HTML).
import type { SessionClient } from './session';
import { chatSearchPath, validQuery } from './chat-search-contract.js';
import type { SearchResult } from './chat-search-contract.js';

export type { SearchHit, SearchResult } from './chat-search-contract.js';
export type ChatSearchState = Readonly<{
  query: string;
  phase: 'idle' | 'searching' | 'ready' | 'error';
  results: readonly SearchResult[];
  truncated: boolean;
}>;

/** Pause after the last key before the search is sent. */
export const SEARCH_DEBOUNCE_MS = 250;
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const IDLE: ChatSearchState = Object.freeze({ query: '', phase: 'idle', results: [], truncated: false });

/** The snippet as plain text pieces; `hit` marks a matched piece. Bad ranges are ignored. */
export function snippetParts(snippet: string, ranges: readonly (readonly [number, number])[]): { text: string; hit: boolean }[] {
  const out: { text: string; hit: boolean }[] = [];
  let at = 0;
  for (const [s, e] of ranges) {
    if (s < at || e <= s || e > snippet.length) continue;
    if (s > at) out.push({ text: snippet.slice(at, s), hit: false });
    out.push({ text: snippet.slice(s, e), hit: true });
    at = e;
  }
  if (at < snippet.length) out.push({ text: snippet.slice(at), hit: false });
  return out;
}

export class ChatSearchController {
  #state: ChatSearchState = IDLE;
  #listeners = new Set<() => void>();
  #timer?: ReturnType<typeof setTimeout>;
  #seq = 0;
  #disposed = false;

  constructor(private readonly client: SessionClient, private readonly debounceMs = SEARCH_DEBOUNCE_MS) {}
  getSnapshot = () => this.#state;
  subscribe = (fn: () => void) => { this.#listeners.add(fn); return () => { this.#listeners.delete(fn); }; };
  private publish(next: Partial<ChatSearchState>) { if (this.#disposed) return; this.#state = Object.freeze({ ...this.#state, ...next }); this.#listeners.forEach(fn => fn()); }

  /** Sets the text typed; a valid query (2-200 characters) is searched after a pause. */
  setQuery(text: string, projectId: string | null = null) {
    clearTimeout(this.#timer);
    const query = text.trim();
    const seq = ++this.#seq;
    if (!validQuery(query)) { this.publish({ ...IDLE, query }); return; }
    this.publish({ query, phase: 'searching' });
    this.#timer = setTimeout(() => void this.run(query, projectId, seq), this.debounceMs);
  }
  clear() { clearTimeout(this.#timer); this.#seq++; this.publish(IDLE); }

  private async run(query: string, projectId: string | null, seq: number) {
    try {
      const r = await this.client.request({ method: 'GET', path: chatSearchPath(query, projectId) } as never);
      if (this.#disposed || seq !== this.#seq) return;
      if (r.status !== 200 || !record(r.body) || !Array.isArray(r.body.results)) { this.publish({ phase: 'error', results: [], truncated: false }); return; }
      this.publish({ phase: 'ready', results: r.body.results as SearchResult[], truncated: r.body.truncated === true });
    } catch {
      if (!this.#disposed && seq === this.#seq) this.publish({ phase: 'error', results: [], truncated: false });
    }
  }
  dispose() { clearTimeout(this.#timer); this.#disposed = true; this.#listeners.clear(); }
}
