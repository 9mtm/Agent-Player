/**
 * Transactions for the repositories (B1-core).
 *
 * `withTransaction(actor, fn)` runs `fn` in one database transaction and
 * resolves with its result; a throw rolls everything back. The actor is
 * passed through so the repository calls inside stay scoped.
 *
 * SQLite (better-sqlite3) note: the transaction is synchronous, so `fn` must
 * do its database work synchronously. Returning a Promise from `fn` is
 * refused (the work after its first await would run outside the
 * transaction). The Promise-returning signature is what B2 (PostgreSQL)
 * implements with a real async transaction.
 */

import { getDatabase } from '../db/index.js';
import type { Actor } from './actor.js';
import { requireActor } from './scope.js';

export class TransactionShapeError extends Error {}

export async function withTransaction<T>(actor: Actor | null | undefined, fn: (actor: Actor) => T): Promise<T> {
  const a = requireActor(actor);
  return getDatabase().transaction(() => {
    const out = fn(a);
    if (out && typeof (out as any).then === 'function') {
      throw new TransactionShapeError('withTransaction: fn must be synchronous on SQLite');
    }
    return out;
  });
}
