require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { allowedLocalImport, localImportResponse } = require('../src/local-import-contract.js');
const { allowed } = require('../scripts/application-server.cjs');
const { LocalImportController } = require('../src/local-import.ts');
const { SessionClient } = require('../src/session.ts');
const { createLoginMock } = require('../src/session-mock.ts');

const SID = 'a'.repeat(32), JOB = '0f8fad5b-d9cb-469f-a165-70867728950e';
test('local import contract: opaque ids only, at most 20; no paths beyond the folder', () => {
  for (const [b, ok] of [[{ sessionIds: [SID] }, true], [{ sessionIds: ['../x'] }, false], [{ sessionIds: [] }, false], [{ sessionIds: [SID, SID] }, false],
    [{ sessionIds: Array.from({ length: 21 }, (_, i) => i.toString(16).padStart(32, '0')) }, false], [{ sessionIds: [SID], path: '/etc' }, false]]) {
    assert.equal(allowedLocalImport('POST', '/api/memory/import/local', b), ok, JSON.stringify(b).slice(0, 60));
    assert.equal(allowed('POST', '/api/memory/import/local', b), ok, 'bridge');
  }
  const body = { archive: '~/.dpro/imports', sessions: [{ id: SID, source: 'codex', cwd: '/w/app', title: 'Deploy rules', updatedAt: 'u', bytes: 10, turns: 3, imported: null, file: '/secret/path.jsonl' }, { id: 'bad', source: 'codex' }] };
  const once = localImportResponse('/api/memory/import/local', 200, body);
  assert.equal(once.sessions.length, 1); assert.ok(!JSON.stringify(once).includes('/secret/path'));
  assert.deepEqual(localImportResponse('/api/memory/import/local', 200, once), once, 'stable twice');
});

test('local import: choose conversations, start, follow the job to the end', async t => {
  const base = createLoginMock(); let polls = 0; const posts = [];
  const live = async r => {
    if (!r.path.startsWith('/api/memory/import/local')) return base(r);
    if (r.method === 'POST') { posts.push(r.body); return { status: 202, body: { job: { id: JOB, total: 1, done: 0, proposed: 0, errors: 0, status: 'running' } } }; }
    if (r.path.endsWith(JOB)) { polls++; return { status: 200, body: { job: { id: JOB, total: 1, done: 1, proposed: 4, errors: 0, status: 'done', notice: '4 memories are waiting for your approval.' } } }; }
    return { status: 200, body: { archive: '~/.dpro/imports', sessions: [{ id: SID, source: 'claude-code', cwd: '/w/app', title: 'Always answer in Arabic', updatedAt: '2026-10-16T10:00:00Z', bytes: 9, turns: 4, imported: null }] } };
  };
  const client = new SessionClient({ live }); client.selectMode('live'); await client.login('demo@example.invalid', 'mock-only');
  const c = new LocalImportController(client, 5); t.after(() => c.dispose());
  await c.load();
  assert.equal(c.getSnapshot().sessions.length, 1);
  c.toggle(SID); await c.start();
  assert.deepEqual(posts, [{ sessionIds: [SID] }]);
  for (let i = 0; i < 50 && c.getSnapshot().job?.status === 'running'; i++) await new Promise(r => setTimeout(r, 10));
  assert.equal(c.getSnapshot().job.proposed, 4); assert.ok(polls >= 1);
  const { LocalImport } = require('../src/LocalImport.tsx');
  const html = renderToStaticMarkup(React.createElement(LocalImport, { client, active: false, onReview: () => {} }));
  assert.match(html, /Import from other agents/); assert.match(html, /Nothing is remembered until you approve/);
});
