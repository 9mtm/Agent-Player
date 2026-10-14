// FU-01: the Gemini CLI and Claude CLI bridge error paths log safe fields only
// (error name, exit code / status, duration). stderr, the prompt and the error
// message never reach the server log. Client replies are unchanged.
// The "CLIs" are throwaway shell scripts in a temp dir (no real binary, no
// network). Throwaway DB/keys.
// Run: node --import tsx --test test/cli-error-logging.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-cli-log-'));
mkdirSync(join(dir, '.data', 'multi-agent'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.AGENT_PLAYER_CONFIG_DIR = join(dir, 'cli-config');
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
process.env.NODE_ENV = 'test';
process.env.AGENT_EXEC_TOOLS = 'true';
for (const k of ['ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'OLLAMA_THINK', 'DEFAULT_MODEL']) delete process.env[k];

const STDERR_SECRET = 'STDERR-SECRET-sk-ant-api03-abcdefghijklmnopqrstuvwxyz /Users/someone/private';
const PROMPT_SECRET = 'PROMPT-SECRET-the-user-wrote-this';

// Fake CLIs: write a secret and every argument (the prompt) to stderr, exit 3.
// Found first by the bridges (cwd-relative name), and first on PATH.
const binDir = join(dir, 'bin');
mkdirSync(binDir);
for (const name of ['gemini', 'claude']) {
  const script = `#!/bin/sh\necho "${STDERR_SECRET}" >&2\necho "$@" >&2\nexit 3\n`;
  for (const p of [join(dir, name), join(binDir, name)]) { writeFileSync(p, script); chmodSync(p, 0o755); }
}
process.env.PATH = `${binDir}:${process.env.PATH}`;

const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => { throw new Error(`unexpected network call in test: ${url}`); };

const quiet = { log: console.log, warn: console.warn, info: console.info, error: console.error };
const logged = [];
const capture = (...a) => { logged.push(a.map((x) => (typeof x === 'string' ? x : (x instanceof Error ? `${x.message} ${x.stack}` : JSON.stringify(x) ?? String(x)))).join(' ')); };
console.log = capture; console.info = capture; console.warn = capture; console.error = capture;

const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const { getCredentialStorage } = await import(join(backendDir, 'src/credentials/storage.ts'));
await getCredentialStorage().initialize();
const { getOrchestrator } = await import(join(backendDir, 'src/multi-agent/index.ts'));
await getOrchestrator().initialize(join(dir, '.data', 'multi-agent', 'orchestrator.db'));
db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status, email_verified) VALUES ('c-owner', 'c-owner@example.test', 'c-owner', 'x', 'owner', 'active', 1)`).run();
db.prepare(`INSERT INTO agents_config (id, name, provider, model) VALUES ('c-gemini', 'Gemini Agent', 'gemini-cli', 'gemini-test')`).run();
db.prepare(`INSERT INTO agents_config (id, name, provider, model) VALUES ('c-claude', 'Claude Agent', 'claude-cli', 'claude-test')`).run();

const { geminiCliTool } = await import(join(backendDir, 'src/tools/cli/gemini-cli.ts'));
const { claudeCliTool } = await import(join(backendDir, 'src/tools/cli/claude-cli.ts'));
const { safeErrorFields } = await import(join(backendDir, 'src/services/safe-error-log.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { buildServer } = await import(join(backendDir, 'src/api/app.ts'));
const app = await buildServer({ logger: false });
await app.ready();
const bearer = (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` });

Object.assign(console, quiet);
const muted = async (fn) => {
  const s = { log: console.log, warn: console.warn, error: console.error, info: console.info };
  console.log = capture; console.warn = capture; console.error = capture; console.info = capture;
  try { return await fn(); } finally { Object.assign(console, s); }
};
const chat = (agentId) => muted(() => app.inject({ method: 'POST', url: '/api/chat',
  headers: bearer('c-owner'),
  payload: { agentId, sessionId: `cli-${agentId}`, stream: true, messages: [{ role: 'user', content: PROMPT_SECRET }] } }));
const dataFrames = (body) => body.split('\n\n').map((b) => b.trim()).filter((b) => b.startsWith('data: ')).map((b) => JSON.parse(b.slice(6)));
const assertNoLeak = (lines) => {
  const all = lines.join('\n');
  assert.ok(!all.includes('STDERR-SECRET'), 'no stderr text in the log');
  assert.ok(!all.includes('sk-ant-api03'), 'no token in the log');
  assert.ok(!all.includes('/Users/someone'), 'no path from stderr in the log');
  assert.ok(!all.includes(PROMPT_SECRET), 'no prompt text in the log');
};

test.after(async () => {
  globalThis.fetch = realFetch;
  try { await app.close(); } catch { /* ignore */ }
  closeDatabase();
  process.chdir(backendDir);
  rmSync(dir, { recursive: true, force: true });
});

test('safeErrorFields keeps name, code, status, signal and duration only', () => {
  const err = Object.assign(new Error(`boom ${STDERR_SECRET}`), {
    code: 3, stderr: STDERR_SECRET, stdout: PROMPT_SECRET, cmd: `gemini -p ${PROMPT_SECRET}`, signal: 'SIGTERM', killed: true,
  });
  const f = safeErrorFields(err, Date.now() - 5);
  assert.deepEqual(Object.keys(f).sort(), ['code', 'durationMs', 'killed', 'name', 'signal']);
  assert.equal(f.name, 'Error');
  assert.equal(f.code, 3);
  assert.ok(f.durationMs >= 0);
  assert.deepEqual(safeErrorFields(Object.assign(new Error('x'), { code: 'ENOENT', status: 401 })), { name: 'Error', code: 'ENOENT', status: 401 });
  // Free text in name/code/signal is dropped.
  assert.deepEqual(safeErrorFields({ name: STDERR_SECRET, code: STDERR_SECRET, signal: STDERR_SECRET }), { name: 'Error' });
  assert.deepEqual(safeErrorFields('a string with a secret'), { name: 'Error' });
  assertNoLeak([JSON.stringify(f)]);
});

for (const [agentId, tag, label] of [['c-gemini', '[GeminiCLI] ❌ Error', 'Gemini'], ['c-claude', '[ClaudeCLI] ❌ Error', 'Claude']]) {
  test(`${label} CLI exits non-zero: the log has the exit code and duration, no stderr or prompt`, async () => {
    logged.length = 0;
    const res = await chat(agentId);
    assert.equal(res.statusCode, 200);
    const frames = dataFrames(res.body);
    assert.equal(frames.at(-1).done, true);
    const errLine = logged.find((l) => l.startsWith(tag));
    assert.ok(errLine, `the bridge logged its error line (${tag})`);
    const fields = JSON.parse(errLine.slice(tag.length + 1));
    assert.equal(fields.code, 3, 'exit code logged');
    assert.equal(typeof fields.durationMs, 'number', 'duration logged');
    assertNoLeak(logged);
  });
}

for (const [agentId, tool, tag, reply] of [
  ['c-gemini', geminiCliTool, '[Chat] Gemini CLI error', '❌ Gemini CLI request failed'],
  ['c-claude', claudeCliTool, '[Chat] Claude CLI error', '❌ Claude CLI request failed'],
]) {
  test(`${tag}: a thrown bridge error logs safe fields; the client reply is unchanged`, async () => {
    const original = tool.execute;
    tool.execute = async (params) => {
      throw Object.assign(new Error(`spawn failed ${STDERR_SECRET} ${params.prompt}`), { name: 'BridgeError', code: 'EACCES', stderr: STDERR_SECRET });
    };
    logged.length = 0;
    try {
      const res = await chat(agentId);
      assert.equal(res.statusCode, 200);
      const frames = dataFrames(res.body);
      assert.equal(frames.at(-1).content, reply, 'the client reply is the same generic text');
      assert.equal(frames.at(-1).done, true);
      const errLine = logged.find((l) => l.startsWith(tag));
      assert.ok(errLine, 'the route logged its error line');
      const fields = JSON.parse(errLine.slice(tag.length + 1));
      assert.equal(fields.name, 'BridgeError');
      assert.equal(fields.code, 'EACCES');
      assert.equal(typeof fields.durationMs, 'number');
      assertNoLeak(logged);
    } finally {
      tool.execute = original;
    }
  });
}
