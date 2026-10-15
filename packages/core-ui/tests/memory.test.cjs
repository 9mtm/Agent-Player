require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createMemoryAdapter, MemoryController, MemoryFailure, parseProposal, validDrawer, reviewVersion } = require('../src/memory.ts');
const { createFixtureMemory, fixtureProposal, fixtureContext, fixtureDrawers } = require('../src/memory-fixture.ts');
const { MemoryReview } = require('../src/MemoryDestination.tsx');
const { memoryCatalogs } = require('../src/memory-catalogs.ts');
const { App } = require('../src/App.tsx');
const { initialState } = require('../src/model.ts');
const clone = x => JSON.parse(JSON.stringify(x));
const context = patch => ({ ...fixtureContext, ...patch });
const drawer = c => ({ drawer: fixtureProposal(c).drawer, drawerId: c.drawerId, agentId: c.agentId, revision: 3, hash: 'a'.repeat(64), count: 2, path: 'fictional/owner.md', content: 'Fictional content' });
function wire(c = context(), override = () => undefined) {
  const calls = [];
  const adapter = createMemoryAdapter(async req => {
    calls.push(req); const special = override(req); if (special) return special;
    return { status: 200, body: req.path.startsWith('/api/memory/files/') ? drawer(c) : req.path === '/api/memory/proposals?status=pending' ? { proposals: [fixtureProposal(c)] } : fixtureProposal(c) };
  });
  return { adapter, calls };
}
async function opened(adapter = createFixtureMemory(), c = context()) {
  const controller = new MemoryController(adapter, c); await controller.load();
  await controller.open(controller.getSnapshot().proposals[0].id); return controller;
}
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
function cleared(state, phase) { assert.equal(state.phase, phase); assert.deepEqual(state.proposals, []); assert.equal(state.detail, undefined); assert.equal(state.drawer, undefined); assert.equal(state.review, undefined); }

