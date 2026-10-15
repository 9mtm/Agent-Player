import type { SessionClient } from './session';
import { panePath } from './conversation-contract.js';
import type { WireChanges, WireDiff, WireFile, WireTree } from './conversation-contract.js';

export type PaneName = 'details' | 'changes' | 'files' | 'terminal';
type Load<T> = { phase: 'loading' } | { phase: 'ready'; data: T } | { phase: 'error'; message: string };
export type PanesState = Readonly<{
  projectId: string | null;
  changes?: Load<WireChanges>;
  /** Open diffs, by file path. */
  diffs: Readonly<Record<string, Load<WireDiff>>>;
  /** Loaded folder levels, by relative path ("" is the project folder). */
  tree: Readonly<Record<string, Load<WireTree>>>;
  expanded: readonly string[];
  file?: { path: string; load: Load<WireFile> };
}>;

const record = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const reason = (status: number, body: unknown) => record(body) && body.code === 'no_folder' ? 'This project has no folder.' : status === 404 ? 'Not found.' : status === 400 ? 'That path cannot be opened.' : 'Could not load it.';

/** Read-only views of the active project's folder: git changes, diffs, folders and files. */
export class PanesController {
  #state: PanesState = Object.freeze({ projectId: null, diffs: {}, tree: {}, expanded: [] });
  #listeners = new Set<() => void>();
  #disposed = false;
  constructor(private readonly client: SessionClient) {}
  getSnapshot = () => this.#state;
  subscribe = (fn: () => void) => { this.#listeners.add(fn); return () => { this.#listeners.delete(fn); }; };
  private publish(p: Partial<PanesState>) { if (this.#disposed) return; this.#state = Object.freeze({ ...this.#state, ...p }); this.#listeners.forEach(fn => fn()); }
  dispose() { this.#disposed = true; this.#listeners.clear(); }
  private async get<T>(path: string): Promise<Load<T>> {
    try {
      const r = await this.client.request({ method: 'GET', path } as never);
      return r.status === 200 && record(r.body) ? { phase: 'ready', data: r.body as T } : { phase: 'error', message: reason(r.status, r.body) };
    } catch { return { phase: 'error', message: 'No connection.' }; }
  }
  /** Switches to another project (or none): everything loaded before is dropped. */
  setProject(projectId: string | null) {
    if (projectId === this.#state.projectId) return;
    this.#state = Object.freeze({ projectId, diffs: {}, tree: {}, expanded: [] }); this.#listeners.forEach(fn => fn());
  }
  private current(id: string) { return !this.#disposed && this.#state.projectId === id; }

  async loadChanges() {
    const id = this.#state.projectId; if (!id) return;
    this.publish({ changes: { phase: 'loading' } });
    const r = await this.get<WireChanges>(`/api/chat/projects/${id}/changes`);
    if (this.current(id)) this.publish({ changes: r, diffs: {} });
  }
  async toggleDiff(path: string) {
    const id = this.#state.projectId; if (!id) return;
    if (this.#state.diffs[path]) { const { [path]: _gone, ...rest } = this.#state.diffs; this.publish({ diffs: rest }); return; }
    this.publish({ diffs: { ...this.#state.diffs, [path]: { phase: 'loading' } } });
    const r = await this.get<WireDiff>(panePath(id, 'diff', path));
    if (this.current(id) && this.#state.diffs[path]) this.publish({ diffs: { ...this.#state.diffs, [path]: r } });
  }
  async loadFolder(rel = '') {
    const id = this.#state.projectId; if (!id) return;
    this.publish({ tree: { ...this.#state.tree, [rel]: { phase: 'loading' } } });
    const r = await this.get<WireTree>(panePath(id, 'tree', rel));
    if (this.current(id)) this.publish({ tree: { ...this.#state.tree, [rel]: r } });
  }
  async toggleFolder(rel: string) {
    const open = this.#state.expanded.includes(rel);
    this.publish({ expanded: open ? this.#state.expanded.filter(x => x !== rel) : [...this.#state.expanded, rel] });
    if (!open && !this.#state.tree[rel]) await this.loadFolder(rel);
  }
  async openFile(path: string) {
    const id = this.#state.projectId; if (!id) return;
    this.publish({ file: { path, load: { phase: 'loading' } } });
    const r = await this.get<WireFile>(panePath(id, 'file', path));
    if (this.current(id) && this.#state.file?.path === path) this.publish({ file: { path, load: r } });
  }
  closeFile() { this.publish({ file: undefined }); }
  /** Reloads what is open: the change list, the root folder and open folders. */
  async refresh() {
    this.publish({ tree: {} });
    await Promise.all([this.loadChanges(), this.loadFolder(''), ...this.#state.expanded.map(r => this.loadFolder(r))]);
  }
}

/** Splits a unified diff into typed lines for display (hunk headers keep their line numbers). */
export function diffLines(diff: string): { kind: 'add' | 'del' | 'hunk' | 'meta' | 'ctx'; text: string; old?: number; new?: number }[] {
  const out: { kind: 'add' | 'del' | 'hunk' | 'meta' | 'ctx'; text: string; old?: number; new?: number }[] = [];
  let o = 0, n = 0, inHunk = false;
  for (const line of diff.split('\n')) {
    const h = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/.exec(line);
    if (h) { o = Number(h[1]); n = Number(h[2]); inHunk = true; out.push({ kind: 'hunk', text: line }); continue; }
    if (!inHunk) { if (line && !/^(diff --git|index |--- |\+\+\+ |new file mode|deleted file mode|similarity|rename )/.test(line)) out.push({ kind: 'meta', text: line }); continue; }
    if (line.startsWith('+')) out.push({ kind: 'add', text: line.slice(1), new: n++ });
    else if (line.startsWith('-')) out.push({ kind: 'del', text: line.slice(1), old: o++ });
    else if (line.startsWith('\\')) out.push({ kind: 'meta', text: line });
    else if (line.startsWith(' ')) out.push({ kind: 'ctx', text: line.slice(1), old: o++, new: n++ });
    else if (line.startsWith('diff --git')) inHunk = false;
  }
  return out;
}
