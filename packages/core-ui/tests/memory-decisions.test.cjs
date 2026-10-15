require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { createMemoryAdapter, MemoryController, parseProposal } = require('../src/memory.ts');
const { createMemoryMock } = require('../src/memory-mock.ts');
const { SessionClient, allowedRequest, createSameOriginTransport, bindMemorySession } = require('../src/session.ts');
const { createLoginMock } = require('../src/session-mock.ts');
const clone = structuredClone;
const defer = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
const signal = () => new AbortController().signal;
const raw = (mock, method, path, body) => mock.transport({ method, path, body, signal: signal(), headers: {} });
async function setup(options = {}, override) {
  const mock = createMemoryMock(options); const calls = [];
  const transport = async (request, abort) => { calls.push(request); return override ? override(request, abort, mock) : mock.transport({ ...request, signal: abort ?? signal(), headers: {} }); };
  const adapter = createMemoryAdapter(transport, () => true);
  const ctrl = new MemoryController(adapter, mock.context); await ctrl.load();
  assert.equal(ctrl.getSnapshot().phase, 'ready');
  await ctrl.open(ctrl.getSnapshot().proposals[0].id);
  assert.equal(ctrl.getSnapshot().phase, 'pending');
  return { ctrl, mock, calls, adapter, transport };
}
const decision = (s, action = 'approve') => s.ctrl.decide(action, s.ctrl.getSnapshot().review);
const posts = s => s.calls.filter(r => r.method === 'POST');

