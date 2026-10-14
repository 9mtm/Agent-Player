// INST-04 (code part) + INST-02 CLI side: start/stop/status from any folder,
// pid/lock file, `service print`, `setup`. Fake install in a temp folder;
// child processes, kill/ps and fetch are stubbed: no server starts, no port
// is bound, nothing is installed or loaded.
// Run (from the repo root): node --import tsx --test packages/cli/test/start.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, statSync, existsSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoBackend = join(here, '..', '..', 'backend');
const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'ap-cli-start-')));
process.env.HOME = join(tmp, 'home');
process.env.AGENT_PLAYER_CONFIG_DIR = join(tmp, 'home', '.config', 'agent-player');
delete process.env.AGENT_PLAYER_ROOT;
mkdirSync(process.env.HOME, { recursive: true });

const ir = await import('../src/utils/install-root.ts');
const rt = await import('../src/utils/runtime.ts');
const st = await import('../src/utils/service-templates.ts');
const secretsCli = await import('../src/utils/secrets-file.ts');
const { startCommand } = await import('../src/commands/start.ts');
const { stopCommand } = await import('../src/commands/stop.ts');
const { statusCommand } = await import('../src/commands/status.ts');
const { servicePrintCommand } = await import('../src/commands/service.ts');
const { setupCommand } = await import('../src/commands/setup.ts');

test.after(() => rmSync(tmp, { recursive: true, force: true }));

let n = 0;
function fakeInstall(name = `install-${++n}`) {
  const root = join(tmp, name);
  mkdirSync(join(root, 'packages', 'backend'), { recursive: true });
  mkdirSync(join(root, 'scripts'), { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'agent-player', scripts: { dev: 'node scripts/next-local.mjs dev' } }));
  writeFileSync(join(root, 'packages', 'backend', 'package.json'), JSON.stringify({ name: '@agent-player/backend' }));
  writeFileSync(join(root, 'scripts', 'next-local.mjs'), "env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }\n");
  return root;
}
const markBuilt = (root) => {
  mkdirSync(join(root, 'packages', 'backend', 'dist', 'api'), { recursive: true });
  writeFileSync(join(root, 'packages', 'backend', 'dist', 'api', 'server.js'), '');
  mkdirSync(join(root, '.next'), { recursive: true });
  writeFileSync(join(root, '.next', 'BUILD_ID'), 'x');
};

class FakeChild extends EventEmitter {
  constructor(pid) { super(); this.pid = pid; this.exitCode = null; this.signalCode = null; this.killed = []; }
  kill(sig) { this.killed.push(sig); setImmediate(() => { this.signalCode = sig; this.emit('exit', null, sig); }); return true; }
  unref() {}
}
function fakeSpawner() {
  const calls = [];
  let pid = 5000;
  const spawn = (command, args, options) => { const c = new FakeChild(++pid); calls.push({ command, args, options, child: c }); return c; };
  return { spawn, calls };
}
const ENTRY = '/opt/agent-player/packages/cli/dist/index.js';
function fakeOps({ alive = new Set(), cmd = {} } = {}) {
  const kills = [];
  return {
    kills, alive,
    isAlive: (pid) => alive.has(pid),
    kill: (pid, sig) => { kills.push([pid, sig]); alive.delete(pid); },
    commandLine: (pid) => cmd[pid] ?? '',
  };
}
const quiet = () => { const lines = []; return { lines, log: (m) => lines.push(String(m)) }; };

test('install root: env, CLI package location, recorded path — never the current folder', () => {
  const root = fakeInstall();
  const elsewhere = join(tmp, 'elsewhere');
  mkdirSync(elsewhere, { recursive: true });
  const prev = process.cwd();
  process.chdir(elsewhere);
  try {
    assert.equal(ir.findInstall({ env: { AGENT_PLAYER_ROOT: root }, moduleDir: elsewhere }).root, root);
    assert.equal(ir.findInstall({ env: { AGENT_PLAYER_ROOT: elsewhere }, moduleDir: elsewhere }), null, 'invalid env root');
    const p = ir.findInstall({ env: {}, moduleDir: join(root, 'packages', 'cli', 'dist') });
    assert.equal(p.root, root);
    assert.equal(p.source, 'package');
    assert.equal(p.backendDir, join(root, 'packages', 'backend'));
    assert.equal(p.dataDir, join(root, 'packages', 'backend', '.data'));
    // CLI outside any install (e.g. a global install): the recorded path is used
    const cfg = join(tmp, 'cfg-record');
    assert.equal(ir.findInstall({ env: {}, moduleDir: elsewhere, configDir: cfg }), null);
    const file = ir.recordInstallRoot(root, cfg);
    assert.equal(statSync(file).mode & 0o777, 0o600);
    const r = ir.findInstall({ env: {}, moduleDir: elsewhere, configDir: cfg });
    assert.equal(r.root, root);
    assert.equal(r.source, 'recorded');
  } finally {
    process.chdir(prev);
  }
});

