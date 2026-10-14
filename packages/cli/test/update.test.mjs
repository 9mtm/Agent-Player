// INST-11: `agent-player update` for a git checkout install.
// Every test uses a temp install folder with its own temp git repo and
// throwaway SQLite databases. Backend tasks (migrate / health) and process
// control are stubbed; `git fetch` is intercepted and never reaches a network.
// Run (from the repo root): node --import tsx --test packages/cli/test/update.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, statSync, existsSync, realpathSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const repoBackend = join(here, '..', '..', 'backend');
const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'ap-cli-update-')));
process.env.HOME = join(tmp, 'home');
process.env.AGENT_PLAYER_CONFIG_DIR = join(tmp, 'home', '.config', 'agent-player');
process.env.GIT_CONFIG_NOSYSTEM = '1';
process.env.GIT_CONFIG_GLOBAL = join(tmp, 'gitconfig');
writeFileSync(process.env.GIT_CONFIG_GLOBAL, '[user]\n\tname = Test\n\temail = test@example.test\n[commit]\n\tgpgsign = false\n[init]\n\tdefaultBranch = main\n');
delete process.env.AGENT_PLAYER_ROOT;
mkdirSync(process.env.HOME, { recursive: true });

const ir = await import('../src/utils/install-root.ts');
const up = await import('../src/utils/update.ts');
const { updateCommand } = await import('../src/commands/update.ts');
const Database = up.loadSqliteFrom(repoBackend);

test.after(() => rmSync(tmp, { recursive: true, force: true }));

const FAKE_SECRET = 'test-only-not-a-real-secret-0123456789abcdef0123456789';

function sh(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf-8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

let n = 0;
/** Temp install: git repo with commits A (HEAD, branch main) and B (branch next, upstream of main). */
function fakeInstall() {
  const root = join(tmp, `install-${++n}`);
  mkdirSync(join(root, 'packages', 'backend'), { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'agent-player' }));
  writeFileSync(join(root, 'packages', 'backend', 'package.json'), JSON.stringify({ name: '@agent-player/backend' }));
  writeFileSync(join(root, '.gitignore'), 'packages/backend/.data/\n');
  writeFileSync(join(root, 'VERSION'), 'A\n');
  sh(root, 'init', '-q');
  sh(root, 'add', '-A');
  sh(root, 'commit', '-q', '-m', 'A');
  const a = sh(root, 'rev-parse', 'HEAD');
  sh(root, 'checkout', '-q', '-b', 'next');
  writeFileSync(join(root, 'VERSION'), 'B\n');
  sh(root, 'commit', '-q', '-am', 'B');
  const b = sh(root, 'rev-parse', 'HEAD');
  sh(root, 'checkout', '-q', 'main');
  sh(root, 'branch', '-q', '--set-upstream-to=next');

  const paths = ir.pathsFor(root, 'env');
  mkdirSync(join(paths.dataDir, 'memory'), { recursive: true, mode: 0o700 });
  const main = new Database(join(paths.dataDir, 'agent-player.db'));
  main.pragma('journal_mode = WAL');
  main.exec("CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT); INSERT INTO notes (body) VALUES ('one'), ('two');");
  main.close();
  const mem = new Database(join(paths.dataDir, 'memory', 'memory.db'));
  mem.exec("CREATE TABLE m (k TEXT); INSERT INTO m VALUES ('remember');");
  mem.close();
  writeFileSync(join(paths.dataDir, 'secrets.env'), `JWT_SECRET=${FAKE_SECRET}\n`, { mode: 0o600 });
  writeFileSync(join(paths.dataDir, 'instance.json'), JSON.stringify({ version: 1, id: 'x', secret: FAKE_SECRET }), { mode: 0o600 });
  writeFileSync(join(paths.dataDir, 'not-a-db.db'), 'plain text');
  return { root, paths, a, b };
}

/** Real git in the temp repo, except `fetch`, which is recorded and simulated. */
function gitFor(root, { onFetch } = {}) {
  const calls = [];
  const real = up.realGit(root);
  const git = (args) => {
    calls.push(args);
    if (args[0] === 'fetch') { onFetch?.(); return { code: 0, stdout: '', stderr: '' }; }
    return real(args);
  };
  return { git, calls };
}

