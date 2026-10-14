/**
 * Dialect helpers (B2.2a) for the common SQLite forms in the B2 SQL
 * inventory, so one SQL string can be written for both drivers.
 *
 * Choice: SQL is written dialect-neutral at the call site (these helpers
 * return SQL fragments for the chosen dialect), NOT rewritten by regex at run
 * time. A runtime rewrite of `datetime(...)` / `strftime(...)` cannot be made
 * safe: arguments nest, and the right PostgreSQL form depends on the column's
 * type, which the SQL text does not show. The translated schema keeps
 * DATETIME columns as timestamptz but TEXT timestamp columns as text in the
 * SQLite string format (login_devices.expires_at is text,
 * login_attempts.attempted_at is timestamptz), and the two compare
 * differently. So every helper names the column kind it is for.
 *
 * Forms covered (SQLite -> PostgreSQL):
 *   CURRENT_TIMESTAMP into a DATETIME column  -> nowTs():   CURRENT_TIMESTAMP (both)
 *   CURRENT_TIMESTAMP / datetime('now') into a TEXT column
 *                                             -> nowText(): to_char(now() AT TIME ZONE 'UTC', ...)
 *   datetime(?) against a DATETIME column     -> tsParam(): datetime(?) | (?)::timestamptz
 *   datetime(?) against a TEXT column         -> bind textTimestamp(ms) as plain ?
 *   datetime('now', ?) offset                 -> nowPlus(): datetime('now', ?) | now() + (?)::interval
 *                                                with the bound value from offset(n, unit)
 *   CAST(strftime('%s', x) AS INTEGER)        -> epochSeconds(x, kind)
 *   INSERT OR IGNORE INTO ...                 -> insertOrIgnore(): INSERT ... ON CONFLICT DO NOTHING
 *                                                (SQLite >= 3.24 accepts that form as well)
 *   RunResult.changes                         -> runResult(): rowCount
 *   RunResult.lastInsertRowid                 -> returningId(): INSERT ... RETURNING id
 *                                                (SQLite >= 3.35 accepts RETURNING as well)
 */

export type Dialect = 'sqlite' | 'postgres';

/** How a timestamp column is stored in PostgreSQL (see the translated schema). */
export type TsKind = 'timestamptz' | 'text';

export class DialectError extends Error {}

const TEXT_NOW_PG = `to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS')`;

/** Current time for a DATETIME (timestamptz) column. */
export function nowTs(_d: Dialect): string {
  return 'CURRENT_TIMESTAMP';
}

/** Current time for a TEXT timestamp column ('YYYY-MM-DD HH:MM:SS', UTC). */
export function nowText(d: Dialect): string {
  return d === 'postgres' ? TEXT_NOW_PG : `datetime('now')`;
}

/**
 * A bound ISO-8601 timestamp compared with / written to a DATETIME column.
 * SQLite normalizes it to its text format; PostgreSQL casts it.
 */
export function tsParam(d: Dialect): string {
  return d === 'postgres' ? '(?)::timestamptz' : 'datetime(?)';
}

