// R2 cost budget gate (D-BUDGET): price table, usage per step, per-run cost
// limit, global daily cap (default 0 = no autonomous paid model calls), free
// local models, interactive chat not gated, owner-only GET /api/budget.
// Throwaway DB/keys; model calls are stubbed (no network, nothing is paid).
// Run: node --import tsx --test test/cost-budget.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-cost-budget-'));
mkdirSync(join(dir, '.data', 'multi-agent'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
process.env.NODE_ENV = 'test';
process.env.OLLAMA_URL = 'http://127.0.0.1:11434';
for (const k of ['DAILY_PAID_CAP_CENTS', 'MODEL_PRICES_JSON', 'AGENT_EXEC_TOOLS', 'TASK_RUN_MAX_STEPS', 'TASK_RUN_MAX_DURATION_MS', 'SMALL_AGENT_MODEL', 'OLLAMA_THINK']) delete process.env[k];

// --- stubbed models --------------------------------------------------------------
const calls = { task: 0, chat: 0, ollama: 0 };
const toolUse = (name, input) => ({ content: [{ type: 'tool_use', id: `tu-${name}`, name, input }], stop_reason: 'tool_use' });
const text = (s) => ({ content: [{ type: 'text', text: s }], stop_reason: 'end_turn' });
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const target = String(url);
  const body = JSON.parse(init.body);
  if (target === 'http://127.0.0.1:11434/api/chat') {
    calls.ollama++;
    return new Response(JSON.stringify({ model: body.model, message: { role: 'assistant', content: 'Release is Friday.' }, prompt_eval_count: 40, eval_count: 9 }),
      { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (!target.startsWith('https://api.anthropic.com/')) throw new Error(`unexpected network call in test: ${target}`);
  const first = String(typeof body.messages[0].content === 'string' ? body.messages[0].content : JSON.stringify(body.messages[0].content));
  const sc = /SCENARIO:(\w+)/.exec(first)?.[1];
  const usage = { input_tokens: 2000, output_tokens: 1000 };
  if (!sc) { calls.chat++; return new Response(JSON.stringify({ ...text('chat reply'), usage }), { status: 200, headers: { 'content-type': 'application/json' } }); }
  calls.task++;
  const t = body.messages.filter((m) => m.role === 'assistant').length;
  const reply = t === 0 ? toolUse('idem_lookup', { q: sc }) : text(`done ${sc}`);
  return new Response(JSON.stringify({ ...reply, usage }), { status: 200, headers: { 'content-type': 'application/json' } });
};

const quiet = { log: console.log, warn: console.warn, info: console.info };
console.log = () => {};
console.info = () => {};
console.warn = () => {};

const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
const { getCredentialStorage } = await import(join(backendDir, 'src/credentials/storage.ts'));
await getCredentialStorage().initialize();
const { getOrchestrator } = await import(join(backendDir, 'src/multi-agent/index.ts'));
const orchestrator = getOrchestrator();
await orchestrator.initialize(join(dir, '.data', 'multi-agent', 'orchestrator.db'));
const addUser = (id, role) => db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status, email_verified) VALUES (?, ?, ?, 'x', ?, 'active', 1)`)
  .run(id, `${id}@example.test`, id, role);
addUser('cb-owner', 'owner');
addUser('cb-admin', 'admin');
addUser('cb-member', 'user');

const tools = await import(join(backendDir, 'src/tools/index.ts'));
tools.registerExtensionTool({ name: 'idem_lookup', description: 'read-only lookup', extensionId: 'cb-test', idempotent: true,
  input_schema: { type: 'object', properties: { q: { type: 'string' } } }, execute: async (p) => ({ content: [{ type: 'text', text: `found ${p.q}` }] }) });
const AGENT = 'cb-agent';
db.prepare(`INSERT INTO agents_config (id, name, provider, model) VALUES (?, ?, 'claude', 'claude-sonnet-test')`).run(AGENT, AGENT);
orchestrator.registerAgent({ id: AGENT, name: AGENT, role: 'worker', capabilities: [], maxConcurrentTasks: 50 });
const grants = await import(join(backendDir, 'src/tools/grants.ts'));
grants.setAgentGrants(AGENT, { grants: ['idem_lookup'] }, 'cb-owner', tools.createToolsRegistry({ workspaceDir: dir }).listRegistered());
const { setAgentApiKey } = await import(join(backendDir, 'src/credentials/authority.ts'));
await setAgentApiKey(AGENT, 'sk-ant-test-' + randomBytes(12).toString('hex'));
// The primary agent answers interactive chat with a (stubbed) paid provider.
db.prepare(`UPDATE agents_config SET provider = 'claude', api_key = ? WHERE is_primary = 1`).run('test-key-' + randomBytes(4).toString('hex'));

const budget = await import(join(backendDir, 'src/services/cost-budget.ts'));
const runs = await import(join(backendDir, 'src/services/task-runs.ts'));
const cron = await import(join(backendDir, 'src/services/agent-cron.ts'));
const gate = await import(join(backendDir, 'src/auth/auth-gate.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { buildServer } = await import(join(backendDir, 'src/api/app.ts'));
const app = await buildServer({ logger: false });
await app.ready();
const bearer = (id) => ({ authorization: `Bearer ${generateToken(id, 1)}` });

console.log = quiet.log;
console.info = quiet.info;
console.warn = quiet.warn;

test.after(async () => {
  globalThis.fetch = realFetch;
  try { await app.close(); } catch { /* ignore */ }
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const runOf = (taskId) => db.prepare('SELECT * FROM task_runs WHERE task_id = ?').get(taskId);
const stepsOf = (runId) => db.prepare('SELECT * FROM task_run_steps WHERE run_id = ? ORDER BY step_index').all(runId);
const usageRows = () => db.prepare('SELECT * FROM paid_usage ORDER BY id').all();

async function runScenario(sc, contract) {
  const res = await app.inject({ method: 'POST', url: '/api/multi-agent/tasks', headers: bearer('cb-owner'),
    payload: { title: `SCENARIO:${sc}`, description: 'cost test', assignedTo: AGENT, ...(contract ? { contract } : {}) } });
  assert.equal(res.statusCode, 201, res.body);
  const taskId = res.json().task.id;
  await cron.runAgentTask({ id: AGENT, name: AGENT, model: 'claude-sonnet-test', provider: 'claude', system_prompt: null,
    temperature: 0, max_tokens: 100, cron_schedule: '', cron_enabled: 0 }, taskId, `SCENARIO:${sc}`);
  return { taskId, run: runOf(taskId), task: orchestrator.getTask(taskId) };
}

// --- price table --------------------------------------------------------------------

test('price table: local models are free, families are priced, unknown providers fail closed, owner overrides apply', () => {
  assert.deepEqual({ ...budget.priceFor('ollama', 'qwen3.8:27b'), known: true }, { input: 0, output: 0, known: true });
  assert.equal(budget.isPaidProvider('ollama'), false);
  assert.equal(budget.isPaidProvider('claude', 'claude-sonnet-4-5'), true);
  const opus = budget.priceFor('claude', 'claude-opus-4-1');
  const haiku = budget.priceFor('anthropic', 'claude-haiku-4-5');
  assert.ok(opus.output > haiku.output, 'opus priced above haiku');
  const unknown = budget.priceFor('some-new-cloud', 'x');
  assert.equal(unknown.known, false);
  assert.ok(unknown.output >= opus.output, 'unknown provider = highest known price');
  assert.equal(budget.costCents({ input: 1, output: 2 }, 1500, 500), 2.5);

  process.env.MODEL_PRICES_JSON = JSON.stringify({ claude: { default: { input: 1, output: 1 }, models: { 'claude-sonnet-test': { input: 0.5, output: 0.25 } } }, ollama: { default: { input: 0, output: 0 } } });
  assert.deepEqual(budget.priceFor('claude', 'claude-sonnet-test').input, 0.5, 'exact model id before the family pattern');
  assert.equal(budget.priceFor('claude', 'claude-x').input, 1);
  process.env.MODEL_PRICES_JSON = '{not json';
  assert.equal(budget.priceFor('claude', 'claude-sonnet-4').input, 0.3, 'invalid override -> built-in estimates');
  delete process.env.MODEL_PRICES_JSON;
  assert.equal(budget.dailyCapCents(), 0, 'default daily cap is 0');
  process.env.DAILY_PAID_CAP_CENTS = '-5';
  assert.equal(budget.dailyCapCents(), 0, 'invalid cap -> 0');
  delete process.env.DAILY_PAID_CAP_CENTS;
});

// --- daily cap 0 (default) ------------------------------------------------------------

test('daily cap 0 (default): an autonomous paid model call is refused before it is made; the task is not retried', async () => {
  const before = calls.task;
  const { run, task } = await runScenario('Z');
  assert.equal(calls.task, before, 'the paid model was never called');
  assert.equal(run.status, 'failed');
  assert.match(run.status_reason, /^budget: daily paid cap is 0/);
  assert.equal(task.status, 'failed');
  assert.equal(task.retryCount, 0, 'a cost refusal is not auto-retried');
  assert.equal(stepsOf(run.id)[0].status, 'failed');
  assert.equal(usageRows().length, 0, 'nothing reserved or recorded');
});

test('local model (Ollama) is free: a small-agent run completes with cap 0', async () => {
  const res = await app.inject({ method: 'POST', url: '/api/small-agent/runs', headers: bearer('cb-owner'), payload: { task: 'When is the release?', kind: 'lookup' } });
  assert.equal(res.statusCode, 201, res.body);
  const id = res.json().run_id;
  for (let i = 0; i < 400 && runs.getRun(id)?.status !== 'completed'; i++) await sleep(20);
  const run = runs.getRun(id);
  assert.equal(run.status, 'completed', run.status_reason);
  assert.equal(run.cost_cents, 0);
  const s = stepsOf(id)[0];
  assert.deepEqual([s.provider, s.input_tokens, s.output_tokens, s.cost_cents, s.usage_source], ['ollama', 40, 9, 0, 'provider']);
  assert.equal(usageRows().length, 0, 'free calls are not in the paid ledger');
});

test('interactive chat with the owner is not blocked by the daily cap', async () => {
  assert.equal(budget.dailyCapCents(), 0);
  const before = calls.chat;
  const res = await app.inject({ method: 'POST', url: '/api/chat', headers: bearer('cb-owner'),
    payload: { stream: false, messages: [{ role: 'user', content: 'hi' }] } });
  assert.equal(res.statusCode, 200, res.body.slice(0, 500));
  assert.equal(calls.chat, before + 1, 'the paid model answered the owner');
  assert.equal(usageRows().length, 0, 'interactive chat is not metered by the autonomous gate');
});

// --- usage + per-run limit ----------------------------------------------------------------

test('usage per step is recorded from the provider; the per-run cost limit stops the run', async () => {
  process.env.DAILY_PAID_CAP_CENTS = '100000';
  process.env.MODEL_PRICES_JSON = JSON.stringify({ claude: { default: { input: 1, output: 1 } } });
  try {
    const before = calls.task;
    // Each stubbed call reports 2000 in + 1000 out = 3 cents at 1 cent / 1k;
    // the reserved worst case (request size / 3 + the agent's max output
    // tokens) is a bit over 4 here.
    const { run, task } = await runScenario('P', { goal: 'Look up P', budget: { maxCostCents: 6 } });
    assert.equal(calls.task, before + 1, `second model call refused before it was made: ${run.status} ${run.status_reason}`);
    assert.equal(run.status, 'failed');
    assert.match(run.status_reason, /^budget: max cost 6 cents would be exceeded \(used 3\.00/);
    assert.equal(task.retryCount, 0);
    const steps = stepsOf(run.id);
    assert.deepEqual([steps[0].provider, steps[0].model, steps[0].input_tokens, steps[0].output_tokens, steps[0].cost_cents, steps[0].usage_source],
      ['claude', 'claude-sonnet-test', 2000, 1000, 3, 'provider']);
    assert.equal(run.cost_cents, 3);
    const ledger = usageRows().filter((u) => u.run_id === run.id);
    assert.deepEqual(ledger.map((u) => [u.status, u.cost_cents, u.purpose]), [['recorded', 3, 'task_run']]);
    assert.ok(ledger[0].estimated_cents > 0 && ledger[0].estimated_cents <= 6, 'worst case was reserved before the call');

    // Without a per-run limit the same task completes; replayed steps cost nothing.
    const ok = await runScenario('Q', { goal: 'Look up Q' });
    assert.equal(ok.run.status, 'completed', ok.run.status_reason);
    assert.equal(ok.run.cost_cents, 6);
  } finally {
    delete process.env.MODEL_PRICES_JSON;
  }
});

test('daily cap reached: the next autonomous paid call is refused; open reservations count', async () => {
  process.env.MODEL_PRICES_JSON = JSON.stringify({ claude: { default: { input: 1, output: 1 } } });
  try {
    const spent = budget.spentCents();
    assert.equal(spent, 9, 'recorded spend of today');
    // A reservation left by a crash keeps counting (the provider may have billed it).
    db.prepare(`INSERT INTO paid_usage (day, provider, model, purpose, status, estimated_cents) VALUES (?, 'claude', 'x', 'task_run', 'reserved', 1)`).run(budget.utcDay());
    assert.equal(budget.spentCents(), 10);
    process.env.DAILY_PAID_CAP_CENTS = '10';
    const before = calls.task;
    const { run } = await runScenario('C');
    assert.equal(calls.task, before);
    assert.equal(run.status, 'failed');
    assert.match(run.status_reason, /^budget: daily paid cap 10 cents would be exceeded/);
  } finally {
    delete process.env.MODEL_PRICES_JSON;
  }
});

// --- API ---------------------------------------------------------------------------------------

test('GET /api/budget is owner only and shows today, the cap and the scope', async () => {
  process.env.DAILY_PAID_CAP_CENTS = '10';
  assert.equal((await app.inject({ method: 'GET', url: '/api/budget' })).statusCode, 401);
  for (const who of ['cb-admin', 'cb-member']) {
    assert.equal((await app.inject({ method: 'GET', url: '/api/budget', headers: bearer(who) })).statusCode, 403, who);
  }
  const res = await app.inject({ method: 'GET', url: '/api/budget', headers: bearer('cb-owner') });
  assert.equal(res.statusCode, 200);
  const b = res.json().budget;
  assert.equal(b.day, budget.utcDay());
  assert.equal(b.dailyCapCents, 10);
  assert.equal(b.spentTodayCents, 10);
  assert.equal(b.reservedTodayCents, 1);
  assert.equal(b.remainingTodayCents, 0);
  assert.equal(b.autonomousPaidCallsAllowed, false);
  assert.ok(b.byProvider.some((p) => p.provider === 'claude'));
  assert.equal(b.prices.ollama.default.input, 0);
  assert.match(b.scope, /Interactive chat .* not blocked/);
  assert.ok(!res.body.includes('sk-ant-'), 'no keys in the budget view');
  delete process.env.DAILY_PAID_CAP_CENTS;
  const off = (await app.inject({ method: 'GET', url: '/api/budget', headers: bearer('cb-owner') })).json().budget;
  assert.equal(off.dailyCapCents, 0);
  assert.equal(off.autonomousPaidCallsAllowed, false);

  const find = (m, u) => app.routeAccessTable.find((r) => r.method === m && r.url === u)?.access;
  assert.equal(find('GET', '/api/budget'), 'owner');
  assert.equal(gate.resolveRouteAccess('GET', '/api/budget'), 'owner');
});
