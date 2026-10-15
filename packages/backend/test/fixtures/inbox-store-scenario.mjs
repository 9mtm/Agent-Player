// B2.2d-17: the inbox message store and approval rules, one scenario for both
// drivers (test/inbox-store.test.mjs on SQLite, test/pg-inbox.integration.test.mjs
// on PostgreSQL). `ctx` = { MessageStore, ApprovalEngine }; `tag` keeps rows of
// repeated runs apart.
import assert from 'node:assert/strict';

const DAY = 24 * 60 * 60 * 1000;

export async function inboxStoreScenario({ MessageStore, ApprovalEngine }, tag) {
  const store = new MessageStore();
  const user = `inbox-u-${tag}`;
  const other = `inbox-o-${tag}`;
  const t0 = Date.now();

  const a = await store.save({ userId: user, sourceType: 'telegram', sourceId: 'chat-1', message: `deploy the site ${tag}`,
    metadata: { k: 1 }, status: 'needs_approval', riskLevel: 'high', approvalNeeded: true, receivedAt: new Date(t0 - 3 * DAY) });
  const b = await store.save({ userId: user, sourceType: 'manual', message: `summarize ${tag}`, riskLevel: 'low',
    autoExecuted: true, receivedAt: new Date(t0 - 2 * DAY) });
  const c = await store.save({ userId: user, sourceType: 'manual', message: `old done ${tag}`, riskLevel: 'medium',
    receivedAt: new Date(t0 - 50 * DAY) });
  await store.save({ userId: other, sourceType: 'manual', message: `not yours ${tag}` });

  // Round trip of every kind of field.
  const got = await store.getById(a.id);
  assert.equal(got.userId, user);
  assert.equal(got.sourceId, 'chat-1');
  assert.deepEqual(got.metadata, { k: 1 });
  assert.equal(got.approvalNeeded, true);
  assert.equal(got.autoExecuted, false);
  assert.equal(got.receivedAt.getTime(), t0 - 3 * DAY);
  await assert.rejects(() => store.getById(`missing-${tag}`), /not found/);

  // Updates: a Date, a boolean, an object and plain values.
  const approvedAt = new Date(t0 - DAY);
  await store.update(a.id, { approvalStatus: 'approved', approvedBy: user, approvedAt, result: { ok: true }, status: 'completed', completedAt: new Date(t0) });
  await store.update(c.id, { status: 'completed', completedAt: new Date(t0 - 40 * DAY) });
  await store.update(b.id, { notAColumn: 'x' }); // ignored
  const upd = await store.getById(a.id);
  assert.equal(upd.status, 'completed');
  assert.equal(upd.approvalStatus, 'approved');
  assert.equal(upd.approvedAt.getTime(), approvedAt.getTime());
  assert.deepEqual(upd.result, { ok: true });

  // Listing: newest first, filters, paging; never another user's rows.
  const ids = (list) => list.map((m) => m.id);
  assert.deepEqual(ids(await store.listByUser(user)), [b.id, a.id, c.id]);
  assert.deepEqual(ids(await store.listByUser(user, { riskLevel: 'low' })), [b.id]);
  assert.deepEqual(ids(await store.listByUser(user, { status: 'completed' })), [a.id, c.id]);
  assert.deepEqual(ids(await store.listByUser(user, { dateFrom: new Date(t0 - 10 * DAY) })), [b.id, a.id]);
  assert.deepEqual(ids(await store.listByUser(user, { dateTo: new Date(t0 - 10 * DAY) })), [c.id]);
  assert.deepEqual(ids(await store.listByUser(user, { limit: 1, offset: 1 })), [a.id]);

  // Counts and stats are numbers on both drivers.
  const counts = await store.countByStatus(user);
  assert.equal(counts.completed, 2);
  assert.equal(counts.pending, 1);
  assert.equal(typeof counts.completed, 'number');
  const stats = await store.getStats(user);
  assert.deepEqual(stats, { total: 3, needsApproval: 0, processing: 0, completed: 2, failed: 0, autoExecuted: 1,
    byRiskLevel: { low: 1, medium: 1, high: 1 } });

  // Cleanup removes only completed rows older than the cutoff.
  assert.equal(await store.deleteOldCompleted(user, 30), 1);
  assert.deepEqual(ids(await store.listByUser(user)), [b.id, a.id]);
  await store.delete(b.id);
  assert.deepEqual(ids(await store.listByUser(user)), [a.id]);

  // Approval rules: priority order, regex match, times_applied, delete.
  const engine = new ApprovalEngine();
  const low = await engine.createRule({ userId: user, name: 'low prio', actionPattern: 'deploy', priority: 2, confidenceScore: 0.5 });
  const high = await engine.createRule({ userId: user, name: 'high prio', actionPattern: '^deploy', sourceType: 'telegram', priority: 9, autoApprove: true });
  assert.deepEqual((await engine.listRules(user)).map((r) => r.name), ['high prio', 'low prio']);
  assert.equal(low.confidenceScore, 0.5);
  assert.equal(high.autoApprove, true);
  assert.equal(high.priority, 9);
  // A CURRENT_TIMESTAMP / timestamptz value is UTC, not local time.
  assert.ok(Math.abs(high.createdAt.getTime() - Date.now()) < 60_000, `createdAt ${high.createdAt.toISOString()}`);
  const msg = await store.getById(a.id);
  const hit = await engine.checkRules(msg, { level: 'high' });
  assert.equal(hit?.id, high.id);
  assert.equal((await engine.getRule(high.id)).timesApplied, 1);
  assert.equal(await engine.checkRules({ ...msg, message: 'nothing here' }, { level: 'high' }), null);
  await engine.deleteRule(low.id);
  await assert.rejects(() => engine.getRule(low.id), /not found/);
}
