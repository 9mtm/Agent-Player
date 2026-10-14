// B2.2c part 2 (SQLite): the world bot routes (deprecated world-bots module
// and the live multiverse module) create, update and list bots. The update
// writes updated_at as TEXT (the former datetime("now") quoted "now" as an
// identifier); the bot view no longer reads agents_config.avatar_url, a
// column that does not exist (agent_avatar_url is NULL).
// Run: node --import tsx --test test/world-bots-routes.test.mjs
// Throwaway DB + cwd, random test-only secret, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-world-bots-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
delete process.env.AGENT_PLAYER_DB;

const quiet = { log: console.log, info: console.info };
console.log = () => {}; console.info = () => {};
const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
const db = getDatabase();
await db.initialize();
for (const id of ['wb-owner', 'wb-other']) {
  db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', 'user', 'active')`).run(id, `${id}@example.test`, id);
}
db.prepare(`INSERT INTO agents_config (id, name) VALUES ('wb-agent', 'Bot Agent')`).run();
db.prepare(`INSERT INTO user_worlds (id, user_id, name, glb_file_id) VALUES ('wb-world', 'wb-owner', 'World', 'g')`).run();

const { default: Fastify } = await import('fastify');
const { registerAuthGate } = await import('../src/auth/auth-gate.ts');
const { generateToken } = await import('../src/auth/jwt.ts');
const { worldBotsRoutes } = await import('../src/api/routes/world-bots.ts');
const { multiverseRoutes } = await import('../src/api/routes/multiverse.ts');
const apps = [];
for (const plugin of [worldBotsRoutes, multiverseRoutes]) {
  const app = Fastify();
  registerAuthGate(app);
  await app.register(plugin);
  await app.ready();
  apps.push(app);
}
Object.assign(console, quiet);

test.after(async () => {
  for (const app of apps) await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const auth = (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` });
const TEXT_TS = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

for (const [i, name] of [[0, 'world-bots'], [1, 'multiverse']]) {
  test(`${name}: create, update (TEXT updated_at), list; another user is refused`, async () => {
    const app = apps[i];
    const base = '/api/multiverse/wb-world/bots';
    const created = await app.inject({ method: 'POST', url: base, headers: auth('wb-owner'), payload: { agent_id: 'wb-agent' } });
    assert.equal(created.statusCode, 200, created.body);
    const bot = created.json().bot;
    assert.equal(bot.agent_name, 'Bot Agent');
    assert.equal(bot.agent_avatar_url, null);
    assert.match(bot.created_at, TEXT_TS);
    const upd = await app.inject({ method: 'PUT', url: `${base}/${bot.id}`, headers: auth('wb-owner'), payload: { rotation_y: 45 } });
    assert.equal(upd.statusCode, 200, upd.body);
    assert.equal(upd.json().bot.rotation_y, 45);
    assert.match(upd.json().bot.updated_at, TEXT_TS);
    const list = await app.inject({ method: 'GET', url: base, headers: auth('wb-owner') });
    assert.ok(list.json().bots.some((b) => b.id === bot.id));
    const other = await app.inject({ method: 'POST', url: base, headers: auth('wb-other'), payload: { agent_id: 'wb-agent' } });
    assert.ok([403, 404].includes(other.statusCode), other.body);
  });
}
