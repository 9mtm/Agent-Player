require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { SessionClient } = require('../src/session.ts');
const { MemoryPanel, drawerId, readableDrawer } = require('../src/SessionPanels.tsx');
const { createLoginMock } = require('../src/session-mock.ts');

test('drawer ids come only from the tabs and a valid key', () => {
  assert.equal(drawerId('owner', 'ignored'), 'owner');
  assert.equal(drawerId('experience', ''), 'experience');
  assert.equal(drawerId('project', 'website'), 'project:website');
  assert.equal(drawerId('project', ' website '), 'project:website');
  assert.equal(drawerId('project', 'Website'), '', 'project names are lowercase');
  assert.equal(drawerId('task', 'T-1.a'), 'task:T-1.a');
  assert.equal(drawerId('people', 'mira@example.test'), 'people:mira@example.test');
  for (const bad of ['', '   ', '../x', 'a..b', 'x/y', 'x?y']) assert.equal(drawerId('task', bad), '', bad);
});

test('the memory page starts with one button and sends nothing on its own', async () => {
  const calls = []; const base = createLoginMock();
  const client = new SessionClient({ mock: async r => { calls.push(r); return base(r); } });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  const before = calls.length;
  const html = renderToStaticMarkup(React.createElement(MemoryPanel, { client }));
  assert.equal(calls.length, before, 'no request from rendering');
  assert.match(html, /aria-label="Memory review"/);
  assert.match(html, />Open memory</);
  assert.match(html, /Offline practice: fictional memory only/);
  assert.doesNotMatch(html, /Use an agent ID|Read memory|Load team/, 'the old form is gone');
  assert.doesNotMatch(html, /role="tablist"/, 'drawers appear once an agent is chosen');
});

test('stored memory hides the generated file header only', () => {
  const text = '<!-- agent-player:memory-export v1 -->\n<!-- GENERATED FILE.\nmore -->\n\n# Memory: About the owner\n- Prefers short answers <!-- inline note -->\n';
  assert.equal(readableDrawer(text), '# Memory: About the owner\n- Prefers short answers ');
  assert.equal(readableDrawer('plain'), 'plain');
});