const rows = (file, sql) => { const db = new Database(file, { readonly: true }); try { return db.prepare(sql).all(); } finally { db.close(); } };
const notes = (paths) => rows(join(paths.dataDir, 'agent-player.db'), 'SELECT body FROM notes ORDER BY id').map((r) => r.body);
const okTasks = () => { const ran = []; return { ran, taskRunner: () => async (t) => { ran.push(t); return { ok: true, result: { ok: true, appliedMigrations: 3 } }; } }; };
const quiet = () => { const lines = []; return { lines, log: (m) => lines.push(String(m)) }; };
const fakeOps = (alive = new Set(), cmd = {}) => ({ alive, kills: [], isAlive: (p) => alive.has(p), kill(p, s) { this.kills.push([p, s]); alive.delete(p); }, commandLine: (p) => cmd[p] ?? '' });
const mode = (p) => statSync(p).mode & 0o777;
const backups = (paths) => { try { return readdirSync(join(paths.dataDir, 'backups')); } catch { return []; } };

test('success: backup (0700/0600, integrity ok, manifest), fast-forward, migrate, health; secrets never printed', async () => {
  const { root, paths, a, b } = fakeInstall();
  const { git, calls } = gitFor(root);
  const { ran, taskRunner } = okTasks();
  const q = quiet();
  const r = await up.runUpdate({}, { paths, git, taskRunner, sqlite: Database, log: q.log, ops: fakeOps() });
  assert.equal(r.state, 'updated', q.lines.join('\n'));
  assert.equal(r.code, 0);
  assert.deepEqual(ran, ['migrate', 'health']);
  assert.equal(sh(root, 'rev-parse', 'HEAD'), b);
  assert.equal(sh(root, 'symbolic-ref', '--short', 'HEAD'), 'main', 'stays on the branch');
  assert.equal(readFileSync(join(root, 'VERSION'), 'utf-8'), 'B\n');
  assert.ok(!calls.some((c) => c[0] === 'fetch'), 'no fetch without --fetch');

  const dir = r.backupDir;
  assert.ok(dir.startsWith(join(paths.dataDir, 'backups', 'update-')));
  assert.equal(mode(join(paths.dataDir, 'backups')), 0o700);
  assert.equal(mode(dir), 0o700);
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf-8'));
  assert.equal(manifest.commit, a);
  assert.equal(manifest.target, b);
  assert.equal(manifest.branch, 'main');
  assert.deepEqual(manifest.databases.map((d) => d.path).sort(), ['agent-player.db', join('memory', 'memory.db')].sort());
  assert.deepEqual(manifest.files.sort(), ['instance.json', 'secrets.env']);
  for (const f of ['manifest.json', join('db', 'agent-player.db'), join('db', 'memory', 'memory.db'), join('files', 'secrets.env'), join('files', 'instance.json')]) {
    assert.equal(mode(join(dir, f)), 0o600, f);
  }
  assert.equal(mode(join(dir, 'db', 'memory')), 0o700);
  assert.deepEqual(rows(join(dir, 'db', 'agent-player.db'), 'SELECT body FROM notes ORDER BY id').map((x) => x.body), ['one', 'two']);
  const check = new Database(join(dir, 'db', 'agent-player.db'), { readonly: true });
  assert.equal(check.pragma('integrity_check', { simple: true }), 'ok');
  check.close();
  assert.equal(readFileSync(join(dir, 'files', 'secrets.env'), 'utf-8'), readFileSync(join(paths.dataDir, 'secrets.env'), 'utf-8'));
  assert.ok(!readFileSync(join(dir, 'manifest.json'), 'utf-8').includes(FAKE_SECRET), 'manifest has no secret values');
  assert.ok(!q.lines.join('\n').includes(FAKE_SECRET), 'output has no secret values');
  assert.ok(existsSync(join(paths.dataDir, 'agent-player.db')));
});

