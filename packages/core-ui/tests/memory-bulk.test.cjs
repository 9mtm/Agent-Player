require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { BulkReviewController, MemoryFailure } = require('../src/memory.ts');
const { MemoryBulkReview, splitMemory } = require('../src/MemoryBulkReview.tsx');
const { localImportResponse } = require('../src/local-import-contract.js');

const context = { userId: 'u1', agentId: 'main', drawerId: 'owner', access: 'owner', session: '1' };
const hash = (n) => String(n).repeat(64).slice(0, 64);
const proposal = (id, n, extra = {}) => ({ id, userId: 'u1', agentId: 'main', drawerId: 'owner', drawer: { kind: 'owner' }, reviewHash: hash(n), baseHash: 'a'.repeat(64), baseRevision: 1, status: 'pending', source: 'import',
  note: null, createdBy: 'u1', createdAt: '2026-10-16T00:00:00Z', decidedBy: null, decidedAt: null, appliedRevision: null, reasons: ['import'], importBatchId: 'b1',
  changes: [{ op: 'add', after: { type: 'preference', importance: 5, content: `Memory ${id}` } }], ...extra });
function adapter(details, outcome = () => 'ok') {
  const posts = [];
  return { posts, a: { mode: 'contract', uncertainDecisions: new Set(),
    drawer: async () => ({}), list: async () => [],
    detail: async (_c, id) => structuredClone(details[id]),
    decide: async (_c, d) => { posts.push(d); const o = outcome(d); if (o instanceof Error) throw o; return { ...details[d.id], status: d.action === 'approve' ? 'approved' : 'rejected', decidedBy: 'u1', decidedAt: '2026-10-16T00:00:01Z' }; } } };
}

test('bulk review: only pending import proposals that add memories; each decision carries its own review hash', async () => {
  const details = { p1: proposal('p1', 1), p2: proposal('p2', 2), p3: proposal('p3', 3), f1: proposal('f1', 4, { source: 'file' }),
    u1: proposal('u1', 5, { changes: [{ op: 'delete', id: 'm1', before: { type: 'fact', importance: 5, content: 'x' } }] }) };
  const { a, posts } = adapter(details);
  const c = new BulkReviewController(a, context);
  assert.deepEqual(BulkReviewController.eligible(Object.values(details)).map((p) => p.id), ['p1', 'p2', 'p3', 'u1'], 'only import proposals');
  await c.load(Object.values(details));
  assert.deepEqual(c.getSnapshot().items.map((p) => p.id), ['p1', 'p2', 'p3'], 'a forget/change is not decided in bulk');
  c.toggle('p2');
  await c.decide('approve');
  assert.deepEqual(posts.map((d) => [d.id, d.expectedReviewHash, d.action]), [['p1', hash(1), 'approve'], ['p3', hash(3), 'approve']]);
  assert.deepEqual(c.getSnapshot().result, { done: 2, changed: 0, failed: 0, unknown: 0, action: 'approve' });
  assert.equal(a.uncertainDecisions.size, 0);
});

test('bulk review: a changed proposal is left alone and counted; no connection = unknown outcome; denied stops', async () => {
  const details = { p1: proposal('p1', 1), p2: proposal('p2', 2), p3: proposal('p3', 3), p4: proposal('p4', 4) };
  const { a, posts } = adapter(details, (d) => d.id === 'p1' ? new MemoryFailure('stale', 'review_changed') : d.id === 'p2' ? new MemoryFailure('unknown') : d.id === 'p3' ? new MemoryFailure('denied') : 'ok');
  const c = new BulkReviewController(a, context);
  await c.load(Object.values(details));
  await c.decide('reject');
  assert.deepEqual(posts.map((d) => d.id), ['p1', 'p2', 'p3'], 'stops after denied');
  assert.deepEqual(c.getSnapshot().result, { done: 0, changed: 1, failed: 1, unknown: 1, action: 'reject' });
  assert.deepEqual([...a.uncertainDecisions], [JSON.stringify(['u1', 'p2'])], 'the unknown one is remembered and not offered again');
  const again = new BulkReviewController(a, context); await again.load(Object.values(details));
  assert.ok(!again.getSnapshot().items.some((p) => p.id === 'p2'));
});

test('bulk review panel renders; contract accepts the two new sources', () => {
  const { a } = adapter({});
  const html = renderToStaticMarkup(React.createElement(MemoryBulkReview, { adapter: a, context, proposals: [], onClose: () => {} }));
  assert.match(html, /Imported memories/);
  const r = localImportResponse('/api/memory/import/local', 200, { archive: '~/.dpro/imports', sessions: ['antigravity', 'gemini-cli', 'other'].map((source, i) => ({ id: String(i).repeat(32), source, cwd: null, title: 't', updatedAt: 'u', bytes: 1, turns: 1, imported: null })) });
  assert.deepEqual(r.sessions.map((x) => x.source), ['antigravity', 'gemini-cli']);
});

test('an imported memory shows its title, not the Markdown mark', () => {
  assert.deepEqual(splitMemory('### Local merges\n\nThe owner merges locally.'), { title: 'Local merges', body: 'The owner merges locally.' });
  assert.deepEqual(splitMemory('Plain text'), { title: '', body: 'Plain text' });
});
