/**
 * SQL runner on PostgreSQL (B2.2b): see repositories/sql-runner.ts.
 * `batch` runs its statements one after another in withPgActorTransaction
 * (a SAVEPOINT when already inside a transaction); a failing statement rolls
 * the whole batch back and rethrows.
 */

import type { SqlRunner } from '../sql-runner.js';
import { pgAll, pgOne, pgRun } from '../../db/pg/pool.js';
import { withPgActorTransaction } from './transaction.js';

export const pgRunner: SqlRunner = {
  dialect: 'postgres',
  one: (sql, ...params) => pgOne(sql, ...params),
  all: (sql, ...params) => pgAll(sql, ...params),
  run: async (sql, ...params) => ({ changes: (await pgRun(sql, ...params)).changes }),
  async batch(actor, statements) {
    await withPgActorTransaction(actor, async () => {
      for (const [sql, ...params] of statements) await pgRun(sql, ...params);
    });
  },
};
