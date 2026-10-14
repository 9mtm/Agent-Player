// CRITICAL: must stay the first import (loads .env and .data/secrets.env, INST-02).
import '../config/load-env.js';

/**
 * Maintenance tasks for `agent-player update` (INST-11). Run as a separate
 * process from the backend folder:
 *
 *   node --import tsx src/maintenance/update-tasks.ts migrate
 *   node --import tsx src/maintenance/update-tasks.ts health
 *
 *  - migrate: opens the main database through the backend's own
 *    DatabaseManager and runs schema + pending migrations (same code as a
 *    normal start), then closes it.
 *  - health: builds the real app with buildServer() and asks GET /health
 *    through Fastify's inject(), so no port is bound.
 *
 * The last stdout line is `AGENT_PLAYER_TASK_RESULT {json}` with counts only.
 * Exit code 0 = success. Nothing secret is printed.
 */

export const RESULT_PREFIX = 'AGENT_PLAYER_TASK_RESULT ';

type TaskResult = Record<string, string | number | boolean>;

function emit(result: TaskResult): void {
  process.stdout.write(`${RESULT_PREFIX}${JSON.stringify(result)}\n`);
}

function quietConsole(): () => void {
  const saved = { log: console.log, info: console.info, warn: console.warn, debug: console.debug };
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.debug = () => {};
  return () => Object.assign(console, saved);
}

async function migrate(): Promise<TaskResult> {
  const { getDatabase, closeDatabase } = await import('../db/database.js');
  const db = getDatabase();
  try {
    await db.initialize();
    const row = db.prepare('SELECT COUNT(*) AS n FROM migrations').get() as { n: number };
    const integrity = db.prepare('PRAGMA integrity_check').get() as Record<string, string>;
    const ok = Object.values(integrity)[0] === 'ok';
    return { ok, task: 'migrate', appliedMigrations: row.n, integrity: ok ? 'ok' : 'failed' };
  } finally {
    closeDatabase();
  }
}

async function health(): Promise<TaskResult> {
  const env = process.env as Record<string, string | undefined>;
  if (!env.NODE_ENV) env.NODE_ENV = 'production';
  const { buildServer } = await import('../api/app.js');
  const app = await buildServer({ logger: false });
  try {
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/health' });
    let status = '';
    try { status = String(JSON.parse(res.body)?.status ?? ''); } catch { /* not json */ }
    return { ok: res.statusCode === 200 && status === 'ok', task: 'health', statusCode: res.statusCode, status };
  } finally {
    await app.close();
  }
}

const task = process.argv[2];
const restore = quietConsole();
let result: TaskResult;
try {
  if (task === 'migrate') result = await migrate();
  else if (task === 'health') result = await health();
  else result = { ok: false, task: String(task ?? ''), error: 'unknown task (use migrate or health)' };
} catch (err: any) {
  result = { ok: false, task: String(task ?? ''), error: String(err?.message ?? err).split('\n')[0].slice(0, 300) };
}
restore();
emit(result);
// Route modules may leave timers or watchers open; this process only runs one task.
process.exit(result.ok ? 0 : 1);
