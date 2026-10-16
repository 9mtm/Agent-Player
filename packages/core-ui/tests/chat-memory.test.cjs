// CHAT-PRO-02 E: chat memory — "Remember this" on a message, agent memory
// proposals with Accept / Reject (review hash), and the memories from a chat.
require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { SessionClient, allowedRequest } = require('../src/session.ts');
const { createLoginMock } = require('../src/session-mock.ts');
const { createAgentsMock } = require('../src/agents-mock.ts');
const { createChatMemoryMock } = require('../src/chat-memory-mock.ts');
const { ChatMemoryController, messageRef, proposalsByRun, rememberDraft } = require('../src/chat-memory.ts');
const { MemoryProposals, ChatMemoryCard, RememberForm } = require('../src/ChatView.tsx');
const { allowedChatMemory, chatMemoryResponse, validRemember, MAX_REMEMBER } = require('../src/chat-memory-contract.js');
const { allowed } = require('../scripts/application-server.cjs');

const CONV = 'conv-0000000001';
const URL = `/api/chat/conversations/${CONV}/memories`;
const MSG = '6c1f2b9e-1d2c-4b7a-9f00-000000000001';
async function fixture(t) {
  const calls = []; const mock = createChatMemoryMock(); const base = createLoginMock(createAgentsMock(), 'existing-owner', mock);
  const client = new SessionClient({ mock: async r => { calls.push({ method: r.method, path: r.path, body: r.body }); return base(r); } });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  const mem = new ChatMemoryController(client);
  t.after(() => mem.dispose());
  return { mem, calls, mock, client };
}
const settle = () => new Promise(r => setTimeout(r, 10));

test('contract (browser and bridge): exact path, strict "Remember this" body, GET/POST only', () => {
  const good = [
    ['GET', URL, undefined],
    ['POST', URL, { messageId: MSG, content: 'We ship on Fridays', drawer: 'owner' }],
    ['POST', URL, { runId: 'run-abc12345', content: 'x', drawer: 'project', type: 'preference', importance: 9 }],
  ];
  const bad = [
    ['PUT', URL, { messageId: MSG, content: 'x', drawer: 'owner' }], ['DELETE', URL, undefined], ['GET', URL, {}],
    ['POST', URL, { content: 'x', drawer: 'owner' }], ['POST', URL, { messageId: MSG, runId: 'run-abc12345', content: 'x', drawer: 'owner' }],
    ['POST', URL, { messageId: MSG, content: '', drawer: 'owner' }], ['POST', URL, { messageId: MSG, content: '   ', drawer: 'owner' }],
    ['POST', URL, { messageId: MSG, content: 'x'.repeat(MAX_REMEMBER + 1), drawer: 'owner' }], ['POST', URL, { messageId: MSG, content: 'x', drawer: 'people' }],
    ['POST', URL, { messageId: MSG, content: 'x', drawer: 'owner', userId: 'u' }], ['POST', URL, { messageId: '../x', content: 'x', drawer: 'owner' }],
    ['POST', URL, { messageId: MSG, content: 'x', drawer: 'owner', importance: 11 }], ['POST', URL, { messageId: MSG, content: 'x', drawer: 'owner', type: 'secret' }],
    ['POST', URL, { messageId: MSG, content: 'a‮b', drawer: 'owner' }],
    ['GET', '/api/chat/conversations/x/memories', undefined], ['GET', `${URL}?x=1`, undefined], ['GET', '/api/chat/conversations/../memories', undefined],
  ];
  for (const [m, p, b] of good) { assert.equal(allowedChatMemory(m, p, b), true, p); assert.equal(allowedRequest(m, p, b), true, p); assert.equal(allowed(m, p, b), true, `bridge ${p}`); }
  for (const [m, p, b] of bad) { assert.equal(allowedRequest(m, p, b), false, `${m} ${p} ${JSON.stringify(b)}`); assert.equal(allowed(m, p, b), false, `bridge ${m} ${p}`); }
  assert.equal(validRemember({ messageId: MSG, content: 'x'.repeat(MAX_REMEMBER), drawer: 'experience' }), true);
  // Deciding a proposal stays on the existing memory proposal routes (review hash only).
  assert.equal(allowedRequest('POST', '/api/memory/proposals/p-1/approve', { expectedReviewHash: 'a'.repeat(64) }), true);
  assert.equal(allowed('POST', '/api/memory/proposals/p-1/reject', { expectedReviewHash: 'a'.repeat(64) }), true);
  assert.equal(allowedRequest('POST', '/api/memory/proposals/p-1/approve', {}), false);
});

