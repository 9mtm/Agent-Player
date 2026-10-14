/**
 * PostgreSQL migration runner (B2.2a) for src/db/migrations-pg/ (generated
 * by scripts/pg/translate-migrations.mjs).
 *
 * Same bookkeeping as the SQLite runner (db/database.ts): table `migrations`
 * (id, name, applied_at); id = file name up to the first '_' ('040b' is its
 * own id), name = file name without '.sql'; files run in name order and every
 * id not yet in the table is applied.
 *
 * Differences, on purpose:
 *  - 000_schema.sql (schema.sql + the migrations table) runs once, on an
 *    empty database: it runs when the `migrations` table does not exist yet,
 *    in the same transaction that creates it. The SQLite runner replays
 *    schema.sql on every start; here a later change to schema.sql must come
 *    as a migration.
 *  - That replay is also why SQLite ends up with the two old audit_logs
 *    indexes: migration 035 rebuilds audit_logs (dropping them) and the next
 *    start's schema.sql adds them back. STEADY_STATE recreates exactly those
 *    two, idempotently, after every run, so PostgreSQL matches SQLite without
 *    a PG-only migration id (which the translator would flag as stale and a
 *    later SQLite migration could collide with). SQLite is unchanged.
 *  - Each migration runs in its own transaction with its `migrations` row.
 *  - A session advisory lock (MIGRATION_LOCK_KEY) is held for the whole run:
 *    a second runner waits, then sees the migrations as applied.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const DEFAULT_PG_MIGRATIONS_DIR = join(__dirname, '..', 'migrations-pg');
export const SCHEMA_FILE = '000_schema.sql';
/** pg_advisory_lock key of the runner ('AP_M' as an integer). */
export const MIGRATION_LOCK_KEY = 0x41505f4d;

/** Idempotent statements applied after every run (see the header). */
export const STEADY_STATE: readonly string[] = [
  'CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs (user_id)',
  'CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at)',
];

export class PgMigrationError extends Error {}

export interface PgMigrationFile {
  id: string;
  name: string;
  file: string;
}

export interface PgMigrationReport {
  schemaApplied: boolean;
  applied: string[];
  alreadyApplied: number;
}

/** Migration files of `dir` (without 000_schema.sql), in run order; refuses duplicate ids. */
export function listPgMigrations(dir: string = DEFAULT_PG_MIGRATIONS_DIR): PgMigrationFile[] {
  if (!existsSync(join(dir, SCHEMA_FILE))) throw new PgMigrationError(`${SCHEMA_FILE} is missing in the migrations directory`);
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql') && f !== SCHEMA_FILE).sort();
  const seen = new Map<string, string>();
  return files.map((file) => {
    const id = file.split('_')[0];
    const other = seen.get(id);
    if (other) throw new PgMigrationError(`duplicate migration id ${id}: ${other} and ${file}`);
    seen.set(id, file);
    return { id, name: file.replace(/\.sql$/, ''), file };
  });
}

async function inTx(client: pg.PoolClient, work: () => Promise<void>): Promise<void> {
  await client.query('BEGIN');
  try {
    await work();
    const done = await client.query('COMMIT');
    if (done.command !== 'COMMIT') throw new PgMigrationError('migration transaction was rolled back');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  }
}

/**
 * Apply 000_schema.sql (empty database only) and every pending migration.
 * `log` gets one line per step (file names only).
 */
export async function runPgMigrations(
  pool: pg.Pool,
  opts: { dir?: string; log?: (line: string) => void } = {},
): Promise<PgMigrationReport> {
  const dir = opts.dir ?? DEFAULT_PG_MIGRATIONS_DIR;
  const log = opts.log ?? (() => undefined);
  const migrations = listPgMigrations(dir);
  const client = await pool.connect();
  let discard = false;
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    try {
      const report: PgMigrationReport = { schemaApplied: false, applied: [], alreadyApplied: 0 };
      const reg = await client.query(`SELECT to_regclass('migrations') IS NOT NULL AS present`);
      if (!reg.rows[0].present) {
        const sql = readFileSync(join(dir, SCHEMA_FILE), 'utf8');
        await inTx(client, async () => { await client.query(sql); });
        report.schemaApplied = true;
        log(`applied ${SCHEMA_FILE}`);
      }
      const done = new Set((await client.query('SELECT id FROM migrations')).rows.map((r) => String(r.id)));
      for (const m of migrations) {
        if (done.has(m.id)) { report.alreadyApplied++; continue; }
        const sql = readFileSync(join(dir, m.file), 'utf8');
        await inTx(client, async () => {
          await client.query(sql);
          await client.query('INSERT INTO migrations (id, name) VALUES ($1, $2)', [m.id, m.name]);
        });
        report.applied.push(m.id);
        log(`applied ${m.file}`);
      }
      await inTx(client, async () => {
        for (const stmt of STEADY_STATE) await client.query(stmt);
      });
      return report;
    } finally {
      try {
        await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
      } catch {
        discard = true; // closing the session releases the lock
      }
    }
  } finally {
    client.release(discard ? true : undefined);
  }
}