/** The SQLite text format of a moment: what datetime(<ISO>) gives ('YYYY-MM-DD HH:MM:SS', UTC). */
export function textTimestamp(ms: number | Date): string {
  const d = ms instanceof Date ? ms : new Date(ms);
  if (Number.isNaN(d.getTime())) throw new DialectError('textTimestamp: invalid time');
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

const UNITS = new Set(['seconds', 'minutes', 'hours', 'days']);

/**
 * A signed offset both dialects read the same way: '-60 minutes', '+7 days'.
 * (SQLite date modifiers and PostgreSQL intervals agree on this form only.)
 */
export function offset(n: number, unit: 'seconds' | 'minutes' | 'hours' | 'days'): string {
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new DialectError('offset: n must be an integer');
  if (!UNITS.has(unit)) throw new DialectError('offset: unsupported unit');
  return `${n < 0 ? '-' : '+'}${Math.abs(n)} ${unit}`;
}

/** now + a bound offset (bind offset(n, unit)), as a DATETIME value. */
export function nowPlus(d: Dialect): string {
  return d === 'postgres' ? '(now() + (?)::interval)' : `datetime('now', ?)`;
}

/**
 * now + a bound offset (bind offset(n, unit)) as TEXT in the SQLite format
 * ('YYYY-MM-DD HH:MM:SS', UTC), for comparisons with TEXT timestamp columns
 * (task_runs.finished_at, tool_approvals.requested_at, ...).
 */
export function nowPlusText(d: Dialect): string {
  return d === 'postgres'
    ? `to_char(((now() + (?)::interval) AT TIME ZONE 'UTC'), 'YYYY-MM-DD HH24:MI:SS')`
    : `datetime('now', ?)`;
}

/**
 * Current time as ISO-8601 TEXT with milliseconds and 'Z'
 * (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), for the TEXT columns that store
 * that form (personality_proposals / evolution_proposals decided_at).
 */
export function nowIsoText(d: Dialect): string {
  return d === 'postgres'
    ? `to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`
    : `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;
}

/** The scalar maximum of its arguments: SQLite MAX(a, b), PostgreSQL GREATEST(a, b). */
export function greatest(d: Dialect): string {
  return d === 'postgres' ? 'GREATEST' : 'MAX';
}

/** Null-safe equality with one bound value: `col IS ?` (SQLite), `col IS NOT DISTINCT FROM ?` (PostgreSQL). */
export function isParam(d: Dialect): string {
  return d === 'postgres' ? 'IS NOT DISTINCT FROM ?' : 'IS ?';
}

/**
 * Row lock suffix for a SELECT inside a transaction: ' FOR UPDATE' on
 * PostgreSQL (a concurrent writer waits until this transaction ends), ''
 * on SQLite (one connection; a write transaction already holds the
 * database lock).
 */
export function forUpdate(d: Dialect): string {
  return d === 'postgres' ? ' FOR UPDATE' : '';
}

/**
 * Case-insensitive LIKE: SQLite's LIKE already ignores ASCII case,
 * PostgreSQL needs ILIKE for the same match.
 */
export function likeCi(d: Dialect): string {
  return d === 'postgres' ? 'ILIKE' : 'LIKE';
}

/** Whole seconds since the epoch of `expr`, as an integer (strftime('%s', expr)). */
export function epochSeconds(d: Dialect, expr: string, kind: TsKind = 'timestamptz'): string {
  if (d === 'sqlite') return `CAST(strftime('%s', ${expr}) AS INTEGER)`;
  const ts = kind === 'text' ? `((${expr})::timestamp AT TIME ZONE 'UTC')` : `(${expr})`;
  return `CAST(floor(extract(epoch FROM ${ts})) AS bigint)`;
}

/**
 * `INSERT INTO ...` that skips rows hitting a unique/primary key.
 * Written as ON CONFLICT DO NOTHING, which both dialects accept; refuses SQL
 * that is not a plain INSERT or already has ON CONFLICT / RETURNING.
 */
export function insertOrIgnore(_d: Dialect, insertSql: string): string {
  const s = insertSql.trim().replace(/;\s*$/, '');
  if (!/^INSERT\s+INTO\s/i.test(s)) throw new DialectError('insertOrIgnore: expected INSERT INTO ...');
  if (/\bON\s+CONFLICT\b|\bRETURNING\b/i.test(s)) throw new DialectError('insertOrIgnore: SQL already has ON CONFLICT or RETURNING');
  return `${s} ON CONFLICT DO NOTHING`;
}

/** `INSERT ...` that returns the new row's `id` column (instead of lastInsertRowid). */
export function returningId(_d: Dialect, insertSql: string, column = 'id'): string {
  const s = insertSql.trim().replace(/;\s*$/, '');
  if (!/^INSERT\s/i.test(s)) throw new DialectError('returningId: expected INSERT ...');
  if (/\bRETURNING\b/i.test(s)) throw new DialectError('returningId: SQL already has RETURNING');
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(column)) throw new DialectError('returningId: bad column name');
  return `${s} RETURNING ${column}`;
}

/** better-sqlite3's RunResult shape from a node-postgres result. */
export interface RunResult {
  changes: number;
  lastInsertRowid?: number | string;
}

export function runResult(res: { rowCount: number | null; rows?: Array<Record<string, unknown>> }, idColumn?: string): RunResult {
  const out: RunResult = { changes: res.rowCount ?? 0 };
  if (idColumn && res.rows && res.rows.length > 0) {
    const v = res.rows[0][idColumn];
    if (typeof v === 'number' || typeof v === 'string') out.lastInsertRowid = v;
  }
  return out;
}

/**
 * Seconds from a TEXT timestamp column ('YYYY-MM-DD HH:MM:SS', UTC) to now,
 * as a number (B2.2c, call durations). SQLite keeps its julianday form (a
 * REAL); PostgreSQL gives the same value as double precision.
 */
export function secondsSinceText(d: Dialect, expr: string): string {
  return d === 'postgres'
    ? `extract(epoch FROM (now() - ((${expr})::timestamp AT TIME ZONE 'UTC')))::double precision`
    : `(julianday(datetime('now')) - julianday(${expr})) * 86400`;
}
