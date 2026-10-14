// RUN-ISO F1-F4 + BUG-04: pure-function tests.
//  - the launcher's config check (scripts/isolated-server.ts uses
//    checkLauncherEnv) and the clean child environment;
//  - the server-side isolated check (AGENT_PLAYER_ISOLATED=1);
//  - data-root helpers keep the legacy paths when the variable is unset;
//  - the background switch;
//  - F4: the Ollama defaults follow OLLAMA_URL / LOCAL_MODEL_API_URL;
//  - BUG-04: the heartbeat checks the configured host and port.
// No server, no DB, no network. Throwaway temp dirs only.
// Run: node --import tsx --test test/isolated-launcher.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const backendDir = process.cwd();
const repoRoot = join(backendDir, '..', '..');
const fakeHome = realpathSync(mkdtempSync(join(tmpdir(), 'ap-iso-home-')));
const base = realpathSync(mkdtempSync(join(tmpdir(), 'ap-iso-run-')));
const dataDir = join(base, 'data');
process.chdir(base); // nothing here may touch the checkout's .data
test.after(() => { rmSync(fakeHome, { recursive: true, force: true }); rmSync(base, { recursive: true, force: true }); });

// F4: set before the modules that read it at import time.
for (const k of ['AGENT_PLAYER_DATA_DIR', 'AGENT_PLAYER_BACKGROUND']) delete process.env[k];
process.env.OLLAMA_URL = 'http://127.0.0.1:9/';
process.env.LOCAL_MODEL_API_URL = 'http://127.0.0.1:9/v1';
process.env.HOST = '127.0.0.1';
process.env.PORT = '41999';

const iso = await import(join(backendDir, 'src/config/isolation.ts'));
const root = await import(join(backendDir, 'src/config/data-root.ts'));
const { backgroundEnabled } = await import(join(backendDir, 'src/config/background.ts'));
const { defaultOllamaUrl, defaultOllamaApiUrl } = await import(join(backendDir, 'src/config/ollama-url.ts'));

const ctx = { repoRoot, homeDirs: [fakeHome] };
const good = {
  AGENT_PLAYER_DATA_DIR: dataDir, PORT: '42521', ALLOWED_ORIGINS: 'http://127.0.0.1:42522',
};
const refused = (env) => {
  const r = iso.checkLauncherEnv(env, ctx);
  assert.equal(r.ok, false, `expected a refusal for ${JSON.stringify(Object.keys(env))}`);
  return r.errors.join('\n');
};

test('launcher: a minimal valid environment is accepted', () => {
  const r = iso.checkLauncherEnv(good, ctx);
  assert.equal(r.ok, true, r.ok ? '' : r.errors.join('; '));
  assert.deepEqual(r.config, { dataDir, port: 42521, origins: ['http://127.0.0.1:42522'] });
  // HOST may be given only as 127.0.0.1; forced values may be given only as their forced value.
  assert.equal(iso.checkLauncherEnv({ ...good, HOST: '127.0.0.1', AGENT_PLAYER_BACKGROUND: 'off', EXTENSIONS_DISABLED: 'true', MEMORY_EMBEDDINGS: 'hash' }, ctx).ok, true);
  assert.equal(iso.checkLauncherEnv({ ...good, ALLOWED_ORIGINS: 'http://127.0.0.1:42522,http://localhost:42522' }, ctx).ok, true);
});

test('launcher: AGENT_PLAYER_DATA_DIR must be set, absolute, outside the checkout and the home', () => {
  assert.match(refused({ ...good, AGENT_PLAYER_DATA_DIR: undefined }), /AGENT_PLAYER_DATA_DIR is required/);
  assert.match(refused({ ...good, AGENT_PLAYER_DATA_DIR: '  ' }), /AGENT_PLAYER_DATA_DIR is required/);
  assert.match(refused({ ...good, AGENT_PLAYER_DATA_DIR: 'relative/data' }), /absolute/);
  assert.match(refused({ ...good, AGENT_PLAYER_DATA_DIR: './data' }), /absolute/);
  assert.match(refused({ ...good, AGENT_PLAYER_DATA_DIR: '/' }), /filesystem root/);
  for (const inRepo of [repoRoot, join(repoRoot, 'tmp-data'), join(backendDir, '.data'), join(repoRoot, 'packages', '..', 'x')]) {
    assert.match(refused({ ...good, AGENT_PLAYER_DATA_DIR: inRepo }), /outside the source checkout/, inRepo);
  }
  assert.match(refused({ ...good, AGENT_PLAYER_DATA_DIR: join(repoRoot, '..') }), /outside the source checkout/, 'a parent of the checkout');
  assert.match(refused({ ...good, AGENT_PLAYER_DATA_DIR: fakeHome }), /outside the home directory/);
  assert.match(refused({ ...good, AGENT_PLAYER_DATA_DIR: join(fakeHome, 'iso', 'data') }), /outside the home directory/);
  // A non-normalized path into the home is normalized first.
  assert.match(refused({ ...good, AGENT_PLAYER_DATA_DIR: join(fakeHome, '.', 'a', '..', 'b') }), /outside the home directory/);
});

