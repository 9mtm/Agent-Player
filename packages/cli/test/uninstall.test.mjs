// INST-12: `agent-player uninstall`. Everything happens inside a temp folder
// (fake install, fake home, fake CLI config folder); the real install is
// never touched. Process control is stubbed.
// Run (from the repo root): node --import tsx --test packages/cli/test/uninstall.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, realpathSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'ap-cli-uninstall-')));
process.env.HOME = join(tmp, 'default-home');
process.env.AGENT_PLAYER_CONFIG_DIR = join(tmp, 'default-home', 'config');
delete process.env.AGENT_PLAYER_ROOT;

const ir = await import('../src/utils/install-root.ts');
const un = await import('../src/utils/uninstall.ts');
const { uninstallCommand } = await import('../src/commands/uninstall.ts');

test.after(() => rmSync(tmp, { recursive: true, force: true }));

let n = 0;
function fakeInstall() {
  const base = join(tmp, `case-${++n}`);
  const root = join(base, 'agent-player');
  const home = join(base, 'home');
  const configDir = join(home, '.config', 'agent-player');
  const paths = ir.pathsFor(root, 'env');
  const w = (p, text = 'x') => { mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, text); return p; };
  w(join(root, 'package.json'), '{}');
  w(join(root, 'packages', 'backend', 'package.json'), JSON.stringify({ name: '@agent-player/backend' }));
  w(join(root, 'packages', 'backend', 'src', 'index.ts'));
  w(join(root, 'packages', 'backend', 'dist', 'api', 'server.js'));
  w(join(root, 'packages', 'cli', 'dist', 'index.js'));
  w(join(root, '.next', 'BUILD_ID'));
  // data
  w(join(paths.dataDir, 'agent-player.db'), 'SQLite format 3\u0000...');
  w(join(paths.dataDir, 'secrets.env'), 'JWT_SECRET=test-only\n');
  w(join(paths.dataDir, 'memory', 'memory.db'));
  w(join(paths.dataDir, 'backups', 'update-x', 'manifest.json'));
  w(join(root, '.data', 'uploads', 'u1', 'file.png'));
  w(join(home, '.agent-player', 'mcp-servers', 'a', 'x'));
  // run + logs
  w(join(paths.runDir, 'agent-player.json'), '{}');
  w(join(paths.logsDir, 'agent-player.log'));
  // CLI config
  w(join(configDir, 'auth.json'), JSON.stringify({ createdBy: 'agent-player-cli', token: 'test-only' }));
  w(join(configDir, 'install.json'), JSON.stringify({ createdBy: 'agent-player-cli', root }));
  w(join(configDir, 'instance.json'), JSON.stringify({ createdBy: 'agent-player-backend' }));
  w(join(configDir, 'other-tool.json'), '{}');
  // services: this install's launchd plist, another install's systemd unit
  w(join(home, 'Library', 'LaunchAgents', 'com.agentplayer.app.plist'), `<string>${root}</string>`);
  w(join(home, '.config', 'systemd', 'user', 'agent-player.service'), 'Environment="AGENT_PLAYER_ROOT=/elsewhere"');
  return { base, root, home, configDir, paths };
}

const quiet = () => { const lines = []; return { lines, log: (m) => lines.push(String(m)) }; };
const noOps = { isAlive: () => false, kill: () => {}, commandLine: () => '' };
const DATA = (c) => [c.paths.dataDir, join(c.root, '.data'), join(c.home, '.agent-player')];

test('dry run is the default: lists everything, deletes nothing', async () => {
  const c = fakeInstall();
  const q = quiet();
  const code = await uninstallCommand({}, { paths: c.paths, home: c.home, configDir: c.configDir, ops: noOps, log: q.log });
  assert.equal(code, 0);
  const out = q.lines.join('\n');
  assert.match(out, /dry run/);
  for (const p of [
    join(c.home, 'Library', 'LaunchAgents', 'com.agentplayer.app.plist'), c.paths.runDir, c.paths.logsDir,
    join(c.configDir, 'auth.json'), join(c.configDir, 'install.json'), join(c.configDir, 'instance.json'),
    join(c.root, 'packages', 'backend', 'dist'), join(c.root, 'packages', 'cli', 'dist'), join(c.root, '.next'),
  ]) {
    assert.ok(out.includes(p), `listed: ${p}`);
    assert.ok(existsSync(p), `still there: ${p}`);
  }
  assert.match(out, /launchctl bootout/);
  assert.ok(!out.includes('test-only'), 'no secret or token values printed');
  for (const d of DATA(c)) assert.ok(existsSync(d));
  // --dry-run with --apply still does nothing
  await uninstallCommand({ apply: true, dryRun: true }, { paths: c.paths, home: c.home, configDir: c.configDir, ops: noOps, log: () => {} });
  assert.ok(existsSync(join(c.root, '.next')));
});