test('start plan: absolute folders, both on 127.0.0.1 (overrides HOST from .env), telemetry off, no watcher', () => {
  const root = fakeInstall();
  const paths = ir.pathsFor(root, 'env');
  for (const mode of ['production', 'dev']) {
    const plan = rt.buildStartPlan(paths, mode, '/usr/bin/node', { HOST: '0.0.0.0', PATH: '/bin' });
    assert.deepEqual(plan.map((c) => c.name), ['backend', 'frontend']);
    const [b, f] = plan;
    assert.equal(b.cwd, join(root, 'packages', 'backend'));
    assert.equal(f.cwd, root);
    for (const c of plan) {
      assert.equal(c.env.HOST, '127.0.0.1');
      assert.equal(c.env.NEXT_TELEMETRY_DISABLED, '1');
      assert.equal(c.command, '/usr/bin/node');
      assert.ok(!c.args.includes('watch'));
      assert.ok(!c.cwd.includes('..'));
    }
    assert.equal(b.env.PORT, '41522');
    assert.deepEqual(f.args.slice(1), [mode === 'production' ? 'start' : 'dev', '--hostname', '127.0.0.1', '--port', '41521']);
  }
  assert.deepEqual(rt.buildStartPlan(paths, 'production', 'node', {})[0].args, [join('dist', 'api', 'server.js')]);
  assert.deepEqual(rt.buildStartPlan(paths, 'dev', 'node', {})[0].args, ['--import', 'tsx', join('src', 'api', 'server.ts')]);
  // not built: production refuses with a clear message, dev is allowed
  assert.match(rt.startProblem(paths, 'production'), /Not built: backend .* and web UI/);
  assert.equal(rt.startProblem(paths, 'dev'), null);
  markBuilt(root);
  assert.equal(rt.startProblem(paths, 'production'), null);
});

test('supervisor: lock file 0600 with both pids; second start refused; stop signal ends both and removes the lock', async () => {
  const root = fakeInstall();
  const paths = ir.pathsFor(root, 'env');
  const { spawn, calls } = fakeSpawner();
  const signals = new EventEmitter();
  const ops = fakeOps({ alive: new Set([process.pid]), cmd: { [process.pid]: `node ${ENTRY} start` } });
  const out = quiet();
  const running = rt.supervise({ paths, mode: 'dev', entry: ENTRY, spawn, ops, signals, log: out.log, stdio: 'ignore' });
  const lockFile = rt.lockFilePath(paths);
  const lock = rt.readLock(lockFile);
  assert.equal(lock.pid, process.pid);
  assert.equal(lock.entry, ENTRY);
  assert.deepEqual(lock.children, { backend: calls[0].child.pid, frontend: calls[1].child.pid });
  assert.equal(statSync(lockFile).mode & 0o777, 0o600);
  assert.equal(statSync(paths.runDir).mode & 0o777, 0o700);
  assert.equal(calls.length, 2);

  // a second start (another process) is refused while this one is alive
  const other = { ...lock, pid: process.pid + 1 };
  assert.throws(() => rt.acquireLock(lockFile, other, ops), rt.AlreadyRunningError);
  const res = await startCommand({ dev: true }, { paths, ops, spawn, log: out.log, entry: ENTRY });
  assert.equal(res, 1);
  assert.match(out.lines.join('\n'), /already running/);
  assert.equal(calls.length, 2, 'no extra children');

  signals.emit('SIGTERM');
  assert.equal(await running, 0);
  assert.deepEqual(calls.map((c) => c.child.killed), [['SIGTERM'], ['SIGTERM']]);
  assert.equal(existsSync(lockFile), false);
  assert.equal(signals.listenerCount('SIGTERM'), 0);
});

