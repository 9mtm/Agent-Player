// CHAT-REBUILD-01: saved conversations, runs, the transcript model and the chat view (offline mock).
require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { SessionClient } = require('../src/session.ts');
const { createLoginMock } = require('../src/session-mock.ts');
const { ConversationsController } = require('../src/conversations.ts');
const { ChatView } = require('../src/ChatView.tsx');
const { ConversationList } = require('../src/ConversationList.tsx');
const { applyEvent, liveTurn, splitWork, toolView, workSummary, duration, fromWire } = require('../src/turns.ts');

async function fixture(t) {
  const calls = []; const base = createLoginMock();
  const client = new SessionClient({ mock: async r => { calls.push({ method: r.method, path: r.path }); return base(r); } });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  let n = 0;
  const c = new ConversationsController(client, () => `id${String(++n).padStart(10, '0')}`);
  t.after(() => c.dispose());
  return { c, calls, client };
}
const until = async (fn, ms = 5000) => { const end = Date.now() + ms; while (!fn()) { if (Date.now() > end) throw Error('timeout'); await new Promise(r => setTimeout(r, 20)); } };
const view = c => renderToStaticMarkup(React.createElement(ChatView, { controller: c, mode: 'mock' }));

test('send creates the conversation, follows the run and stores the work; the list gets its title', async t => {
  const { c, calls } = await fixture(t);
  await c.load();
  assert.equal(c.getSnapshot().listPhase, 'ready');
  assert.match(view(c), /chat-suggestion/);
  c.edit('Plan the launch week\nwith details');
  const sending = c.send();
  assert.equal(c.getSnapshot().draft, '', 'the box clears at once');
  await sending;
  const s1 = c.getSnapshot();
  assert.ok(s1.activeId); assert.ok(s1.runId);
  assert.deepEqual(s1.turns.map(x => x.role), ['user', 'assistant']);
  assert.match(view(c), /Thinking|Working/);
  await until(() => !c.getSnapshot().runId);
  const done = c.getSnapshot().turns.at(-1);
  assert.equal(done.status, 'complete');
  assert.deepEqual(done.parts.map(p => p.kind), ['reasoning', 'tools', 'text']);
  assert.equal(done.parts[1].calls[1].output, 'brief.md\nideas.md');
  const html = view(c);
  assert.match(html, /Worked for/);
  assert.match(html, /Read 1 file|ran 1 command/i);
  assert.match(html, /<table class="md-table">/);
  assert.match(html, /<span class="md-code-lang">ts<\/span>/);
  await until(() => c.getSnapshot().conversations[0]?.title === 'Plan the launch week with details'.split(' ').slice(0, 7).join(' ').split('\n')[0] || c.getSnapshot().conversations[0]?.title?.startsWith('Plan the launch week'));
  assert.ok(calls.some(x => x.method === 'POST' && x.path === '/api/chat/conversations'));
  assert.ok(calls.some(x => /\/api\/chat\/runs\/run-.+\/events/.test(x.path)));
  // Reopening rebuilds the turn from the stored parts.
  const id = c.getSnapshot().activeId;
  c.newChat(); assert.equal(c.getSnapshot().turns.length, 0);
  await c.open(id);
  assert.equal(c.getSnapshot().turns.length, 2);
  assert.deepEqual(c.getSnapshot().turns[1].parts.map(p => p.kind), ['reasoning', 'tools', 'text']);
  const list = renderToStaticMarkup(React.createElement(ConversationList, { controller: c, onOpen: () => {} }));
  assert.match(list, /aria-current="true"/);
  assert.match(list, /Plan the launch week/);
});

test('a message typed while the agent works waits in the queue and goes after the reply', async t => {
  const { c } = await fixture(t);
  await c.send('First task');
  assert.ok(c.getSnapshot().runId);
  c.edit('Second task');
  await c.send();
  assert.deepEqual(c.getSnapshot().queue.map(q => q.text), ['Second task']);
  assert.match(view(c), /Waiting to send/);
  await until(() => c.getSnapshot().turns.filter(x => x.role === 'user').length === 2 && c.getSnapshot().queue.length === 0);
  await until(() => !c.getSnapshot().runId);
  assert.deepEqual(c.getSnapshot().turns.filter(x => x.role === 'user').map(x => x.content), ['First task', 'Second task']);
});

