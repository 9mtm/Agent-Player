require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { SessionClient } = require('../src/session.ts');
const { AccountPanel } = require('../src/SessionPanels.tsx');
const { createLoginMock } = require('../src/session-mock.ts');

test('account page: profile, role, session facts; sign out everywhere needs confirmation; no requests', async () => {
  const calls = []; const base = createLoginMock();
  const client = new SessionClient({ mock: async r => { calls.push(r); return base(r); } });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  const before = calls.length;
  const html = renderToStaticMarkup(React.createElement(AccountPanel, { client }));
  assert.equal(calls.length, before, 'no request from rendering');
  assert.match(html, /Signed in as <bdi>Offline demo<\/bdi>/);
  assert.match(html, /demo@example\.invalid/);
  assert.match(html, /class="badge">Owner</);
  assert.match(html, /Full control: hires agents/);
  assert.match(html, /Offline practice \(fictional data\)/);
  assert.match(html, /class="danger" disabled="">Sign out on all devices/);
  assert.match(html, /aria-label="Sign out everywhere"/);
});