test('supervisor: when one part exits, the other is stopped and the exit code is non-zero', async () => {
  const paths = ir.pathsFor(fakeInstall(), 'env');
  const { spawn, calls } = fakeSpawner();
  const running = rt.supervise({ paths, mode: 'dev', entry: ENTRY, spawn, ops: fakeOps(), signals: new EventEmitter(), log: () => {}, stdio: 'ignore' });
  const backend = calls[0].child;
  backend.exitCode = 2;
  backend.emit('exit', 2, null);
  assert.equal(await running, 2);
  assert.deepEqual(calls[1].child.killed, ['SIGTERM']);
  assert.equal(existsSync(rt.lockFilePath(paths)), false);
});

test('a stale lock (dead pid, or a pid now used by another program) does not block start', () => {
  const paths = ir.pathsFor(fakeInstall(), 'env');
  const file = rt.lockFilePath(paths);
  const base = { createdBy: 'agent-player-cli', entry: ENTRY, root: paths.root, mode: 'dev', startedAt: 'x', children: {}, ports: { backend: 41522, frontend: 41521 } };
  rt.acquireLock(file, { ...base, pid: 111 }, fakeOps());
  rt.acquireLock(file, { ...base, pid: 222 }, fakeOps()); // 111 dead
  assert.equal(rt.readLock(file).pid, 222);
  const reused = fakeOps({ alive: new Set([222]), cmd: { 222: '/usr/bin/vim notes.txt' } });
  rt.acquireLock(file, { ...base, pid: 333 }, reused);
  assert.equal(rt.readLock(file).pid, 333);
});

test('stop: uses the pid file only (no pkill); SIGTERM to our supervisor; stale and foreign pids are not killed', async () => {
  const src = readFileSync(join(here, '..', 'src', 'commands', 'stop.ts'), 'utf-8');
  assert.doesNotMatch(src, /pkill|taskkill/);
  const paths = ir.pathsFor(fakeInstall(), 'env');
  const out = quiet();
  assert.equal(await stopCommand({}, { paths, ops: fakeOps(), log: out.log }), 0);
  assert.match(out.lines.at(-1), /not running/);

  const file = rt.lockFilePath(paths);
  const base = { createdBy: 'agent-player-cli', entry: ENTRY, root: paths.root, mode: 'production', startedAt: 'x', ports: { backend: 41522, frontend: 41521 } };
  rt.acquireLock(file, { ...base, pid: 900, children: { backend: 901, frontend: 902 } }, fakeOps());

  const foreign = fakeOps({ alive: new Set([900, 901]), cmd: { 900: 'other program', 901: 'other program too' } });
  assert.equal(await stopCommand({}, { paths, ops: foreign, log: out.log }), 0);
  assert.deepEqual(foreign.kills, [], 'nothing foreign killed');
  assert.match(out.lines.at(-1), /stale/);

  const ours = fakeOps({ alive: new Set([900]), cmd: { 900: `node ${ENTRY} start` } });
  assert.equal(await stopCommand({}, { paths, ops: ours, log: out.log, pollMs: 1, timeoutMs: 100 }), 0);
  assert.deepEqual(ours.kills, [[900, 'SIGTERM']]);
  assert.match(out.lines.at(-1), /stopped/);

  const stuck = fakeOps({ alive: new Set([900]), cmd: { 900: `node ${ENTRY} start` } });
  stuck.kill = (pid, sig) => stuck.kills.push([pid, sig]); // never dies
  assert.equal(await stopCommand({}, { paths, ops: stuck, log: out.log, pollMs: 1, timeoutMs: 20 }), 1);
  assert.match(out.lines.at(-1), /did not stop/);
});