test('responses are projected to reviewed fields; malformed ones are refused', () => {
  const m = { id: 'l-1', kind: 'proposed', messageId: MSG, drawerId: 'project:launch', text: 'Blue logo', memoryId: 'm-1', proposalId: 'p-1', status: 'pending', createdAt: '2026-10-16 10:00:00', secret: 'x' };
  const out = chatMemoryResponse(URL, 200, { memories: [m] });
  assert.equal(out.memories[0].secret, undefined);
  assert.equal(out.memories[0].memoryId, null, 'a memory id only for a saved memory');
  assert.equal(chatMemoryResponse(URL, 200, { memories: [{ ...m, status: 'saved' }] }).memories[0].memoryId, 'm-1');
  assert.throws(() => chatMemoryResponse(URL, 200, { memories: [{ ...m, status: 'hacked' }] }));
  assert.throws(() => chatMemoryResponse(URL, 200, { memories: [{ ...m, drawerId: '../x' }] }));
  assert.throws(() => chatMemoryResponse(URL, 200, { memories: 'x' }));
  const made = chatMemoryResponse(URL, 201, { memory: { ...m, kind: 'remembered', status: 'saved' }, redacted: 2, duplicate: false, extra: 1 });
  assert.deepEqual([made.redacted, made.duplicate, made.extra], [2, false, undefined]);
  assert.deepEqual(chatMemoryResponse(URL, 400, { code: 'only_secrets', error: 'text' }), { code: 'only_secrets' });
  assert.equal(chatMemoryResponse(URL, 500, { code: 'boom' }), null);
});

test('offline: "Remember this" saves an edited message; secrets are left out; the list shows it', async t => {
  const { mem, calls } = await fixture(t);
  assert.equal(mem.getSnapshot().owner, true);
  mem.setConversation(CONV);
  await settle();
  assert.equal(mem.getSnapshot().phase, 'ready');
  assert.equal(await mem.remember({ messageId: MSG, content: '   ', drawer: 'owner' }), false, 'text is required');
  assert.equal(calls.filter(c => c.method === 'POST' && c.path.endsWith('/memories')).length, 0, 'nothing sent for an empty memory');
  assert.equal(await mem.remember({ messageId: MSG, content: 'Deploy key sk-abcdefghijkl', drawer: 'owner' }), true);
  let s = mem.getSnapshot();
  assert.match(s.notice, /1 secret value was left out/);
  assert.equal(s.memories.length, 1);
  assert.deepEqual([s.memories[0].kind, s.memories[0].status, s.memories[0].drawerId], ['remembered', 'saved', 'owner']);
  assert.doesNotMatch(s.memories[0].text, /sk-/);
  assert.equal(await mem.remember({ runId: 'run-abc12345', content: 'sk-abcdefghijkl', drawer: 'experience' }), false);
  assert.match(mem.getSnapshot().notice, /Nothing is left/);
  const html = renderToStaticMarkup(React.createElement(ChatMemoryCard, { controller: mem, onOpen: () => {} }));
  assert.match(html, /Memory from this chat/); assert.match(html, /Open in Memory/); assert.match(html, /About you/);
});

