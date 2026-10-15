// BOARD-01: the company task board. Owner only; columns, cards (priority,
// agents, departments, due date), versioned moves, comments, archive.
// Run: node --import tsx --test test/task-board.test.mjs
// Throwaway DB + cwd, random test-only secrets, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-board-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only

const quiet = { log: console.log, warn: console.warn };
console.log = () => {}; console.warn = () => {};
const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const addUser = (id, role) => db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', ?, 'active')`).run(id, `${id}@example.test`, id, role);
addUser('bd-owner', 'owner'); addUser('bd-admin', 'admin'); addUser('bd-user', 'user');
for (const id of ['ag-1', 'ag-2']) db.prepare(`INSERT INTO agents_config (id, name) VALUES (?, ?)`).run(id, id);

const { registerAuthGate } = await import(join(backendDir, 'src/auth/auth-gate.ts'));
const { taskBoardRoutes } = await import(join(backendDir, 'src/api/routes/task-board.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { default: Fastify } = await import('fastify');
const app = Fastify();
registerAuthGate(app);
await app.register(taskBoardRoutes);
await app.ready();
Object.assign(console, quiet);

test.after(async () => { await app.close(); closeDatabase(); rmSync(dir, { recursive: true, force: true }); });

const auth = (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` });
const call = (method, url, payload, who = 'bd-owner') => app.inject({ method, url, headers: auth(who), payload });
let board;
const B = () => `/api/boards/${board.id}`;
const col = (name) => board.columns.find((c) => c.name === name).id;
const refresh = async () => { board = (await call('GET', B())).json(); return board; };

test('only the owner may use the board', async () => {
  for (const [m, u] of [['GET', '/api/boards'], ['POST', '/api/boards/x/cards']]) {
    assert.equal((await app.inject({ method: m, url: u, payload: m === 'POST' ? {} : undefined })).statusCode, 401);
    for (const who of ['bd-admin', 'bd-user']) assert.equal((await call(m, u, m === 'POST' ? {} : undefined, who)).statusCode, 403);
  }
});

test('first read creates the company board with five columns; reading again does not duplicate it', async () => {
  const first = (await call('GET', '/api/boards')).json().boards;
  const again = (await call('GET', '/api/boards')).json().boards;
  assert.equal(first.length, 1); assert.deepEqual(again, first);
  board = (await call('GET', `/api/boards/${first[0].id}`)).json();
  assert.deepEqual(board.columns.map((c) => c.name), ['Backlog', 'To do', 'In progress', 'Review', 'Done']);
  assert.equal((await call('GET', '/api/boards/nope')).statusCode, 404);
});

test('cards: create with agents and departments, validate, edit, move, archive', async () => {
  const created = await call('POST', `${B()}/cards`, { columnId: col('To do'), title: '  Launch   the newsletter ', description: 'Line 1\nLine 2', priority: 'high', dueDate: '2026-11-01', agents: ['ag-1', 'ag-1', 'ag-2'], departments: ['Marketing', 'design'] });
  assert.equal(created.statusCode, 201, created.body);
  const card = created.json();
  assert.equal(card.title, 'Launch the newsletter');
  assert.deepEqual(card.agents, ['ag-1', 'ag-2']); assert.deepEqual(card.departments, ['design', 'marketing']);
  assert.equal(card.version, 1);
  for (const [payload, why] of [
    [{ columnId: col('To do'), title: '' }, 'empty title'], [{ columnId: col('To do'), title: 'x', priority: 'asap' }, 'priority'],
    [{ columnId: col('To do'), title: 'x', agents: ['ghost'] }, 'unknown agent'], [{ columnId: col('To do'), title: 'x', dueDate: '1/2/2026' }, 'date'],
    [{ columnId: col('To do'), title: 'x', extra: 1 }, 'extra field'], [{ columnId: col('To do'), title: 'x', departments: ['a<b>'] }, 'department'],
    [{ columnId: col('To do'), title: 'x', description: 'a\u0000b' }, 'control char'],
  ]) assert.equal((await call('POST', `${B()}/cards`, payload)).statusCode, 400, why);
  assert.equal((await call('POST', `${B()}/cards`, { columnId: 'missing', title: 'x' })).statusCode, 404);

  const b = (await call('POST', `${B()}/cards`, { columnId: col('In progress'), title: 'Second' })).json();
  const c = (await call('POST', `${B()}/cards`, { columnId: col('In progress'), title: 'Third' })).json();
  // Move the first card into "In progress", before "Third".
  const moved = await call('PUT', `${B()}/cards/${card.id}`, { expectedVersion: 1, columnId: col('In progress'), beforeCardId: c.id, priority: 'urgent' });
  assert.equal(moved.statusCode, 200, moved.body);
  assert.equal(moved.json().version, 2);
  await refresh();
  assert.deepEqual(board.cards.filter((x) => x.columnId === col('In progress')).map((x) => x.title), ['Second', 'Launch the newsletter', 'Third']);
  // A stale version is refused with the current card.
  const stale = await call('PUT', `${B()}/cards/${card.id}`, { expectedVersion: 1, title: 'Old edit' });
  assert.equal(stale.statusCode, 409); assert.equal(stale.json().code, 'version_conflict'); assert.equal(stale.json().card.version, 2);
  assert.equal((await call('PUT', `${B()}/cards/${card.id}`, { title: 'No version' })).json().code, 'invalid_version');
  // Archive hides the card from the board; ?archived=1 shows it.
  assert.equal((await call('PUT', `${B()}/cards/${b.id}`, { expectedVersion: 1, archived: true })).statusCode, 200);
  await refresh();
  assert.ok(!board.cards.some((x) => x.id === b.id));
  assert.ok((await call('GET', `${B()}?archived=1`)).json().cards.some((x) => x.id === b.id && x.archived));
  // Edit agents and departments.
  const edited = await call('PUT', `${B()}/cards/${card.id}`, { expectedVersion: 2, agents: ['ag-2'], departments: [] });
  assert.deepEqual([edited.json().agents, edited.json().departments], [['ag-2'], []]);
});

test('many moves to the same spot keep a stable order (renumbering)', async () => {
  const target = col('Review');
  const anchor = (await call('POST', `${B()}/cards`, { columnId: target, title: 'Anchor' })).json();
  for (let i = 0; i < 15; i++) {
    const x = (await call('POST', `${B()}/cards`, { columnId: col('Backlog'), title: `Item ${i}` })).json();
    const r = await call('PUT', `${B()}/cards/${x.id}`, { expectedVersion: 1, columnId: target, beforeCardId: anchor.id });
    assert.equal(r.statusCode, 200, r.body);
  }
  await refresh();
  const titles = board.cards.filter((x) => x.columnId === target).map((x) => x.title);
  assert.equal(titles.at(-1), 'Anchor');
  assert.deepEqual(titles.slice(0, -1), Array.from({ length: 15 }, (_, i) => `Item ${i}`));
});

test('columns: add and rename; comments: add and list with counts', async () => {
  const added = await call('POST', `${B()}/columns`, { name: 'Blocked' });
  assert.equal(added.statusCode, 201);
  board = added.json();
  assert.equal(board.columns.at(-1).name, 'Blocked');
  board = (await call('PUT', `${B()}/columns/${col('Blocked')}`, { name: 'Waiting' })).json();
  assert.ok(board.columns.some((c) => c.name === 'Waiting'));
  assert.equal((await call('POST', `${B()}/columns`, { name: '' })).statusCode, 400);
  const card = board.cards[0];
  assert.equal((await call('POST', `${B()}/cards/${card.id}/comments`, { body: '' })).statusCode, 400);
  const r = await call('POST', `${B()}/cards/${card.id}/comments`, { body: 'Please start with the outline.\nThanks' });
  assert.equal(r.statusCode, 201);
  const list = (await call('GET', `${B()}/cards/${card.id}/comments`)).json().comments;
  assert.deepEqual(list.map((c) => [c.authorKind, c.authorId, c.body]), [['user', 'bd-owner', 'Please start with the outline.\nThanks']]);
  await refresh();
  assert.equal(board.cards.find((x) => x.id === card.id).comments, 1);
});

test('agents: list, comment on and move only their own cards; others look missing', async () => {
  const tools = await import(join(backendDir, 'src/tools/index.ts'));
  const { DEFAULT_AGENT_TOOLS } = await import(join(backendDir, 'src/tools/grants.ts'));
  for (const t of ['board_my_cards', 'board_comment', 'board_move']) assert.ok(DEFAULT_AGENT_TOOLS.includes(t));
  await refresh();
  const mine = (await call('POST', `${B()}/cards`, { columnId: col('To do'), title: 'Agent card', agents: ['ag-1'], priority: 'high' })).json();
  const other = (await call('POST', `${B()}/cards`, { columnId: col('To do'), title: 'Not yours', agents: ['ag-2'] })).json();
  const registry = await tools.createAgentToolsRegistry({ workspaceDir: dir, agentId: 'ag-1', userId: 'bd-owner', sessionId: 's-board' });
  const text = (r) => (r.content || []).map((c) => c.text).join('\n');
  const quietRun = async (name, params) => { const s = { ...console }; console.log = () => {}; console.warn = () => {}; try { return await registry.execute(name, params); } finally { Object.assign(console, s); } };
  const list = await quietRun('board_my_cards', {});
  assert.match(text(list), /Agent card/); assert.doesNotMatch(text(list), /Not yours/);
  assert.match(text(await quietRun('board_comment', { card_id: mine.id, comment: 'Started on it.' })), /Comment added \(1/);
  assert.match(text(await quietRun('board_comment', { card_id: other.id, comment: 'Sneaky' })), /not one of your board cards/);
  assert.match(text(await quietRun('board_move', { card_id: mine.id, column: 'in progress' })), /moved to "In progress"/);
  assert.match(text(await quietRun('board_move', { card_id: mine.id, column: 'Nowhere' })), /No column named/);
  assert.match(text(await quietRun('board_move', { card_id: mine.id, column: 'done' })), /Only the owner moves cards to "Done"/);
  assert.match(text(await quietRun('board_move', { card_id: mine.id, column: board.columns.at(-1).name })), /Only the owner moves cards to/, 'nor into the last column');
  assert.match(text(await quietRun('board_move', { card_id: other.id, column: 'Done' })), /not one of your board cards/);
  const comments = (await call('GET', `${B()}/cards/${mine.id}/comments`)).json().comments;
  assert.deepEqual(comments.map((c) => [c.authorKind, c.authorId, c.body]), [['agent', 'ag-1', 'Started on it.']]);
  await refresh();
  assert.equal(board.cards.find((c) => c.id === mine.id).columnId, col('In progress'));
  assert.equal(board.cards.find((c) => c.id === other.id).columnId, col('To do'));
  // Another owner's run of the same agent sees nothing.
  const foreign = await tools.createAgentToolsRegistry({ workspaceDir: dir, agentId: 'ag-1', userId: 'bd-admin', sessionId: 's-x' });
  const s = { ...console }; console.log = () => {};
  try { assert.match(text(await foreign.execute('board_my_cards', {})), /no board cards/); } finally { Object.assign(console, s); }
});
