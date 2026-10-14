/**
 * SQL steps (B2.2b-3): one copy of a module's database logic for both
 * drivers, including multi-statement transactions.
 *
 * Why generators: a better-sqlite3 transaction must run synchronously (work
 * after an `await` would land outside it), a PostgreSQL transaction is
 * async. A step is a generator that yields its queries:
 *
 *   function* approve(id: string): Step<number> {
 *     const d = yield* dialect();
 *     const row = yield* one<{ n: number }>(`SELECT ... WHERE id = ?${forUpdate(d)}`, id);
 *     yield* run('UPDATE ... WHERE id = ?', id);
 *     return row?.n ?? 0;
 *   }
 *
 * and a driver runs it:
 *
 *   SQLite      every query synchronously; `tx` inside better-sqlite3's
 *               db.transaction (SAVEPOINT when nested), so the transaction
 *               stays synchronous and nothing else can interleave.
 *   PostgreSQL  every query awaited; `tx` inside withPgTransaction (the
 *               AsyncLocalStorage client, SAVEPOINT when nested).
 *
 * A step composes others with `yield*` (they join the same transaction), may
 * do synchronous non-database work (validation, hashing, a sync file write
 * that must roll the transaction back when it throws), and catches query
 * errors with try/catch as usual (a failed statement is thrown into the
 * generator). It never awaits: async work (encryption, the network) is done
 * before or after the step.
 *
 * Inside a step, `yield* atomic(() => body)` runs `body` in a transaction
 * (a SAVEPOINT when one is open).
 *
 * Callers use `sql()` (the runner for the process driver, dbDriver()):
 *   await sql().read(step)     one step; no transaction of its own (on
 *                              PostgreSQL it joins an open withTransaction)
 *   await sql().tx(() => step) one transaction (all or nothing)
 *   sqliteSync(step)           SQLite only: the result right away (for the
 *                              few synchronous callers that remain on SQLite,
 *                              e.g. createToolsRegistry); throws on PostgreSQL
 */

import type { Dialect } from '../db/pg/dialect.js';
import { getDatabase } from '../db/index.js';
import { dbDriver } from '../db/pg/config.js';
import { pgAll, pgOne, pgRun, withPgTransaction } from '../db/pg/pool.js';

export type SqlParam = string | number | null;

type Op =
  | { kind: 'one' | 'all' | 'run'; sql: string; params: SqlParam[] }
  | { kind: 'dialect' }
  | { kind: 'tx'; body: () => Step<unknown> };

/** A unit of database work that yields its queries (see the header). */
export type Step<T> = Generator<Op, T, unknown>;

/** First row or undefined (better-sqlite3 .get()). */
export function* one<T = any>(sql: string, ...params: SqlParam[]): Step<T | undefined> {
  return (yield { kind: 'one', sql, params }) as T | undefined;
}

/** All rows (better-sqlite3 .all()). */
export function* all<T = any>(sql: string, ...params: SqlParam[]): Step<T[]> {
  return (yield { kind: 'all', sql, params }) as T[];
}

/** INSERT / UPDATE / DELETE: { changes } (better-sqlite3 .run(), PostgreSQL rowCount). */
export function* run(sql: string, ...params: SqlParam[]): Step<{ changes: number }> {
  return (yield { kind: 'run', sql, params }) as { changes: number };
}

/** The dialect of the driver that runs this step (for the db/pg/dialect.ts helpers). */
export function* dialect(): Step<Dialect> {
  return (yield { kind: 'dialect' }) as Dialect;
}

/**
 * Run `body` atomically inside a step: its own transaction when none is
 * open, else a SAVEPOINT (a throw rolls back only `body`'s work, and the
 * caller may catch it and go on).
 */
export function* atomic<T>(body: () => Step<T>): Step<T> {
  return (yield { kind: 'tx', body }) as T;
}

export interface StepRunner {
  readonly dialect: Dialect;
  /** Run one step without a transaction of its own. */
  read<T>(step: Step<T>): Promise<T>;
  /**
   * Run a step in one transaction; a throw rolls everything back. Nested
   * (inside another tx or an open withTransaction): a SAVEPOINT.
   * `immediate` (SQLite): BEGIN IMMEDIATE, the write lock is taken first.
   */
  tx<T>(body: () => Step<T>, opts?: { immediate?: boolean }): Promise<T>;
}

function sqliteOp(op: Op): unknown {
  if (op.kind === 'dialect') return 'sqlite';
  if (op.kind === 'tx') return getDatabase().getDb().transaction(() => driveSync(op.body()))();
  const stmt = getDatabase().prepare(op.sql);
  if (op.kind === 'one') return stmt.get(...op.params);
  if (op.kind === 'all') return stmt.all(...op.params);
  return { changes: stmt.run(...op.params).changes };
}

async function pgOp(op: Op): Promise<unknown> {
  if (op.kind === 'dialect') return 'postgres';
  if (op.kind === 'tx') return withPgTransaction(() => driveAsync(op.body()));
  if (op.kind === 'one') return pgOne(op.sql, ...op.params);
  if (op.kind === 'all') return pgAll(op.sql, ...op.params);
  return { changes: (await pgRun(op.sql, ...op.params)).changes };
}

/** Drive a step synchronously on SQLite. */
function driveSync<T>(step: Step<T>): T {
  let r = step.next();
  while (!r.done) {
    let value: unknown;
    try {
      value = sqliteOp(r.value);
    } catch (err) {
      r = step.throw(err);
      continue;
    }
    r = step.next(value);
  }
  return r.value;
}

async function driveAsync<T>(step: Step<T>): Promise<T> {
  let r = step.next();
  while (!r.done) {
    let value: unknown;
    try {
      value = await pgOp(r.value);
    } catch (err) {
      r = step.throw(err);
      continue;
    }
    r = step.next(value);
  }
  return r.value;
}

export const sqliteSteps: StepRunner = {
  dialect: 'sqlite',
  read<T>(step: Step<T>): Promise<T> {
    try {
      return Promise.resolve(driveSync(step));
    } catch (err) {
      return Promise.reject(err);
    }
  },
  tx<T>(body: () => Step<T>, opts: { immediate?: boolean } = {}): Promise<T> {
    try {
      const t = getDatabase().getDb().transaction(() => driveSync(body()));
      return Promise.resolve(opts.immediate ? t.immediate() : t());
    } catch (err) {
      return Promise.reject(err);
    }
  },
};

export const pgSteps: StepRunner = {
  dialect: 'postgres',
  read: (step) => driveAsync(step),
  // PostgreSQL has no BEGIN IMMEDIATE: a step that needs a write lock up
  // front takes it itself (FOR UPDATE, pg_advisory_xact_lock).
  tx: (body) => withPgTransaction(() => driveAsync(body())),
};

/** The runner for a driver. */
export function stepsFor(driver: 'sqlite' | 'postgres'): StepRunner {
  return driver === 'postgres' ? pgSteps : sqliteSteps;
}

/** The runner for the process driver (AGENT_PLAYER_DB, db/pg/config.ts). */
export function sql(): StepRunner {
  return stepsFor(dbDriver());
}

export class SyncOnPostgresError extends Error {}

/**
 * SQLite only: run a step and return its result synchronously. For the
 * synchronous callers that are still SQLite-only; on PostgreSQL it throws
 * (use the async API there).
 */
export function sqliteSync<T>(step: Step<T>): T {
  if (dbDriver() === 'postgres') {
    throw new SyncOnPostgresError('synchronous database access is SQLite only; use the async API on PostgreSQL');
  }
  return driveSync(step);
}