test('status shows supervisor, backend and web UI; only loopback URLs are fetched', async () => {
  const paths = ir.pathsFor(fakeInstall(), 'env');
  const fetched = [];
  const fetchFn = async (url) => { fetched.push(String(url)); if (String(url).includes('41522')) return new Response('ok'); throw new Error('refused'); };
  const out = quiet();
  assert.equal(await statusCommand({ json: true }, { paths, ops: fakeOps(), fetchFn, log: out.log }), 3);
  let s = JSON.parse(out.lines.at(-1));
  assert.equal(s.running, false);

  const file = rt.lockFilePath(paths);
  rt.acquireLock(file, { createdBy: 'agent-player-cli', pid: 700, entry: ENTRY, root: paths.root, mode: 'production', startedAt: 'now', children: { backend: 701, frontend: 702 }, ports: { backend: 41522, frontend: 41521 } }, fakeOps());
  const ops = fakeOps({ alive: new Set([700, 701]), cmd: { 700: `node ${ENTRY} start` } });
  assert.equal(await statusCommand({ json: true }, { paths, ops, fetchFn, log: out.log }), 0);
  s = JSON.parse(out.lines.at(-1));
  assert.equal(s.running, true);
  const by = Object.fromEntries(s.parts.map((p) => [p.name, p]));
  assert.equal(by.backend.alive, true);
  assert.equal(by.backend.responding, true);
  assert.equal(by.frontend.alive, false);
  assert.equal(by.frontend.responding, false);
  assert.ok(fetched.every((u) => u.startsWith('http://127.0.0.1:')), fetched.join(','));
  assert.equal(await statusCommand({}, { paths, ops, fetchFn, log: out.log }), 0);
  assert.match(out.lines.at(-1), /backend .*pid 701 .*alive/);
});

test('start --daemon spawns a detached supervisor with output to a private log file', async () => {
  const root = fakeInstall();
  markBuilt(root);
  const paths = ir.pathsFor(root, 'env');
  const { calls } = fakeSpawner();
  const ops = fakeOps({ alive: new Set([4242]), cmd: { 4242: `node ${ENTRY} start` } });
  const spawn = (command, args, options) => {
    calls.push({ command, args, options });
    // the "supervisor" writes its lock
    rt.acquireLock(rt.lockFilePath(paths), { createdBy: 'agent-player-cli', pid: 4242, entry: ENTRY, root, mode: 'production', startedAt: 'x', children: {}, ports: { backend: 41522, frontend: 41521 } }, fakeOps());
    return new FakeChild(4242);
  };
  const out = quiet();
  assert.equal(await startCommand({ daemon: true }, { paths, ops, spawn, log: out.log, entry: ENTRY, execArgv: [] }), 0);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args, [ENTRY, 'start']);
  assert.equal(calls[0].options.detached, true);
  assert.equal(calls[0].options.cwd, root);
  assert.equal(calls[0].options.env.AGENT_PLAYER_ROOT, root);
  const logFile = join(paths.logsDir, 'agent-player.log');
  assert.equal(statSync(logFile).mode & 0o777, 0o600);
  assert.match(out.lines.join('\n'), /started in the background \(pid 4242\)/);
});

