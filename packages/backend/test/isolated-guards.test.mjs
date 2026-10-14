// RUN-ISO ISO-1 / ISO-3: fresh exclusive data root, no symlink escapes,
// minimal outer launcher environment.
//  - the REAL launcher (child process, clean env) refuses a symlinked root,
//    an existing root, an unsafe parent and a polluted outer environment,
//    and writes nothing anywhere when it refuses;
//  - the server-side tree check (config/isolated-tree.ts, run by load-env
//    before any secret or DB open) refuses interior symlinks, symlinked
//    store files and group-writable entries; a load-env child with an
//    interior symlink exits before writing anything (the link target stays
//    empty, no secrets.env appears);
//  - the launcher's log file is created O_EXCL|O_NOFOLLOW (a pre-planted
//    link or file is refused, its target untouched).
// Synthetic temp dirs only. No server is started (every launcher run here
// is refused before it spawns one). No network.
// Run: node --import tsx --test test/isolated-guards.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync, closeSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync,
  symlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const backendDir = process.cwd();
const launcher = join(backendDir, 'scripts', 'isolated-server.ts');
const base = realpathSync(mkdtempSync(join(tmpdir(), 'ap-iso-guard-')));
test.after(() => {
  // Undo any mode a test changed so cleanup cannot fail.
  const walk = (d) => { try { chmodSync(d, 0o700); for (const e of readdirSync(d, { withFileTypes: true })) if (e.isDirectory()) walk(join(d, e.name)); } catch { /* gone */ } };
  walk(base);
  rmSync(base, { recursive: true, force: true });
});

const tree = await import(join(backendDir, 'src/config/isolated-tree.ts'));
const envCheck = await import(join(backendDir, 'src/config/isolated-env-check.ts'));
const tsconfigPath = join(backendDir, 'tsconfig.json');
const tsxLoader = import.meta.resolve('tsx');

let n = 0;
/** A fresh private parent folder (0700) for one case. */
function freshParent() {
  const p = join(base, `case-${++n}`);
  mkdirSync(p, { mode: 0o700 });
  return p;
}

/** Outer env exactly like the documented `env -i ...` command. */
function outerEnv(parent, root, extra = {}) {
  return {
    PATH: `${dirname(process.execPath)}:/usr/bin:/bin`,
    HOME: parent,
    AGENT_PLAYER_DATA_DIR: root,
    PORT: '42599',
    ALLOWED_ORIGINS: 'http://127.0.0.1:42522',
    ...extra,
  };
}

function runLauncher(env, nodeArgs = ['--import', 'tsx']) {
  const r = spawnSync(process.execPath, [...nodeArgs, launcher], { cwd: backendDir, env, encoding: 'utf8', timeout: 60_000 });
  return { status: r.status, out: `${r.stdout}\n${r.stderr}`, signal: r.signal };
}

function listAll(dir) {
  const out = [];
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); out.push(p); if (e.isDirectory() && !e.isSymbolicLink()) walk(p); } };
  walk(dir);
  return out.sort();
}

// ── ISO-1: launcher, fresh exclusive root ──────────────────────────────────

test('ISO-1 launcher: a symlinked root is refused and its target stays empty', () => {
  const parent = freshParent();
  const target = join(parent, 'elsewhere');
  mkdirSync(target, { mode: 0o700 });
  const root = join(parent, 'data');
  symlinkSync(target, root);
  const r = runLauncher(outerEnv(parent, root));
  assert.equal(r.status, 2, r.out);
  assert.match(r.out, /AGENT_PLAYER_DATA_DIR must not exist yet/);
  assert.deepEqual(readdirSync(target), []);
  assert.ok(lstatSync(root).isSymbolicLink(), 'the link is left alone');
});

test('ISO-1 launcher: an existing (non-empty or empty) root is refused and left untouched', () => {
  const parent = freshParent();
  const root = join(parent, 'data');
  mkdirSync(root, { mode: 0o700 });
  writeFileSync(join(root, 'secrets.env'), 'PLANTED=1\n', { mode: 0o600 });
  const before = listAll(root);
  const r = runLauncher(outerEnv(parent, root));
  assert.equal(r.status, 2, r.out);
  assert.match(r.out, /AGENT_PLAYER_DATA_DIR must not exist yet/);
  assert.deepEqual(listAll(root), before);
  assert.equal(readFileSync(join(root, 'secrets.env'), 'utf8'), 'PLANTED=1\n');

  const emptyParent = freshParent();
  const emptyRoot = join(emptyParent, 'data');
  mkdirSync(emptyRoot, { mode: 0o700 });
  const r2 = runLauncher(outerEnv(emptyParent, emptyRoot));
  assert.equal(r2.status, 2, r2.out);
  assert.match(r2.out, /must not exist yet/);
  assert.deepEqual(readdirSync(emptyRoot), []);
});

