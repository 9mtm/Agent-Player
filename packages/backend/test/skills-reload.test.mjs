// F-07: POST /api/skills/reload exists, is owner/admin only, and rescans the
// skill directories (the registry's reload() used `require`, which does not
// exist in an ES module).
// Run: node --import tsx --test test/skills-reload.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-skills-reload-'));
const backendDir = process.cwd();
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only

const skillsDir = join(dir, 'skills');
mkdirSync(skillsDir, { recursive: true }); // starts empty

const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { getSkillsRegistry } = await import(join(backendDir, 'src/skills/registry.ts'));
const { skillsRoutes } = await import(join(backendDir, 'src/api/routes/skills.ts'));
const { default: Fastify } = await import('fastify');

const db = getDatabase();
await db.initialize();
const addUser = (id, role, status = 'active') => db.prepare(
  `INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', ?, ?)`
).run(id, `${id}@example.test`, id, role, status);
addUser('u-owner', 'owner');
addUser('u-admin', 'admin');
addUser('u-user', 'user');
addUser('u-suspended', 'admin', 'suspended');
const token = id => `Bearer ${generateToken(id, 1)}`;

const registry = getSkillsRegistry();
await registry.load([skillsDir]);

const app = Fastify();
await app.register(skillsRoutes);
await app.ready();

test.after(async () => {
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const reload = (authorization) => app.inject({
  method: 'POST', url: '/api/skills/reload', headers: authorization ? { authorization } : {},
});

test('anonymous and forged callers get 401; member and suspended admin get 403', async () => {
  assert.equal((await reload(null)).statusCode, 401);
  assert.equal((await reload('Bearer not-a-jwt')).statusCode, 401);
  assert.equal((await reload(token('u-user'))).statusCode, 403);
  assert.equal((await reload(token('u-suspended'))).statusCode, 403);
});

test('owner/admin reload picks up skills added on disk, including into a directory that was empty', async () => {
  assert.equal(registry.getAll().length, 0);
  mkdirSync(join(skillsDir, 'hello-world'));
  copyFileSync(join(backendDir, 'skills', 'hello-world', 'SKILL.md'), join(skillsDir, 'hello-world', 'SKILL.md'));

  const res = await reload(token('u-owner'));
  assert.equal(res.statusCode, 200, res.body);
  assert.deepEqual(res.json(), { success: true, count: 1 });

  const again = await reload(token('u-admin'));
  assert.equal(again.statusCode, 200, again.body);
  assert.equal(again.json().count, 1);
});
