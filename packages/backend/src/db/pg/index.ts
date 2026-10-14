/**
 * PostgreSQL driver module (B2.2a). SQLite stays the default; see config.ts
 * for the switch (AGENT_PLAYER_DB=postgres + AGENT_PLAYER_PG_URL).
 */

export { dbDriver, isPostgres, readPgConfig, parsePgUrl, isLoopbackHost, describePgTarget, PgConfigError } from './config.js';
export type { DbDriver, PgConfig } from './config.js';
export { parseInt8, parseTimestamp, ownTypeParser, makePgTypes, Int8RangeError, OID } from './types.js';
export { convertPlaceholders, toPgPlaceholders, PlaceholderError } from './placeholders.js';
export * as dialect from './dialect.js';
export {
  loadPg, createPgPool, getPgPool, setPgPool, closePgPool,
  pgAll, pgOne, pgRun, pgInsert, pgExec,
  withPgTransaction, inPgTransaction, PgTransactionError,
} from './pool.js';
export type { Param } from './pool.js';
export { runPgMigrations, listPgMigrations, STEADY_STATE, MIGRATION_LOCK_KEY, PgMigrationError } from './migrate.js';
export type { PgMigrationReport } from './migrate.js';
