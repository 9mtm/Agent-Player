/**
 * Pure helpers for app/storage/[...path]/route.ts (CL-05), kept separate so
 * they can be unit-tested.
 */

/** Response headers copied from the backend upload response. */
export const FORWARDED_HEADERS = [
  'content-type',
  'content-length',
  'cache-control',
  'content-security-policy',
  'x-content-type-options',
  'content-disposition',
] as const;

/**
 * Backend URL for a `/storage/<segments>` request, or null when a segment is
 * unsafe. Each segment is re-encoded so the backend sees the same path.
 */
export function backendUploadUrl(backendUrl: string, segments: string[] | undefined): string | null {
  if (!Array.isArray(segments) || segments.length === 0 || segments.length > 32) return null;
  for (const s of segments) {
    if (typeof s !== 'string' || s === '' || s === '.' || s === '..' || s.length > 255) return null;
    if (/[\x00-\x1f\x7f\\/]/.test(s)) return null;
  }
  return `${backendUrl.replace(/\/+$/, '')}/api/uploads/${segments.map(encodeURIComponent).join('/')}`;
}