test('ISO-1 launcher: a group-writable parent is refused; nothing is created', () => {
  const parent = freshParent();
  chmodSync(parent, 0o770);
  const root = join(parent, 'data');
  const r = runLauncher(outerEnv(parent, root));
  chmodSync(parent, 0o700);
  assert.equal(r.status, 2, r.out);
  assert.match(r.out, /parent of AGENT_PLAYER_DATA_DIR must not be group- or world-writable/);
  assert.equal(existsSync(root), false);
  assert.deepEqual(readdirSync(parent), []);
});

test('ISO-1 launcher: a symlinked parent and a missing parent are refused', () => {
  const holder = freshParent();
  const realParent = join(holder, 'real');
  mkdirSync(realParent, { mode: 0o700 });
  const linkParent = join(holder, 'link');
  symlinkSync(realParent, linkParent);
  const r = runLauncher(outerEnv(linkParent, join(linkParent, 'data')));
  assert.equal(r.status, 2, r.out);
  assert.match(r.out, /parent of AGENT_PLAYER_DATA_DIR must not be a symlink/);
  assert.deepEqual(readdirSync(realParent), []);

  const missing = join(holder, 'missing');
  const r2 = runLauncher(outerEnv(missing, join(missing, 'data')));
  assert.equal(r2.status, 2, r2.out);
  assert.match(r2.out, /parent of AGENT_PLAYER_DATA_DIR must exist/);
  assert.equal(existsSync(missing), false);
});

test('ISO-1 trusted parent: the pure check (canonical, owner, mode, sticky)', () => {
  const p = freshParent();
  assert.deepEqual(tree.checkTrustedParent(p), []);
  chmodSync(p, 0o707);
  assert.match(tree.checkTrustedParent(p).join('\n'), /group- or world-writable/);
  chmodSync(p, 0o1777); // sticky + world-writable is accepted for the parent itself
  assert.deepEqual(tree.checkTrustedParent(p), []);
  chmodSync(p, 0o700);
  const file = join(p, 'f');
  writeFileSync(file, '');
  assert.match(tree.checkTrustedParent(file).join('\n'), /must be a directory/);
});

// ── ISO-1: launcher log file ───────────────────────────────────────────────

test('ISO-1 log file: a pre-planted symlinked log file (or an existing one) is refused, target untouched', () => {
  const dir = freshParent();
  const target = join(dir, 'outside.txt');
  writeFileSync(target, 'keep\n');
  const log = join(dir, 'backend.log');
  symlinkSync(target, log);
  assert.throws(() => tree.openFreshLogFile(log), (e) => e.code === 'EEXIST' || e.code === 'ELOOP');
  assert.equal(readFileSync(target, 'utf8'), 'keep\n');

  const dangling = join(dir, 'dangling.log');
  symlinkSync(join(dir, 'not-there.txt'), dangling);
  assert.throws(() => tree.openFreshLogFile(dangling), (e) => e.code === 'EEXIST' || e.code === 'ELOOP');
  assert.equal(existsSync(join(dir, 'not-there.txt')), false, 'a dangling link is not followed to create its target');

  const existing = join(dir, 'existing.log');
  writeFileSync(existing, 'old\n');
  assert.throws(() => tree.openFreshLogFile(existing), (e) => e.code === 'EEXIST');

  const fresh = join(dir, 'fresh.log');
  closeSync(tree.openFreshLogFile(fresh));
  assert.equal(lstatSync(fresh).mode & 0o777, 0o600);
});

// ── ISO-1: server-side tree check ──────────────────────────────────────────

/** A root shaped like the launcher's (0700, every launcher dir). */
function launcherShapedRoot() {
  const parent = freshParent();
  const root = join(parent, 'data');
  mkdirSync(root, { mode: 0o700 });
  for (const d of tree.ISOLATED_DIRS) mkdirSync(join(root, ...d.split('/')), { mode: 0o700 });
  return { parent, root };
}

test('ISO-1 tree: a launcher-shaped fresh root passes', () => {
  const { root } = launcherShapedRoot();
  assert.deepEqual(tree.checkIsolatedTree(root), []);
  tree.assertSafeIsolatedTree(root);
});

