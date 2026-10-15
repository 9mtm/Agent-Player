import type { WireRequest, WireResponse } from './session';

type Card = { id: string; columnId: string; title: string; description: string; priority: string; position: number; dueDate: string | null; archived: boolean; version: number; agents: string[]; departments: string[]; comments: number; updatedAt: string };

/** Fictional in-memory company board for offline practice and tests (same rules as the server, simplified). */
export function createBoardMock() {
  const boardId = 'board-offline';
  let n = 0; const nextId = (p: string) => `${p}-${++n}`;
  const columns = ['Backlog', 'To do', 'In progress', 'Review', 'Done'].map((name, i) => ({ id: `col-${i + 1}`, name, position: (i + 1) * 1000 }));
  const cards: Card[] = [];
  const comments = new Map<string, { id: string; authorKind: 'user'; authorId: string; body: string; createdAt: string }[]>();
  const now = () => '2026-10-15 12:00:00';
  const view = (archived = false) => ({ id: boardId, name: 'Company board', columns: columns.map(c => ({ ...c })), cards: cards.filter(c => archived || !c.archived).map(c => ({ ...c, comments: comments.get(c.id)?.length ?? 0 })) });
  const endOf = (columnId: string) => Math.max(0, ...cards.filter(c => c.columnId === columnId).map(c => c.position)) + 1000;
  return function transport(request: WireRequest): WireResponse {
    const p = request.path; const b = request.body as Record<string, any>;
    if (p === '/api/boards') return { status: 200, body: { boards: [{ id: boardId, name: 'Company board' }] } };
    const m = /^\/api\/boards\/([^/?]+)(?:\?archived=1)?(?:\/(columns|cards)(?:\/([^/]+)(?:\/(comments))?)?)?$/.exec(p);
    if (!m || m[1] !== boardId) return { status: 404, body: { code: 'not_found' } };
    const [, , kind, sub, tail] = m;
    if (!kind) return { status: 200, body: view(p.includes('archived=1')) };
    if (kind === 'columns' && !sub) { columns.push({ id: nextId('col-x'), name: b.name, position: (columns.length + 1) * 1000 }); return { status: 201, body: view() }; }
    if (kind === 'columns') { const c = columns.find(x => x.id === sub); if (!c) return { status: 404, body: { code: 'not_found' } }; c.name = b.name; return { status: 200, body: view() }; }
    if (kind === 'cards' && !sub) {
      if (!columns.some(c => c.id === b.columnId)) return { status: 404, body: { code: 'not_found' } };
      const card: Card = { id: nextId('card'), columnId: b.columnId, title: b.title, description: b.description ?? '', priority: b.priority ?? 'normal', position: endOf(b.columnId), dueDate: b.dueDate ?? null,
        archived: false, version: 1, agents: b.agents ?? [], departments: b.departments ?? [], comments: 0, updatedAt: now() };
      cards.push(card); return { status: 201, body: { ...card } };
    }
    const card = cards.find(c => c.id === sub);
    if (!card) return { status: 404, body: { code: 'not_found' } };
    if (tail === 'comments') {
      const list = comments.get(card.id) ?? [];
      if (request.method === 'POST') { list.push({ id: nextId('cm'), authorKind: 'user', authorId: 'owner', body: b.body, createdAt: now() }); comments.set(card.id, list); return { status: 201, body: { comments: list.map(c => ({ ...c })) } }; }
      return { status: 200, body: { comments: list.map(c => ({ ...c })) } };
    }
    if (b.expectedVersion !== card.version) return { status: 409, body: { code: 'version_conflict', card: { ...card } } };
    for (const k of ['title', 'description', 'priority', 'dueDate', 'agents', 'departments', 'archived'] as const) if (b[k] !== undefined) (card as any)[k] = b[k];
    if (b.columnId !== undefined) {
      const before = b.beforeCardId ? cards.find(c => c.id === b.beforeCardId) : undefined;
      card.columnId = b.columnId;
      if (before) { const at = before.position; cards.filter(c => c.columnId === b.columnId && c.position >= at && c.id !== card.id).forEach(c => { c.position += 1000; }); card.position = at; }
      else card.position = endOf(b.columnId);
    }
    card.version++; card.updatedAt = now();
    return { status: 200, body: { ...card, comments: comments.get(card.id)?.length ?? 0 } };
  };
}
