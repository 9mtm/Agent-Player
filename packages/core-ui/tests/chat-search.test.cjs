// CHAT-PRO-02 D: search inside conversations — the strict search path (browser and
// bridge), the projected answer (plain text snippets, offsets), the search controller,
// the grouped results and opening a hit at its message.
require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { SessionClient, allowedRequest } = require('../src/session.ts');
const { createLoginMock } = require('../src/session-mock.ts');
const { ConversationsController } = require('../src/conversations.ts');
const { ChatSearchController, snippetParts } = require('../src/chat-search.ts');
const { SearchResults } = require('../src/ChatSearch.tsx');
const { ConversationList } = require('../src/ConversationList.tsx');
const { ChatView } = require('../src/ChatView.tsx');
const { allowedChatSearch, chatSearchPath, chatSearchResponse, searchPath, validQuery } = require('../src/chat-search-contract.js');
const { allowed } = require('../scripts/application-server.cjs');

const CID = 'conv-0000000001';
const PID = 'proj-00000001';
const path = q => `/api/chat/search?q=${encodeURIComponent(q)}`;
const until = async (fn, ms = 5000) => { const end = Date.now() + ms; while (!fn()) { if (Date.now() > end) throw Error('timeout'); await new Promise(r => setTimeout(r, 20)); } };

async function fixture(t) {
  const calls = []; const base = createLoginMock();
  const client = new SessionClient({ mock: async r => { calls.push({ method: r.method, path: r.path }); return base(r); } });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  let n = 0;
  const c = new ConversationsController(client, () => `id${String(++n).padStart(10, '0')}`);
  const search = new ChatSearchController(client, 5);
  t.after(() => { c.dispose(); search.dispose(); });
  return { c, search, calls, client };
}

test('contract (browser and bridge): one canonical GET path, query 2-200 characters', () => {
  const good = [path('deploy'), path('نشر الموقع'), path('100% my_site'), `${path('deploy')}&projectId=${PID}`, `${path('deploy')}&limit=50`, `${path('deploy')}&projectId=${PID}&limit=200`, path('x'.repeat(200)), path('😀😀')];
  const bad = [
    '/api/chat/search', '/api/chat/search?q=', path('a'), path(' deploy'), path('deploy '), path('x'.repeat(201)), path('a\nb'), path('a‮b'),
    '/api/chat/search?q=deploy%2', '/api/chat/search?q=de%70loy', '/api/chat/search?q=deploy+now', `${path('deploy')}&limit=0`, `${path('deploy')}&limit=201`, `${path('deploy')}&limit=050`,
    `${path('deploy')}&projectId=../x`, `${path('deploy')}&x=1`, `${path('deploy')}&limit=5&projectId=${PID}`, `/api/chat/search?projectId=${PID}&q=deploy`, '/api/chat/search/../conversations?q=xx',
  ];
  for (const p of good) {
    assert.equal(allowedChatSearch('GET', p, undefined), true, p);
    assert.equal(allowedRequest('GET', p, undefined), true, p);
    assert.equal(allowed('GET', p, undefined), true, `bridge ${p}`);
  }
  for (const p of bad) { assert.equal(allowedRequest('GET', p, undefined), false, p); assert.equal(allowed('GET', p, undefined), false, `bridge ${p}`); }
  for (const m of ['POST', 'PUT', 'DELETE']) { assert.equal(allowedRequest(m, path('deploy'), {}), false); assert.equal(allowed(m, path('deploy'), {}), false); }
  assert.equal(allowedRequest('GET', path('deploy'), {}), false, 'no body');
  assert.equal(chatSearchPath('a b', PID, 10), `/api/chat/search?q=a%20b&projectId=${PID}&limit=10`);
  assert.deepEqual(searchPath(chatSearchPath('a b', PID, 10)), { query: 'a b', projectId: PID, limit: 10 });
  assert.equal(validQuery('ok'), true); assert.equal(validQuery(' ok'), false); assert.equal(validQuery('o'), false);
});