test('exact pinned routes: encoded drawer and agentId, no invented user/scope/version query or POST', async () => {
  const c = context({ drawerId: 'project:sample-alpha' }); const w = wire(c); const controller = await opened(w.adapter, c);
  assert.deepEqual(w.calls, [
    { method: 'GET', path: '/api/memory/files/project%3Asample-alpha?agentId=sample-main' },
    { method: 'GET', path: '/api/memory/proposals?status=pending' },
    { method: 'GET', path: '/api/memory/proposals/sample-sample-main-project-sample-alpha' },
  ]);
  assert.equal(w.adapter.decide, undefined);
  await controller.decide('approve', controller.getSnapshot().review); assert.equal(w.calls.length, 3);
});
test('all five drawer kinds; invalid or traversing scope never reaches transport', async () => {
  for (const id of fixtureDrawers) assert.equal(validDrawer(id), true);
  for (const drawerId of ['', 'project', 'owner:x', 'project:UPPER', 'task:../x', 'people:a..b', 'people:a/b', 'project:a?userId=other']) {
    assert.equal(validDrawer(drawerId), false);
    const w = wire(); const ctrl = new MemoryController(w.adapter, context({ drawerId })); await ctrl.load(); cleared(ctrl.getSnapshot(), 'error'); assert.equal(w.calls.length, 0);
  }
});
test('owner-only scope does not grant admin, channel, guest or denied access', async () => {
  for (const access of ['admin', 'channel', 'guest', 'denied']) {
    const w = wire(); const ctrl = new MemoryController(w.adapter, context({ access })); await ctrl.load(); cleared(ctrl.getSnapshot(), 'denied'); assert.equal(w.calls.length, 0);
  }
});
test('owner-wide list filtered by exact drawer AND agent; another user response fails closed', async () => {
  const c = context(); const entries = [fixtureProposal(c), fixtureProposal(context({ agentId: 'other' })), fixtureProposal(context({ drawerId: 'project:sample-beta' }))];
  const w = wire(c, req => req.path === '/api/memory/proposals?status=pending' ? { status: 200, body: { proposals: entries } } : undefined);
  assert.deepEqual((await w.adapter.list(c)).map(p => p.id), [entries[0].id]);
  entries.push(fixtureProposal(context({ userId: 'other' })));
  await assert.rejects(w.adapter.list(c), MemoryFailure);
});
test('detail and drawer mismatches cannot leak across user, agent, drawer or proposal id', async () => {
  for (const patch of [{ userId: 'other' }, { agentId: 'other' }, { drawerId: 'experience' }, { id: 'other' }]) {
    const p = { ...fixtureProposal(context()), ...patch };
    const w = wire(context(), req => req.path.includes('/proposals/') ? { status: 200, body: p } : undefined);
    const ctrl = await opened(w.adapter); cleared(ctrl.getSnapshot(), 'error');
  }
  const w = wire(context(), req => req.path.includes('/files/') ? { status: 200, body: drawer(context({ drawerId: 'experience' })) } : undefined);
  const ctrl = new MemoryController(w.adapter, context()); await ctrl.load(); cleared(ctrl.getSnapshot(), 'error');
});
test('scope/session changes immediately clear loaded text and version', async () => {
  for (const patch of [{ drawerId: 'project:sample-beta' }, { agentId: 'sample-helper' }, { userId: 'other' }, { session: 'replacement-login' }]) {
    const ctrl = await opened(); ctrl.setContext(context(patch)); cleared(ctrl.getSnapshot(), 'idle');
    await ctrl.decide('approve', 'old review'); cleared(ctrl.getSnapshot(), 'idle');
  }
});
test('late drawer result after context change cannot start list request or populate data', async () => {
  const pending = deferred(); let lists = 0;
  const adapter = { ...createFixtureMemory(), drawer: () => pending.promise, list: async () => { lists++; return []; } };
  const ctrl = new MemoryController(adapter, context()); const load = ctrl.load(); ctrl.setContext(context({ drawerId: 'experience' }));
  pending.resolve(drawer(context())); await load; cleared(ctrl.getSnapshot(), 'idle'); assert.equal(lists, 0);
});
test('late list/detail results and errors cannot replace newer context', async () => {
  for (const operation of ['list', 'detail']) {
    const pending = deferred(); const base = createFixtureMemory(); const adapter = { ...base, [operation]: () => pending.promise };
    const ctrl = new MemoryController(adapter, context()); let running;
    if (operation === 'list') { running = ctrl.load(); await Promise.resolve(); }
    else { await ctrl.load(); running = ctrl.open(ctrl.getSnapshot().proposals[0].id); }
    ctrl.setContext(context({ session: 'new-session' }));
    pending.resolve(operation === 'list' ? [fixtureProposal(context())] : fixtureProposal(context())); await running; cleared(ctrl.getSnapshot(), 'idle');
  }
});
test('latest detail wins when two full reviews race', async () => {
  const pending = deferred(); const base = createFixtureMemory(); let reads = 0;
  const ctrl = new MemoryController({ ...base, detail: async c => ++reads === 1 ? pending.promise : { ...fixtureProposal(c), note: 'Latest detail' } }, context());
  await ctrl.load(); const id = ctrl.getSnapshot().proposals[0].id; const old = ctrl.open(id); await ctrl.open(id);
  pending.resolve(fixtureProposal(context())); await old; assert.equal(ctrl.getSnapshot().detail.note, 'Latest detail');
});
test('401 and 403 clear drawer, list, detail and review at every read stage', async () => {
  for (const status of [401, 403]) for (const stage of ['drawer', 'list', 'detail']) {
    let deny = false;
    const w = wire(context(), req => deny && (stage === 'drawer' ? req.path.includes('/files/') : stage === 'list' ? req.path === '/api/memory/proposals?status=pending' : req.path.includes('/proposals/')) ? { status, body: { error: '<secret>do not display</secret>' } } : undefined);
    const ctrl = await opened(w.adapter); deny = true;
    if (stage === 'detail') await ctrl.open(ctrl.getSnapshot().detail.id); else await ctrl.load();
    cleared(ctrl.getSnapshot(), 'denied'); assert.doesNotMatch(JSON.stringify(ctrl.getSnapshot()), /secret/);
  }
});
test('malformed successful responses rejected: no coercion, unknown status, missing/oversized diff, invalid UTC', async () => {
  const p = fixtureProposal(context());
  for (const patch of [{ baseRevision: '3' }, { baseRevision: -1 }, { baseHash: 'wrong' }, { status: 'expired' }, { changes: null }, { changes: [] }, { changes: Array(501).fill(p.changes[0]) }, { createdAt: '2026-10-14 08:00:00' }, { createdAt: 'badZ' }, { reasons: {} }, { changes: [{ op: 'execute', after: p.changes[0].after }] }, { changes: [{ op: 'add', after: { type: 'fact', importance: 11, content: 'x' } }] }, { changes: [{ op: 'add', after: { type: 'fact', importance: 5, content: 'x'.repeat(50001) } }] }]) {
    assert.throws(() => parseProposal({ ...p, ...patch }), MemoryFailure);
  }
  for (const body of [null, [], {}, { proposals: 'bad' }, { proposals: Array(201).fill(p) }]) {
    const w = wire(context(), req => req.path === '/api/memory/proposals?status=pending' ? { status: 200, body } : undefined);
    const ctrl = new MemoryController(w.adapter, context()); await ctrl.load(); cleared(ctrl.getSnapshot(), 'error');
  }
});
test('404 unavailable, 409 stale, 500 and thrown failures sanitized; no read retries', async () => {
  for (const [status, phase] of [[404, 'unavailable'], [409, 'stale'], [500, 'error'], [429, 'error'], [201, 'error']]) {
    const w = wire(context(), () => ({ status, body: { error: 'PRIVATE' } })); const ctrl = new MemoryController(w.adapter, context()); await ctrl.load(); cleared(ctrl.getSnapshot(), phase); assert.equal(w.calls.length, 1);
  }
  const ctrl = new MemoryController(createMemoryAdapter(async () => { throw new Error('PRIVATE'); }), context()); await ctrl.load(); cleared(ctrl.getSnapshot(), 'error');
});
test('explicit full-version decision required; altered review and base hash blocked; revision is not a backend stale precondition', async () => {
  for (const change of ['review', 'hash']) {
    let writes = 0; const base = createFixtureMemory(); const ctrl = await opened({ ...base, decide: async (...args) => { writes++; return base.decide(...args); } });
    const state = ctrl.getSnapshot(); let review = state.review;
    if (change === 'review') review += 'changed';
    else if (change === 'revision') state.drawer.revision++;
    else state.drawer.hash = 'b'.repeat(64);
    await ctrl.decide('approve', review); cleared(ctrl.getSnapshot(), 'stale'); assert.equal(writes, 0);
  }
});
test('list-only and terminal states never permit decisions; explicit accept/reject once only', async () => {
  for (const action of ['approve', 'reject']) {
    let writes = 0; const base = createFixtureMemory(); const ctrl = new MemoryController({ ...base, decide: async (...args) => { writes++; return base.decide(...args); } }, context());
    await ctrl.load(); await ctrl.decide(action, 'unreviewed'); assert.equal(writes, 0);
    await ctrl.open(ctrl.getSnapshot().proposals[0].id); const review = ctrl.getSnapshot().review;
    await ctrl.decide(action, review); assert.equal(ctrl.getSnapshot().phase, action === 'approve' ? 'accepted' : 'rejected');
    await ctrl.decide(action, review); assert.equal(writes, 1);
    await ctrl.load(); assert.equal(ctrl.getSnapshot().proposals[0].status, action === 'approve' ? 'approved' : 'rejected');
  }
});
test('fixture scopes preserve decisions separately; same-owner drawer revision shared across agents', async () => {
  const adapter = createFixtureMemory(); const ctrl = await opened(adapter); await ctrl.decide('approve', ctrl.getSnapshot().review);
  ctrl.setContext(context({ drawerId: 'project:sample-alpha' })); await ctrl.load(); await ctrl.open(ctrl.getSnapshot().proposals[0].id); assert.equal(ctrl.getSnapshot().phase, 'pending');
  ctrl.setContext(context({ agentId: 'sample-helper' })); await ctrl.load(); await ctrl.open(ctrl.getSnapshot().proposals[0].id);
  await ctrl.decide('approve', ctrl.getSnapshot().review); cleared(ctrl.getSnapshot(), 'stale');
});
test('uncertain/malformed write outcomes never auto retry or retain a decision token', async () => {
  for (const outcome of ['throw', 'malformed', 'wrong-status', 'denied', 'stale']) {
    let writes = 0; const ctrl = await opened({ ...createFixtureMemory(), decide: async () => {
      writes++;
      if (outcome === 'denied' || outcome === 'stale') throw new MemoryFailure(outcome);
      if (outcome === 'throw') throw new Error('PRIVATE');
      return outcome === 'malformed' ? {} : fixtureProposal(context());
    } });
    const review = ctrl.getSnapshot().review; await ctrl.decide('approve', review); await ctrl.decide('approve', review);
    cleared(ctrl.getSnapshot(), outcome === 'denied' || outcome === 'stale' ? outcome : 'error'); assert.equal(writes, 1);
  }
});
test('double click, context replacement, and unmount invalidation suppress late decisions', async () => {
  const pending = deferred(); let writes = 0;
  const ctrl = await opened({ ...createFixtureMemory(), decide: async () => { writes++; return pending.promise; } });
  const review = ctrl.getSnapshot().review; const saving = ctrl.decide('approve', review); await ctrl.decide('approve', review);
  ctrl.invalidate(); pending.resolve({ ...fixtureProposal(context()), status: 'approved', appliedRevision: 4 }); await saving;
  cleared(ctrl.getSnapshot(), 'idle'); assert.equal(writes, 1);
});
test('fixture expired/denied/error states are cleared and are not accepted server proposal statuses', async () => {
  for (const phase of ['expired', 'denied', 'error']) {
    const ctrl = new MemoryController(createFixtureMemory(phase), context()); await ctrl.load(); cleared(ctrl.getSnapshot(), phase);
  }
  const stale = await opened(createFixtureMemory('stale')); assert.equal(stale.getSnapshot().phase, 'stale');
  const empty = new MemoryController(createFixtureMemory('empty'), context()); await empty.load(); assert.deepEqual(empty.getSnapshot().proposals, []);
});
test('SSR full diff preserves every character as escaped text with disabled unconfirmed decisions', async () => {
  const ctrl = await opened(); const state = clone(ctrl.getSnapshot());
  state.detail.changes[0].after.content = '<script>alert(1)</script>\n<img src=x onerror=evil()>\n' + 'full-text '.repeat(700);
  state.detail.note = '<iframe>note</iframe>'; state.detail.reasons = ['<svg onload=evil()>'];
  const html = renderToStaticMarkup(React.createElement(MemoryReview, { state, locale: 'en', canDecide: true }));
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/); assert.match(html, /&lt;iframe&gt;note/); assert.match(html, /&lt;svg onload=evil\(\)&gt;/);
  assert.doesNotMatch(html, /<script|<img|<iframe|<svg/); assert.equal((html.match(/full-text /g) || []).length, 700);
  for (const content of ['old checklist', 'obsolete reminder', 'short test result']) assert.ok(html.includes(content));
  assert.equal((html.match(/<button[^>]*disabled=""/g) || []).length, 2); assert.match(html, /type="checkbox"/); assert.match(html, /dir="auto"/);
});
test('SSR contract mode has no decision capability; localized catalogs complete, RTL and six destinations preserved', async () => {
  const ctrl = await opened();
  for (const locale of ['en', 'ar', 'de']) {
    assert.deepEqual(Object.keys(memoryCatalogs[locale]).sort(), Object.keys(memoryCatalogs.en).sort());
    assert.ok(Object.values(memoryCatalogs[locale]).every(x => typeof x === 'string' && x.length));
    const detail = renderToStaticMarkup(React.createElement(MemoryReview, { state: ctrl.getSnapshot(), locale }));
    assert.ok(detail.includes(memoryCatalogs[locale].disabled));
    const shell = renderToStaticMarkup(React.createElement(App, { seed: { ...initialState(), locale, destination: 'memory' } }));
    assert.match(shell, new RegExp(`lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}"`));
    assert.equal((shell.match(/class="nav-item"/g) || []).length, 6); assert.ok(shell.includes(memoryCatalogs[locale].fixture));
    assert.ok(shell.includes(memoryCatalogs[locale].projectAlpha)); assert.ok(shell.includes(memoryCatalogs[locale].projectBeta));
  }
});
test('review binding is canonical across wire property order but changes when full content changes', () => {
  const p = fixtureProposal(context()); const reversed = Object.fromEntries(Object.entries(p).reverse());
  assert.equal(reviewVersion(p), reviewVersion(reversed));
  reversed.changes = clone(p.changes); reversed.changes[0].after.content += ' amended';
  assert.notEqual(reviewVersion(p), reviewVersion(reversed));
});
test('late rejected request after session replacement cannot clear the newer review', async () => {
  let reject; const promise = new Promise((_, r) => { reject = r; }); let calls = 0;
  const base = createFixtureMemory(); const ctrl = new MemoryController({ ...base, drawer: c => ++calls === 1 ? promise : base.drawer(c) }, context());
  const old = ctrl.load(); ctrl.setContext(context({ session: 'new' })); await ctrl.load();
  reject(new MemoryFailure('denied')); await old; assert.equal(ctrl.getSnapshot().phase, 'ready'); assert.ok(ctrl.getSnapshot().drawer);
});
test('bad drawer response and changed write result fail closed, without retry', async () => {
  for (const patch of [{ revision: '3' }, { hash: null }, { count: -1 }, { content: {} }]) {
    const w = wire(context(), req => req.path.includes('/files/') ? { status: 200, body: { ...drawer(context()), ...patch } } : undefined);
    const ctrl = new MemoryController(w.adapter, context()); await ctrl.load(); cleared(ctrl.getSnapshot(), 'error');
  }
  let calls = 0; const ctrl = await opened({ ...createFixtureMemory(), decide: async () => {
    calls++; const p = fixtureProposal(context()); p.status = 'approved'; p.changes[0].after.content = 'unexpected'; return p;
  } });
  const reviewed = ctrl.getSnapshot().review;
  await ctrl.decide('unexpected-action', reviewed); assert.equal(calls, 0);
  await ctrl.decide('approve', reviewed); cleared(ctrl.getSnapshot(), 'error'); assert.equal(calls, 1);
});
