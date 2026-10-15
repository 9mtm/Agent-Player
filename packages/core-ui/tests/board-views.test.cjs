require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { SessionClient } = require('../src/session.ts');
const { BoardController } = require('../src/board.ts');
const { OVERLOAD, cardsByDue, monthGrid, sortCards, workload } = require('../src/board-views.ts');
const { CalendarView, TableView, WorkloadView, ViewSwitch } = require('../src/BoardViews.tsx');
const { createLoginMock } = require('../src/session-mock.ts');

const card = (id, over = {}) => ({ id, columnId: 'c1', title: id, description: '', priority: 'normal', position: 1000, dueDate: null, archived: false, version: 1,
  agents: [], departments: [], comments: 0, updatedAt: '', type: 'task', startDate: null, cover: null, labels: [], checklist: { done: 0, total: 0 }, ...over });
const columns = [{ id: 'c1', name: 'To do', position: 1000 }, { id: 'c2', name: 'Doing', position: 2000 }, { id: 'c3', name: 'Done', position: 3000 }];

test('sorting: by priority, due date (empty last both ways), column, checklist; ties keep board order', () => {
  const cards = [card('a', { priority: 'low', dueDate: '2026-11-03' }), card('b', { priority: 'urgent' }), card('c', { priority: 'high', dueDate: '2026-11-01', columnId: 'c3' }), card('d', { checklist: { done: 1, total: 2 } })];
  assert.deepEqual(sortCards(cards, columns, 'priority', 'asc').map(c => c.id), ['b', 'c', 'd', 'a']);
  assert.deepEqual(sortCards(cards, columns, 'due', 'asc').map(c => c.id), ['c', 'a', 'b', 'd']);
  assert.deepEqual(sortCards(cards, columns, 'due', 'desc').map(c => c.id), ['a', 'c', 'b', 'd']);
  assert.deepEqual(sortCards(cards, columns, 'column', 'desc').map(c => c.id), ['c', 'a', 'b', 'd']);
  assert.deepEqual(sortCards(cards, columns, 'checklist', 'asc').map(c => c.id)[0], 'd');
});

test('month grid: Monday first, whole weeks, days of other months marked', () => {
  const oct = monthGrid(2026, 9); // October 2026 starts on a Thursday
  assert.equal(oct[0][0].date, '2026-09-28'); assert.equal(oct[0][0].inMonth, false);
  assert.equal(oct[0][3].date, '2026-10-01'); assert.equal(oct[0][3].inMonth, true);
  assert.ok(oct.every(w => w.length === 7));
  assert.equal(oct.flat().filter(d => d.inMonth).length, 31);
  assert.equal(monthGrid(2026, 1).flat().filter(d => d.inMonth).length, 28); // February 2026
  const { byDay, undated } = cardsByDue([card('x', { dueDate: '2026-10-15' }), card('y'), card('z', { dueDate: '2026-10-15' })]);
  assert.deepEqual(byDay.get('2026-10-15').map(c => c.id), ['x', 'z']); assert.deepEqual(undated.map(c => c.id), ['y']);
});

test('workload: open cards per agent (last column counts as done), overdue and urgent, most loaded first, free agents listed', () => {
  const agents = [{ id: 'a1', name: 'Nora' }, { id: 'a2', name: 'Wren' }, { id: 'a3', name: 'Idle' }];
  const cards = [
    ...Array.from({ length: OVERLOAD + 1 }, (_, i) => card(`n${i}`, { agents: ['a1'], dueDate: i === 0 ? '2026-01-01' : null, priority: i === 1 ? 'urgent' : 'normal' })),
    card('w1', { agents: ['a2', 'a1'], columnId: 'c3' }), card('w2', { agents: ['a2'] }),
  ];
  const loads = workload(cards, columns, agents, '2026-10-15');
  assert.deepEqual(loads.map(l => [l.agent.name, l.open.length, l.overdue, l.urgent, l.done]), [['Nora', 6, 1, 1, 1], ['Wren', 1, 0, 0, 1], ['Idle', 0, 0, 0, 0]]);
});

async function fixture(t) {
  const client = new SessionClient({ mock: createLoginMock() });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  const b = new BoardController(client); t.after(() => b.dispose());
  await b.load();
  return b;
}
const html = (el, props) => renderToStaticMarkup(React.createElement(el, props));

test('views render from the open board: table with sortable headers, calendar with due cards, workload per agent', async t => {
  const b = await fixture(t);
  const todo = b.getSnapshot().columns.find(c => c.name === 'To do').id;
  const agent = b.getSnapshot().agents[0].id;
  const today = new Date().toISOString().slice(0, 10);
  await b.addCard(todo, 'Write the post');
  await b.addCard(todo, 'Undated idea');
  const first = b.getSnapshot().cards.find(c => c.title === 'Write the post');
  await b.openCard(first.id); b.editDraft({ dueDate: today, priority: 'urgent' }); b.toggleAgent(agent); await b.saveCard(); b.closeCard();
  const table = html(TableView, { controller: b, busy: false });
  for (const h of ['Card', 'Status', 'Priority', 'Due', 'Checklist', 'Write the post', 'Urgent']) assert.match(table, new RegExp(h));
  assert.match(table, /aria-sort="ascending"/);
  const cal = html(CalendarView, { controller: b });
  assert.match(cal, new RegExp(`aria-label="${today}"[^>]*>.*?Write the post`));
  assert.match(cal, /No due date \(1\)/);
  const load = html(WorkloadView, { controller: b });
  assert.match(load, new RegExp(`${b.getSnapshot().agents[0].name}</strong>`));
  assert.match(load, /1 open/);
  assert.match(load, /Free on this board/);
  const sw = html(ViewSwitch, { view: 'calendar', onChange: () => {} });
  assert.match(sw, /aria-selected="true"[^>]*>Calendar/);
});