test('launcher: HOST is forced to 127.0.0.1 and anything else is refused', () => {
  for (const host of ['0.0.0.0', 'localhost', '::', '::1', '192.168.1.2', '127.0.0.2']) {
    assert.match(refused({ ...good, HOST: host }), /HOST must be unset or 127\.0\.0\.1/, host);
  }
});

test('launcher: PORT is required and must be 1-65535', () => {
  for (const port of [undefined, '', '0', '65536', 'abc', '-1', '42521.5', '1e3']) {
    assert.match(refused({ ...good, PORT: port }), /PORT/, String(port));
  }
});

test('launcher: database selectors and per-store overrides must be unset', () => {
  for (const name of ['AGENT_PLAYER_DB', 'AGENT_PLAYER_PG_URL', 'DATABASE_URL']) {
    assert.match(refused({ ...good, [name]: 'x' }), new RegExp(`${name} must be unset`), name);
  }
  for (const name of iso.FORBIDDEN_STORE_VARS) {
    assert.match(refused({ ...good, [name]: join(dataDir, 'x') }), new RegExp(`${name} must be unset`), name);
  }
  assert.match(refused({ ...good, STORAGE_PROVIDER: 's3' }), /STORAGE_PROVIDER/);
});

test('launcher: ALLOWED_ORIGINS must be an exact list of loopback origins', () => {
  for (const o of [undefined, '', '*', 'http://*.example.com:1', 'http://127.0.0.1', 'http://127.0.0.1:42522/',
    'https://127.0.0.1:42522', 'http://example.com:42522', 'http://127.0.0.1:42522,', 'http://127.0.0.1:0', 'http://127.0.0.1:70000',
    'http://127.0.0.1:42522/path', 'http://user@127.0.0.1:42522']) {
    assert.match(refused({ ...good, ALLOWED_ORIGINS: o }), /ALLOWED_ORIGINS/, String(o));
  }
});

test('launcher: forced values cannot be overridden; Ollama URLs must be loopback', () => {
  assert.match(refused({ ...good, AGENT_PLAYER_BACKGROUND: 'on' }), /AGENT_PLAYER_BACKGROUND must be unset or off/);
  assert.match(refused({ ...good, EXTENSIONS_DISABLED: 'false' }), /EXTENSIONS_DISABLED/);
  assert.match(refused({ ...good, MEMORY_EMBEDDINGS: 'ollama' }), /MEMORY_EMBEDDINGS/);
  assert.match(refused({ ...good, OLLAMA_URL: 'http://10.0.0.5:11434' }), /OLLAMA_URL must be a loopback/);
  assert.match(refused({ ...good, LOCAL_MODEL_API_URL: 'https://api.example.com/v1' }), /LOCAL_MODEL_API_URL/);
  assert.equal(iso.checkLauncherEnv({ ...good, OLLAMA_URL: 'http://127.0.0.1:11434' }, ctx).ok, true, 'an explicit loopback Ollama is the operator choice');
});

test('launcher: refusal messages never echo values', () => {
  const secret = 'postgres://user:SECRET-PASSWORD@db.example.com/x';
  const text = refused({ ...good, DATABASE_URL: secret, AGENT_PLAYER_PG_URL: secret, HOST: 'SECRET-HOST' });
  assert.equal(text.includes('SECRET'), false);
});

