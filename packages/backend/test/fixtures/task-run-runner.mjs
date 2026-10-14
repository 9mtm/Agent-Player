// Child-process runner for test/task-run-durability.test.mjs (CORE-08).
// Uses the throwaway DB/keys passed in the environment by the test; the
// model API is stubbed (no network). Stub tools append to a ledger file so
// the test can count side effects across processes.
//
//   node --import tsx test/fixtures/task-run-runner.mjs start <scenario> <workDir>
//   node --import tsx test/fixtures/task-run-runner.mjs recover _ <workDir>
import { appendFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const AGENT_ID = 'tr-agent';

const ledgerPath = (workDir) => join(workDir, 'ledger.txt');
const note = (workDir, line) => appendFileSync(ledgerPath(workDir), `${line}\n`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const forever = () => new Promise(() => {});

/** Stub tools: their side effect is one ledger line per execution. */
export async function registerStubTools(workDir) {
  const { registerExtensionTool } = await import(join(backendDir, 'src/tools/index.ts'));
  const schema = (props) => ({ type: 'object', properties: props });
  const keyOf = (ctx) => ctx?.taskRun?.idempotencyKey ?? 'nokey';
  registerExtensionTool({
    name: 'ledger_append', description: 'append (non-idempotent side effect)', extensionId: 'tr-test',
    input_schema: schema({ entry: { type: 'string' } }),
    execute: async (p, ctx) => { note(workDir, `ledger_append:${p.entry}:${keyOf(ctx)}`); return { content: [{ type: 'text', text: 'appended' }] }; },
  });
  registerExtensionTool({
    name: 'hang_effect', description: 'side effect that can hang (non-idempotent)', extensionId: 'tr-test',
    input_schema: schema({ entry: { type: 'string' } }),
    execute: async (p, ctx) => {
      note(workDir, `hang_effect:start:${p.entry}:${keyOf(ctx)}`);
      if (process.env.HANG === '1') await forever();
      note(workDir, `hang_effect:done:${p.entry}:${keyOf(ctx)}`);
      return { content: [{ type: 'text', text: 'effect done' }] };
    },
  });
  registerExtensionTool({
    name: 'idem_lookup', description: 'read-only lookup (declared idempotent)', extensionId: 'tr-test', idempotent: true,
    input_schema: schema({ q: { type: 'string' } }),
    execute: async (p, ctx) => {
      note(workDir, `idem_lookup:start:${p.q}:${keyOf(ctx)}`);
      if (process.env.HANG === '1') await forever();
      await sleep(Number(process.env.IDEM_DELAY_MS || 0));
      note(workDir, `idem_lookup:done:${p.q}:${keyOf(ctx)}`);
      return { content: [{ type: 'text', text: `found ${p.q}` }] };
    },
  });
  registerExtensionTool({
    name: 'stub_pay', description: 'payment (needs owner approval)', extensionId: 'tr-test', requiresApproval: true,
    input_schema: schema({ amount: { type: 'number' } }),
    execute: async (p, ctx) => { note(workDir, `stub_pay:${p.amount}:${keyOf(ctx)}`); return { content: [{ type: 'text', text: `paid ${p.amount}` }] }; },
  });
}

export const STUB_TOOLS = ['ledger_append', 'hang_effect', 'idem_lookup', 'stub_pay'];

const toolUse = (t, name, input) => ({ content: [{ type: 'tool_use', id: `tu-${t}-${name}`, name, input }], stop_reason: 'tool_use' });
const text = (s) => ({ content: [{ type: 'text', text: s }], stop_reason: 'end_turn' });

/** Deterministic model script per scenario; t = completed tool turns so far. */
function script(scenario, t) {
  switch (scenario) {
    case 'A': return t === 0 ? toolUse(t, 'ledger_append', { entry: 'A1' }) : t === 1 ? toolUse(t, 'hang_effect', { entry: 'A2' }) : text('done A');
    case 'B': return t === 0 ? toolUse(t, 'idem_lookup', { q: 'B' }) : text('done B');
    case 'C': return t === 0 ? toolUse(t, 'idem_lookup', { q: 'C' }) : text('done C');
    case 'D': return toolUse(t, 'idem_lookup', { q: `D${t}` }); // never finishes on its own
    case 'E': return t === 0 ? toolUse(t, 'hang_effect', { entry: 'E' }) : text('done E');
    case 'F': return t === 0 ? toolUse(t, 'stub_pay', { amount: 5 }) : text('done F');
    // R1: side effect, a wrong answer, then (after verification feedback) the right one.
    case 'G': return t === 0 ? toolUse(t, 'ledger_append', { entry: 'G1' }) : t === 1 ? text('draft without the word') : text('GOOD answer G');
    default: return text('?');
  }
}

async function main() {
  const [mode, scenario, workDir] = process.argv.slice(2);
  const quiet = () => {};
  console.log = quiet; console.info = quiet; console.warn = quiet;
  const out = (obj) => process.stdout.write(`RESULT ${JSON.stringify(obj)}\n`);
  // The backend's own timers are unref'd (a server keeps the process alive);
  // keep this runner alive while a stub tool hangs.
  setInterval(() => {}, 1000);
  mkdirSync(join(workDir, '.data', 'multi-agent'), { recursive: true });
  process.chdir(workDir);

  let modelCalls = 0;
  globalThis.fetch = async (url, init = {}) => {
    if (!String(url).startsWith('https://api.anthropic.com/')) throw new Error(`unexpected network call in test: ${url}`);
    const body = JSON.parse(init.body);
    const prompt = String(body.messages[0].content);
    const sc = /SCENARIO:(\w)/.exec(prompt)?.[1] ?? '?';
    const t = (body.messages.length - 1) / 2;
    modelCalls++;
    note(workDir, `model:${sc}:${t}`);
    if (process.env.HANG_MODEL_T !== undefined && Number(process.env.HANG_MODEL_T) === t) await forever();
    return new Response(JSON.stringify(script(sc, t)), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const { getDatabase } = await import(join(backendDir, 'src/db/database.ts'));
  await getDatabase().initialize();
  const { getCredentialStorage } = await import(join(backendDir, 'src/credentials/storage.ts'));
  await getCredentialStorage().initialize();
  const { getOrchestrator } = await import(join(backendDir, 'src/multi-agent/index.ts'));
  const orchestrator = getOrchestrator();
  await orchestrator.initialize(join(workDir, '.data', 'multi-agent', 'orchestrator.db'));
  await registerStubTools(workDir);

  if (mode === 'start') {
    if (!orchestrator.getAgent?.(AGENT_ID)) {
      orchestrator.registerAgent({ id: AGENT_ID, name: AGENT_ID, role: 'worker', capabilities: [], maxConcurrentTasks: 10 });
    }
    const task = orchestrator.createTask({ title: `SCENARIO:${scenario}`, description: 'durable run test', origin: 'owner' });
    if (process.env.CONTRACT_JSON) {
      // R1: a task contract given at create time (validated like the API does).
      const contracts = await import(join(backendDir, 'src/services/task-contracts.ts'));
      const c = contracts.validateContract(JSON.parse(process.env.CONTRACT_JSON), { grants: null, maxSteps: 60, maxDurationMs: 1_800_000 });
      await contracts.storeTaskContract(task.id, c, 'tr-owner');
    }
    orchestrator.assignTask(task.id, AGENT_ID);
    process.stdout.write(`TASK ${task.id}\n`);
    const cron = await import(join(backendDir, 'src/services/agent-cron.ts'));
    const output = await cron.runAgentTask({ id: AGENT_ID, name: AGENT_ID, model: 'claude-test', provider: 'claude',
      system_prompt: null, temperature: 0, max_tokens: 100, cron_schedule: '', cron_enabled: 0 }, task.id, `SCENARIO:${scenario}`);
    out({ mode, output, modelCalls, taskStatus: orchestrator.getTask(task.id)?.status });
  } else if (mode === 'recover') {
    const exec = await import(join(backendDir, 'src/services/task-run-executor.ts'));
    const executed = await exec.recoverTaskRuns();
    out({ mode, executed, modelCalls });
  }
  process.exit(0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => { process.stderr.write(`runner error: ${err?.stack ?? err}\n`); process.exit(1); });
}