test('answers are projected to reviewed fields; malformed ones are refused', () => {
  const P = path('deploy');
  const hit = { kind: 'assistant', messageId: 'm-12', createdAt: '2026-10-16 10:00:00', snippet: '…run <b>deploy</b> now', ranges: [[7, 13]], html: '<b>x</b>' };
  const body = { query: 'deploy', truncated: true, secret: 1, results: [{ conversationId: CID, title: 'Deploy notes', projectId: PID, updatedAt: '2026-10-16 10:00:05', matchCount: 3, userId: 'u1', hits: [{ kind: 'title', messageId: null, createdAt: '2026-10-16 10:00:05', snippet: 'Deploy notes', ranges: [[0, 6]] }, hit] }] };
  const out = chatSearchResponse(P, 200, body);
  assert.equal(out.secret, undefined); assert.equal(out.truncated, true);
  assert.equal(out.results[0].userId, undefined); assert.equal(out.results[0].hits[1].html, undefined);
  assert.equal(out.results[0].hits[1].snippet, '…run <b>deploy</b> now', 'snippets stay text; the view escapes them');
  const bad = [
    { ...body, query: 'other' }, { ...body, results: 'x' },
    { ...body, results: [{ ...body.results[0], conversationId: '../x' }] },
    { ...body, results: [{ ...body.results[0], hits: [] }] },
    { ...body, results: [{ ...body.results[0], hits: [{ ...hit, ranges: [[5, 3]] }] }] },
    { ...body, results: [{ ...body.results[0], hits: [{ ...hit, ranges: [[0, 999]] }] }] },
    { ...body, results: [{ ...body.results[0], hits: [{ ...hit, ranges: [[4, 8], [5, 9]] }] }] },
    { ...body, results: [{ ...body.results[0], hits: [{ ...hit, kind: 'system' }] }] },
    { ...body, results: [{ ...body.results[0], hits: [{ ...hit, kind: 'title' }] }] },
    { ...body, results: [{ ...body.results[0], hits: [{ ...hit, messageId: null }] }] },
    { ...body, results: [{ ...body.results[0], hits: [{ ...hit, snippet: 'x'.repeat(401) }] }] },
  ];
  for (const b of bad) assert.throws(() => chatSearchResponse(P, 200, b), JSON.stringify(b).slice(0, 80));
  assert.deepEqual(chatSearchResponse(P, 400, { error: 'q must be 2-200 characters', code: 'invalid_request' }), { code: 'invalid_request' });
  assert.equal(chatSearchResponse(P, 500, { error: 'boom' }), null);
  assert.throws(() => chatSearchResponse('/api/chat/search?q=a', 200, body));
});

test('snippet pieces mark only valid ranges', () => {
  assert.deepEqual(snippetParts('one two one', [[0, 3], [8, 11]]), [{ text: 'one', hit: true }, { text: ' two ', hit: false }, { text: 'one', hit: true }]);
  assert.deepEqual(snippetParts('abc', [[2, 1], [1, 9]]), [{ text: 'abc', hit: false }]);
});

test('the controller searches after a pause, keeps only the newest answer and the mock finds own chats', async t => {
  const { c, search, calls } = await fixture(t);
  await c.load();
  c.edit('Plan the launch week'); await c.send();
  await until(() => !c.getSnapshot().runId);
  search.setQuery('l'); assert.equal(search.getSnapshot().phase, 'idle', 'one character is not searched');
  search.setQuery('lau'); search.setQuery('launch');
  assert.equal(search.getSnapshot().phase, 'searching');
  await until(() => search.getSnapshot().phase === 'ready');
  assert.equal(calls.filter(x => x.path.startsWith('/api/chat/search')).length, 1, 'typing quickly sends one search');
  const s = search.getSnapshot();
  assert.equal(s.query, 'launch');
  assert.equal(s.results.length, 1);
  assert.deepEqual(s.results[0].hits.map(h => h.kind), ['title', 'user']);
  search.setQuery('fictional'); await until(() => search.getSnapshot().phase === 'ready' && search.getSnapshot().query === 'fictional');
  assert.equal(search.getSnapshot().results[0].hits[0].kind, 'assistant');
  search.setQuery('nothing like this'); await until(() => search.getSnapshot().phase === 'ready' && search.getSnapshot().query === 'nothing like this');
  assert.equal(search.getSnapshot().results.length, 0);
  search.clear(); assert.equal(search.getSnapshot().phase, 'idle');
});