test('launcher: the child environment is built from nothing (no inherited secrets)', () => {
  const r = iso.checkLauncherEnv(good, ctx);
  const parent = { ...good, JWT_SECRET: 'x', ENCRYPTION_KEY: 'x', ANTHROPIC_API_KEY: 'x', OPENAI_API_KEY: 'x', AGENT_EXEC_TOOLS: 'true',
    SMTP_PASS: 'x', NODE_OPTIONS: '--require /tmp/evil.js', PATH: '/opt/homebrew/bin:/usr/bin', TZ: 'Europe/Berlin' };
  const env = iso.buildIsolatedChildEnv(r.config, parent, '/node/bin');
  assert.deepEqual(Object.keys(env).sort(), ['AGENT_PLAYER_BACKGROUND', 'AGENT_PLAYER_DATA_DIR', 'AGENT_PLAYER_ISOLATED', 'ALLOWED_ORIGINS',
    'EXTENSIONS_DISABLED', 'HOME', 'HOST', 'LOCAL_MODEL_API_URL', 'MEMORY_EMBEDDINGS', 'NEXT_PUBLIC_APP_URL', 'NODE_ENV', 'OLLAMA_URL',
    'PATH', 'PORT', 'TMPDIR', 'TZ', 'XDG_CONFIG_HOME']);
  assert.equal(env.HOST, '127.0.0.1');
  assert.equal(env.AGENT_PLAYER_ISOLATED, '1');
  assert.equal(env.AGENT_PLAYER_BACKGROUND, 'off');
  assert.equal(env.EXTENSIONS_DISABLED, 'true');
  assert.equal(env.MEMORY_EMBEDDINGS, 'hash');
  assert.equal(env.NODE_ENV, 'production');
  assert.equal(env.OLLAMA_URL, 'http://127.0.0.1:9');
  assert.equal(env.LOCAL_MODEL_API_URL, 'http://127.0.0.1:9/v1');
  assert.equal(env.PATH, '/node/bin:/usr/bin:/bin');
  for (const k of ['HOME', 'XDG_CONFIG_HOME', 'TMPDIR']) assert.ok(iso.isInsideOrEqual(env[k], dataDir), k);
  // The server-side check accepts exactly what the launcher builds (cwd = <data>/run).
  assert.deepEqual(iso.checkIsolatedServerEnv(env, ctx, join(dataDir, 'run')), []);
});

test('server (AGENT_PLAYER_ISOLATED=1): the same rules, plus cwd/HOME/TMPDIR inside the data root', () => {
  const env = iso.buildIsolatedChildEnv(iso.checkLauncherEnv(good, ctx).config, {}, '/node/bin');
  const errs = (patch, cwd = join(dataDir, 'run')) => iso.checkIsolatedServerEnv({ ...env, ...patch }, ctx, cwd).join('\n');
  assert.match(errs({}, repoRoot), /working directory/);
  assert.match(errs({ HOME: fakeHome }), /HOME must be inside/);
  assert.match(errs({ TMPDIR: '/tmp' }), /TMPDIR must be inside/);
  assert.match(errs({ HOST: '0.0.0.0' }), /HOST must be 127\.0\.0\.1/);
  assert.match(errs({ HOST: undefined }), /HOST must be 127\.0\.0\.1/);
  assert.match(errs({ AGENT_PLAYER_BACKGROUND: undefined }), /AGENT_PLAYER_BACKGROUND must be off/);
  assert.match(errs({ EXTENSIONS_DISABLED: undefined }), /EXTENSIONS_DISABLED must be true/);
  assert.match(errs({ AGENT_PLAYER_PG_URL: 'x' }), /AGENT_PLAYER_PG_URL must be unset/);
  assert.match(errs({ DATABASE_PATH: '/tmp/x.db' }), /DATABASE_PATH must be unset/);
  assert.match(errs({ AGENT_PLAYER_DATA_DIR: join(repoRoot, 'x') }), /outside the source checkout/);
  assert.match(errs({ ALLOWED_ORIGINS: undefined }), /ALLOWED_ORIGINS/);
  assert.match(errs({ PORT: undefined }), /PORT is required/);
});

test('data root unset: every helper returns the legacy location unchanged', () => {
  delete process.env.AGENT_PLAYER_DATA_DIR;
  assert.equal(root.dataRootOverride(), null);
  assert.equal(root.dataRoot(), join(process.cwd(), '.data'));
  assert.equal(root.dataPath('audio', 'x.mp3'), join(process.cwd(), '.data', 'audio', 'x.mp3'));
  assert.equal(root.dataPathOr('./.data/gateway', 'gateway'), './.data/gateway');
  assert.equal(root.dataPathOr('../../.data/memory', 'memory'), '../../.data/memory');
  const saved = process.env.DATABASE_PATH;
  delete process.env.DATABASE_PATH;
  assert.equal(root.mainDatabasePath(), join(process.cwd(), '.data', 'agent-player.db'));
  process.env.DATABASE_PATH = '/x/y.db';
  assert.equal(root.mainDatabasePath(), '/x/y.db', 'DATABASE_PATH still wins');
  if (saved === undefined) delete process.env.DATABASE_PATH; else process.env.DATABASE_PATH = saved;
});