test('plan: data kept without --delete-data; foreign files kept; nested items deduplicated', () => {
  const c = fakeInstall();
  const plan = un.planUninstall(c.paths, { home: c.home, configDir: c.configDir });
  const removed = plan.remove.map((i) => i.path);
  for (const d of DATA(c)) {
    assert.ok(!removed.includes(d));
    assert.ok(plan.keep.some((i) => i.kind === 'data' && i.path === d));
  }
  assert.ok(plan.keep.some((i) => i.path.endsWith('agent-player.service')), 'another install\'s unit is kept');
  assert.ok(!removed.includes(join(c.configDir, 'other-tool.json')));
  assert.ok(!removed.some((p) => p.includes(join('packages', 'backend', 'src'))));

  const withData = un.planUninstall(c.paths, { home: c.home, configDir: c.configDir, deleteData: true });
  const r2 = withData.remove.map((i) => i.path);
  for (const d of DATA(c)) assert.ok(r2.includes(d));
  assert.ok(!r2.includes(c.paths.runDir), 'run/ is inside the data dir: listed once');
});

test('--apply without --delete-data removes service, run/log, CLI files, build output; keeps data and source', async () => {
  const c = fakeInstall();
  const q = quiet();
  const code = await uninstallCommand({ apply: true }, { paths: c.paths, home: c.home, configDir: c.configDir, ops: noOps, log: q.log });
  assert.equal(code, 0, q.lines.join('\n'));
  for (const p of [
    join(c.home, 'Library', 'LaunchAgents', 'com.agentplayer.app.plist'), c.paths.runDir, c.paths.logsDir,
    join(c.configDir, 'auth.json'), join(c.configDir, 'install.json'), join(c.configDir, 'instance.json'),
    join(c.root, 'packages', 'backend', 'dist'), join(c.root, 'packages', 'cli', 'dist'), join(c.root, '.next'),
  ]) assert.ok(!existsSync(p), `removed: ${p}`);
  for (const p of [
    join(c.paths.dataDir, 'agent-player.db'), join(c.paths.dataDir, 'secrets.env'), join(c.paths.dataDir, 'memory', 'memory.db'),
    join(c.paths.dataDir, 'backups', 'update-x', 'manifest.json'), join(c.root, '.data', 'uploads', 'u1', 'file.png'),
    join(c.home, '.agent-player', 'mcp-servers', 'a', 'x'), join(c.root, 'packages', 'backend', 'src', 'index.ts'),
    join(c.configDir, 'other-tool.json'), join(c.home, '.config', 'systemd', 'user', 'agent-player.service'),
  ]) assert.ok(existsSync(p), `kept: ${p}`);
});

test('--delete-data needs the typed confirmation; a wrong answer removes nothing', async () => {
  const c = fakeInstall();
  const q = quiet();
  const asked = [];
  const code = await uninstallCommand({ apply: true, deleteData: true }, {
    paths: c.paths, home: c.home, configDir: c.configDir, ops: noOps, log: q.log,
    ask: async (question) => { asked.push(question); return 'delete my data'; },
  });
  assert.equal(code, 1);
  assert.equal(asked.length, 1);
  assert.match(asked[0], /DELETE MY DATA/);
  for (const d of DATA(c)) assert.ok(existsSync(d));
  assert.ok(existsSync(join(c.root, '.next')), 'nothing at all removed');
});