test('offline: an agent proposal is accepted or rejected with its review hash; a changed proposal is not decided', async t => {
  const { mem, mock, calls } = await fixture(t);
  const p1 = await mock.proposeFromAgent(CONV, MSG, 'The team meets every Monday at 9');
  const p2 = await mock.proposeFromAgent(CONV, MSG, 'Lunch is at noon');
  mem.setConversation(CONV);
  await settle(); await settle();
  let s = mem.getSnapshot();
  assert.equal(s.memories.filter(m => m.status === 'pending').length, 2);
  assert.ok(s.reviews[p1] && s.reviews[p2], 'pending proposals are read in full');
  let html = renderToStaticMarkup(React.createElement(MemoryProposals, { controller: mem, items: s.memories }));
  assert.match(html, /Remember this\?/); assert.match(html, /Accept/); assert.match(html, /Reject/); assert.match(html, /Every Monday|every Monday/);

  assert.equal(await mem.decide(s.memories.find(m => m.proposalId === p1), 'approve'), true);
  const approve = calls.find(c => c.path === `/api/memory/proposals/${p1}/approve`);
  assert.equal(approve.body.expectedReviewHash, s.reviews[p1].reviewHash);
  // The second proposal changes after the owner read it: the old hash is refused.
  await mock.changeProposal(p2, 'Lunch is at one');
  assert.equal(await mem.decide(mem.getSnapshot().memories.find(m => m.proposalId === p2), 'approve'), false);
  assert.match(mem.getSnapshot().notice, /changed/);
  await settle();
  s = mem.getSnapshot();
  assert.equal(s.reviews[p2].text, 'Lunch is at one', 'read again before the next decision');
  assert.equal(await mem.decide(s.memories.find(m => m.proposalId === p2), 'reject'), true);
  s = mem.getSnapshot();
  assert.deepEqual(s.memories.map(m => m.status), ['saved', 'rejected']);
  assert.ok(s.memories[0].memoryId);
  html = renderToStaticMarkup(React.createElement(MemoryProposals, { controller: mem, items: s.memories }));
  assert.match(html, /Saved/); assert.match(html, /Not saved/); assert.doesNotMatch(html, />Accept</);
});

test('helpers: which message a turn names, the draft text, proposals placed under their reply; the form', async t => {
  assert.deepEqual(messageRef({ key: MSG, role: 'user', runId: 'run-abc12345' }), { messageId: MSG });
  assert.deepEqual(messageRef({ key: 'run:run-abc12345', role: 'assistant', runId: 'run-abc12345' }), { runId: 'run-abc12345' });
  assert.equal(messageRef({ key: 'pending:run-abc12345', role: 'user', runId: 'run-abc12345', pending: true }), null);
  assert.equal(messageRef({ key: 'user:run-abc12345', role: 'user', runId: 'run-abc12345' }), null);
  assert.equal([...rememberDraft(`  ${'é'.repeat(MAX_REMEMBER + 10)} `)].length, MAX_REMEMBER);
  const turns = [{ key: MSG, role: 'user', runId: 'run-1' }, { key: 'a1', role: 'assistant', runId: 'run-1' }];
  const by = proposalsByRun([{ id: 'l1', kind: 'proposed', messageId: MSG }, { id: 'l2', kind: 'remembered', messageId: MSG }, { id: 'l3', kind: 'proposed', messageId: 'other-message' }], turns);
  assert.deepEqual([...by.keys()], ['run-1']); assert.deepEqual(by.get('run-1').map(m => m.id), ['l1']);
  const { mem } = await fixture(t);
  const form = renderToStaticMarkup(React.createElement(RememberForm, { controller: mem, seed: { ref: { messageId: MSG }, text: 'Use the blue logo', key: 1 }, project: 'Launch site', agent: 'Main', onClose: () => {} }));
  assert.match(form, /Project: Launch site/); assert.match(form, /About you/); assert.match(form, /Main&#x27;s lessons|Main's lessons/); assert.match(form, /Use the blue logo/);
  assert.match(form, /secrets are left out/);
});

test('not the owner: nothing is read or sent', async () => {
  const client = new SessionClient({ mock: createLoginMock() });
  const mem = new ChatMemoryController(client);
  mem.setConversation(CONV);
  await mem.refresh();
  assert.equal(mem.getSnapshot().owner, false);
  assert.equal(await mem.remember({ messageId: MSG, content: 'x', drawer: 'owner' }), false);
  assert.equal(await mem.decide({ id: 'l', kind: 'proposed', proposalId: 'p', status: 'pending' }, 'approve'), false);
  mem.dispose();
});