test('service print: launchd plist and systemd unit are printed only (nothing written or loaded)', () => {
  const root = fakeInstall('install & "quoted" 50%');
  const paths = ir.pathsFor(root, 'env');
  const home = join(tmp, 'svc-home');
  mkdirSync(home, { recursive: true });
  let text = '';
  assert.equal(servicePrintCommand({ platform: 'macos' }, { paths, home, nodePath: '/usr/local/bin/node', out: (s) => { text += s; } }), 0);
  assert.ok(text.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n'));
  assert.match(text, /<key>Label<\/key><string>com\.agentplayer\.app<\/string>/);
  assert.match(text, /<key>HOST<\/key><string>127\.0\.0\.1<\/string>/);
  assert.match(text, /<key>NEXT_TELEMETRY_DISABLED<\/key><string>1<\/string>/);
  assert.match(text, /<key>Umask<\/key><integer>63<\/integer>/);
  assert.ok(text.includes('install &amp; &quot;quoted&quot; 50%'), 'paths XML-escaped');
  assert.ok(!text.includes('install & "quoted"'));
  assert.match(text, /<string>start<\/string>/);
  assert.match(text, /Library\/LaunchAgents\/com\.agentplayer\.app\.plist/);
  assert.ok(!/<!--[^]*--[^>][^]*-->/.test(text.split('\n')[1]), 'comment is valid XML');

  let unit = '';
  assert.equal(servicePrintCommand({ platform: 'linux' }, { paths, home, nodePath: '/usr/bin/node', out: (s) => { unit += s; } }), 0);
  assert.match(unit, /^\[Unit\]/m);
  assert.match(unit, /Environment="HOST=127\.0\.0\.1"/);
  assert.match(unit, /UMask=0077/);
  assert.match(unit, /ExecStart="\/usr\/bin\/node" .* "start"/);
  assert.ok(unit.includes('install & \\"quoted\\" 50%%'), 'systemd escaping');
  assert.match(unit, /WantedBy=default\.target/);

  assert.equal(existsSync(join(home, 'Library')), false);
  assert.equal(existsSync(join(home, '.config', 'systemd')), false);
  assert.throws(() => st.launchdPlist({ ...st.serviceSpec(paths), workingDir: '/x\n<evil>' }), /control characters/);
  assert.equal(servicePrintCommand({ platform: 'plan9' }, { paths, out: () => {}, err: () => {} }), 1);
});

test('setup: data folders 0700, secrets generated 0600 (names only printed), .env values win, install recorded', () => {
  const root = fakeInstall();
  const paths = ir.pathsFor(root, 'env');
  const cfg = join(tmp, 'cfg-setup');
  const keepKey = 'a'.repeat(64);
  writeFileSync(join(paths.backendDir, '.env'), `ENCRYPTION_KEY=${keepKey}\n`, { mode: 0o600 });
  const out = quiet();
  assert.equal(setupCommand({ paths, log: out.log, env: {}, configDir: cfg }), 0);
  for (const d of [paths.dataDir, paths.logsDir, paths.runDir]) assert.equal(statSync(d).mode & 0o777, 0o700, d);
  const file = join(paths.dataDir, 'secrets.env');
  assert.equal(statSync(file).mode & 0o777, 0o600);
  const values = secretsCli.parseEnvText(readFileSync(file, 'utf-8'));
  assert.deepEqual([...values.keys()], ['JWT_SECRET', 'MASTER_ENCRYPTION_KEY', 'WORKFLOW_SECRET']);
  const printed = out.lines.join('\n');
  for (const v of values.values()) assert.ok(!printed.includes(v), 'secret value printed');
  assert.match(printed, /Generated JWT_SECRET, MASTER_ENCRYPTION_KEY, WORKFLOW_SECRET/);
  assert.equal(ir.readRecordedRoot(cfg), root);
  // re-run keeps values
  const before = readFileSync(file, 'utf-8');
  assert.equal(setupCommand({ paths, log: () => {}, env: {}, configDir: cfg }), 0);
  assert.equal(readFileSync(file, 'utf-8'), before);
  // placeholder in .env is refused
  writeFileSync(join(paths.backendDir, '.env'), 'JWT_SECRET=your-secret-key-here-CHANGE-THIS-IMMEDIATELY\n');
  const bad = quiet();
  assert.equal(setupCommand({ paths, log: bad.log, env: {}, configDir: cfg }), 1);
  assert.match(bad.lines.join('\n'), /JWT_SECRET \(\.env\) is a known placeholder/);
  assert.ok(!bad.lines.join('\n').includes('CHANGE-THIS'));
});

test('CLI secrets rules match the backend bootstrap', async () => {
  const be = await import(join(repoBackend, 'src', 'config', 'secrets-bootstrap.ts'));
  const strip = (list) => list.map((s) => ({ name: s.name, bytes: s.bytes, pattern: s.pattern?.source }));
  assert.deepEqual(strip(secretsCli.REQUIRED_SECRETS), strip(be.REQUIRED_SECRETS));
  assert.equal(secretsCli.MIN_SECRET_LENGTH, be.MIN_SECRET_LENGTH);
  assert.equal(secretsCli.SECRETS_FILE_NAME, be.SECRETS_FILE_NAME);
  const samples = ['change-me', 'CHANGEME', 'your-secret-here', 'development-secret-change-in-production', 'super-secret-key-change-me',
    'my-placeholder', 'x'.repeat(64), 'a1b2c3', 'secret', 'Password', 'prod-key-here'];
  for (const s of samples) assert.equal(secretsCli.isPlaceholderSecret(s), be.isPlaceholderSecret(s), s);
  const text = 'A=1\nexport B="two"\n# C=3\nbad line\nD=\'four\'\n';
  assert.deepEqual([...secretsCli.parseEnvText(text)], [...be.parseSecretsFile(text)]);
});