test('migration failure: rollback restores DB bytes, secrets and the recorded commit; backup kept; new files moved aside', async () => {
  const { root, paths, a } = fakeInstall();
  const { git } = gitFor(root);
  const before = notes(paths);
  const secretsBefore = readFileSync(join(paths.dataDir, 'secrets.env'));
  const taskRunner = () => async (t) => {
    assert.equal(t, 'migrate');
    // A half-done migration: rows changed, a table added, a new DB, a secret rewritten.
    const db = new Database(join(paths.dataDir, 'agent-player.db'));
    db.exec("INSERT INTO notes (body) VALUES ('from-new-version'); CREATE TABLE added (x); DELETE FROM notes WHERE body = 'one';");
    db.close();
    const extra = new Database(join(paths.dataDir, 'created-by-new.db'));
    extra.exec('CREATE TABLE t (x)');
    extra.close();
    writeFileSync(join(paths.dataDir, 'secrets.env'), 'JWT_SECRET=changed-by-new-version-0000000000000000000\n');
    return { ok: false, reason: 'migrate failed (exit 1)' };
  };
  const q = quiet();
  const r = await up.runUpdate({}, { paths, git, taskRunner, sqlite: Database, log: q.log, ops: fakeOps() });
  assert.equal(r.state, 'rolled-back', q.lines.join('\n'));
  assert.equal(r.code, 1);
  assert.equal(sh(root, 'rev-parse', 'HEAD'), a);
  assert.equal(sh(root, 'symbolic-ref', '--short', 'HEAD'), 'main');
  assert.equal(readFileSync(join(root, 'VERSION'), 'utf-8'), 'A\n');
  assert.deepEqual(notes(paths), before);
  assert.deepEqual(readFileSync(join(paths.dataDir, 'agent-player.db')), readFileSync(join(r.backupDir, 'db', 'agent-player.db')), 'DB bytes = backup bytes');
  assert.equal(rows(join(paths.dataDir, 'agent-player.db'), "SELECT name FROM sqlite_master WHERE name = 'added'").length, 0);
  assert.deepEqual(readFileSync(join(paths.dataDir, 'secrets.env')), secretsBefore);
  assert.equal(mode(join(paths.dataDir, 'secrets.env')), 0o600);
  assert.ok(!existsSync(join(paths.dataDir, 'created-by-new.db')), 'new DB moved out of the data dir');
  assert.ok(existsSync(join(r.backupDir, 'rollback-leftovers', 'created-by-new.db')), '... into the backup, not deleted');
  assert.ok(existsSync(join(r.backupDir, 'manifest.json')), 'backup kept');
  assert.ok(!q.lines.join('\n').includes(FAKE_SECRET));
});

test('health-check failure after a good migration: rollback', async () => {
  const { root, paths, a } = fakeInstall();
  const { git } = gitFor(root);
  const before = readFileSync(join(paths.dataDir, 'memory', 'memory.db'));
  const ran = [];
  const taskRunner = () => async (t) => {
    ran.push(t);
    if (t === 'migrate') {
      const db = new Database(join(paths.dataDir, 'memory', 'memory.db'));
      db.exec("INSERT INTO m VALUES ('new')");
      db.close();
      return { ok: true, result: { ok: true, appliedMigrations: 4 } };
    }
    return { ok: false, reason: 'health failed (exit 1)' };
  };
  const r = await up.runUpdate({}, { paths, git, taskRunner, sqlite: Database, log: () => {}, ops: fakeOps() });
  assert.deepEqual(ran, ['migrate', 'health']);
  assert.equal(r.state, 'rolled-back');
  assert.equal(sh(root, 'rev-parse', 'HEAD'), a);
  assert.deepEqual(rows(join(paths.dataDir, 'memory', 'memory.db'), 'SELECT k FROM m').map((x) => x.k), ['remember']);
  assert.deepEqual(readFileSync(join(paths.dataDir, 'memory', 'memory.db')), readFileSync(join(r.backupDir, 'db', 'memory', 'memory.db')));
  assert.ok(before.length > 0);
});

test('refuses while running; --stop stops it through the pid file first', async () => {
  const { root, paths, a, b } = fakeInstall();
  const entry = '/opt/agent-player/packages/cli/dist/index.js';
  mkdirSync(paths.runDir, { recursive: true });
  writeFileSync(join(paths.runDir, 'agent-player.json'), JSON.stringify({ createdBy: 'agent-player-cli', pid: 4242, entry, root, mode: 'production', startedAt: '', children: {}, ports: { backend: 1, frontend: 2 } }));
  const { git } = gitFor(root);
  const { ran, taskRunner } = okTasks();
  const ops = fakeOps(new Set([4242]), { 4242: `node ${entry} start` });
  const r = await up.runUpdate({}, { paths, git, taskRunner, sqlite: Database, log: () => {}, ops });
  assert.equal(r.state, 'refused');
  assert.match(r.reason, /running/);
  assert.equal(sh(root, 'rev-parse', 'HEAD'), a);
  assert.deepEqual(ran, []);
  assert.deepEqual(backups(paths), [], 'no backup while refused');

  const r2 = await up.runUpdate({ stop: true }, { paths, git, taskRunner, sqlite: Database, log: () => {}, ops, stopTimeoutMs: 200 });
  assert.equal(r2.state, 'updated');
  assert.deepEqual(ops.kills, [[4242, 'SIGTERM']]);
  assert.equal(sh(root, 'rev-parse', 'HEAD'), b);
});

