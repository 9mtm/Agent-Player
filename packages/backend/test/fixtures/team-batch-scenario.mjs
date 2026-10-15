// ONBOARD-TEAM-02: the batch hire on both drivers. The caller sets up the
// driver and passes { q, batch } (q from sql-steps, batch = services/team-batch).
// Used by test/team-batch.test.mjs (SQLite) and
// test/pg-team-batch.integration.test.mjs (PostgreSQL).
import assert from 'node:assert/strict';

export const SIX = ['development', 'marketing', 'sales', 'support', 'finance', 'security'];

export function teamBatchScenario(test, getM, { tag, owner, skip = false }) {
  const id = (s) => `${s}-${tag}`;

  test('400 people over 6 departments: created in batches, exactly once, with the reviewed roles and personas', { skip }, async () => {
    const { q, batch } = getM();
    const plan = (await import('../../src/services/company-plan.ts')).planDistribution({ total: 400, departments: SIX });
    const departments = plan.departments.map((d) => ({ department: d.department, count: d.count, ...(d.department === 'support' ? { presets: { specialist: 'careful-auditor' } } : {}) }));
    const agentsBefore = (await q.one('SELECT COUNT(*) AS n FROM agents_config')).n;

    const first = await batch.createBatch(owner, { id: id('b400'), language: 'en', departments });
    assert.equal(first.created, true);
    assert.equal(first.progress.total, 400);
    assert.equal(first.progress.pending, 400);
    // Sending the same plan again (a retry after a lost answer) is a no-op.
    const again = await batch.createBatch(owner, { id: id('b400'), language: 'en', departments });
    assert.equal(again.created, false);
    assert.equal(Number((await q.one('SELECT COUNT(*) AS n FROM team_hire_batch_items WHERE batch_id = ?', id('b400'))).n), 400);
    // The same id with another plan is refused.
    await assert.rejects(batch.createBatch(owner, { id: id('b400'), language: 'en', departments: departments.slice(1) }), (e) => e.code === 'batch_conflict');
    await assert.rejects(batch.createBatch('someone-else', { id: id('b400'), language: 'en', departments }), (e) => e.code === 'batch_conflict');

    // First chunk, then a "reload": the open batch is found again and finished.
    const r1 = await batch.runBatch(owner, id('b400'), { max: 50 });
    assert.equal(r1.results.length, 50);
    assert.equal(r1.progress.created, 50);
    const open = await batch.openBatches(owner);
    assert.ok(open.some((b) => b.id === id('b400') && b.pending === 350));
    // Two runs at once: one is refused, nothing is created twice.
    const both = await Promise.allSettled([batch.runBatch(owner, id('b400'), { max: 50 }), batch.runBatch(owner, id('b400'), { max: 50 })]);
    assert.equal(both.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(both.find((r) => r.status === 'rejected').reason.code, 'batch_running');
    let progress = (await batch.batchStatus(id('b400'), owner));
    assert.equal(progress.created, 100);
    while (!progress.done) progress = (await batch.runBatch(owner, id('b400'), { max: 50 })).progress;
    assert.deepEqual([progress.created, progress.failed, progress.pending], [400, 0, 0]);
    assert.ok(!(await batch.openBatches(owner)).some((b) => b.id === id('b400')));
    // A finished batch run again creates nothing.
    assert.deepEqual((await batch.runBatch(owner, id('b400'), { max: 50 })).results, []);

    const agentsAfter = (await q.one('SELECT COUNT(*) AS n FROM agents_config')).n;
    assert.equal(Number(agentsAfter) - Number(agentsBefore), 400);
    const items = await q.all('SELECT seq, department, role, preset, agent_id, name FROM team_hire_batch_items WHERE batch_id = ? ORDER BY seq', id('b400'));
    assert.equal(new Set(items.map((i) => i.agent_id)).size, 400, 'one agent per item');
    assert.equal(new Set(items.map((i) => i.name.toLowerCase())).size, 400, 'distinct names');
    const reserved = await q.one(`SELECT COUNT(*) AS n FROM used_agent_names WHERE reason = 'create' AND agent_id IN (SELECT agent_id FROM team_hire_batch_items WHERE batch_id = ?)`, id('b400'));
    assert.equal(Number(reserved.n), 400, 'every name reserved');
    for (const share of plan.departments) {
      const rows = await q.all(`SELECT a.role, COUNT(*) AS n FROM agents_config a JOIN team_hire_batch_items i ON i.agent_id = a.id WHERE i.batch_id = ? AND a.department = ? GROUP BY a.role`, id('b400'), share.department);
      const got = Object.fromEntries(rows.map((r) => [r.role, Number(r.n)]));
      for (const role of ['manager', 'specialist', 'evaluator']) assert.equal(got[role] ?? 0, share.roles[role], `${share.department} ${role}`);
    }
    // Personas: a lead has the department persona; the owner's change for support specialists is kept.
    const persona = async (dep, role) => (await q.one(`
      SELECT v.preset, v.source FROM agent_personality_versions v JOIN agents_config a ON a.id = v.agent_id
      JOIN team_hire_batch_items i ON i.agent_id = a.id WHERE i.batch_id = ? AND a.department = ? AND a.role = ? ORDER BY i.seq LIMIT 1`, id('b400'), dep, role));
    assert.deepEqual(await persona('marketing', 'manager'), { preset: 'bold-creative', source: 'owner' });
    assert.equal((await persona('development', 'manager')).preset, 'precise-developer');
    assert.equal((await persona('support', 'specialist')).preset, 'careful-auditor');
    assert.equal((await persona('sales', 'evaluator')).preset, 'strict-evaluator');
  });

  test('failed items can be retried; unknown or foreign batches are not found', { skip }, async () => {
    const { q, batch } = getM();
    await batch.createBatch(owner, { id: id('retry'), language: 'de', departments: [{ department: 'legal', count: 3 }] });
    await q.run(`UPDATE team_hire_batch_items SET status = 'failed', error_code = 'create_failed' WHERE batch_id = ? AND seq = 2`, id('retry'));
    let p = (await batch.runBatch(owner, id('retry'), { max: 10 })).progress;
    assert.deepEqual([p.created, p.failed, p.pending, p.done], [2, 1, 0, true]);
    assert.ok((await batch.openBatches(owner)).some((b) => b.id === id('retry')), 'a batch with failures stays open');
    p = (await batch.runBatch(owner, id('retry'), { max: 10, retryFailed: true })).progress;
    assert.deepEqual([p.created, p.failed], [3, 0]);
    await assert.rejects(batch.runBatch('someone-else', id('retry'), {}), (e) => e.code === 'batch_not_found');
    assert.equal(await batch.batchStatus(id('retry'), 'someone-else'), null);
    await assert.rejects(batch.runBatch(owner, id('none'), {}), (e) => e.code === 'batch_not_found');
  });
}