test('--delete-data with the exact confirmation removes data too (inside the temp folder only)', async () => {
  const c = fakeInstall();
  const outside = join(c.base, 'outside-keep.txt');
  writeFileSync(outside, 'keep');
  const code = await uninstallCommand({ apply: true, deleteData: true }, {
    paths: c.paths, home: c.home, configDir: c.configDir, ops: noOps, log: () => {}, ask: async () => 'DELETE MY DATA',
  });
  assert.equal(code, 0);
  for (const d of DATA(c)) assert.ok(!existsSync(d), `removed: ${d}`);
  assert.ok(existsSync(join(c.root, 'packages', 'backend', 'src', 'index.ts')), 'source kept');
  assert.ok(existsSync(join(c.root, 'package.json')));
  assert.ok(existsSync(outside));
  assert.ok(existsSync(c.home));
});

test('refuses --apply while running; dry run only warns; --stop stops first', async () => {
  const c = fakeInstall();
  const entry = '/opt/ap/packages/cli/dist/index.js';
  writeFileSync(join(c.paths.runDir, 'agent-player.json'), JSON.stringify({ createdBy: 'agent-player-cli', pid: 777, entry, root: c.root, mode: 'production', startedAt: '', children: {}, ports: { backend: 1, frontend: 2 } }));
  const alive = new Set([777]);
  const kills = [];
  const ops = { isAlive: (p) => alive.has(p), kill: (p, s) => { kills.push([p, s]); alive.delete(p); }, commandLine: () => `node ${entry} start` };
  const q = quiet();
  assert.equal(await uninstallCommand({ apply: true }, { paths: c.paths, home: c.home, configDir: c.configDir, ops, log: q.log }), 1);
  assert.match(q.lines.join('\n'), /running/);
  assert.ok(existsSync(join(c.root, '.next')));
  assert.equal(await uninstallCommand({}, { paths: c.paths, home: c.home, configDir: c.configDir, ops, log: () => {} }), 0);
  assert.deepEqual(kills, []);
  assert.equal(await uninstallCommand({ apply: true, stop: true }, { paths: c.paths, home: c.home, configDir: c.configDir, ops, log: () => {}, stopTimeoutMs: 200 }), 0);
  assert.deepEqual(kills, [[777, 'SIGTERM']]);
  assert.ok(!existsSync(join(c.root, '.next')));
});

test('safety: symlinked build output is removed as a link, its target is kept; paths outside the bases are refused', () => {
  const c = fakeInstall();
  const target = join(c.base, 'elsewhere-dist');
  mkdirSync(target, { recursive: true });
  writeFileSync(join(target, 'keep.js'), 'x');
  rmSync(join(c.root, 'packages', 'cli', 'dist'), { recursive: true });
  symlinkSync(target, join(c.root, 'packages', 'cli', 'dist'));
  const plan = un.planUninstall(c.paths, { home: c.home, configDir: c.configDir });
  const r = un.applyUninstall(plan, { root: c.root, home: c.home, configDir: c.configDir });
  assert.deepEqual(r.failed, []);
  assert.ok(existsSync(join(target, 'keep.js')));

  const forged = { ...plan, remove: [{ kind: 'build', path: join(c.base, 'outside-keep'), type: 'dir' }, { kind: 'build', path: c.root, type: 'dir' }, { kind: 'build', path: '/', type: 'dir' }] };
  mkdirSync(join(c.base, 'outside-keep'), { recursive: true });
  const r2 = un.applyUninstall(forged, { root: c.root, home: c.home, configDir: c.configDir });
  assert.equal(r2.removed, 0);
  assert.equal(r2.failed.length, 3);
  assert.ok(existsSync(join(c.base, 'outside-keep')));
  assert.ok(existsSync(c.root));

  // a symlinked parent that leads outside is refused
  const outsideDir = join(c.base, 'outside-pkg');
  mkdirSync(join(outsideDir, 'dist'), { recursive: true });
  symlinkSync(outsideDir, join(c.root, 'packages', 'evil'));
  const r3 = un.applyUninstall({ ...plan, remove: [{ kind: 'build', path: join(c.root, 'packages', 'evil', 'dist'), type: 'dir' }] }, { root: c.root, home: c.home, configDir: c.configDir });
  assert.equal(r3.removed, 0);
  assert.ok(existsSync(join(outsideDir, 'dist')));
});
