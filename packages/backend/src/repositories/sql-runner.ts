/**
 * SQL runner (B2.2b): the four query shapes a repository needs, behind one
 * async interface, so a repository's logic and SQL exist once and run on
 * either driver (teams.ts is the first user).
 *
 *   sqliteRunner   better-sqlite3 (synchronous under the hood)
 *   pgRunner       repositories/pg/sql-runner.ts (PostgreSQL)
 *
 * SQL uses `?` placeholders on both drivers. Where the dialects differ the
 * repository asks `runner.dialect` and builds the fragment with the
 * db/pg/dialect.ts helpers; nothing is rewritten at run time.
 *
 * Transactions: `batch(actor, statements)` runs the statements in order in
 * one transaction (all or nothing). A statement list rather than a callback,
 * because a better-sqlite3 transaction must be synchronous while a PostgreSQL
 * one is async: the list works the same on both. SQLite uses
 * transaction.ts withTransaction, PostgreSQL withPgActorTransaction.
 */

import type { Actor } from './actor.js';
import type { Dialect } from '../db/pg/dialect.js';
import { getDatabase } from '../db/index.js';
import { withTransaction } from './transaction.js';

export type SqlParam = string | number | null;
export type SqlStatement = readonly [sql: string, ...params: SqlParam[]];

export interface SqlRunner {
  readonly dialect: Dialect;
  one<T = any>(sql: string, ...params: SqlParam[]): Promise<T | undefined>;
  all<T = any>(sql: string, ...params: SqlParam[]): Promise<T[]>;
  run(sql: string, ...params: SqlParam[]): Promise<{ changes: number }>;
  batch(actor: Actor | null | undefined, statements: readonly SqlStatement[]): Promise<void>;
}

const db = () => getDatabase();

export const sqliteRunner: SqlRunner = {
  dialect: 'sqlite',
  one: async (sql, ...params) => db().prepare(sql).get(...params) as any,
  all: async (sql, ...params) => db().prepare(sql).all(...params) as any[],
  run: async (sql, ...params) => ({ changes: db().prepare(sql).run(...params).changes }),
  async batch(actor, statements) {
    await withTransaction(actor, () => {
      for (const [sql, ...params] of statements) db().prepare(sql).run(...params);
    });
  },
};
