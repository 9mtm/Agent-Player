// B2.2b-3 / B2.2b-4: no ported module may reach a synchronous SQLite
// transaction (or any raw better-sqlite3 call) on the PostgreSQL path. Their SQL runs through
// repositories/sql-steps.ts, which is the only place that opens a SQLite
// transaction for them (and only when the driver is SQLite).
// Run: node --import tsx --test test/pg-ported-transactions.test.mjs
//
// Two parts:
//  1. a static scan of the ported modules (comments stripped): no
//     getDatabase / getDb / .prepare / .transaction / withSqliteTransaction,
//     no rowid or lastInsertRowid, no raw SQLite-only SQL forms
//     (datetime(, strftime(, INSERT OR ...) outside the dialect helpers;
//  2. the switch itself: with AGENT_PLAYER_DB=postgres the step runner,
//     withTransaction and the synchronous grant loader all take the
//     PostgreSQL path (no database is opened: without a PostgreSQL URL the
//     PostgreSQL path fails with PgConfigError, never with a SQLite result).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const backend = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Every module ported to the driver-neutral SQL steps (B2.2b-3, B2.2b-4 memory). */
export const PORTED = [
  'src/repositories/agents.ts',
  'src/repositories/agents-config.ts',
  'src/repositories/task-runs.ts',
  'src/services/agent-names.ts',
  'src/services/personality-store.ts',
  'src/services/personality-evolution.ts',
  'src/services/evolution-proposals.ts',
  'src/services/task-runs.ts',
  'src/services/task-contracts.ts',
  'src/services/task-run-executor.ts',
  'src/services/cost-budget.ts',
  'src/services/small-agent.ts',
  'src/services/agent-cron.ts',
  'src/tools/grants.ts',
  'src/tools/approvals.ts',
  'src/credentials/authority.ts',
  'src/llm/model-call.ts',
  // B2.2b-4: memory
  'src/repositories/memory.ts',
  'src/repositories/memory-recall.ts',
  'src/repositories/memory-owner.ts',
  'src/repositories/memory-shared.ts',
  'src/memory/drawers.ts',
  'src/memory/storage.ts',
  'src/memory/versions.ts',
  'src/memory/learning.ts',
  'src/memory/memory-files.ts',
  'src/memory/forget.ts',
  'src/memory/retention.ts',
  'src/memory/weekly-summary.ts',
  'src/memory/reembed.ts',
  'src/memory/retrieval.ts',
  'src/memory/indexer-pg.ts',
  'src/memory/import/pipeline.ts',
  'src/services/memory-tiers.ts',
  'src/services/memory-consolidation.ts',
  'src/services/memory-deduplication.ts',
  'src/services/memory-enrichment.ts',
  'src/services/memory-quality-scorer.ts',
  // B2.2b-4: remaining readers of ported tables
  'src/api/routes/chat.ts',
  'src/api/routes/multi-agent.ts',
  'src/tools/tasks/task-create.tool.ts',
  'src/tools/tasks/task-list.tool.ts',
  // B2.2c part 1: scheduler, MCP discovery, settings, notifications, audit, sign-in throttle
  'src/scheduler/store.ts',
  'src/scheduler/engine.ts',
  'src/api/routes/scheduler.ts',
  'src/memory/jobs.ts',
  'src/mcp-client/store.ts',
  'src/mcp-client/service.ts',
  'src/mcp-client/tools.ts',
  'src/mcp-client/grant-binding.ts',
];

/** Ported modules without SQL of their own (they compose ported services). */
const NO_SQL = new Set(['src/repositories/agents.ts', 'src/repositories/task-runs.ts', 'src/repositories/memory-owner.ts', 'src/memory/retrieval.ts',
  // B2.2c: compose the cron store
  'src/scheduler/engine.ts', 'src/api/routes/scheduler.ts']);

