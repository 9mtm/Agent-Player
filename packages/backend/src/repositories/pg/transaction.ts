/**
 * Actor transactions on PostgreSQL (B2.2a): withPgActorTransaction(actor, fn)
 * is the PostgreSQL form of repositories/transaction.ts withTransaction:
 * `fn` may be async and every PostgreSQL repository call inside it (at any
 * await depth) joins the transaction; a throw rolls it back. A nested call
 * becomes a SAVEPOINT (db/pg/pool.ts).
 *
 * repositories/transaction.ts (SQLite) is unchanged and still what
 * `withTransaction` exports: while B2 is partial, the SQLite repositories
 * (teams, agents-config, ...) need their SQLite transaction. B2.2b switches
 * `withTransaction` by driver once every repository it wraps is ported.
 */

import type { Actor } from '../actor.js';
import { requireActor } from '../scope.js';
import { withPgTransaction } from '../../db/pg/pool.js';

export async function withPgActorTransaction<T>(actor: Actor | null | undefined, fn: (actor: Actor) => T | Promise<T>): Promise<Awaited<T>> {
  const a = requireActor(actor);
  return withPgTransaction(() => fn(a));
}
