/**
 * API timestamps (BE-UI-01): every timestamp the new UI reads is returned as
 * ISO-8601 UTC with `Z` (e.g. "2026-10-14T10:00:00.000Z"). The database keeps
 * its own format (SQLite `datetime('now')` = "YYYY-MM-DD HH:MM:SS", UTC);
 * conversion happens only here, at the API layer.
 */

const SQLITE_UTC = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)$/;

/** ISO-8601 UTC with Z, or null for empty/unparseable values. */
export function isoUtc(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    // Seconds vs milliseconds since the epoch.
    const d = new Date(value < 1e12 ? value * 1000 : value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value !== 'string') return null;
  const m = SQLITE_UTC.exec(value.trim());
  // A naive SQLite timestamp is UTC: add the Z before parsing.
  const d = new Date(m ? `${m[1]}T${m[2]}Z` : value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Copy of `obj` with the named fields converted by isoUtc (fields that are absent stay absent). */
export function withIsoFields<T extends Record<string, any>>(obj: T, fields: readonly string[]): T {
  if (!obj || typeof obj !== 'object') return obj;
  const out: Record<string, any> = { ...obj };
  for (const f of fields) if (f in out) out[f] = isoUtc(out[f]);
  return out as T;
}

/** isoUtc(value) + hours, or null. */
export function isoPlusHours(value: unknown, hours: number): string | null {
  const iso = isoUtc(value);
  return iso ? new Date(Date.parse(iso) + hours * 3_600_000).toISOString() : null;
}
