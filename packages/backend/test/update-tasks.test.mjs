// INST-11: backend maintenance tasks used by `agent-player update`.
// Runs src/maintenance/update-tasks.ts as a child process in a temp folder
// with a throwaway database and test-only secrets. The health task uses
// buildServer() + inject(): no port is bound. No network.
// Run: node --import tsx --test test/update-tasks.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const backendDir = process.cwd();
const script = join(backendDir, 'src', 'maintenance', 'update-tasks.ts');
const tsx = pathToFileURL(createRequire(join(backendDir, 'package.json')).resolve('tsx')).href;
const root = mkdtempSync(join(tmpdir(), 'ap-update-tasks-'));
test.after(() => rmSync(root, { recursive: true, force: true }));
const PREFIX = 'AGENT_PLAYER_TASK_RESULT ';

let n = 0;
function run(task, { dbPath } = {}) {
  const dir = join(root, `case-${++n}`);
  mkdirSync(join(dir, '.data'), { recursive: true });
  const env = {
    PATH: process.env.PATH,
    HOME: dir,
    AGENT_PLAYER_CONFIG_DIR: join(dir, 'config'),
    DATABASE_PATH: dbPath ?? join(dir, '.data', 'agent-player.db'),
    JWT_SECRET: randomBytes(64).toString('hex'), // throwaway, test only
    ENCRYPTION_KEY: randomBytes(32).toString('hex'), // throwaway, test only
    NODE_ENV: 'test',
  };
  const r = spawnSync(process.execPath, ['--import', tsx, script, task], { cwd: dir, env, encoding: 'utf-8', timeout: 120_000 });
  const line = r.stdout.split('\n').filter((l) => l.startsWith(PREFIX)).pop();
  return { dir, code: r.status, result: line ? JSON.parse(line.slice(PREFIX.length)) : null, stdout: r.stdout, env };
}

test('migrate: schema + every migration on a fresh throwaway DB, integrity ok; output has counts only', () => {
  const { dir, code, result, stdout, env } = run('migrate');
  assert.equal(code, 0, stdout);
  assert.equal(result.ok, true);
  assert.equal(result.integrity, 'ok');
  assert.ok(result.appliedMigrations > 0);
  assert.ok(existsSync(join(dir, '.data', 'agent-player.db')));
  assert.ok(!stdout.includes(env.JWT_SECRET) && !stdout.includes(env.ENCRYPTION_KEY));
});

test('migrate: a database that cannot be opened fails with exit 1', () => {
  const bad = join(root, 'is-a-dir.db');
  mkdirSync(bad, { recursive: true });
  const { code, result } = run('migrate', { dbPath: bad });
  assert.equal(code, 1);
  assert.equal(result.ok, false);
});

test('health: the real app answers GET /health through inject (no port)', () => {
  const { code, result, stdout } = run('health');
  assert.equal(code, 0, stdout);
  assert.deepEqual({ ok: result.ok, statusCode: result.statusCode, status: result.status }, { ok: true, statusCode: 200, status: 'ok' });
});

test('unknown task: exit 1', () => {
  const { code, result } = run('nope');
  assert.equal(code, 1);
  assert.equal(result.ok, false);
});
