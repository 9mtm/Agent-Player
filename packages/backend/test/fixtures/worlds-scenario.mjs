// B2.2d-10: one world builder / generator scenario for both drivers. The
// caller sets a temp cwd (the storage dir is under it), points the local
// model at a dead loopback port with no paid provider (no network), registers
// the world-builder and world-generator routes behind the auth gate and
// passes { app, q, auth, storage }. Used by test/worlds-routes.test.mjs
// (SQLite) and test/pg-worlds.integration.test.mjs (PostgreSQL).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function worldsScenario(test, getM, { tag, skip = false }) {
  const m = () => getM();
  const owner = `wo-owner-${tag}`;
  const other = `wo-other-${tag}`;
  const call = async (method, url, user, payload) => m().app.inject({ method, url, headers: m().auth(user), payload });
  let worldId;

  test('seed users and an agent', { skip }, async () => {
    const { q } = m();
    for (const [u, role] of [[owner, 'owner'], [other, 'user']]) {
      await q.run(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', ?, 'active')`, u, `${u}@example.test`, u, role);
    }
    await q.run(`INSERT INTO agents_config (id, name) VALUES (?, 'World Agent')`, `wo-agent-${tag}`);
  });

  test('builder create: world row + storage_files row + file on disk, one transaction', { skip }, async () => {
    const { q, storage } = m();
    const r = await call('POST', '/api/world-builder', owner, { name: `W ${tag}`, description: 'd', objects: [{ type: 'box' }] });
    assert.equal(r.statusCode, 200, r.body);
    worldId = r.json().world.id;
    const w = await q.one('SELECT user_id, glb_file_id, is_public, max_players, created_at FROM user_worlds WHERE id = ?', worldId);
    assert.equal(w.user_id, owner);
    assert.equal(w.is_public, 0);
    assert.match(w.created_at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    const f = await q.one('SELECT zone, category, filepath, mime_type, size_bytes, created_by FROM storage_files WHERE id = ?', w.glb_file_id);
    assert.equal(f.zone, 'cdn');
    assert.equal(f.created_by, owner);
    assert.ok(f.size_bytes > 0);
    assert.ok(existsSync(join(storage, f.filepath)));
  });

  test('builder get/update read and write the contained file; another user gets 404', { skip }, async () => {
    const g = await call('GET', `/api/world-builder/${worldId}`, owner);
    assert.equal(g.statusCode, 200, g.body);
    assert.deepEqual(g.json().world.objects, [{ type: 'box' }]);
    const u = await call('PUT', `/api/world-builder/${worldId}`, owner, { name: 'renamed', objects: [{ type: 'sphere' }] });
    assert.equal(u.statusCode, 200, u.body);
    const g2 = (await call('GET', `/api/world-builder/${worldId}`, owner)).json().world;
    assert.equal(g2.name, 'renamed');
    assert.deepEqual(g2.objects, [{ type: 'sphere' }]);
    assert.equal((await call('GET', `/api/world-builder/${worldId}`, other)).statusCode, 404);
    assert.equal((await call('PUT', `/api/world-builder/${worldId}`, other, { name: 'x', objects: [] })).statusCode, 404);
  });

  test('a stored file key that leaves the storage dir is never read or written', { skip }, async () => {
    const { q, storage } = m();
    const w = await q.one('SELECT glb_file_id FROM user_worlds WHERE id = ?', worldId);
    await q.run('UPDATE storage_files SET filepath = ? WHERE id = ?', '/../../outside.json', w.glb_file_id);
    const u = await call('PUT', `/api/world-builder/${worldId}`, owner, { name: 'n', objects: [{ type: 'evil' }] });
    assert.equal(u.statusCode, 200, u.body);
    assert.equal(existsSync(join(storage, '..', '..', 'outside.json')), false);
    assert.deepEqual((await call('GET', `/api/world-builder/${worldId}`, owner)).json().world.objects, []);
  });

  test('generator: unknown agent 404; known agent reaches the model call (dead local model → 503, no world written)', { skip }, async () => {
    const { q } = m();
    const before = (await q.one('SELECT COUNT(*) AS n FROM user_worlds WHERE user_id = ?', owner)).n;
    assert.equal((await call('POST', '/api/world-generator/ai', owner, { prompt: 'a park', agent_id: `missing-${tag}` })).statusCode, 404);
    const r = await call('POST', '/api/world-generator/ai', owner, { prompt: 'a park', agent_id: `wo-agent-${tag}` });
    assert.equal(r.statusCode, 503, r.body);
    assert.equal((await q.one('SELECT COUNT(*) AS n FROM user_worlds WHERE user_id = ?', owner)).n, before);
  });
}