for (const action of ['approve', 'reject']) test(`exact ${action} contract, SHA-256 review and pending queue; no duplicate decision`, async () => {
  const s = await setup(); const p = clone(s.ctrl.getSnapshot().detail); const oldHash = s.ctrl.getSnapshot().drawer.hash;
  const expected = createHash('sha256').update(JSON.stringify(['memory-proposal-review/v1', p.id, p.drawerId, p.baseRevision, p.baseHash, p.source, p.changes])).digest('hex');
  assert.equal(p.reviewHash, expected);
  await decision(s, action); assert.equal(s.ctrl.getSnapshot().phase, action === 'approve' ? 'accepted' : 'rejected');
  assert.deepEqual(posts(s), [{ method: 'POST', path: `/api/memory/proposals/${p.id}/${action}`, body: { expectedReviewHash: expected } }]);
  await decision(s, action); assert.equal(posts(s).length, 1);
  await s.ctrl.load(); assert.deepEqual(s.ctrl.getSnapshot().proposals, []);
  assert.equal(s.ctrl.getSnapshot().drawer.hash === oldHash, action === 'reject');
  assert.equal(s.ctrl.getSnapshot().drawer.revision, action === 'approve' ? 4 : 3);
  assert.ok(s.calls.some(r => r.path === '/api/memory/proposals?status=pending'));
});
test('strong decision path and body allowlist; no mass assignment or query aliases', () => {
  const hash = 'a'.repeat(64); const path = '/api/memory/proposals/p1/approve';
  assert.equal(allowedRequest('POST', path, { expectedReviewHash: hash }), true);
  for (const id of ['a.b', 'a_b', 'a@b', '..', '%70', 'a/b', 'x'.repeat(65)]) assert.equal(allowedRequest('POST', `/api/memory/proposals/${id}/reject`, { expectedReviewHash: hash }), false);
  for (const body of [undefined, null, [], {}, { expectedReviewHash: 'A'.repeat(64) }, { expectedReviewHash: 1 }, { expectedReviewHash: hash, note: 'extra' }, { expectedReviewHash: hash, userId: 'other' }, { expectedReviewHash: hash, action: 'reject' }]) assert.equal(allowedRequest('POST', path, body), false);
  for (const suffix of ['?x=1', '#x', '/', '?status=pending']) assert.equal(allowedRequest('POST', path + suffix, { expectedReviewHash: hash }), false);
});
test('missing and malformed reviewed hashes and server proposal IDs fail closed on GET', async () => {
  const s = await setup(); const p = s.ctrl.getSnapshot().detail;
  for (const patch of [{ reviewHash: undefined }, { reviewHash: 'f'.repeat(63) }, { reviewHash: 'F'.repeat(64) }, { id: 'bad_id' }, { id: 'x'.repeat(65) }]) assert.throws(() => parseProposal({ ...p, ...patch }));
});
for (const source of ['file', 'upload', 'learning', 'agent', 'import']) test(`source ${source}: unrelated drawer edit follows backend source semantics`, async () => {
  const s = await setup({ source });
  await s.mock.changeEntry('unrelated', { type: 'fact', importance: 5, content: 'Unrelated fictional edit' });
  await s.ctrl.load(); await s.ctrl.open(s.ctrl.getSnapshot().proposals[0].id);
  await decision(s);
  if (['file', 'upload'].includes(source)) { assert.equal(s.ctrl.getSnapshot().phase, 'stale'); assert.equal(posts(s).length, 0); }
  else { assert.equal(s.ctrl.getSnapshot().phase, 'accepted'); assert.equal(posts(s).length, 1); }
});
test('file stale check uses hash, not revision alone; rejection does not require current drawer hash', async () => {
  const s = await setup(); s.ctrl.getSnapshot().drawer.revision++; await decision(s); assert.equal(s.ctrl.getSnapshot().phase, 'accepted');
  const r = await setup(); await r.mock.changeEntry('unrelated', { type: 'fact', importance: 5, content: 'Changed' });
  await r.ctrl.load(); await r.ctrl.open(r.ctrl.getSnapshot().proposals[0].id); await decision(r, 'reject'); assert.equal(r.ctrl.getSnapshot().phase, 'rejected');
});
for (const source of ['learning', 'agent', 'import']) test(`${source} changed target receives stale; consent cleared and detail refreshed`, async () => {
  const s = await setup({ source }); await s.mock.changeEntry('sample-entry', { type: 'fact', importance: 5, content: 'Concurrent target edit' });
  await decision(s); const state = s.ctrl.getSnapshot();
  assert.equal(state.phase, 'stale'); assert.equal(state.decisionNotice, 'stale'); assert.equal(state.detail.status, 'stale'); assert.equal(state.review, undefined); assert.equal(posts(s).length, 1);
});
test('review_changed refreshes exact content and hash; old consent cannot decide fresh detail', async () => {
  const s = await setup(); const old = s.ctrl.getSnapshot().review; const oldHash = s.ctrl.getSnapshot().detail.reviewHash;
  await s.mock.changeReview('<script>changed untrusted proposal</script>'); await decision(s);
  let state = s.ctrl.getSnapshot(); assert.equal(state.decisionNotice, 'review_changed'); assert.equal(state.review, undefined); assert.notEqual(state.detail.reviewHash, oldHash);
  const id = state.detail.id; await s.ctrl.open(id); await s.ctrl.decide('approve', old); assert.equal(posts(s).length, 1);
  await s.ctrl.load(); await s.ctrl.open(id); await decision(s); assert.equal(s.ctrl.getSnapshot().phase, 'accepted');
});
for (const code of ['already_decided', 'stale', 'review_changed', 'review_hash_required']) test(`${code}: exact status/code maps, GET reconciliation cannot retain consent`, async () => {
  const s = await setup({}, (r, abort, mock) => r.method === 'POST' ? { status: code === 'review_hash_required' ? 400 : 409, body: { code, error: 'PRIVATE' } } : mock.transport({ ...r, signal: abort, headers: {} }));
  const old = s.ctrl.getSnapshot().review; await decision(s); assert.equal(s.ctrl.getSnapshot().decisionNotice, code); assert.equal(s.ctrl.getSnapshot().review, undefined);
  await s.ctrl.decide('approve', old); assert.equal(posts(s).length, 1); assert.doesNotMatch(JSON.stringify(s.ctrl.getSnapshot()), /PRIVATE/);
});
for (const result of ['throw', '500', 'malformed', 'unknown-code', 'wrong-status-code', 'wrong-scope', 'wrong-applied', 'wrong-content']) test(`unknown ${result}: current approved GET never proves execution, never duplicates even after reopen/remount`, async () => {
  const s = await setup({}, async (r, abort, mock) => {
    const actual = await mock.transport({ ...r, signal: abort, headers: {} });
    if (r.method !== 'POST') return actual;
    if (result === 'throw') throw new Error('PRIVATE');
    if (result === '500') return { status: 500, body: null };
    if (result === 'unknown-code') return { status: 409, body: { code: 'other' } };
    if (result === 'wrong-status-code') return { status: 400, body: { code: 'already_decided' } };
    if (result === 'malformed') return { status: 200, body: {} };
    const body = clone(actual.body);
    if (result === 'wrong-scope') body.proposal.userId = 'other';
    if (result === 'wrong-applied') body.applied.updated = [];
    if (result === 'wrong-content') body.proposal.changes[0].after.content += ' changed';
    return { status: 200, body };
  });
  await decision(s); const state = s.ctrl.getSnapshot(); assert.equal(state.phase, 'unknown'); assert.equal(state.unknownOutcome, true); assert.equal(state.detail.status, 'approved'); assert.equal(state.review, undefined);
  await s.ctrl.open(state.detail.id); await decision(s); assert.equal(posts(s).length, 1);
  const newer = new MemoryController(createMemoryAdapter(s.transport, () => true), s.mock.context);
  assert.equal(newer.adapter.uncertainDecisions.size, 1);
});
test('unknown with still-pending GET stays blocked after explicit refresh and full reopening', async () => {
  const s = await setup({}, (r, abort, mock) => r.method === 'POST' ? Promise.reject(new Error('lost')) : mock.transport({ ...r, signal: abort, headers: {} }));
  await decision(s); assert.equal(s.ctrl.getSnapshot().detail.status, 'pending');
  await s.ctrl.load(); await s.ctrl.open(s.ctrl.getSnapshot().proposals[0].id); await decision(s);
  assert.equal(s.ctrl.getSnapshot().phase, 'unknown'); assert.equal(posts(s).length, 1);
});
test('double click, concurrent refresh/open, and context change abort request and discard late completion', async () => {
  const gate = defer(); const s = await setup({ beforeDecision: () => gate.promise });
  const review = s.ctrl.getSnapshot().review; const pending = s.ctrl.decide('approve', review);
  await s.ctrl.decide('reject', review); await s.ctrl.load(); await s.ctrl.open(s.ctrl.getSnapshot().detail.id);
  assert.equal(posts(s).length, 1); assert.equal(s.ctrl.getSnapshot().phase, 'deciding');
  s.ctrl.setContext({ ...s.mock.context, drawerId: 'experience' }); gate.resolve(); await pending;
  assert.equal(s.ctrl.getSnapshot().phase, 'idle'); assert.equal(s.ctrl.getSnapshot().detail, undefined);
});
test('two independent frontend reviews race approve/reject: one winner, loser refreshes already_decided', async () => {
  const gate = defer(); const s = await setup({ beforeDecision: () => gate.promise });
  const second = new MemoryController(createMemoryAdapter(async (r, abort) => s.mock.transport({ ...r, signal: abort, headers: {} }), () => true), s.mock.context);
  await second.load(); await second.open(second.getSnapshot().proposals[0].id);
  const first = decision(s); await second.decide('reject', second.getSnapshot().review); gate.resolve(); await first;
  assert.equal(second.getSnapshot().phase, 'rejected'); assert.equal(s.ctrl.getSnapshot().decisionNotice, 'already_decided'); assert.equal(s.ctrl.getSnapshot().detail.status, 'rejected');
});
test('mock error check order and atomic double approve learning yields one applied revision', async () => {
  const s = await setup({ source: 'learning' }); const p = s.ctrl.getSnapshot().detail; const path = `/api/memory/proposals/${p.id}/approve`;
  assert.equal((await raw(s.mock, 'POST', path, {})).body.code, 'review_hash_required');
  assert.equal((await raw(s.mock, 'POST', path, { expectedReviewHash: 'a'.repeat(64) })).body.code, 'review_changed');
  const responses = await Promise.all([raw(s.mock, 'POST', path, { expectedReviewHash: p.reviewHash }), raw(s.mock, 'POST', path, { expectedReviewHash: p.reviewHash })]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
  assert.equal((await raw(s.mock, 'POST', path, {})).body.code, 'already_decided');
});
test('session mock authenticates owner, requires injected capability, aborts pending memory on epoch changes', async () => {
  const mock = createLoginMock(); const gate = defer(); let pendingSignal; let entered;
  const enteredGate = new Promise(r => entered = r);
  const client = new SessionClient({ mock: async r => { if (r.method === 'POST' && r.path.endsWith('/approve')) { pendingSignal = r.signal; entered(); await gate.promise; } return mock(r); } });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  const adapter = createMemoryAdapter(client.request, c => client.getSnapshot().phase === 'authenticated' && client.getSnapshot().user?.role === 'owner' && String(client.getSnapshot().epoch) === c.session);
  const ctrl = new MemoryController(adapter, { userId: 'mock-owner', agentId: 'sample-main', drawerId: 'owner', access: 'owner', session: '' });
  const stop = bindMemorySession(client, ctrl); await ctrl.load(); await ctrl.open(ctrl.getSnapshot().proposals[0].id);
  const write = ctrl.decide('approve', ctrl.getSnapshot().review); await enteredGate; client.selectMode('fixture');
  assert.equal(pendingSignal.aborted, true); assert.equal(ctrl.getSnapshot().detail, undefined); gate.resolve(); await write;
  assert.equal(ctrl.getSnapshot().phase, 'denied'); stop();
  assert.equal(createMemoryAdapter(client.request).decide, undefined);
});
test('decision codes survive both transport layers; arbitrary backend error text never does', async () => {
  const response = { status: 409, body: { code: 'review_changed', error: 'PRIVATE' } };
  const transport = createSameOriginTransport('http://127.0.0.1:42522', async () => new Response(JSON.stringify(response.body), { status: response.status, headers: { 'Content-Type': 'application/json' } }));
  const got = await transport({ method: 'POST', path: '/api/memory/proposals/p1/approve', body: { expectedReviewHash: 'a'.repeat(64) }, headers: { Authorization: 'Bearer fictional' }, signal: signal() });
  assert.deepEqual(got, { status: 409, body: { code: 'review_changed' } });
  const login = createLoginMock(); const client = new SessionClient({ mock: r => r.path.endsWith('/approve') ? Promise.resolve(response) : login(r) });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  assert.deepEqual(await client.request({ method: 'POST', path: '/api/memory/proposals/p1/approve', body: { expectedReviewHash: 'a'.repeat(64) } }), got);
});
for (const status of [401, 403, 404]) test(`decision ${status} clears full content and consent without retry`, async () => {
  const s = await setup({}, (r, abort, mock) => r.method === 'POST' ? { status, body: { error: 'PRIVATE' } } : mock.transport({ ...r, signal: abort, headers: {} }));
  await decision(s); assert.equal(s.ctrl.getSnapshot().phase, status === 404 ? 'unavailable' : 'denied');
  assert.equal(s.ctrl.getSnapshot().detail, undefined); assert.equal(s.ctrl.getSnapshot().review, undefined); assert.equal(posts(s).length, 1);
});
test('authorization expires before decision: no POST; forged owner context never grants a session write', async () => {
  const mock = createMemoryMock(); let authorize = true; let writes = 0;
  const adapter = createMemoryAdapter(async (r, abort) => { if (r.method === 'POST') writes++; return mock.transport({ ...r, signal: abort, headers: {} }); }, () => authorize);
  const ctrl = new MemoryController(adapter, mock.context); await ctrl.load(); await ctrl.open(ctrl.getSnapshot().proposals[0].id); authorize = false;
  await ctrl.decide('approve', ctrl.getSnapshot().review); assert.equal(writes, 0); assert.equal(ctrl.getSnapshot().phase, 'denied');
  const client = new SessionClient({ mock: async r => r.path === '/api/auth/login' ? { status: 200, body: { token: 'fictional', deviceToken: 'd'.repeat(43), user: { id: 'u', email: 'u@example.invalid', username: 'U', role: 'admin' } } } : r.path === '/api/auth/me' ? { status: 200, body: { user: { id: 'u', email: 'u@example.invalid', username: 'U', role: 'admin' } } } : (writes++, { status: 200, body: {} }) });
  client.selectMode('mock'); await client.login('u@example.invalid', 'fictional');
  await assert.rejects(client.request({ method: 'POST', path: '/api/memory/proposals/p1/approve', body: { expectedReviewHash: 'a'.repeat(64) } })); assert.equal(writes, 0);
});
test('late conflict reconciliation GET cannot restore private content after context switch', async () => {
  const gate = defer(); let writes = 0; let reconciliationStarted; const entered = new Promise(r => reconciliationStarted = r);
  const s = await setup({}, async (r, abort, mock) => {
    if (r.method === 'POST') { writes++; return { status: 409, body: { code: 'review_changed' } }; }
    if (writes && r.path.includes('/files/')) { reconciliationStarted(); await gate.promise; }
    return mock.transport({ ...r, signal: signal(), headers: {} });
  });
  const pending = decision(s); await entered; s.ctrl.setContext({ ...s.mock.context, session: 'new', userId: 'other' }); gate.resolve(); await pending;
  assert.equal(s.ctrl.getSnapshot().phase, 'idle'); assert.equal(s.ctrl.getSnapshot().detail, undefined); assert.equal(s.ctrl.getSnapshot().drawer, undefined);
});
test('unknown response with GET denial clears content, retained uncertainty prevents a remounted duplicate', async () => {
  let deny = false; const s = await setup({}, (r, abort, mock) => {
    if (r.method === 'POST') { deny = true; throw new Error('lost'); }
    return deny ? { status: 403, body: null } : mock.transport({ ...r, signal: abort, headers: {} });
  });
  await decision(s); assert.equal(s.ctrl.getSnapshot().phase, 'denied'); assert.equal(s.ctrl.getSnapshot().detail, undefined);
  deny = false;
  const newer = new MemoryController(createMemoryAdapter(s.transport, () => true), s.mock.context);
  await newer.load(); assert.equal(newer.getSnapshot().unknownOutcome, true);
  await newer.open(newer.getSnapshot().proposals[0].id); assert.equal(newer.getSnapshot().phase, 'unknown');
  await newer.decide('reject', newer.getSnapshot().review); assert.equal(posts(s).length, 1);
});
test('summary-only, malformed current snapshot and changed full content cannot submit consent', async () => {
  for (const mutation of ['list', 'invalid', 'changed']) {
    const s = await setup(); const review = s.ctrl.getSnapshot().review;
    if (mutation === 'list') await s.ctrl.load();
    else if (mutation === 'invalid') s.ctrl.getSnapshot().detail.reviewHash = 'bad';
    else s.ctrl.getSnapshot().detail.changes[0].after.content += ' altered';
    await s.ctrl.decide('approve', review); assert.equal(posts(s).length, 0);
  }
});

for (const op of ['add', 'update', 'delete']) test(`${op}: exact own key sets; no hidden hashed approval`, async () => {
  const s = await setup(); const base = s.ctrl.getSnapshot().detail;
  const entry = { type: 'fact', importance: 5, content: 'complete' };
  const change = { op, ...(op === 'add' ? {} : { id: 'm1', before: clone(entry) }), ...(op === 'delete' ? {} : { after: clone(entry) }) };
  for (const where of ['change', ...('before' in change ? ['before'] : []), ...('after' in change ? ['after'] : [])]) {
    for (const key of ['metadata', 'tags', 'secret', '__proto__', ...(where === 'change' ? [op === 'add' ? 'id' : op === 'delete' ? 'after' : 'unknown'] : [])]) {
      const p = { ...clone(base), changes: [clone(change)] };
      Object.defineProperty(where === 'change' ? p.changes[0] : p.changes[0][where], key, { value: 'hidden', enumerable: true });
      assert.throws(() => parseProposal(p));
      const broken = await setup(); const old = broken.ctrl.getSnapshot().review;
      broken.ctrl.getSnapshot().detail.changes = p.changes;
      await broken.ctrl.decide('approve', old); assert.equal(posts(broken).length, 0); assert.equal(broken.ctrl.getSnapshot().phase, 'error');
    }
    for (const key of Object.keys(where === 'change' ? change : entry)) {
      const p = { ...clone(base), changes: [clone(change)] }; delete (where === 'change' ? p.changes[0] : p.changes[0][where])[key];
      assert.throws(() => parseProposal(p));
    }
  }
});
test('unknown hashed GET detail never provides consent or sends a decision', async () => {
  const s = await setup();
  const badTransport = async (r, abort) => {
    const response = await s.transport(r, abort);
    if (r.method === 'GET' && r.path.includes('/proposals/')) response.body.changes[0].metadata = { hidden: true };
    return response;
  };
  const ctrl = new MemoryController(createMemoryAdapter(badTransport, () => true), s.mock.context);
  await ctrl.load(); await ctrl.open(ctrl.getSnapshot().proposals[0].id); assert.equal(ctrl.getSnapshot().phase, 'error');
  assert.equal(ctrl.getSnapshot().review, undefined); await ctrl.decide('approve', 'invented'); assert.equal(posts(s).length, 0);
});
for (const code of ['blocked', 'cancelled', 'unavailable', 'spoofed']) test(`transport ${code}: only trusted pre-send blocked clears uncertainty`, async () => {
  const { SessionFailure } = require('../src/session.ts');
  const s = await setup({}, (r, abort, mock) => {
    if (r.method === 'POST') throw code === 'spoofed' ? { code: 'blocked' } : new SessionFailure(code);
    return mock.transport({ ...r, signal: abort, headers: {} });
  });
  await decision(s);
  assert.equal(s.adapter.uncertainDecisions.size, code === 'blocked' ? 0 : 1);
  assert.equal(s.ctrl.getSnapshot().phase, code === 'blocked' ? 'denied' : 'unknown');
});
async function sessionDecisionHarness(responseStatus, late = false) {
  const login = createLoginMock(), gate = defer(), entered = defer(); let calls = 0;
  const client = new SessionClient({ mock: async r => {
    if (r.method === 'POST' && r.path.includes('/memory/')) { calls++; entered.resolve(); if (late) await gate.promise; return { status: responseStatus, body: { code: responseStatus === 401 ? 'unauthenticated' : 'inactive_user' } }; }
    return login(r);
  } });
  client.selectMode('mock'); await client.login('demo@example.invalid', 'mock-only');
  const context = { userId: client.getSnapshot().user.id, agentId: 'sample-main', drawerId: 'owner', access: 'owner', session: String(client.getSnapshot().epoch) };
  const ctrl = new MemoryController(createMemoryAdapter(client.request, () => true), context);
  const unbind = bindMemorySession(client, ctrl);
  await ctrl.load(); await ctrl.open(ctrl.getSnapshot().proposals[0].id);
  return { client, ctrl, unbind, gate, entered, calls: () => calls };
}
for (const status of [401, 403]) test(`definitive ${status} settles ledger despite synchronous session invalidation`, async () => {
  const s = await sessionDecisionHarness(status);
  try {
    await s.ctrl.decide('approve', s.ctrl.getSnapshot().review);
    assert.equal(s.client.getSnapshot().phase, 'signed-out'); assert.equal(s.ctrl.getSnapshot().phase, 'denied');
    assert.equal(s.ctrl.getSnapshot().detail, undefined); assert.equal(s.ctrl.adapter.uncertainDecisions.size, 0); assert.equal(s.calls(), 1);
    await s.client.login('demo@example.invalid', 'mock-only'); await s.ctrl.load(); await s.ctrl.open(s.ctrl.getSnapshot().proposals[0].id);
    assert.equal(s.ctrl.getSnapshot().phase, 'pending'); assert.ok(s.ctrl.getSnapshot().review);
  } finally { s.unbind(); }
});
for (const status of [401, 403, 500]) test(`late ${status} after relogin: old refusal only settles old ledger; no new-session reset or private restoration`, async () => {
  const s = await sessionDecisionHarness(status, true);
  try {
    const pending = s.ctrl.decide('approve', s.ctrl.getSnapshot().review); await s.entered.promise;
    s.client.cancel(); await s.client.login('demo@example.invalid', 'mock-only');
    const state = s.client.getSnapshot(); const memory = s.ctrl.getSnapshot();
    s.gate.resolve(); await pending;
    assert.equal(s.client.getSnapshot(), state); assert.equal(s.ctrl.getSnapshot(), memory);
    assert.equal(s.ctrl.getSnapshot().detail, undefined); assert.equal(s.ctrl.adapter.uncertainDecisions.size, status === 500 ? 1 : 0);
  } finally { s.unbind(); }
});
test('pre-aborted SessionClient memory request never invokes wire transport and releases ledger', async () => {
  const s = await sessionDecisionHarness(200);
  try {
    // Invalidate synchronously when deciding is published, before the adapter invokes transport.
    const unsubscribe = s.ctrl.subscribe(() => { if (s.ctrl.getSnapshot().phase === 'deciding') s.client.cancel(); });
    await s.ctrl.decide('approve', s.ctrl.getSnapshot().review); unsubscribe();
    assert.equal(s.calls(), 0); assert.equal(s.ctrl.adapter.uncertainDecisions.size, 0); assert.equal(s.ctrl.getSnapshot().phase, 'denied');
  } finally { s.unbind(); }
});
test('Unicode entry limits use UTF-16 code units, not UTF-8 bytes or code points', async () => {
  const s = await setup(); const p = clone(s.ctrl.getSnapshot().detail);
  for (const content of ['ع'.repeat(50000), '漢'.repeat(50000), '😀'.repeat(25000)]) {
    p.changes = [{ op: 'add', after: { type: 'fact', importance: 5, content } }];
    assert.equal(parseProposal(p).changes[0].after.content, content);
    p.changes[0].after.content += 'x'; assert.throws(() => parseProposal(p));
  }
});

test('pre-aborted signal is definitely blocked before the session wire call', async () => {
  const s = await sessionDecisionHarness(200);
  try {
    const abort = new AbortController(); abort.abort();
    await assert.rejects(s.client.request({ method: 'POST', path: '/api/memory/proposals/p1/approve', body: { expectedReviewHash: 'a'.repeat(64) } }, abort.signal), e => e.code === 'blocked');
    assert.equal(s.calls(), 0); assert.equal(s.client.getSnapshot().phase, 'authenticated');
  } finally { s.unbind(); }
});
test('same-origin fetch failure after dispatch remains unknown even with blocked-looking exception', async () => {
  const { SessionFailure } = require('../src/session.ts'); let sent = 0;
  const transport = createSameOriginTransport('http://127.0.0.1:42522', async () => { sent++; throw new SessionFailure('blocked'); });
  const s = await setup({}, (r, abort, mock) => r.method === 'POST' ? transport({ ...r, signal: abort, headers: { Authorization: 'Bearer fictional' } }) : mock.transport({ ...r, signal: abort, headers: {} }));
  await decision(s); assert.equal(sent, 1); assert.equal(s.ctrl.getSnapshot().phase, 'unknown'); assert.equal(s.adapter.uncertainDecisions.size, 1);
});
test('unknown ledger blocks a second controller while the first sent decision is unresolved', async () => {
  const gate = defer(), entered = defer();
  const s = await setup({}, async (r, abort, mock) => {
    if (r.method === 'POST') { entered.resolve(); await gate.promise; return { status: 500, body: null }; }
    return mock.transport({ ...r, signal: abort, headers: {} });
  });
  const pending = decision(s); await entered.promise;
  const other = new MemoryController(createMemoryAdapter(s.transport, () => true), s.mock.context);
  await other.load(); await other.open(other.getSnapshot().proposals[0].id); assert.equal(other.getSnapshot().phase, 'unknown');
  await other.decide('approve', 'forged'); assert.equal(posts(s).length, 1);
  gate.resolve(); await pending; assert.equal(other.adapter.uncertainDecisions.size, 1);
});
test('context note explicitly distinguishes note/reasons from the reviewed hash in every supported catalog', async () => {
  const React = require('../node_modules/react'); const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
  const { MemoryReview } = require('../src/MemoryDestination.tsx'); const { memoryCatalogs } = require('../src/memory-catalogs.ts');
  const s = await setup();
  for (const locale of ['en', 'ar', 'de']) {
    const html = renderToStaticMarkup(React.createElement(MemoryReview, { state: s.ctrl.getSnapshot(), locale }));
    assert.ok(memoryCatalogs[locale].contextNote); assert.ok(html.includes(memoryCatalogs[locale].contextNote));
  }
});
