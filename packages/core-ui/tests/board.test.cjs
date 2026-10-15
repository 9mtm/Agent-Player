require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { SessionClient, allowedRequest } = require('../src/session.ts');
const { BoardController, cardsIn, matches } = require('../src/board.ts');
const { TaskBoard } = require('../src/TaskBoard.tsx');
const { allowedBoard, boardResponse, validCardEdit, validNewCard } = require('../src/board-contract.js');
const { createLoginMock } = require('../src/session-mock.ts');
const { allowed } = require('../scripts/application-server.cjs');

async function fixture(t, wrap = x => x) {
  const calls = []; const base = wrap(createLoginMock());
  const client = new SessionClient({ mock: async r => { calls.push(r); return base(r); } });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  const b = new BoardController(client); t.after(() => b.dispose());
  return { b, calls, client };
}
const markup = b => renderToStaticMarkup(React.createElement(TaskBoard, { controller: b }));
const col = (b, name) => b.getSnapshot().columns.find(c => c.name === name).id;

test('board contract (browser and bridge): exact paths, strict bodies, no other methods', () => {
  assert.equal(validNewCard({ columnId: 'c1', title: 'Write the post', priority: 'high', agents: ['agent-1'], departments: ['marketing'], dueDate: '2026-11-01' }), true);
  for (const bad of [{ columnId: 'c1', title: '' }, { columnId: 'c1', title: 'a\nb' }, { columnId: 'c1', title: 'x', priority: 'asap' }, { columnId: 'c1', title: 'x', departments: ['Marketing'] },
    { columnId: 'c1', title: 'x', extra: 1 }, { columnId: '../x', title: 'x' }, { columnId: 'c1', title: 'x', description: 'a‮b' }])
    assert.equal(validNewCard(bad), false, JSON.stringify(bad));
  assert.equal(validCardEdit({ expectedVersion: 2, columnId: 'c2', beforeCardId: null }), true);
  for (const bad of [{ expectedVersion: 2 }, { title: 'x' }, { expectedVersion: 2, beforeCardId: 'k1' }, { expectedVersion: 0, title: 'x' }, { expectedVersion: 2, archived: 'yes' }])
    assert.equal(validCardEdit(bad), false, JSON.stringify(bad));
  for (const allow of [allowedRequest, allowed]) {
    assert.equal(allow('GET', '/api/boards', undefined), true);
    assert.equal(allow('GET', '/api/boards/b1', undefined), true);
    assert.equal(allow('GET', '/api/boards/b1?archived=1', undefined), true);
    assert.equal(allow('GET', '/api/boards/b1?x=1', undefined), false);
    assert.equal(allow('POST', '/api/boards/b1/cards', { columnId: 'c1', title: 'x' }), true);
    assert.equal(allow('PUT', '/api/boards/b1/cards/k1', { expectedVersion: 1, title: 'y' }), true);
    assert.equal(allow('DELETE', '/api/boards/b1/cards/k1', undefined), false);
    assert.equal(allow('POST', '/api/boards/b1/cards/k1/comments', { body: 'hi' }), true);
    assert.equal(allow('POST', '/api/boards/b1/cards/k1/comments', { body: '' }), false);
    assert.equal(allow('PUT', '/api/boards/b1/columns/c1', { name: 'Doing' }), true);
  }
  assert.equal(allowedBoard('POST', '/api/boards/b1/columns', { name: 'x', extra: 1 }), false);
});

test('responses are projected; malformed ones are refused', () => {
  const card = { id: 'k1', columnId: 'c1', title: 'T', description: '', priority: 'normal', position: 1000, dueDate: null, archived: false, version: 1, agents: ['agent-1', '../bad'], departments: ['sales', 'Bad Dep'], comments: 2, updatedAt: '2026-10-15 12:00:00', taskId: 'secret', createdBy: 'owner' };
  const view = boardResponse('/api/boards/b1', 200, { id: 'b1', name: 'Company board', columns: [{ id: 'c1', name: 'To do', position: 1000 }], cards: [card], owner_id: 'x' });
  assert.deepEqual(view.cards[0].agents, ['agent-1']); assert.deepEqual(view.cards[0].departments, ['sales']);
  assert.equal(view.cards[0].taskId, undefined); assert.equal(view.owner_id, undefined);
  assert.throws(() => boardResponse('/api/boards/b1', 200, { id: 'b1', columns: [], cards: [{ ...card, priority: 'mega' }] }));
  assert.deepEqual(boardResponse('/api/boards/b1/cards/k1', 409, { code: 'version_conflict', error: 'x', card }).code, 'version_conflict');
  assert.equal(boardResponse('/api/boards/b1/cards', 400, { code: 'weird', error: 'stack…' }), null);
});

