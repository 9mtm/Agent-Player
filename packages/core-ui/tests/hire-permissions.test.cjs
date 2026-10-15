require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { SessionClient, allowedRequest } = require('../src/session.ts');
const { HireController } = require('../src/hire.ts');
const { HireAgent } = require('../src/HireAgent.tsx');
const { hireResponse, validPermissionsBody, permissionsAgentId } = require('../src/hire-contract.js');
const { createAgentsMock } = require('../src/agents-mock.ts');
const { createLoginMock } = require('../src/session-mock.ts');
const { allowed } = require('../scripts/application-server.cjs');

async function fixture(t, wrap = x => x) {
  const calls = []; const base = wrap(createLoginMock(createAgentsMock()));
  const client = new SessionClient({ mock: async r => { calls.push(r); return base(r); } });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  const h = new HireController(client); t.after(() => h.dispose());
  return { h, calls };
}
const markup = h => renderToStaticMarkup(React.createElement(HireAgent, { controller: h, onClose: () => {} }));
const ALL = ['owner', 'project', 'experience', 'task', 'people'];
const modes = (m = {}) => ({ browser: 'ask', network: 'ask', message: 'ask', delete: 'ask', install: 'ask', money: 'ask', settings: 'ask', ...m });
const body = (over = {}) => ({ memoryRead: ALL, memoryWrite: ALL, sharedMemory: false, modes: modes(), expectedVersion: 1, ...over });

test('permissions body contract (browser and bridge): full replacement, risky allow needs confirmRisky', () => {
  assert.equal(validPermissionsBody(body()), true);
  assert.equal(validPermissionsBody(body({ modes: modes({ money: 'allow' }), confirmRisky: true })), true);
  for (const bad of [body({ modes: modes({ money: 'allow' }) }), body({ memoryRead: ['task'], memoryWrite: ['owner'] }), body({ memoryRead: ['secret'] }),
    body({ modes: { browser: 'off' } }), body({ modes: modes({ network: 'maybe' }) }), body({ sharedMemory: 'no' }), body({ expectedVersion: -1 }), { ...body(), extra: 1 }])
    assert.equal(validPermissionsBody(bad), false, JSON.stringify(bad));
  assert.equal(permissionsAgentId('/api/agents/a1/permissions'), 'a1');
  assert.equal(permissionsAgentId('/api/agents/a1/permissions?x=1'), null);
  for (const allow of [allowedRequest, allowed]) {
    assert.equal(allow('GET', '/api/agents/a1/permissions', undefined), true);
    assert.equal(allow('PUT', '/api/agents/a1/permissions', body()), true);
    assert.equal(allow('PUT', '/api/agents/a1/permissions', body({ modes: modes({ delete: 'allow' }) })), false);
    assert.equal(allow('POST', '/api/agents/a1/permissions', body()), false);
  }
  const view = hireResponse('/api/agents/a1/permissions', 200, { agentId: 'a1', memoryRead: ['task'], memoryWrite: ['task'], sharedMemory: true, modes: modes(), version: 3, stored: true, extra: 'x' });
  assert.deepEqual(Object.keys(view).sort(), ['agentId', 'memoryRead', 'memoryWrite', 'modes', 'sharedMemory', 'version']);
  assert.throws(() => hireResponse('/api/agents/a1/permissions', 200, { agentId: 'other', memoryRead: [], memoryWrite: [], sharedMemory: false, modes: modes(), version: 1 }));
  assert.deepEqual(hireResponse('/api/agents/a1/permissions', 400, { code: 'risky_not_confirmed', error: 'x' }), { code: 'risky_not_confirmed' });
});

test('hire: memory drawers and off / ask / allow are shown, edited and saved after the tools', async t => {
  const { h, calls } = await fixture(t);
  h.edit({ name: 'Perm Hire', role: 'specialist' });
  await h.create();
  let s = h.getSnapshot();
  assert.equal(s.step, 'memory');
  assert.deepEqual(s.permissions.modes, modes(), 'a new agent asks for everything');
  let html = markup(h);
  for (const label of ['About you', 'Lessons learned', 'Projects', 'Tasks', 'People you know', 'May see memories other agents share']) assert.match(html, new RegExp(label));
  h.setMemory('owner', { write: false });
  h.setMemory('people', { read: false });
  h.setMemory('people', { write: true });
  h.setShared(true);
  s = h.getSnapshot();
  assert.deepEqual(s.permissions.memoryRead, ['owner', 'project', 'experience', 'task']);
  assert.deepEqual(s.permissions.memoryWrite, ['project', 'experience', 'task'], 'write needs read');
  h.next();
  html = markup(h);
  for (const label of ['Use a web browser', 'Spend money or trade', 'Ask me first', 'Risky']) assert.match(html, new RegExp(label));
  h.setMode('browser', 'off'); h.setMode('network', 'allow'); h.setMode('money', 'allow');
  assert.match(markup(h), /I understand that spend money or trade will run without asking me/);
  await h.save();
  assert.match(h.getSnapshot().notice, /Confirm that the risky tools/);
  assert.equal(calls.filter(c => c.method === 'PUT').length, 0, 'nothing sent before the confirmation');
  h.setConfirmRisky(true);
  await h.save();
  s = h.getSnapshot();
  assert.equal(s.step, 'done', s.notice);
  const puts = calls.filter(c => c.method === 'PUT');
  assert.deepEqual(puts.map(c => c.path.replace(/agents\/[^/]+/, 'agents/:id')), ['/api/agents/:id/tool-grants', '/api/agents/:id/permissions']);
  assert.deepEqual(puts[1].body, { memoryRead: ['owner', 'project', 'experience', 'task'], memoryWrite: ['project', 'experience', 'task'], sharedMemory: true,
    modes: modes({ browser: 'off', network: 'allow', money: 'allow' }), expectedVersion: 1, confirmRisky: true });
  assert.equal(s.permissions.version, 2);
});

test('a risky Allow switched back to Ask clears the confirmation; a conflict reloads', async t => {
  let conflict = true;
  const { h } = await fixture(t, b => async r => (r.method === 'PUT' && r.path.endsWith('/permissions') && conflict ? (conflict = false, { status: 409, body: { code: 'version_conflict', currentVersion: 1 } }) : b(r)));
  h.edit({ name: 'Perm Conflict', role: 'specialist' });
  await h.create(); h.next();
  h.setMode('delete', 'allow'); h.setConfirmRisky(true); h.setMode('delete', 'ask');
  assert.equal(h.getSnapshot().confirmRisky, false);
  await h.save();
  assert.match(h.getSnapshot().notice, /changed elsewhere/);
  await h.save();
  assert.equal(h.getSnapshot().step, 'done');
});
