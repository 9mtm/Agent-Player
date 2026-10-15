import type { SessionClient } from './session';
import { LOCAL_IMPORT_PATH, MAX_IMPORT_SESSIONS } from './local-import-contract.js';
import type { ImportJob, LocalSession } from './local-import-contract.js';

export type LocalImportState = Readonly<{
  phase: 'idle' | 'loading' | 'ready' | 'error';
  sessions: readonly LocalSession[];
  selected: readonly string[];
  job?: ImportJob;
  notice?: string;
  archive: string;
}>;
const record = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Import memories from Claude Code and Codex conversations on this computer (owner only). */
export class LocalImportController {
  #state: LocalImportState = Object.freeze({ phase: 'idle', sessions: [], selected: [], archive: '' });
  #listeners = new Set<() => void>();
  #timer: ReturnType<typeof setTimeout> | undefined;
  #disposed = false;
  constructor(private readonly client: SessionClient, private readonly pollMs = 1500) {}
  getSnapshot = () => this.#state;
  subscribe = (fn: () => void) => { this.#listeners.add(fn); return () => { this.#listeners.delete(fn); }; };
  private publish(p: Partial<LocalImportState>) { if (this.#disposed) return; this.#state = Object.freeze({ ...this.#state, ...p }); this.#listeners.forEach(fn => fn()); }

  async load() {
    this.publish({ phase: 'loading', notice: undefined });
    try {
      const r = await this.client.request({ method: 'GET', path: LOCAL_IMPORT_PATH } as never);
      if (r.status === 200 && record(r.body) && Array.isArray(r.body.sessions)) {
        const job = r.body.job as ImportJob | undefined;
        this.publish({ phase: 'ready', sessions: r.body.sessions as LocalSession[], archive: String(r.body.archive ?? ''), ...(job ? { job } : {}) });
        if (job?.status === 'running') this.poll(job.id);
      } else this.publish({ phase: 'error', notice: record(r.body) && r.body.code === 'not_loopback' ? 'This works only on the computer where Dpro runs.' : 'The conversations could not be read.' });
    } catch { this.publish({ phase: 'error', notice: 'The conversations could not be read (no connection).' }); }
  }
  toggle(id: string) {
    const s = this.#state.selected;
    if (s.includes(id)) this.publish({ selected: s.filter(x => x !== id) });
    else if (s.length < MAX_IMPORT_SESSIONS) this.publish({ selected: [...s, id] });
    else this.publish({ notice: `Choose up to ${MAX_IMPORT_SESSIONS} conversations at a time.` });
  }
  clear() { this.publish({ selected: [] }); }
  /** Starts the import of the selected conversations and follows it. */
  async start() {
    const ids = this.#state.selected; if (!ids.length || this.#state.job?.status === 'running') return;
    this.publish({ notice: undefined });
    try {
      const r = await this.client.request({ method: 'POST', path: LOCAL_IMPORT_PATH, body: { sessionIds: [...ids] } } as never);
      if (r.status === 202 && record(r.body) && record(r.body.job)) { const job = r.body.job as ImportJob; this.publish({ job, selected: [] }); this.poll(job.id); return; }
      this.publish({ notice: record(r.body) && r.body.code === 'import_running' ? 'An import is already running.' : 'The import could not start.' });
    } catch { this.publish({ notice: 'The import could not start (no connection).' }); }
  }
  private poll(id: string) {
    clearTimeout(this.#timer);
    this.#timer = setTimeout(async () => {
      try {
        const r = await this.client.request({ method: 'GET', path: `${LOCAL_IMPORT_PATH}/jobs/${id}` } as never);
        if (r.status === 200 && record(r.body) && record(r.body.job)) {
          const job = r.body.job as ImportJob;
          this.publish({ job });
          if (job.status === 'running') this.poll(id); else void this.load();
          return;
        }
      } catch { /* try again */ }
      if (!this.#disposed) this.poll(id);
    }, this.pollMs);
  }
  dispose() { clearTimeout(this.#timer); this.#disposed = true; this.#listeners.clear(); }
}