test('data root set: helpers resolve under it (relative values are made absolute)', () => {
  const saved = process.env.DATABASE_PATH;
  delete process.env.DATABASE_PATH;
  try {
    process.env.AGENT_PLAYER_DATA_DIR = dataDir;
    assert.equal(root.dataRoot(), dataDir);
    assert.equal(root.dataPath('audit', 'audit.db'), join(dataDir, 'audit', 'audit.db'));
    assert.equal(root.dataPathOr('../../.data/memory', 'memory'), join(dataDir, 'memory'));
    assert.equal(root.mainDatabasePath(), join(dataDir, 'agent-player.db'));
    process.env.AGENT_PLAYER_DATA_DIR = 'rel-data';
    assert.equal(root.dataRoot(), join(process.cwd(), 'rel-data'));
  } finally {
    delete process.env.AGENT_PLAYER_DATA_DIR;
    if (saved !== undefined) process.env.DATABASE_PATH = saved;
  }
});

test('background switch: only "off" (any case, trimmed) disables it', () => {
  assert.equal(backgroundEnabled({}), true);
  assert.equal(backgroundEnabled({ AGENT_PLAYER_BACKGROUND: 'on' }), true);
  assert.equal(backgroundEnabled({ AGENT_PLAYER_BACKGROUND: '' }), true);
  assert.equal(backgroundEnabled({ AGENT_PLAYER_BACKGROUND: 'off' }), false);
  assert.equal(backgroundEnabled({ AGENT_PLAYER_BACKGROUND: ' OFF ' }), false);
});

test('F4: the Ollama defaults follow OLLAMA_URL / LOCAL_MODEL_API_URL', async () => {
  assert.equal(defaultOllamaUrl({}), 'http://127.0.0.1:11434');
  assert.equal(defaultOllamaApiUrl({}), 'http://127.0.0.1:11434/v1');
  assert.equal(defaultOllamaUrl({ OLLAMA_URL: 'http://127.0.0.1:9/' }), 'http://127.0.0.1:9');
  assert.equal(defaultOllamaUrl({ LOCAL_MODEL_API_URL: 'http://127.0.0.1:9/v1/' }), 'http://127.0.0.1:9');
  assert.equal(defaultOllamaApiUrl({ OLLAMA_URL: 'http://127.0.0.1:9' }), 'http://127.0.0.1:9/v1');
  // The runtime defaults (read at import, after the env above was set).
  const { DEFAULT_SETTINGS } = await import(join(backendDir, 'src/settings/types.ts'));
  const { OLLAMA_URL } = await import(join(backendDir, 'src/llm/ollama.ts'));
  const { config } = await import(join(backendDir, 'src/config/index.ts'));
  assert.equal(DEFAULT_SETTINGS.local.url, 'http://127.0.0.1:9');
  assert.equal(OLLAMA_URL, 'http://127.0.0.1:9');
  assert.equal(config.ai.ollama.url, 'http://127.0.0.1:9');
  assert.equal(config.ai.ollama.apiUrl, 'http://127.0.0.1:9/v1');
});

test('BUG-04: the heartbeat checks the configured host and port', async () => {
  const { selfHealthUrl, initializeHeartbeat, shutdownHeartbeat } = await import(join(backendDir, 'src/heartbeat/index.ts'));
  assert.equal(selfHealthUrl('127.0.0.1', 42521), 'http://127.0.0.1:42521/health');
  assert.equal(selfHealthUrl('0.0.0.0', 1), 'http://127.0.0.1:1/health');
  assert.equal(selfHealthUrl('::', 1), 'http://127.0.0.1:1/health');
  assert.equal(selfHealthUrl('::1', 1), 'http://[::1]:1/health');
  assert.equal(selfHealthUrl('agent.lan', 2), 'http://agent.lan:2/health');
  process.env.AGENT_PLAYER_BACKGROUND = 'off'; // no check timers in this test
  try {
    const monitor = await initializeHeartbeat();
    assert.equal(monitor.getComponent('api-server').registration.healthCheck.endpoint, 'http://127.0.0.1:41999/health');
    shutdownHeartbeat();
  } finally {
    delete process.env.AGENT_PLAYER_BACKGROUND;
  }
});