test('Stop keeps what was written; a failed run shows the error card with Try again', async t => {
  const { c } = await fixture(t);
  await c.send('Long job');
  await until(() => c.getSnapshot().turns.at(-1).parts.length > 0);
  await c.stop();
  await until(() => !c.getSnapshot().runId);
  const stopped = c.getSnapshot().turns.at(-1);
  assert.equal(stopped.status, 'stopped');
  assert.match(view(c), /Stopped/);
  await c.send('please fail now');
  await until(() => !c.getSnapshot().runId);
  const failed = c.getSnapshot().turns.at(-1);
  assert.equal(failed.status, 'error');
  assert.equal(failed.code, 'model_unavailable');
  assert.match(view(c), /The model could not be reached/);
  assert.match(view(c), /Try again/);
});

test('rename, pin and delete', async t => {
  const { c } = await fixture(t);
  await c.send('One'); await until(() => !c.getSnapshot().runId);
  const id = c.getSnapshot().activeId;
  await c.rename(id, 'Renamed chat');
  assert.equal(c.getSnapshot().conversations.find(x => x.id === id).title, 'Renamed chat');
  await c.pin(id, true);
  assert.equal(c.getSnapshot().conversations.find(x => x.id === id).pinned, true);
  await c.remove(id);
  assert.equal(c.getSnapshot().conversations.length, 0);
  assert.equal(c.getSnapshot().activeId, null);
});

test('transcript model: events in order, duplicates ignored, tools named by what they did', () => {
  let t = liveTurn('run-xxxxxxxx', 0);
  t = applyEvent(t, { seq: 1, type: 'reasoning', content: 'hm' }, 100);
  t = applyEvent(t, { seq: 2, type: 'tool_start', step: 1, tools: [{ id: 'a', name: 'exec', input: '{"command":"npm test"}' }] }, 1300);
  t = applyEvent(t, { seq: 2, type: 'text', content: 'dup' }, 1400);
  t = applyEvent(t, { seq: 3, type: 'tool_result', step: 1, results: [{ id: 'a', name: 'exec', output: 'ok', isError: false, ms: 900 }] }, 2000);
  t = applyEvent(t, { seq: 4, type: 'text', content: 'Done' }, 2100);
  t = applyEvent(t, { seq: 5, type: 'end', status: 'complete', ms: 2200 }, 2200);
  assert.equal(t.content, 'Done');
  assert.equal(t.parts[0].endedAt, 1300, 'thinking ends when the tool starts');
  assert.equal(t.parts[1].calls[0].running, false);
  const { work, answer } = splitWork(t.parts);
  assert.deepEqual(work.map(p => p.kind), ['reasoning', 'tools']);
  assert.deepEqual(answer.map(p => p.kind), ['text']);
  assert.deepEqual(toolView({ name: 'exec', input: '{"command":"npm test"}', running: true }).verb, 'Running');
  assert.equal(toolView({ name: 'exec', input: '{"command":"npm test"}', running: false }).target, 'npm test');
  assert.equal(toolView({ name: 'read_file', input: '{"path":"/a/b/config.ts"}', running: false }).target, 'config.ts');
  assert.equal(toolView({ name: 'web_search', input: '{"query":"weather"}', running: false }).target, '“weather”');
  assert.equal(workSummary(t.parts), 'Ran 1 command');
  assert.equal(duration(65000), '1m 05s');
  const stored = fromWire({ id: 'm', role: 'assistant', content: 'plain', parts: null, status: 'complete', runId: null, durationMs: null, createdAt: '' });
  assert.deepEqual(stored.parts, [{ kind: 'text', text: 'plain' }]);
});

test('Stop pauses the queue; Send now sends the waiting message', async t => {
  const { c } = await fixture(t);
  await c.send('Big job');
  c.edit('Follow-up'); await c.send();
  assert.equal(c.getSnapshot().queue.length, 1);
  await until(() => c.getSnapshot().turns.at(-1).parts.length > 0);
  await c.stop();
  await until(() => !c.getSnapshot().runId);
  const s = c.getSnapshot();
  assert.equal(s.queuePaused, true);
  assert.equal(s.queue.length, 1, 'nothing was sent on its own');
  assert.match(view(c), /Send now/);
  c.sendQueued(s.queue[0].key);
  await until(() => c.getSnapshot().turns.filter(x => x.role === 'user').length === 2);
  assert.equal(c.getSnapshot().queuePaused, false);
  await until(() => !c.getSnapshot().runId);
});
