// B2.2d-17: `agent-player update` maintenance tasks on PostgreSQL. migrate
// runs the PostgreSQL migrations (it used to run the SQLite ones), health
// builds the real app; neither opens or creates a SQLite file.
// Runs src/maintenance/update-tasks.ts as a child process in a temp folder.
// Runs ONLY when AGENT_PLAYER_PG_TEST_URL names a THROWAWAY database on
// 127.0.0.1 that the PostgreSQL runner has already migrated. Otherwise every
// test skips. scripts/pg/integration.sh runs it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';

const URL_ = process.env.AGENT_PLAYER_PG_TEST_URL;
const skip = URL_ ? false : 'AGENT_PLAYER_PG_TEST_URL is not set (PostgreSQL integration test)';

const backendDir = process.cwd();
const script = join(backendDir, 'src', 'maintenance', 'update-tasks.ts');
const tsx = pathToFileURL(createRequire(join(backendDir, 'package.json')).resolve('tsx')).href;
const root = mkdtempSync(join(tmpdir(), 'ap-pg-update-tasks-'));
test.after(() => rmSync(root, { recursive: true, force: true }));
const PREFIX = 'AGENT_PLAYER_TASK_RESULT ';

let n = 0;
function run(task) {
  const dir = join(root, `case-${++n}`);
  const data = join(dir, 'data');
  mkdirSync(data, { recursive: true });
  const env = {
    PATH: process.env.PATH,
    // pg connects as the OS user (as scripts/pg/integration.sh does).
    USER: process.env.USER, LOGNAME: process.env.LOGNAME,
    HOME: dir,
    AGENT_PLAYER_CONFIG_DIR: join(dir, 'config'),
    AGENT_PLAYER_DATA_DIR: data,
    DATABASE_PATH: join(data, 'agent-player.db'),
    AGENT_PLAYER_DB: 'postgres',
    AGENT_PLAYER_PG_URL: URL_,
    AGENT_PLAYER_BACKGROUND: 'off',
    EXTENSIONS_DISABLED: 'true',
    OLLAMA_URL: 'http://127.0.0.1:9',
    JWT_SECRET: randomBytes(64).toString('hex'), // throwaway, test only
    ENCRYPTION_KEY: randomBytes(32).toString('hex'), // throwaway, test only
    NODE_ENV: 'test',
  };
  const r = spawnSync(process.execPath, ['--import', tsx, script, task], { cwd: dir, env, encoding: 'utf-8', timeout: 120_000 });
  const line = r.stdout.split('\n').filter((l) => l.startsWith(PREFIX)).pop();
  const dbFiles = readdirSync(dir, { recursive: true }).map(String).filter((f) => /\.(db|sqlite3?)$/.test(f));
  return { code: r.status, result: line ? JSON.parse(line.slice(PREFIX.length)) : null, out: r.stdout + r.stderr, env, dbFiles };
}

test('migrate on PostgreSQL runs the PostgreSQL migrations (all already applied) and creates no SQLite file', { skip }, () => {
  const { code, result, out, env, dbFiles } = run('migrate');
  assert.equal(code, 0, out);
  assert.equal(result.ok, true);
  assert.equal(result.driver, 'postgres');
  assert.equal(result.appliedMigrations, 0);
  assert.ok(result.alreadyApplied > 0);
  assert.equal(result.schema, 'present');
  assert.deepEqual(dbFiles, []);
  assert.ok(!out.includes(env.JWT_SECRET) && !out.includes(env.ENCRYPTION_KEY));
  assert.ok(!existsSync(env.DATABASE_PATH));
});

test('health on PostgreSQL: the real app answers and no SQLite file is created', { skip }, () => {
  const { code, result, out, dbFiles } = run('health');
  assert.equal(code, 0, out);
  assert.equal(result.ok, true);
  assert.deepEqual(dbFiles, []);
});
