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