test('no network without --fetch; --fetch runs (stubbed) git fetch, then uses the fetched ref', async () => {
  const { root, paths, b } = fakeInstall();
  const { git, calls } = gitFor(root, { onFetch: () => sh(root, 'update-ref', 'refs/remotes/origin/main', b) });
  const { taskRunner } = okTasks();
  const q = quiet();
  const r = await up.runUpdate({ to: 'origin/main' }, { paths, git, taskRunner, sqlite: Database, log: q.log, ops: fakeOps() });
  assert.equal(r.state, 'refused');
  assert.match(r.reason, /not present locally.*--fetch/);
  assert.ok(!calls.some((c) => c[0] === 'fetch'));
  assert.deepEqual(backups(paths), []);

  const r2 = await up.runUpdate({ to: 'origin/main', fetch: true }, { paths, git, taskRunner, sqlite: Database, log: q.log, ops: fakeOps() });
  assert.equal(r2.state, 'updated', q.lines.join('\n'));
  assert.equal(calls.filter((c) => c[0] === 'fetch').length, 1);
  assert.equal(sh(root, 'rev-parse', 'HEAD'), b);
});

test('refuses: dirty checkout, diverged target, option-like ref, not a git checkout; up to date', async () => {
  const { root, paths, a, b } = fakeInstall();
  const { git } = gitFor(root);
  const { ran, taskRunner } = okTasks();
  const deps = { paths, git, taskRunner, sqlite: Database, log: () => {}, ops: fakeOps() };

  writeFileSync(join(root, 'VERSION'), 'edited\n');
  let r = await up.runUpdate({}, deps);
  assert.equal(r.state, 'refused');
  assert.match(r.reason, /uncommitted/);
  sh(root, 'checkout', '-q', '--', 'VERSION');

  // main moves to B; a branch from A is then not a fast-forward.
  sh(root, 'checkout', '-q', '-b', 'side', a);
  writeFileSync(join(root, 'VERSION'), 'S\n');
  sh(root, 'commit', '-q', '-am', 'S');
  sh(root, 'checkout', '-q', 'main');
  sh(root, 'merge', '-q', '--ff-only', b);
  r = await up.runUpdate({ to: 'side' }, deps);
  assert.equal(r.state, 'refused');
  assert.match(r.reason, /not a fast-forward/);

  r = await up.runUpdate({ to: '--upload-pack=x' }, deps);
  assert.equal(r.state, 'refused');
  assert.match(r.reason, /Invalid/);

  r = await up.runUpdate({ to: 'next' }, deps);
  assert.equal(r.state, 'up-to-date');
  assert.deepEqual(ran, []);
  assert.deepEqual(backups(paths), []);

  const plain = join(tmp, 'plain');
  mkdirSync(join(plain, 'packages', 'backend'), { recursive: true });
  const r2 = await up.runUpdate({}, { ...deps, paths: ir.pathsFor(plain, 'env'), git: () => ({ code: 128, stdout: '', stderr: 'not a git repository' }) });
  assert.equal(r2.state, 'refused');
  assert.match(r2.reason, /not a git checkout/);
});

test('backend task runner: separate process from source in the backend folder, result parsed, output to a 0600 log only', async () => {
  const { paths } = fakeInstall();
  const logFile = join(tmp, `update-${++n}.log`);
  const calls = [];
  const spawn = (command, args, options) => {
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = () => true;
    calls.push({ command, args, options });
    const task = args[args.length - 1];
    setImmediate(() => {
      child.stdout.emit('data', Buffer.from(`noise\n${up.TASK_RESULT_PREFIX}${JSON.stringify({ ok: task === 'migrate', task, appliedMigrations: 7 })}\n`));
      child.stderr.emit('data', Buffer.from('some log\n'));
      child.emit('close', task === 'migrate' ? 0 : 1);
    });
    return child;
  };
  const run = up.backendTaskRunner(paths, logFile, { spawn, nodePath: '/usr/bin/node' });
  const m = await run('migrate');
  assert.equal(m.ok, true);
  assert.equal(m.result.appliedMigrations, 7);
  const h = await run('health');
  assert.equal(h.ok, false);
  assert.match(h.reason, /health failed/);
  assert.equal(calls[0].command, '/usr/bin/node');
  assert.equal(calls[0].options.cwd, paths.backendDir);
  assert.equal(calls[0].args[0], '--import');
  assert.equal(calls[0].args[2], join(paths.backendDir, 'src', 'maintenance', 'update-tasks.ts'));
  assert.equal(calls[0].options.env.HOST, '127.0.0.1');
  assert.equal(mode(logFile), 0o600);
  assert.match(readFileSync(logFile, 'utf-8'), /some log/);
  assert.equal(up.parseTaskResult('x\ny'), null);
});

test('update command: refused message and exit code', async () => {
  const { root, paths } = fakeInstall();
  writeFileSync(join(root, 'VERSION'), 'dirty\n');
  const q = quiet();
  const code = await updateCommand({}, { paths, git: up.realGit(root), sqlite: Database, log: q.log, ops: fakeOps(), taskRunner: okTasks().taskRunner });
  assert.equal(code, 1);
  assert.match(q.lines.join('\n'), /Update refused: .*uncommitted/);
});
