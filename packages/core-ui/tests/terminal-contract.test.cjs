require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { terminalPath, allowedTerminal, terminalResponse, TerminalEventParser } = require('../src/terminal-contract.js');
const { allowed } = require('../scripts/application-server.cjs');

const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
test('terminal routes: only reviewed shapes pass, on both sides', () => {
  assert.deepEqual(terminalPath(`/api/terminal/sessions/${ID}/stream?after=7`), { kind: 'stream', id: ID, after: 7 });
  assert.equal(terminalPath('/api/terminal/sessions/../x/input'), null);
  for (const [m, p, b, ok] of [
    ['POST', '/api/terminal/sessions', { cols: 80, rows: 24, projectId: ID }, true],
    ['POST', '/api/terminal/sessions', { cols: 80, rows: 24, shell: '/bin/sh' }, false],
    ['POST', `/api/terminal/sessions/${ID}/input`, { data: 'ls\r' }, true],
    ['POST', `/api/terminal/sessions/${ID}/input`, { data: '' }, false],
    ['POST', `/api/terminal/sessions/${ID}/input`, { data: 'x'.repeat(40000) }, false],
    ['POST', `/api/terminal/sessions/${ID}/resize`, { cols: 9000, rows: 24 }, false],
    ['DELETE', `/api/terminal/sessions/${ID}`, undefined, true],
    ['GET', `/api/terminal/sessions/${ID}/stream`, undefined, true],
  ]) { assert.equal(allowedTerminal(m, p, b), ok, `${m} ${p}`); assert.equal(allowed(m, p, b), ok, `bridge ${m} ${p}`); }
});

test('terminal responses project to reviewed fields; 204 becomes ok; stable twice', () => {
  const once = terminalResponse('/api/terminal/sessions', 201, { id: ID, cols: 80, rows: 24, shell: '/bin/zsh', cwd: '/x/app', secret: 'no' });
  assert.deepEqual(once, { id: ID, cols: 80, rows: 24, shell: 'zsh', cwd: '/x/app' });
  assert.deepEqual(terminalResponse('/api/terminal/sessions', 201, once), once);
  assert.deepEqual(terminalResponse(`/api/terminal/sessions/${ID}/input`, 204, undefined), { ok: true });
  assert.deepEqual(terminalResponse('/api/terminal', 403, { code: 'disabled', error: 'detail' }), { code: 'disabled' });
});

test('terminal stream parser reads backend and bridge frames, drops repeats, stops at exit', () => {
  const enc = s => new TextEncoder().encode(s);
  const p = new TerminalEventParser(1);
  const frames = p.push(enc('event: output\ndata: {"seq":1,"data":"old"}\n\nevent: output\ndata: {"seq":2,"data":"hi\\r\\n"}\n\n: ping\n\ndata: {"type":"output","seq":3,"data":"$ "}\n\nevent: exit\ndata: {"exitCode":0}\n\n'));
  assert.deepEqual(frames, [{ type: 'output', seq: 2, data: 'hi\r\n' }, { type: 'output', seq: 3, data: '$ ' }, { type: 'exit', exitCode: 0 }]);
  assert.equal(p.ended, true); assert.equal(p.last, 3);
});

test('terminal controller: opens in the project, streams output, sends keys in order, replays, closes', async t => {
  const { SessionClient } = require('../src/session.ts');
  const { createLoginMock } = require('../src/session-mock.ts');
  const { TerminalController } = require('../src/terminal.ts');
  const base = createLoginMock(); const calls = []; let push;
  const PID = '00000000-0000-4000-8000-000000000001';
  const transport = async r => {
    if (!r.path.startsWith('/api/terminal')) return base(r);
    calls.push([r.method, r.path, r.body]);
    if (r.path === '/api/terminal/sessions') return { status: 201, body: { id: ID, cols: 80, rows: 24, shell: 'zsh', cwd: '/fiction/app' } };
    if (r.path.includes('/stream')) return { status: 200, body: null, stream: new ReadableStream({ start(c) { push = s => c.enqueue(new TextEncoder().encode(s)); push('data: {"type":"output","seq":1,"data":"$ "}\n\n'); } }) };
    if (r.path.endsWith('/input')) { push(`data: {"type":"output","seq":${calls.length + 1},"data":${JSON.stringify(r.body.data)}}\n\n`); return { status: 200, body: { ok: true } }; }
    return { status: 200, body: { ok: true } };
  };
  const client = new SessionClient({ live: transport }); client.selectMode('live'); await client.login('demo@example.invalid', 'mock-only');
  const term = new TerminalController(client); t.after(() => term.dispose());
  let screen = ''; term.onOutput(d => { screen += d; });
  await term.open(PID, { cols: 100, rows: 30 });
  assert.deepEqual(calls[0], ['POST', '/api/terminal/sessions', { cols: 100, rows: 30, projectId: PID }]);
  assert.equal(term.getSnapshot().cwd, '/fiction/app');
  await new Promise(r => setTimeout(r, 30));
  term.write('l'); term.write('s'); term.write('\r');
  await new Promise(r => setTimeout(r, 60));
  assert.equal(calls.filter(c => c[1].endsWith('/input')).map(c => c[2].data).join(''), 'ls\r', 'keys arrive in order');
  assert.match(screen, /^\$ /);
  let again = ''; term.onOutput(d => { again += d; });
  assert.equal(again, screen, 'a new screen gets the buffered output');
  await term.close();
  assert.ok(calls.some(c => c[0] === 'DELETE'));
  assert.equal(term.getSnapshot().phase, 'idle');
});

