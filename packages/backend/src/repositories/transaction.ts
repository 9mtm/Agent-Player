/**
 * Transactions for the repositories (B1-core, B2.2b-3).
 *
 * `withTransaction(actor, fn)` runs `fn` in one database transaction and
 * resolves with its result; a throw rolls everything back. The actor is
 * passed through so the repository calls inside stay scoped. It chooses by
 * the process driver (db/pg/config.ts dbDriver()):
 *
 *   PostgreSQL  withPgActorTransaction (repositories/pg/transaction.ts):
 *               `fn` may be async; every ported repository / service call
 *               inside it (at any await depth) joins the transaction, a
 *               nested call is a SAVEPOINT. Since B2.2b-3 that covers every
 *               area that has been ported (identity, teams, credentials,
 *               audit, agents incl. personality, evolution proposals, tool
 *               grants, task runs and contracts, approvals, cost budget).
 *   SQLite      withSqliteTransaction: better-sqlite3's transaction is
 *               synchronous, so `fn` must do its database work
 *               synchronously; returning a Promise is refused (the work
 *               after its first await would run outside the transaction).
 *               Ported modules compose their SQLite transactions as SQL
 *               steps instead (repositories/sql-steps.ts), which run
 *               synchronously inside db.transaction.
 */

import { getDatabase } from '../db/index.js';
import { dbDriver } from '../db/pg/config.js';
import type { Actor } from './actor.js';
import { requireActor } from './scope.js';
import { withPgActorTransaction } from './pg/transaction.js';

export class TransactionShapeError extends Error {}

/** SQLite only: `fn` runs synchronously inside better-sqlite3's transaction. */
export async function withSqliteTransaction<T>(actor: Actor | null | undefined, fn: (actor: Actor) => T): Promise<T> {
  const a = requireActor(actor);
  return getDatabase().transaction(() => {
    const out = fn(a);
    if (out && typeof (out as any).then === 'function') {
      throw new TransactionShapeError('withTransaction: fn must be synchronous on SQLite');
    }
    return out;
  });
}

/** One transaction on the process driver (see the header). */
export function withTransaction<T>(actor: Actor | null | undefined, fn: (actor: Actor) => T | Promise<T>): Promise<Awaited<T>> {
  if (dbDriver() === 'postgres') return withPgActorTransaction(actor, fn);
  return withSqliteTransaction(actor, fn as (actor: Actor) => T) as Promise<Awaited<T>>;
}
