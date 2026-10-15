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