test('ISO-1 tree: symlinks anywhere, wrong types and group-writable entries are refused', () => {
  const cases = [
    ['interior dir link', (root, out) => { rmSync(join(root, 'audit'), { recursive: true }); symlinkSync(out, join(root, 'audit')); }, /<data root>\/audit is a symlink/],
    ['secrets.env link', (root, out) => { writeFileSync(join(out, 's'), 'X=1'); symlinkSync(join(out, 's'), join(root, 'secrets.env')); }, /<data root>\/secrets.env is a symlink/],
    ['db link', (root, out) => symlinkSync(join(out, 'db'), join(root, 'agent-player.db')), /<data root>\/agent-player.db is a symlink/],
    ['log link', (root, out) => symlinkSync(join(out, 'l'), join(root, 'logs', 'backend.log')), /<data root>\/logs\/backend.log is a symlink/],
    ['deep link', (root, out) => { mkdirSync(join(root, 'run', 'a'), { mode: 0o700 }); symlinkSync(out, join(root, 'run', 'a', 'b')); }, /<data root>\/run\/a\/b is a symlink/],
    ['dir where a file belongs', (root) => mkdirSync(join(root, 'secrets.env'), { mode: 0o700 }), /<data root>\/secrets.env must be a regular file/],
    ['file where a dir belongs', (root) => { rmSync(join(root, 'memory'), { recursive: true }); writeFileSync(join(root, 'memory'), ''); }, /<data root>\/memory must be a directory/],
    ['group-writable store dir', (root) => chmodSync(join(root, 'encryption'), 0o770), /<data root>\/encryption is group- or world-writable/],
    ['world-writable file', (root) => { writeFileSync(join(root, 'tmp', 'x'), ''); chmodSync(join(root, 'tmp', 'x'), 0o666); }, /<data root>\/tmp\/x is group- or world-writable/],
    ['root not private', (root) => chmodSync(root, 0o755), /data root must be private/],
  ];
  for (const [name, plant, expected] of cases) {
    const { parent, root } = launcherShapedRoot();
    const out = join(parent, 'elsewhere');
    mkdirSync(out, { mode: 0o700 });
    plant(root, out);
    const problems = tree.checkIsolatedTree(root).join('\n');
    assert.match(problems, expected, name);
    assert.throws(() => tree.assertSafeIsolatedTree(root), (e) => e instanceof tree.IsolatedTreeError, name);
  }
  // A symlinked root and a root under a symlinked parent.
  const { parent, root } = launcherShapedRoot();
  const link = join(parent, 'link');
  symlinkSync(root, link);
  assert.match(tree.checkIsolatedTree(link).join('\n'), /data root is a symlink/);
  const pLink = join(base, `plink-${++n}`);
  symlinkSync(parent, pLink);
  assert.match(tree.checkIsolatedTree(join(pLink, 'data')).join('\n'), /canonical path/);
});

test('ISO-1 server: load-env refuses an interior symlink before any file is written', () => {
  const { parent, root } = launcherShapedRoot();
  const elsewhere = join(parent, 'elsewhere');
  mkdirSync(elsewhere, { mode: 0o700 });
  rmSync(join(root, 'audit'), { recursive: true });
  symlinkSync(elsewhere, join(root, 'audit'));
  const before = listAll(root);
  const env = {
    PATH: `${dirname(process.execPath)}:/usr/bin:/bin`,
    HOME: join(root, 'home'), XDG_CONFIG_HOME: join(root, 'home', '.config'), TMPDIR: join(root, 'tmp'),
    NODE_ENV: 'production', HOST: '127.0.0.1', PORT: '42599', ALLOWED_ORIGINS: 'http://127.0.0.1:42522',
    NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:42522', AGENT_PLAYER_DATA_DIR: root, AGENT_PLAYER_ISOLATED: '1',
    AGENT_PLAYER_BACKGROUND: 'off', EXTENSIONS_DISABLED: 'true', MEMORY_EMBEDDINGS: 'hash',
    AGENT_PLAYER_READONLY: '1', AGENT_PLAYER_ISOLATED_STAGE: '1',
    OLLAMA_URL: 'http://127.0.0.1:9', LOCAL_MODEL_API_URL: 'http://127.0.0.1:9/v1',
    TSX_TSCONFIG_PATH: tsconfigPath,
  };
  const r = spawnSync(process.execPath, ['--import', tsxLoader, join(backendDir, 'src', 'config', 'load-env.ts')],
    { cwd: join(root, 'run'), env, encoding: 'utf8', timeout: 60_000 });
  assert.equal(r.status, 1, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stderr, /FATAL \(isolated mode\): <data root>\/audit is a symlink/);
  assert.deepEqual(readdirSync(elsewhere), [], 'the link target stays empty');
  assert.equal(existsSync(join(root, 'secrets.env')), false, 'no secret was generated');
  // tsx may cache compiled files under TMPDIR (<root>/tmp); nothing else changed.
  assert.deepEqual(listAll(root).filter((p) => !p.startsWith(join(root, 'tmp') + '/')), before.filter((p) => !p.startsWith(join(root, 'tmp') + '/')));

  // Control: the same env on a clean launcher-shaped root passes the check and bootstraps secrets inside it.
  const clean = launcherShapedRoot();
  const r2 = spawnSync(process.execPath, ['--import', tsxLoader, join(backendDir, 'src', 'config', 'load-env.ts')],
    { cwd: join(clean.root, 'run'), env: { ...env, AGENT_PLAYER_DATA_DIR: clean.root, HOME: join(clean.root, 'home'), XDG_CONFIG_HOME: join(clean.root, 'home', '.config'), TMPDIR: join(clean.root, 'tmp') }, encoding: 'utf8', timeout: 60_000 });
  assert.equal(r2.status, 0, `${r2.stdout}\n${r2.stderr}`);
  assert.equal(existsSync(join(clean.root, 'secrets.env')), true);
  assert.equal(lstatSync(join(clean.root, 'secrets.env')).mode & 0o777, 0o600);
  assert.deepEqual(readdirSync(clean.parent), ['data']);
});

