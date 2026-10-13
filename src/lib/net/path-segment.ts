/**
 * SECURITY (S0-A.8): a single path segment taken from a URL parameter
 * (skill name, author slug, ...) before it is joined onto a directory.
 * Only plain names are accepted: no separators, no "." / "..", no NUL,
 * no drive letters, bounded length.
 */
export function isSafePathSegment(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    if (value.length === 0 || value.length > 128) return false;
    if (value === '.' || value === '..') return false;
    return /^[A-Za-z0-9._-]+$/.test(value) && !value.startsWith('.');
}
