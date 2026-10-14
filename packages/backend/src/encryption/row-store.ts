/**
 * Row store of the encryption system (B2.2b-2): the key manager and the
 * credential vault run their SQL through this, so their logic and SQL exist
 * once for both drivers.
 *
 *   SQLite      a dedicated better-sqlite3 file (.data/encryption/keys.db,
 *               .data/encryption/credentials.db), as before. Calls are
 *               synchronous and return plain values, so the methods that
 *               were synchronous (vault.getById, vault.query, keys.listKeys,
 *               ...) still are on SQLite.
 *   PostgreSQL  the main PostgreSQL database (tables vault_keys and
 *               vault_credentials, from migrations-pg r002/r003). Calls
 *               return promises.
 *
 * Callers combine both with `mapMaybe()` (sync in, sync out) or `await`.
 * Transactions: on PostgreSQL `transaction(fn)` is withPgTransaction; on
 * SQLite it just runs `fn` (the SQLite behaviour is unchanged: these files
 * never used a transaction).
 */

import type Database from 'better-sqlite3';
import type { Dialect } from '../db/pg/dialect.js';
import { pgAll, pgOne, pgRun, withPgTransaction } from '../db/pg/pool.js';

export type Maybe<T> = T | Promise<T>;
export type RowParam = string | number | null;

export interface RowStore {
  readonly dialect: Dialect;
  one<T = any>(sql: string, ...params: RowParam[]): Maybe<T | undefined>;
  all<T = any>(sql: string, ...params: RowParam[]): Maybe<T[]>;
  run(sql: string, ...params: RowParam[]): Maybe<{ changes: number }>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
  close(): void;
}

function isPromise<T>(v: Maybe<T>): v is Promise<T> {
  return !!v && typeof (v as any).then === 'function';
}

/**
 * f(v) now when v is a plain value; v.then(f) when it is a promise.
 * (Not named `then`: a module exporting `then` is a thenable, and
 * `await import()` of it would call that function.)
 */
export function mapMaybe<T, U>(v: Maybe<T>, f: (value: T) => U): Maybe<U> {
  return isPromise(v) ? v.then(f) : f(v);
}

/** f(values) now when every value is plain; after Promise.all otherwise. */
export function mapAll<T extends readonly unknown[], U>(values: { [K in keyof T]: Maybe<T[K]> }, f: (values: T) => U): Maybe<U> {
  const list = values as readonly Maybe<unknown>[];
  if (list.some(isPromise)) return Promise.all(list).then((v) => f(v as unknown as T));
  return f(list as unknown as T);
}

/** A row store over one better-sqlite3 database (synchronous). */
export function sqliteRowStore(db: Database.Database): RowStore {
  return {
    dialect: 'sqlite',
    one: (sql, ...params) => db.prepare(sql).get(...params) as any,
    all: (sql, ...params) => db.prepare(sql).all(...params) as any[],
    run: (sql, ...params) => ({ changes: db.prepare(sql).run(...params).changes }),
    transaction: (fn) => fn(),
    close: () => db.close(),
  };
}

/** The row store on the main PostgreSQL database (asynchronous). */
export const pgRowStore: RowStore = {
  dialect: 'postgres',
  one: (sql, ...params) => pgOne(sql, ...params) as Promise<any>,
  all: (sql, ...params) => pgAll(sql, ...params) as Promise<any[]>,
  run: async (sql, ...params) => ({ changes: (await pgRun(sql, ...params)).changes }),
  transaction: (fn) => withPgTransaction(fn) as Promise<any>,
  close: () => undefined, // the process pool is closed by its owner
};

/** Refuse to start on PostgreSQL when the table's migration has not run. */
export async function requirePgTable(table: string, migration: string): Promise<void> {
  const row = await pgOne<{ present: boolean }>('SELECT to_regclass(?) IS NOT NULL AS present', table);
  if (!row?.present) {
    throw new Error(`PostgreSQL table ${table} is missing; run the PostgreSQL migrations (${migration})`);
  }
}