test('terminal settings: known keys only on both sides; saved after a pause; tabs up to four', async t => {
  const { terminalPrefs, DEFAULT_TERMINAL_PREFS } = require('../src/terminal-contract.js');
  const { TerminalPrefsController, TerminalTabs, MAX_TERMINAL_TABS } = require('../src/terminal.ts');
  for (const [b, ok] of [[{ theme: 'ocean' }, true], [{ fontSize: 14, cursorStyle: 'bar' }, true], [{ theme: 'neon' }, false], [{ fontSize: 30 }, false], [{ shell: 'x' }, false], [{}, false]]) {
    assert.equal(allowedTerminal('PUT', '/api/terminal/prefs', b), ok, JSON.stringify(b));
    assert.equal(allowed('PUT', '/api/terminal/prefs', b), ok, `bridge ${JSON.stringify(b)}`);
  }
  assert.deepEqual(terminalResponse('/api/terminal/prefs', 200, { prefs: { theme: 'paper', fontSize: 99, extra: 1 } }).prefs, { ...DEFAULT_TERMINAL_PREFS, theme: 'paper' });
  assert.equal(terminalPrefs(null).theme, 'dpro-night');

  const { SessionClient } = require('../src/session.ts');
  const { createLoginMock } = require('../src/session-mock.ts');
  const base = createLoginMock(); const puts = [];
  const client = new SessionClient({ live: async r => {
    if (r.path === '/api/terminal/prefs') { if (r.method === 'PUT') puts.push(r.body); return { status: 200, body: { prefs: { ...DEFAULT_TERMINAL_PREFS, theme: 'forest' } } }; }
    if (r.path.startsWith('/api/terminal')) return { status: 403, body: { code: 'disabled' } };
    return base(r);
  } });
  client.selectMode('live'); await client.login('demo@example.invalid', 'mock-only');
  const prefs = new TerminalPrefsController(client); t.after(() => prefs.dispose());
  await prefs.load();
  assert.equal(prefs.getSnapshot().theme, 'forest');
  prefs.update({ fontSize: 15 }); prefs.update({ cursorStyle: 'underline' }); prefs.update({ fontSize: 99 });
  assert.equal(prefs.getSnapshot().fontSize, 15, 'applied at once; a bad value is ignored');
  await new Promise(r => setTimeout(r, 450));
  assert.deepEqual(puts, [{ fontSize: 15, cursorStyle: 'underline' }], 'quick changes become one save');

  const tabs = new TerminalTabs(client); t.after(() => tabs.dispose());
  for (let i = 0; i < MAX_TERMINAL_TABS + 2; i++) tabs.add();
  assert.equal(tabs.getSnapshot().tabs.length, MAX_TERMINAL_TABS);
  const [a, b] = tabs.getSnapshot().tabs;
  tabs.select(a.key); tabs.close(a.key);
  assert.equal(tabs.getSnapshot().active, b.key, 'closing the active tab selects its neighbour');

  const React = require('../node_modules/react'); const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
  const { TerminalPane } = require('../src/TerminalPane.tsx');
  const html = renderToStaticMarkup(React.createElement(TerminalPane, { tabs, prefs, projectId: null, maximized: false, onToggleMax: () => {} }));
  assert.match(html, /aria-label="New terminal"/); assert.match(html, /aria-label="Terminal settings"/); assert.match(html, /aria-label="Maximize"/);
  assert.match(html, /role="tab"/);
});
