// B2.2d-11: one extension-marketplace scenario for both drivers (registry
// search with a real total, details, dependencies, install/uninstall,
// reviews, update queue with a concurrent process). The caller sets a temp
// cwd (install creates an extension dir under it), registers the
// marketplace routes behind the auth gate and passes
// { app, q, auth, mk, deps, upd }. Used by test/marketplace.test.mjs (SQLite)
// and test/pg-marketplace.integration.test.mjs (PostgreSQL).
import assert from 'node:assert/strict';

export function marketplaceScenario(test, getM, { tag, skip = false }) {
  const m = () => getM();
  const owner = `mk-owner-${tag}`;
  const other = `mk-other-${tag}`;
  const base = `base-${tag}`;
  const app = `app-${tag}`;
  let updateId;

  test('seed users, registry rows, a dependency', { skip }, async () => {
    const { q, deps } = m();
    for (const [u, role] of [[owner, 'owner'], [other, 'user']]) {
      await q.run(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', ?, 'active')`, u, `${u}@example.test`, u, role);
    }
    await q.run(`INSERT INTO extension_registry (id, name, description, author, version, type, download_url, tags, featured) VALUES (?, ?, 'Base library', 'A', '1.0.0', 'tool', 'https://example.invalid/b', '["core"]', 1)`, base, `Base ${tag}`);
    await q.run(`INSERT INTO extension_registry (id, name, description, author, version, type, download_url, tags) VALUES (?, ?, 'An app', 'A', '2.0.0', 'app', 'https://example.invalid/a', '["ui"]')`, app, `App ${tag}`);
    await q.run(`INSERT INTO extension_versions (id, extension_id, version, download_url, changelog) VALUES (?, ?, '1.0.0', 'https://example.invalid/b', 'first')`, `v-${tag}`, base);
    assert.deepEqual(await deps.addDependency(app, base, '1.0.0'), { success: true });
    assert.equal((await deps.addDependency(app, app)).success, false);
  });

  test('search: case-insensitive, tags, real total (was always 0); details and versions', { skip }, async () => {
    const { mk } = m();
    const r = await mk.searchMarketplace({ query: `BASE ${tag.toUpperCase()}` });
    assert.deepEqual(r.extensions.map((e) => e.id), [base]);
    assert.equal(r.total, 1);
    assert.equal(r.extensions[0].featured, true);
    assert.deepEqual(r.extensions[0].tags, ['core']);
    assert.deepEqual((await mk.searchMarketplace({ tags: ['ui'], query: tag })).extensions.map((e) => e.id), [app]);
    assert.equal((await mk.getExtensionDetails(app)).installed, false);
    assert.equal((await mk.getExtensionVersions(base))[0].changelog, 'first');
  });

  test('install: missing dependency refused; base then app; double install refused; uninstall blocked by dependents', { skip }, async () => {
    const { mk, deps } = m();
    const first = await mk.installExtension(app, owner);
    assert.equal(first.success, false);
    assert.match(first.error, /Missing dependencies/);
    assert.deepEqual(await mk.installExtension(base, owner), { success: true });
    assert.match((await mk.installExtension(base, owner)).error, /already installed/);
    assert.deepEqual(await mk.installExtension(app, owner), { success: true });
    assert.equal((await mk.getExtensionDetails(app, owner)).installed, true);
    assert.equal((await mk.getExtensionDetails(base)).install_count, 1);
    assert.deepEqual(await deps.canUninstall(base, owner), { canUninstall: false, blockedBy: [`App ${tag}`] });
    assert.match((await mk.uninstallExtension(base, owner)).error, /required by/);
  });

  test('reviews: upsert per user, average and count as numbers', { skip }, async () => {
    const { mk } = m();
    assert.equal((await mk.submitReview(base, owner, 9)).success, false);
    await mk.submitReview(base, owner, 5, 'great');
    await mk.submitReview(base, owner, 3, 'ok');
    await mk.submitReview(base, other, 4);
    const d = await mk.getExtensionDetails(base);
    assert.equal(d.rating_count, 2);
    assert.equal(d.rating_avg, 3.5);
    assert.equal(typeof d.rating_avg, 'number');
    assert.equal((await mk.getExtensionReviews(base)).length, 2);
  });

  test('updates: auto-queue once, concurrent process runs exactly once, cancel', { skip }, async () => {
    const { q, mk, upd } = m();
    await q.run(`UPDATE extension_registry SET version = '1.1.0' WHERE id = ?`, base);
    assert.deepEqual((await mk.checkForUpdates(owner)).map((u) => [u.extension_id, u.latest_version]), [[base, '1.1.0']]);
    assert.deepEqual(await upd.autoQueueUpdates(owner), { queued: 1, errors: [] });
    assert.equal((await upd.autoQueueUpdates(owner)).errors.length, 1, 'already queued');
    const pending = await upd.getPendingUpdates(owner);
    assert.equal(pending.length, 1);
    updateId = pending[0].id;
    const results = await Promise.all([upd.processUpdate(updateId), upd.processUpdate(updateId)]);
    assert.equal(results.filter((r) => r.success).length, 1, JSON.stringify(results));
    assert.equal((await q.one('SELECT installed_version FROM extension_installations WHERE extension_id = ? AND user_id = ?', base, owner)).installed_version, '1.1.0');
    assert.equal((await q.one('SELECT status FROM extension_update_queue WHERE id = ?', updateId)).status, 'completed');
    const again = await upd.queueUpdate(app, owner, '2.0.0', '2.1.0');
    assert.equal((await upd.cancelUpdate(again.updateId, other)).success, false, 'only the owner of the queue entry');
    assert.deepEqual(await upd.cancelUpdate(again.updateId, owner), { success: true });
  });

  test('routes: search answers the real total; install/uninstall through the API', { skip }, async () => {
    const { app: fastify, auth, mk } = m();
    const res = await fastify.inject({ method: 'GET', url: `/api/marketplace/search?q=${encodeURIComponent(tag)}`, headers: auth(owner) });
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(JSON.stringify(res.json()).includes(base), true);
    assert.equal(JSON.stringify(res.json()).includes('"total":2'), true, res.body);
    const un = await fastify.inject({ method: 'POST', url: '/api/marketplace/uninstall', headers: auth(owner), payload: { extension_id: app } });
    assert.equal(un.statusCode, 200, un.body);
    assert.equal((await mk.getExtensionDetails(app, owner)).installed, false);
  });
}
