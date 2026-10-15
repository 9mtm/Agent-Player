import type { WireRequest, WireResponse } from './session';

type Card = { id: string; columnId: string; title: string; description: string; priority: string; position: number; dueDate: string | null; archived: boolean; version: number; agents: string[]; departments: string[]; comments: number; updatedAt: string };
type Board = { id: string; name: string; description: string; template: string; color: string; departments: string[]; archived: boolean; version: number; columns: { id: string; name: string; position: number }[] };

const TEMPLATES = [
  { id: 'kanban', name: 'Team workflow', description: 'Fictional: ideas to done.', columns: ['Ideas', 'Backlog', 'To do', 'In progress', 'Review', 'Done'] },
  { id: 'content', name: 'Content calendar', description: 'Fictional: posts from idea to published.', columns: ['Ideas', 'Writing', 'Editing', 'Scheduled', 'Published'] },
  { id: 'simple', name: 'Simple list', description: 'Fictional: to do and done.', columns: ['To do', 'Doing', 'Done'] },
];
const COLORS = ['blue', 'green', 'orange', 'red', 'purple', 'pink', 'teal', 'gray'];

/** Fictional in-memory boards for offline practice and tests (same rules as the server, simplified). */
export function createBoardMock() {
  let n = 0; const nextId = (p: string) => `${p}-${++n}`;
  const boards: Board[] = [];
  const cards = new Map<string, Card[]>();
  const comments = new Map<string, { id: string; authorKind: 'user'; authorId: string; body: string; createdAt: string }[]>();
  const now = () => '2026-10-15 12:00:00';
  const kind = (b: Board) => (b.departments.length === 0 ? 'company' : b.departments.length === 1 ? 'department' : 'shared');
  const meta = (b: Board) => ({ id: b.id, name: b.name, description: b.description, template: b.template, color: b.color, departments: [...b.departments], kind: kind(b), archived: b.archived, version: b.version });
  const create = (name: string, template: string, color: string, departments: string[], description = '') => {
    const tpl = TEMPLATES.find(t => t.id === template) ?? TEMPLATES[0];
    const b: Board = { id: nextId('board'), name, description, template: tpl.id, color, departments: [...departments].sort(), archived: false, version: 1, columns: tpl.columns.map((c, i) => ({ id: nextId('col'), name: c, position: (i + 1) * 1000 })) };
    boards.push(b); cards.set(b.id, []); return b;
  };
  const view = (b: Board, archived = false) => ({ ...meta(b), columns: b.columns.map(c => ({ ...c })), cards: cards.get(b.id)!.filter(c => archived || !c.archived).map(c => ({ ...c, comments: comments.get(c.id)?.length ?? 0 })) });
  const endOf = (b: Board, columnId: string) => Math.max(0, ...cards.get(b.id)!.filter(c => c.columnId === columnId).map(c => c.position)) + 1000;
  return function transport(request: WireRequest): WireResponse {
    const p = request.path; const body = request.body as Record<string, any>;
    if (p === '/api/boards' || p === '/api/boards?archived=1') {
      if (request.method === 'POST') return { status: 201, body: view(create(body.name, body.template ?? 'kanban', body.color ?? 'blue', body.departments ?? [], body.description)) };
      if (!boards.length) create('Company board', 'kanban', 'blue', []);
      const list = boards.filter(b => p.endsWith('=1') || !b.archived).map(b => ({ ...meta(b), cards: cards.get(b.id)!.filter(c => !c.archived).length, open: 0 }));
      return { status: 200, body: { boards: list, templates: TEMPLATES, colors: COLORS } };
    }
    const m = /^\/api\/boards\/([^/?]+)(?:\?archived=1)?(?:\/(columns|cards)(?:\/([^/]+)(?:\/(comments))?)?)?$/.exec(p);
    const b = m && boards.find(x => x.id === m[1]);
    if (!m || !b) return { status: 404, body: { code: 'not_found' } };
    const [, , part, sub, tail] = m;
    if (!part) {
      if (request.method === 'GET') return { status: 200, body: view(b, p.includes('archived=1')) };
      if (body.expectedVersion !== b.version) return { status: 409, body: { code: 'version_conflict', board: meta(b) } };
      for (const k of ['name', 'description', 'color', 'archived'] as const) if (body[k] !== undefined) (b as any)[k] = body[k];
      if (body.departments) b.departments = [...body.departments].sort();
      b.version++;
      return { status: 200, body: view(b) };
    }
    const list = cards.get(b.id)!;
    if (part === 'columns' && !sub) { b.columns.push({ id: nextId('col'), name: body.name, position: (b.columns.length + 1) * 1000 }); return { status: 201, body: view(b) }; }
    if (part === 'columns') { const c = b.columns.find(x => x.id === sub); if (!c) return { status: 404, body: { code: 'not_found' } }; c.name = body.name; return { status: 200, body: view(b) }; }
    if (part === 'cards' && !sub) {
      if (!b.columns.some(c => c.id === body.columnId)) return { status: 404, body: { code: 'not_found' } };
      const card: Card = { id: nextId('card'), columnId: body.columnId, title: body.title, description: body.description ?? '', priority: body.priority ?? 'normal', position: endOf(b, body.columnId), dueDate: body.dueDate ?? null,
        archived: false, version: 1, agents: body.agents ?? [], departments: body.departments ?? [], comments: 0, updatedAt: now() };
      list.push(card); return { status: 201, body: { ...card } };
    }
    const card = list.find(c => c.id === sub);
    if (!card) return { status: 404, body: { code: 'not_found' } };
    if (tail === 'comments') {
      const cs = comments.get(card.id) ?? [];
      if (request.method === 'POST') { cs.push({ id: nextId('cm'), authorKind: 'user', authorId: 'owner', body: body.body, createdAt: now() }); comments.set(card.id, cs); return { status: 201, body: { comments: cs.map(c => ({ ...c })) } }; }
      return { status: 200, body: { comments: cs.map(c => ({ ...c })) } };
    }
    if (body.expectedVersion !== card.version) return { status: 409, body: { code: 'version_conflict', card: { ...card } } };
    for (const k of ['title', 'description', 'priority', 'dueDate', 'agents', 'departments', 'archived'] as const) if (body[k] !== undefined) (card as any)[k] = body[k];
    if (body.columnId !== undefined) {
      const before = body.beforeCardId ? list.find(c => c.id === body.beforeCardId) : undefined;
      card.columnId = body.columnId;
      if (before) { const at = before.position; list.filter(c => c.columnId === body.columnId && c.position >= at && c.id !== card.id).forEach(c => { c.position += 1000; }); card.position = at; }
      else card.position = endOf(b, body.columnId);
    }
    card.version++; card.updatedAt = now();
    return { status: 200, body: { ...card, comments: comments.get(card.id)?.length ?? 0 } };
  };
}
