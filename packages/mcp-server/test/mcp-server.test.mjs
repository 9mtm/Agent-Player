// MCP-01: the Agent Player MCP server over stdio.
// Each test starts the real server in a child process and speaks MCP
// JSON-RPC (initialize, tools/list, tools/call) on its stdin/stdout. The
// backend is an in-process fake fetch preloaded into the child
// (test/fixtures/fake-backend.mjs): no port, no network. A temp HOME/config
// dir holds a fake CLI token file (0600).
// Run (from the repo root): node --import tsx --test packages/mcp-server/test/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const entry = join(pkgDir, 'src', 'index.ts');
const fake = pathToFileURL(join(pkgDir, 'test', 'fixtures', 'fake-backend.mjs')).href;
const RUN = '11111111-2222-3333-4444-555555555555';
const TOKEN = 'tok-' + randomBytes(24).toString('hex'); // fake, test only

const root = mkdtempSync(join(tmpdir(), 'ap-mcp-'));
test.after(() => rmSync(root, { recursive: true, force: true }));
let n = 0;

function setup({ token = TOKEN, mode = 0o600, backendUrl } = {}) {
  const dir = join(root, `case-${++n}`);
  const config = join(dir, 'config', 'agent-player');
  mkdirSync(config, { recursive: true, mode: 0o700 });
  if (token) {
    const file = join(config, 'auth.json');
    writeFileSync(file, JSON.stringify({ createdBy: 'agent-player-cli', token, backendUrl: backendUrl ?? 'http://127.0.0.1:41522', savedAt: new Date().toISOString() }), { mode });
    chmodSync(file, mode);
  }
  return { dir, config, log: join(dir, 'fetch.log') };
}

