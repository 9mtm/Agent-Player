/**
 * PostgreSQL result type parsers (B2.2a): make rows look like the rows
 * better-sqlite3 returns today, so repository callers see no difference.
 *
 *   int8 (bigint, OID 20)       -> number. The translated schema maps every
 *                                  SQLite INTEGER to bigint, and COUNT(*) is
 *                                  bigint; SQLite returns these as numbers.
 *                                  A value outside Number.MAX_SAFE_INTEGER is
 *                                  refused (Int8RangeError) instead of being
 *                                  rounded silently.
 *   timestamptz (OID 1184)      -> 'YYYY-MM-DD HH:MM:SS[.ffffff]' in UTC, the
 *   timestamp   (OID 1114)         SQLite CURRENT_TIMESTAMP format. Whole
 *                                  seconds give exactly the SQLite string; a
 *                                  fraction (now() has microseconds) is kept,
 *                                  so a value read and written back compares
 *                                  equal. api/timestamps.ts isoUtc() reads
 *                                  both forms.
 *   date (OID 1082)             -> 'YYYY-MM-DD' string (pg's default makes a
 *                                  local-time Date).
 *
 * Sessions run with TimeZone=UTC (pool.ts), so timestamptz text arrives as
 * '... +00'. Any other offset is converted to UTC (millisecond precision).
 * 'infinity' / '-infinity' are passed through unchanged.
 *
 * The parsers are attached per pool (a `types` object), never through the
 * global pg.types registry, so no other pg user in the process is affected.
 *
 * No runtime import of 'pg' here (SQLite mode must load without pg
 * installed): pool.ts loads pg lazily and passes its default parsers in.
 */

import type pg from 'pg';

/** pg's own parser lookup (pg.types.getTypeParser), used for every other type. */
export type FallbackTypeParser = (oid: number, format: 'text' | 'binary') => (value: string) => unknown;

export const OID = { INT8: 20, TIMESTAMP: 1114, TIMESTAMPTZ: 1184, DATE: 1082 } as const;

export class Int8RangeError extends RangeError {}

/** bigint text -> number; refuses values a JS number cannot hold exactly. */
export function parseInt8(text: string): number {
  if (!/^-?\d+$/.test(text)) throw new Int8RangeError('int8 value is not an integer');
  const n = Number(text);
  if (!Number.isSafeInteger(n)) {
    throw new Int8RangeError('int8 value is outside the safe integer range (|n| > 2^53 - 1); read it as text');
  }
  return n;
}

const PG_TS = /^(\d{4,}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})(\.\d+)?(?:([+-])(\d{2})(?::?(\d{2}))?(?::?(\d{2}))?)?( BC)?$/;

function pad(n: number, w = 2): string {
  return String(n).padStart(w, '0');
}

/** timestamptz / timestamp text -> 'YYYY-MM-DD HH:MM:SS[.f]' (UTC). */
export function parseTimestamp(text: string): string {
  const m = PG_TS.exec(text);
  if (!m) return text; // infinity, -infinity, anything unexpected: unchanged
  const [, date, time, frac = '', sign, oh, om, os, bc] = m;
  if (bc) return text;
  if (!sign || (Number(oh) === 0 && Number(om ?? 0) === 0 && Number(os ?? 0) === 0)) return `${date} ${time}${frac}`;
  // Non-UTC offset: convert (ms precision; sessions use UTC so this is rare).
  const offsetSec = (sign === '-' ? -1 : 1) * (Number(oh) * 3600 + Number(om ?? 0) * 60 + Number(os ?? 0));
  const ms = Date.parse(`${date}T${time}${frac.slice(0, 4)}Z`) - offsetSec * 1000;
  if (Number.isNaN(ms)) return text;
  const d = new Date(ms);
  const base = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  return d.getUTCMilliseconds() ? `${base}.${pad(d.getUTCMilliseconds(), 3)}` : base;
}

function identity(text: string): string {
  return text;
}

/** Our text-format parser for an OID, or null when pg's default applies. */
export function ownTypeParser(oid: number, format: 'text' | 'binary' = 'text'): ((value: string) => unknown) | null {
  if (format !== 'text') return null;
  if (oid === OID.INT8) return parseInt8;
  if (oid === OID.TIMESTAMPTZ || oid === OID.TIMESTAMP) return parseTimestamp;
  if (oid === OID.DATE) return identity;
  return null;
}

/** The `types` option for a pg Pool/Client: ours first, then `fallback` (pg's defaults). */
export function makePgTypes(fallback: FallbackTypeParser): pg.CustomTypesConfig {
  const getTypeParser = (oid: number, format: 'text' | 'binary' = 'text') => ownTypeParser(oid, format) ?? fallback(oid, format);
  return { getTypeParser } as unknown as pg.CustomTypesConfig;
}
