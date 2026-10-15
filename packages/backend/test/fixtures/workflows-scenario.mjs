// B2.2d-3: one workflows scenario for both drivers (CRUD, owner scoping,
// execute + background executor status, executions list, ISO times). The
// caller sets up the environment and the driver, registers the workflow
// routes behind the auth gate and passes { app, q, auth }.
// Used by test/workflows-routes.test.mjs (SQLite) and
// test/pg-workflows.integration.test.mjs (PostgreSQL).
import assert from 'node:assert/strict';

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function workflowsScenario(test, getM, { tag, skip = false }) {
  const m = () => getM();
  const owner = `wf-owner-${tag}`;
  const other = `wf-other-${tag}`;
  const nodes = [
    { id: 't', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
    { id: 'a', type: 'action', position: { x: 1, y: 0 }, data: { actionType: 'log', message: 'hello' } },
  ];
  const edges = [{ id: 'e', source: 't', target: 'a' }];
  let id;

  const call = async (method, url, user, payload) => {
    const { app, auth } = m();
    return app.inject({ method, url, headers: auth(user), payload });
  };

  test('seed users', { skip }, async () => {
    const { q } = m();
    // Workflows are owner-only at the auth gate; `other` is a plain user.
    for (const [u, role] of [[owner, 'owner'], [other, 'user']]) {
      await q.run(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', ?, 'active')`, u, `${u}@example.test`, u, role);
    }
  });

  test('create, get, list: parsed JSON, boolean enabled, ISO times', { skip }, async () => {
    const res = await call('POST', '/api/workflows', owner, { name: ` Flow ${tag} `, nodes, edges, enabled: true });
    assert.equal(res.statusCode, 201, res.body);
    id = res.json().workflow.id;
    const got = await call('GET', `/api/workflows/${id}`, owner);
    assert.equal(got.statusCode, 200, got.body);
    const w = got.json().workflow;
    assert.equal(w.name, `Flow ${tag}`);
    assert.equal(w.enabled, true);
    assert.deepEqual(w.nodes, nodes);
    assert.deepEqual(w.edges, edges);
    assert.match(w.created_at, ISO);
    assert.match(w.updated_at, ISO);
    const list = await call('GET', '/api/workflows', owner);
    assert.deepEqual(list.json().workflows.map((x) => x.id), [id]);
    assert.equal((await call('POST', '/api/workflows', owner, { name: ' ', nodes, edges })).statusCode, 400);
  });

  test('another user cannot list, read, change, run or delete it', { skip }, async () => {
    const refused = (r) => assert.ok([403, 404].includes(r.statusCode), `${r.statusCode} ${r.body}`);
    refused(await call('GET', '/api/workflows', other));
    refused(await call('GET', `/api/workflows/${id}`, other));
    refused(await call('PUT', `/api/workflows/${id}`, other, { name: 'x' }));
    refused(await call('POST', `/api/workflows/${id}/execute`, other));
    refused(await call('GET', `/api/workflows/${id}/executions`, other));
    refused(await call('DELETE', `/api/workflows/${id}`, other));
    assert.ok(await m().q.one('SELECT id FROM workflows WHERE id = ?', id), 'still there');
  });

  test('update: fields change, disabled refuses execute, empty update refused', { skip }, async () => {
    const res = await call('PUT', `/api/workflows/${id}`, owner, { description: 'd', enabled: false });
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(res.json().workflow.description, 'd');
    assert.equal(res.json().workflow.enabled, false);
    assert.equal((await call('POST', `/api/workflows/${id}/execute`, owner)).statusCode, 400);
    assert.equal((await call('PUT', `/api/workflows/${id}`, owner, {})).statusCode, 400);
    assert.equal((await call('PUT', `/api/workflows/${id}`, owner, { enabled: true })).statusCode, 200);
  });

  test('execute: the background executor completes and stores its logs', { skip }, async () => {
    const res = await call('POST', `/api/workflows/${id}/execute`, owner);
    assert.equal(res.statusCode, 200, res.body);
    const exec = res.json().execution;
    let e;
    for (let i = 0; i < 100; i++) {
      e = (await call('GET', `/api/workflows/${id}/executions?limit=abc`, owner)).json().executions.find((x) => x.id === exec.id);
      if (e && e.status !== 'running') break;
      await new Promise((r) => setTimeout(r, 20));
    }
    assert.equal(e.status, 'completed', JSON.stringify(e));
    assert.match(e.started_at, ISO);
    assert.match(e.completed_at, ISO);
    assert.ok(e.logs.some((l) => l.message === '[Action Log] hello'));
    const one = (await call('GET', `/api/workflows/${id}/executions?limit=1`, owner)).json().executions;
    assert.equal(one.length, 1);
  });

  test('delete removes the workflow and its executions', { skip }, async () => {
    const { q } = m();
    assert.equal((await call('DELETE', `/api/workflows/${id}`, owner)).statusCode, 200);
    assert.equal((await call('GET', `/api/workflows/${id}`, owner)).statusCode, 404);
    assert.equal((await q.one('SELECT COUNT(*) AS n FROM workflow_executions WHERE workflow_id = ?', id)).n, 0);
  });
}
