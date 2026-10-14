// B2.2d-6: the leftover SQLite readers of tables that are on the process
// driver, for both drivers: resolveToolUser (users) and the extension
// runner (extension_configs: enable, disable, load only enabled ones).
// The caller sets up a temp cwd, the driver, and passes { q, tools, Runner,
// Fastify, extDir }. Used by test/pg-leftovers.test.mjs (SQLite) and
// test/pg-leftovers.integration.test.mjs (PostgreSQL).
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function leftoversScenario(test, getM, { tag, skip = false }) {
  const m = () => getM();
  const active = `lo-active-${tag}`;
  const inactive = `lo-inactive-${tag}`;
  const extA = `ext-a-${tag}`;
  const extB = `ext-b-${tag}`;

  test('resolveToolUser: active user only, on the process driver', { skip }, async () => {
    const { q, tools } = m();
    await q.run(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', 'user', 'active')`, active, `${active}@example.test`, active);
    await q.run(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', 'user', 'inactive')`, inactive, `${inactive}@example.test`, inactive);
    assert.equal(await tools.resolveToolUser(active), active);
    assert.equal(await tools.resolveToolUser(inactive), null);
    assert.equal(await tools.resolveToolUser(`missing-${tag}`), null);
    assert.equal(await tools.resolveToolUser(''), null);
    assert.equal(await tools.resolveToolUser(undefined), null);
  });

  test('extension runner: enable writes extension_configs; only enabled extensions load', { skip }, async () => {
    const { q, Runner, Fastify, extDir } = m();
    globalThis.__loLoaded = []; globalThis.__loDisabled = [];
    for (const id of [extA, extB]) {
      mkdirSync(join(extDir, id), { recursive: true });
      writeFileSync(join(extDir, id, 'agentplayer.plugin.json'), JSON.stringify({ id, name: id, version: '1.0.0', main: 'index.mjs' }));
      writeFileSync(join(extDir, id, 'index.mjs'),
        `export default { async register() { globalThis.__loLoaded.push(${JSON.stringify(id)}); }, async onDisable() { globalThis.__loDisabled.push(${JSON.stringify(id)}); } };\n`);
    }
    const runner = new Runner(extDir);
    await runner.enableExtension(extA);
    await runner.enableExtension(extA); // upsert, no duplicate
    const row = await q.one('SELECT enabled, updated_at FROM extension_configs WHERE extension_id = ?', extA);
    assert.equal(row.enabled, 1);
    assert.match(row.updated_at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    const app = Fastify();
    await runner.initialize(app, {});
    await app.close();
    assert.deepEqual(globalThis.__loLoaded, [extA]);
    assert.deepEqual([...runner.getLoadedExtensions().keys()], [extA]);
  });

  test('extension runner: disable writes enabled = 0, calls onDisable, and the next start skips it', { skip }, async () => {
    const { q, Runner, Fastify, extDir } = m();
    const runner = new Runner(extDir);
    const app = Fastify();
    await runner.initialize(app, {});
    await runner.disableExtension(extA);
    await app.close();
    assert.equal((await q.one('SELECT enabled FROM extension_configs WHERE extension_id = ?', extA)).enabled, 0);
    assert.deepEqual(globalThis.__loDisabled, [extA]);
    globalThis.__loLoaded = [];
    const again = new Runner(extDir);
    const app2 = Fastify();
    await again.initialize(app2, {});
    await app2.close();
    assert.deepEqual(globalThis.__loLoaded, []);
  });
}