// ── ISO-3: minimal outer environment ───────────────────────────────────────

test('ISO-3 env check: injection, linker, npm and loader variables are refused by name', () => {
  const root = '/private/tmp/x/data';
  const ok = { PATH: '/n:/usr/bin:/bin', HOME: '/private/tmp/x', AGENT_PLAYER_DATA_DIR: root, PORT: '1', ALLOWED_ORIGINS: 'http://127.0.0.1:2' };
  const check = (env, argv = ['--import', 'tsx']) => envCheck.checkOuterLauncherEnv(env, argv, { tsconfigPath }).join('\n');
  assert.equal(check(ok), '');
  assert.equal(check(ok, ['--import=tsx']), '');
  assert.equal(check({ ...ok, TSX_TSCONFIG_PATH: tsconfigPath }), '', 'the launcher-set tsconfig is allowed');
  assert.equal(check({ ...ok, NODE_ENV: 'production', LANG: 'C', TZ: 'UTC' }), '');
  for (const name of ['NODE_OPTIONS', 'NODE_PATH', 'NODE_EXTRA_CA_CERTS', 'NODE_TLS_REJECT_UNAUTHORIZED', 'UV_THREADPOOL_SIZE',
    'ELECTRON_RUN_AS_NODE', 'NODE_V8_COVERAGE', 'NODE_REPL_EXTERNAL_MODULE', 'npm_config_registry', 'NPM_CONFIG_PREFIX',
    'TSX_TSCONFIG_PATH', 'TSX_DISABLE_CACHE', 'LD_PRELOAD', 'LD_LIBRARY_PATH', 'DYLD_INSERT_LIBRARIES', 'DYLD_LIBRARY_PATH']) {
    const text = check({ ...ok, [name]: name === 'TSX_TSCONFIG_PATH' ? '/evil/tsconfig.json' : 'SECRET-VALUE' });
    assert.match(text, new RegExp(`${name} must not be set`), name);
    assert.equal(text.includes('SECRET-VALUE') || text.includes('/evil/'), false, 'no value echoed');
  }
  assert.match(check({ ...ok, NODE_OPTIONS: '' }), /NODE_OPTIONS must not be set/, 'present but empty is refused too');
  assert.match(check({ ...ok, HOME: '/Users/someone' }), /HOME must be the parent of AGENT_PLAYER_DATA_DIR/);
  assert.match(check({ ...ok, HOME: undefined }), /HOME must be set/);
  for (const argv of [[], ['--require', 'x'], ['--import', 'tsx', '--inspect'], ['--import', 'evil'], ['--loader', 'tsx'], ['--import', 'tsx', '--import', 'tsx']]) {
    assert.match(check(ok, argv), /no other Node flags/, JSON.stringify(argv));
  }
});

test('ISO-3 launcher: a polluted outer environment or extra Node flag is refused before anything is created', () => {
  const parent = freshParent();
  const root = join(parent, 'data');
  for (const extra of [{ NODE_OPTIONS: '--no-warnings' }, { npm_config_registry: 'http://127.0.0.1:1' }, { TSX_DISABLE_CACHE: '1' },
    { UV_THREADPOOL_SIZE: '4' }, { HOME: '/' }]) {
    const r = runLauncher(outerEnv(parent, root, extra));
    assert.equal(r.status, 2, `${JSON.stringify(Object.keys(extra))}: ${r.out}`);
    assert.match(r.out, /refused: /);
  }
  const r = runLauncher(outerEnv(parent, root), ['--no-warnings', '--import', 'tsx']);
  assert.equal(r.status, 2, r.out);
  assert.match(r.out, /no other Node flags/);
  // ISO-2 at the launcher: an inherited provider endpoint is refused too.
  const r2 = runLauncher(outerEnv(parent, root, { OLLAMA_URL: 'http://127.0.0.1:11434' }));
  assert.equal(r2.status, 2, r2.out);
  assert.match(r2.out, /OLLAMA_URL must be unset/);
  assert.deepEqual(readdirSync(parent), [], 'no data root was created by any refused run');
});