const FORBIDDEN = [
  [/\bgetDatabase\s*\(/, 'getDatabase() (a raw SQLite handle)'],
  [/\.getDb\s*\(/, 'getDb() (the raw better-sqlite3 handle)'],
  [/\.prepare\s*\(/, '.prepare() (a better-sqlite3 statement)'],
  [/\.transaction\s*\(/, '.transaction() (a synchronous SQLite transaction)'],
  [/\bwithSqliteTransaction\b/, 'withSqliteTransaction (SQLite only)'],
  [/\.immediate\s*\(/, '.immediate() (BEGIN IMMEDIATE, SQLite only)'],
  [/\browid\b/i, 'rowid (SQLite only; order by a key instead)'],
  [/\blastInsertRowid\b/, 'lastInsertRowid (use RETURNING id)'],
  [/\bdatetime\s*\(/, "datetime( (use nowText / nowPlusText / tsParam)"],
  [/\bstrftime\s*\(/, 'strftime( (use nowIsoText / epochSeconds)'],
  [/\bINSERT\s+OR\s+(IGNORE|REPLACE)\b/i, 'INSERT OR ... (use insertOrIgnore / ON CONFLICT)'],
  // B2.2b-4
  [/\bjson_\w+\s*\(/, 'json_*() (SQLite JSON functions: do the JSON work in JS)'],
  [/\bsqlite_master\b/, 'sqlite_master (use tableExists from sql-steps)'],
  [/PRAGMA\s+table_info|pragma_table_info/i, 'PRAGMA table_info (use columnExists from sql-steps)'],
];

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, '').replace(/([^:'"`])\/\/[^'"`\n]*$/gm, '$1');
}

test('ported modules never call SQLite directly or use SQLite-only SQL', () => {
  const offenders = [];
  for (const rel of PORTED) {
    const code = stripComments(readFileSync(join(backend, rel), 'utf8'));
    for (const [re, what] of FORBIDDEN) {
      if (re.test(code)) offenders.push(`${rel}: ${what}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('ported modules take their SQL helpers from sql-steps (one runner per driver)', () => {
  const missing = PORTED.filter((rel) => {
    // Modules that only compose the ported services (scope checks, no SQL of their own).
    if (NO_SQL.has(rel)) return false;
    return !/from '\.{1,2}\/(?:\.\.\/)?(?:repositories\/)?sql-steps\.js'/.test(readFileSync(join(backend, rel), 'utf8'));
  });
  assert.deepEqual(missing, []);
});

test('sql-steps is the only SQLite transaction left, and only on the SQLite runner', () => {
  const src = stripComments(readFileSync(join(backend, 'src/repositories/sql-steps.ts'), 'utf8'));
  const txCalls = src.match(/\.transaction\s*\(/g) ?? [];
  assert.equal(txCalls.length, 2, 'sqliteOp (atomic) and sqliteSteps.tx');
  // The PostgreSQL runner and the PostgreSQL op driver use withPgTransaction only.
  const pgPart = src.slice(src.indexOf('async function pgOp'), src.indexOf('function driveSync'));
  assert.match(pgPart, /withPgTransaction/);
  assert.doesNotMatch(pgPart, /getDatabase|\.transaction\(/);
  const pgSteps = src.slice(src.indexOf('export const pgSteps'), src.indexOf('export function stepsFor'));
  assert.match(pgSteps, /withPgTransaction\(\(\) => driveAsync/);
  assert.doesNotMatch(pgSteps, /getDatabase|driveSync|\.transaction\(/);
});

test('with AGENT_PLAYER_DB=postgres every ported path takes PostgreSQL', async () => {
  const saved = { db: process.env.AGENT_PLAYER_DB, url: process.env.AGENT_PLAYER_PG_URL };
  const steps = await import('../src/repositories/sql-steps.ts');
  const { withTransaction } = await import('../src/repositories/transaction.ts');
  const { loadAgentGrantsSync } = await import('../src/tools/grants.ts');
  const { PgConfigError } = await import('../src/db/pg/config.ts');
  const { closePgPool } = await import('../src/db/pg/pool.ts');
  const owner = { kind: 'user', userId: 'pt-owner', role: 'owner' };
  try {
    process.env.AGENT_PLAYER_DB = 'postgres';
    delete process.env.AGENT_PLAYER_PG_URL;
    assert.equal(steps.sql().dialect, 'postgres');
    assert.equal(steps.sql(), steps.pgSteps);
    assert.throws(() => steps.sqliteSync(steps.one('SELECT 1')), steps.SyncOnPostgresError);
    assert.throws(() => loadAgentGrantsSync('main-agent', []), steps.SyncOnPostgresError);
    // The PostgreSQL transaction is chosen (async fn allowed); no URL -> PgConfigError, not a SQLite result.
    await assert.rejects(() => withTransaction(owner, async () => 1), (e) => e instanceof PgConfigError);
    await assert.rejects(() => steps.sql().tx(() => steps.one('SELECT 1')), (e) => e instanceof PgConfigError);
    await assert.rejects(() => steps.sql().read(steps.one('SELECT 1')), (e) => e instanceof PgConfigError);
  } finally {
    if (saved.db === undefined) delete process.env.AGENT_PLAYER_DB; else process.env.AGENT_PLAYER_DB = saved.db;
    if (saved.url !== undefined) process.env.AGENT_PLAYER_PG_URL = saved.url;
    await closePgPool();
  }
  assert.equal(steps.sql().dialect, 'sqlite');
  assert.equal(steps.sql(), steps.sqliteSteps);
});

test('rowid tie-breaks are replaced by time-ordered primary keys (same order on both drivers)', async () => {
  const { orderedId } = await import('../src/repositories/ordered-id.ts');
  const ids = Array.from({ length: 3000 }, () => orderedId());
  assert.deepEqual([...ids].sort(), ids, 'lexicographic order = creation order, also within one millisecond');
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids.slice(0, 20)) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  // The row ids that break created_at ties come from orderedId().
  for (const rel of ['src/services/task-runs.ts', 'src/services/personality-store.ts', 'src/services/evolution-proposals.ts']) {
    assert.match(readFileSync(join(backend, rel), 'utf8'), /const id = orderedId\(\)/, rel);
  }
});

test('B2.2b-4: MCP grant bindings are written and read with the grants (SQL steps, one transaction)', () => {
  const grants = stripComments(readFileSync(join(backend, 'src/tools/grants.ts'), 'utf8'));
  assert.match(grants, /yield\* writeMcpBindingsStep\(/, 'bindings written inside the grants step');
  assert.match(grants, /yield\* isMcpGrantBoundStep\(/, 'bindings read inside the grants step');
  assert.doesNotMatch(grants, /\bwriteMcpBindings\(|\bisMcpGrantBound\(/);
  const gb = stripComments(readFileSync(join(backend, 'src/mcp-client/grant-binding.ts'), 'utf8'));
  // B2.2c: the MCP discovery read is a step too; no raw handle is left.
  assert.doesNotMatch(gb, /getDatabase|\.prepare\(|sqliteSync/);
  assert.match(gb, /function\* isMcpGrantBoundStep[\s\S]*yield\* currentMcpToolStep\(/, 'the fingerprint is read in the binding step');
  assert.match(grants, /yield\* currentMcpToolStep\(/, 'grant validation reads discovery in the grants step');
  for (const fn of ['isMcpGrantBoundStep', 'writeMcpBindingsStep', 'revokeMcpGrantsStep']) {
    const body = gb.slice(gb.indexOf(`function* ${fn}`), gb.indexOf('\n}\n', gb.indexOf(`function* ${fn}`)));
    assert.ok(body.length > 0, fn);
    assert.doesNotMatch(body, /getDatabase|\.prepare\(/, fn);
  }
});

test('B2.2b-4: with AGENT_PLAYER_DB=postgres the memory paths take PostgreSQL', async () => {
  const saved = { db: process.env.AGENT_PLAYER_DB, url: process.env.AGENT_PLAYER_PG_URL };
  const { PgConfigError } = await import('../src/db/pg/config.ts');
  const { closePgPool } = await import('../src/db/pg/pool.ts');
  const { getMemoryStorage } = await import('../src/memory/storage.ts');
  const versions = await import('../src/memory/versions.ts');
  const forget = await import('../src/memory/forget.ts');
  const files = await import('../src/memory/memory-files.ts');
  const pipeline = await import('../src/memory/import/pipeline.ts');
  const retention = await import('../src/memory/retention.ts');
  const { MemoryTiersService } = await import('../src/services/memory-tiers.ts');
  const pgErr = (e) => e instanceof PgConfigError;
  try {
    process.env.AGENT_PLAYER_DB = 'postgres';
    delete process.env.AGENT_PLAYER_PG_URL;
    await assert.rejects(() => getMemoryStorage().getOwned('u-1', 'm-1'), pgErr);
    await assert.rejects(() => getMemoryStorage().getByDrawers('u-1', [{ kind: 'owner' }]), pgErr);
    await assert.rejects(() => versions.memoryVersions('u-1', 'm-1'), pgErr);
    await assert.rejects(() => forget.listTombstones('u-1'), pgErr);
    await assert.rejects(() => forget.forgetMemory('u-1', 'm-1', 'u-1'), pgErr);
    await assert.rejects(() => files.listProposals('u-1'), pgErr);
    await assert.rejects(() => files.rejectProposal('u-1', 'p-1', 'u-1', 'a'.repeat(64)), pgErr);
    await assert.rejects(() => pipeline.listImports('u-1'), pgErr);
    await assert.rejects(() => retention.getRetentionConfig('u-1'), pgErr);
    await assert.rejects(() => MemoryTiersService.getLayerStats('u-1'), pgErr);
  } finally {
    if (saved.db === undefined) delete process.env.AGENT_PLAYER_DB; else process.env.AGENT_PLAYER_DB = saved.db;
    if (saved.url !== undefined) process.env.AGENT_PLAYER_PG_URL = saved.url;
    await closePgPool();
  }
});