test('results render grouped, marked and escaped; the list shows them for 2+ characters', async t => {
  const state = { query: 'deploy', phase: 'ready', truncated: true, results: [{ conversationId: CID, title: 'Deploy notes', projectId: PID, updatedAt: '', matchCount: 7, hits: [
    { kind: 'title', messageId: null, createdAt: '', snippet: 'Deploy notes', ranges: [[0, 6]] },
    { kind: 'assistant', messageId: 'm-12', createdAt: '', snippet: 'run <img src=x onerror=alert(1)> deploy', ranges: [[33, 39]] },
  ] }] };
  const html = renderToStaticMarkup(React.createElement(SearchResults, { state, projectName: () => 'Launch site', onOpen: () => {} }));
  assert.match(html, /<mark>Deploy<\/mark><span> notes<\/span>/);
  assert.match(html, /<mark>deploy<\/mark>/);
  assert.ok(!html.includes('<img'), 'snippet text is escaped');
  assert.match(html, /Launch site/); assert.match(html, /\+6 more in this chat/); assert.match(html, /Showing the newest matches/);
  assert.match(renderToStaticMarkup(React.createElement(SearchResults, { state: { ...state, results: [] }, onOpen: () => {} })), /No chat contains “deploy”/);
  assert.match(renderToStaticMarkup(React.createElement(SearchResults, { state: { ...state, phase: 'error', results: [] }, onOpen: () => {} })), /not available/);

  const { c, search } = await fixture(t);
  c.edit('Hello there'); await c.send(); await until(() => !c.getSnapshot().runId);
  const list = renderToStaticMarkup(React.createElement(ConversationList, { controller: c, onOpen: () => {}, search }));
  assert.match(list, /placeholder="Search chats"/, 'the search box shows with any number of chats');
});

test('opening a hit opens the chat and asks the view to show that message', async t => {
  const { c } = await fixture(t);
  c.edit('First question about pricing'); await c.send(); await until(() => !c.getSnapshot().runId);
  const id = c.getSnapshot().activeId;
  const userMsg = c.getSnapshot().turns[0].key;
  c.newChat();
  await c.openAt(id, userMsg);
  const s = c.getSnapshot();
  assert.equal(s.activeId, id); assert.equal(s.threadPhase, 'ready');
  assert.deepEqual(s.focus, { messageId: userMsg, n: 1 });
  const html = renderToStaticMarkup(React.createElement(ChatView, { controller: c, mode: 'mock' }));
  assert.match(html, new RegExp(`data-message-id="${userMsg}"`), 'messages carry their id for the scroll');
  await c.openAt(id, userMsg); assert.equal(c.getSnapshot().focus.n, 2, 'the same hit again scrolls again');
  c.clearFocus(); assert.equal(c.getSnapshot().focus, null);
  await c.openAt(id, null); assert.equal(c.getSnapshot().focus, null, 'a title hit only opens the chat');
  c.newChat(); assert.equal(c.getSnapshot().focus, null);
});

test('a guest cannot search', async () => {
  const auth = createLoginMock(); const calls = [];
  const client = new SessionClient({ mock: async r => { calls.push(r.path); const out = await auth(r); if (out.body?.user) out.body.user = { ...out.body.user, role: 'guest' }; return out; } });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  await assert.rejects(client.request({ method: 'GET', path: path('deploy') }));
  assert.equal(calls.filter(p => p.startsWith('/api/chat/search')).length, 0);
});