test('offline: open, add cards, edit in the panel, move, comment, archive', async t => {
  const { b, calls } = await fixture(t);
  assert.equal(calls.filter(c => c.path.startsWith('/api/boards')).length, 0, 'nothing read before Open the board');
  assert.match(markup(b), /Open the board/);
  await b.load();
  let s = b.getSnapshot();
  assert.deepEqual(s.columns.map(c => c.name), ['Backlog', 'To do', 'In progress', 'Review', 'Done']);
  assert.ok(s.agents.length >= 2, 'team loaded for assignees');
  assert.equal(await b.addCard(col(b, 'To do'), '  Write   the launch post '), true);
  assert.equal(await b.addCard(col(b, 'To do'), 'Design the banner'), true);
  assert.equal(await b.addCard(col(b, 'To do'), ''), false);
  s = b.getSnapshot();
  assert.deepEqual(cardsIn(s.cards, col(b, 'To do')).map(c => c.title), ['Write the launch post', 'Design the banner']);
  const post = s.cards.find(c => c.title === 'Write the launch post');
  await b.openCard(post.id);
  b.editDraft({ description: 'Short and friendly.', priority: 'urgent', dueDate: '2026-11-02' });
  b.toggleAgent(s.agents[0].id);
  assert.equal(b.addDepartment('  Marketing '), true);
  assert.equal(b.addDepartment('a<b>'), false);
  await b.saveCard();
  const put = calls.filter(c => c.method === 'PUT').at(-1);
  assert.deepEqual(put.body, { expectedVersion: 1, description: 'Short and friendly.', priority: 'urgent', dueDate: '2026-11-02', agents: [s.agents[0].id], departments: ['marketing'] });
  let html = markup(b);
  assert.match(html, /Urgent/); assert.match(html, /marketing/); assert.match(html, /Due 2026-11-02/);
  await b.addComment('Please keep it under 200 words.');
  assert.equal(b.getSnapshot().comments.length, 1);
  assert.equal(b.getSnapshot().cards.find(c => c.id === post.id).comments, 1);
  // Move the banner before the post in "In progress", then the post after it.
  const banner = b.getSnapshot().cards.find(c => c.title === 'Design the banner');
  await b.move(banner.id, col(b, 'In progress'), null);
  await b.move(post.id, col(b, 'In progress'), banner.id);
  assert.deepEqual(cardsIn(b.getSnapshot().cards, col(b, 'In progress')).map(c => c.title), ['Write the launch post', 'Design the banner']);
  // Filters.
  b.setFilter({ department: 'marketing' });
  assert.equal(b.getSnapshot().cards.filter(c => matches(c, b.getSnapshot().filter)).length, 1);
  b.setFilter({ department: '', text: 'banner' });
  assert.equal(b.getSnapshot().cards.filter(c => matches(c, b.getSnapshot().filter)).length, 1);
  b.setFilter({ text: '' });
  // Archive closes the panel and hides the card.
  await b.openCard(banner.id);
  await b.archiveCard();
  s = b.getSnapshot();
  assert.equal(s.open, undefined); assert.ok(!s.cards.some(c => c.id === banner.id));
  html = markup(b);
  for (const label of ['Search cards', 'All agents', 'All departments', 'Add column', '+ Add a card']) assert.match(html, new RegExp(label.replace('+', '\\+')));
});

test('a stale card shows the latest version; nothing is sent for an unchanged card', async t => {
  let stale = true;
  const { b, calls } = await fixture(t, base => async r => {
    if (r.method === 'PUT' && /\/cards\//.test(r.path) && stale) { stale = false; const cur = await base({ ...r, body: { expectedVersion: r.body.expectedVersion, title: 'Changed elsewhere' } }); return { status: 409, body: { code: 'version_conflict', card: cur.body } }; }
    return base(r);
  });
  await b.load();
  await b.addCard(col(b, 'Backlog'), 'Original');
  const card = b.getSnapshot().cards[0];
  await b.openCard(card.id);
  await b.saveCard();
  assert.match(b.getSnapshot().notice, /Nothing changed/);
  assert.equal(calls.filter(c => c.method === 'PUT').length, 0);
  b.editDraft({ title: 'My edit' });
  await b.saveCard();
  assert.match(b.getSnapshot().notice, /changed meanwhile/);
  assert.equal(b.getSnapshot().draft.title, 'Changed elsewhere');
});

test('not the owner: nothing to open', async () => {
  const client = new SessionClient({ mock: createLoginMock() });
  const b = new BoardController(client);
  assert.equal(b.getSnapshot().owner, false);
  await b.load();
  assert.equal(b.getSnapshot().boardId, undefined);
  b.dispose();
});

test('quick successive adds are queued, none is lost', async t => {
  const { b } = await fixture(t);
  await b.load();
  const results = await Promise.all(['One', 'Two', 'Three'].map(x => b.addCard(col(b, 'Backlog'), x)));
  assert.deepEqual(results, [true, true, true]);
  assert.deepEqual(cardsIn(b.getSnapshot().cards, col(b, 'Backlog')).map(c => c.title), ['One', 'Two', 'Three']);
});