function startServer(ctx, env = {}) {
  const childEnv = { ...process.env };
  for (const k of ['AGENT_PLAYER_URL', 'BACKEND_URL', 'XDG_CONFIG_HOME']) delete childEnv[k];
  Object.assign(childEnv, {
    HOME: ctx.dir,
    AGENT_PLAYER_CONFIG_DIR: ctx.config,
    FAKE_LOG: ctx.log,
    FAKE_EXPECTED_TOKEN: TOKEN,
    ...env,
  });
  const child = spawn(process.execPath, ['--import', 'tsx', '--import', fake, entry], { cwd: pkgDir, env: childEnv, stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  const pending = new Map();
  const lines = [];
  child.stdout.on('data', (d) => {
    stdout += d;
    let i;
    while ((i = stdout.indexOf('\n')) >= 0) {
      const line = stdout.slice(0, i);
      stdout = stdout.slice(i + 1);
      if (!line.trim()) continue;
      lines.push(line);
      const msg = JSON.parse(line); // stdout must carry only JSON-RPC
      if (msg.id !== undefined && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    }
  });
  child.stderr.on('data', (d) => { stderr += d; });
  let id = 0;
  const send = (msg) => child.stdin.write(`${JSON.stringify(msg)}\n`);
  const request = (method, params) => new Promise((resolve, reject) => {
    const myId = ++id;
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${method}; stderr: ${stderr}`)), 15_000);
    pending.set(myId, (m) => { clearTimeout(t); resolve(m); });
    send({ jsonrpc: '2.0', id: myId, method, params });
  });
  const initialize = async () => {
    const res = await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test-client', version: '0' } });
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    return res;
  };
  const callTool = async (name, args) => (await request('tools/call', { name, arguments: args })).result;
  const stop = async () => {
    child.stdin.end();
    await new Promise((r) => { if (child.exitCode !== null) r(); else { child.on('exit', r); setTimeout(() => child.kill(), 2000); } });
  };
  const output = () => ({ stdout: lines.join('\n') + stdout, stderr });
  return { request, initialize, callTool, stop, output, send };
}

const fetchLog = (ctx) => (existsSync(ctx.log) ? readFileSync(ctx.log, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const noToken = (srv) => {
  const { stdout, stderr } = srv.output();
  assert.ok(!stdout.includes(TOKEN), 'token on stdout');
  assert.ok(!stderr.includes(TOKEN), 'token on stderr');
};

test('initialize and tools/list over stdio', async () => {
  const ctx = setup();
  const srv = startServer(ctx);
  try {
    const init = await srv.initialize();
    assert.equal(init.result.serverInfo.name, 'agent-player');
    assert.ok(init.result.capabilities.tools, 'tools capability');
    assert.match(init.result.instructions, /spawn_small_agent/);
    const list = await srv.request('tools/list', {});
    const tools = list.result.tools;
    assert.deepEqual(tools.map((t) => t.name), ['spawn_small_agent', 'get_result', 'list_runs']);
    const spawnTool = tools[0];
    assert.deepEqual(spawnTool.inputSchema.required, ['task']);
    assert.deepEqual(Object.keys(spawnTool.inputSchema.properties).sort(), ['drawers', 'kind', 'max_steps', 'task', 'tools']);
    assert.deepEqual(tools[1].inputSchema.required, ['run_id']);
    const unknown = await srv.request('no/such/method', {});
    assert.ok(unknown.error, 'unknown method is a JSON-RPC error');
    assert.equal(fetchLog(ctx).length, 0, 'listing tools does not call the backend');
  } finally {
    await srv.stop();
  }
});

test('spawn_small_agent creates a run through the local backend with the saved token', async () => {
  const ctx = setup();
  const srv = startServer(ctx);
  try {
    await srv.initialize();
    const res = await srv.callTool('spawn_small_agent', {
      task: 'Find the release date in the project notes.', kind: 'lookup', tools: ['memory_search', 'exec'], drawers: ['project:alpha'], max_steps: 5,
    });
    assert.ok(!res.isError, JSON.stringify(res));
    assert.equal(res.structuredContent.run_id, RUN);
    assert.deepEqual(res.structuredContent.granted_tools, ['memory_search']);
    assert.ok(res.structuredContent.warnings.some((w) => w.includes('exec')));
    assert.match(res.content[0].text, /get_result/);
    assert.deepEqual(JSON.parse(res.content[1].text), res.structuredContent);

    const calls = fetchLog(ctx);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'http://127.0.0.1:41522/api/small-agent/runs');
    assert.equal(calls[0].method, 'POST');
    assert.equal(calls[0].authOk, true, 'bearer token from the CLI token store');
    assert.equal(calls[0].redirect, 'error', 'redirects are refused');
    assert.deepEqual(calls[0].body, { task: 'Find the release date in the project notes.', kind: 'lookup', tools: ['memory_search', 'exec'], drawers: ['project:alpha'], max_steps: 5 });
    noToken(srv);
  } finally {
    await srv.stop();
  }
});

test('get_result returns the result card (Markdown + JSON) and can wait for the run', async () => {
  const ctx = setup();
  const srv = startServer(ctx);
  try {
    await srv.initialize();
    const first = await srv.callTool('get_result', { run_id: RUN });
    assert.equal(first.structuredContent.status, 'running');
    assert.equal(first.structuredContent.needs_review, true);
    const done = await srv.callTool('get_result', { run_id: RUN, wait_seconds: 5 });
    const card = done.structuredContent;
    assert.equal(card.status, 'completed');
    for (const k of ['status', 'summary', 'outputs', 'steps_used', 'duration_ms', 'model', 'needs_review', 'warnings']) assert.ok(k in card, k);
    const md = done.content[0].text;
    assert.match(md, /Small agent: completed/);
    assert.match(md, /\*\*Summary:\*\* Release is on Friday\./);
    assert.match(md, /model: qwen3\.8:27b/);
    assert.match(md, /steps: 3\/15/);
    assert.match(md, /needs_review: false/);
    assert.match(md, /Found in the project notes/);
    assert.ok(fetchLog(ctx).every((c) => c.url.startsWith('http://127.0.0.1:41522/') && c.authOk));
    noToken(srv);
  } finally {
    await srv.stop();
  }
});

test('list_runs shows runs, capacity and queue length', async () => {
  const ctx = setup();
  const srv = startServer(ctx);
  try {
    await srv.initialize();
    const res = await srv.callTool('list_runs', { status: 'running', limit: 5 });
    assert.ok(!res.isError);
    assert.equal(res.structuredContent.runs.length, 1);
    assert.deepEqual(res.structuredContent.capacity, { active: 2, running: 1, queued: 1, waiting: 0, limit: 2, available: 0, queue_length: 1 });
    assert.match(res.content[0].text, /capacity: 2\/2 active/);
    assert.equal(fetchLog(ctx)[0].url, 'http://127.0.0.1:41522/api/small-agent/runs?status=running&limit=5');
  } finally {
    await srv.stop();
  }
});

test('a busy small agent refuses the spawn (capacity) and says so', async () => {
  const ctx = setup();
  const srv = startServer(ctx, { FAKE_SCENARIO: 'busy' });
  try {
    await srv.initialize();
    const res = await srv.callTool('spawn_small_agent', { task: 'x' });
    assert.equal(res.isError, true);
    assert.match(res.content[0].text, /busy.*2\/2 active.*Do the task yourself/s);
    assert.equal(res.structuredContent.refused, 'capacity');
  } finally {
    await srv.stop();
  }
});

test('invalid arguments are refused before any backend call', async () => {
  const ctx = setup();
  const srv = startServer(ctx);
  try {
    await srv.initialize();
    for (const [name, args] of [
      ['spawn_small_agent', {}], ['spawn_small_agent', { task: '' }], ['spawn_small_agent', { task: 'x', kind: 'payment' }],
      ['spawn_small_agent', { task: 'x', tools: 'read' }], ['spawn_small_agent', { task: 'x', max_steps: 1.5 }], ['spawn_small_agent', { task: 'x', extra: 1 }],
      ['get_result', { run_id: '../../etc' }], ['get_result', { run_id: RUN, wait_seconds: 999 }], ['list_runs', { status: 'nope' }], ['nope_tool', {}],
    ]) {
      const res = await srv.callTool(name, args);
      assert.equal(res.isError, true, `${name} ${JSON.stringify(args)}`);
    }
    assert.equal(fetchLog(ctx).length, 0);
  } finally {
    await srv.stop();
  }
});

test('no saved session: a clear error, no request', async () => {
  const ctx = setup({ token: null });
  const srv = startServer(ctx);
  try {
    await srv.initialize();
    const res = await srv.callTool('list_runs', {});
    assert.equal(res.isError, true);
    assert.match(res.content[0].text, /agent-player login/);
    assert.equal(fetchLog(ctx).length, 0);
  } finally {
    await srv.stop();
  }
});

test('the token never goes to another host', async () => {
  for (const env of [{ AGENT_PLAYER_URL: 'https://example.com' }, { BACKEND_URL: 'http://10.0.0.5:41522' }, { AGENT_PLAYER_URL: 'http://user:pw@127.0.0.1:41522' }]) {
    const ctx = setup();
    const srv = startServer(ctx, env);
    try {
      await srv.initialize();
      const res = await srv.callTool('spawn_small_agent', { task: 'x' });
      assert.equal(res.isError, true, JSON.stringify(env));
      assert.match(res.content[0].text, /this machine|credentials/);
      assert.equal(fetchLog(ctx).length, 0);
    } finally {
      await srv.stop();
    }
  }
  // A saved non-local backend URL is refused too.
  const ctx = setup({ backendUrl: 'http://evil.example:41522' });
  const srv = startServer(ctx);
  try {
    await srv.initialize();
    assert.equal((await srv.callTool('list_runs', {})).isError, true);
    assert.equal(fetchLog(ctx).length, 0);
  } finally {
    await srv.stop();
  }
});

test('a token file readable by others is not used; a non-owner session is explained', { skip: process.platform === 'win32' }, async () => {
  const ctx = setup({ mode: 0o644 });
  const srv = startServer(ctx);
  try {
    await srv.initialize();
    const res = await srv.callTool('list_runs', {});
    assert.equal(res.isError, true);
    assert.match(res.content[0].text, /readable by other users/);
    assert.equal(fetchLog(ctx).length, 0);
    noToken(srv);
  } finally {
    await srv.stop();
  }
  const ctx2 = setup();
  const srv2 = startServer(ctx2, { FAKE_SCENARIO: 'notowner' });
  try {
    await srv2.initialize();
    const res = await srv2.callTool('spawn_small_agent', { task: 'x' });
    assert.equal(res.isError, true);
    assert.match(res.content[0].text, /owner/);
  } finally {
    await srv2.stop();
  }
});
