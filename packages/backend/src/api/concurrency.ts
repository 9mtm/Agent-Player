/**
 * Optimistic concurrency helpers (BE-UI-01).
 *
 * A client sends the version it last read either as `expectedVersion` in
 * the JSON body or as `If-Match: "<version>"` (weak `W/"3"` and bare `3`
 * are accepted; `*` means "any version"). Absent -> no check (older
 * clients); the new UI always sends it. Responses carry `version` and an
 * `ETag: "<version>"` header.
 */

export class VersionInputError extends Error {}

/** Expected version from body/header: a positive integer, null (no check), or throws VersionInputError. */
export function expectedVersionFrom(body: unknown, ifMatch: unknown): number | null {
  const fromBody = body && typeof body === 'object' ? (body as Record<string, unknown>).expectedVersion : undefined;
  let fromHeader: number | null | undefined;
  const raw = Array.isArray(ifMatch) ? ifMatch[0] : ifMatch;
  if (typeof raw === 'string' && raw.trim()) {
    const v = raw.trim();
    if (v === '*') fromHeader = null;
    else {
      const m = /^(?:W\/)?"?(\d{1,12})"?$/.exec(v);
      if (!m) throw new VersionInputError('If-Match must be a version, e.g. "3"');
      fromHeader = Number(m[1]);
    }
  }
  let fromBodyNum: number | undefined;
  if (fromBody !== undefined && fromBody !== null) {
    if (typeof fromBody !== 'number' || !Number.isInteger(fromBody) || fromBody < 1) throw new VersionInputError('expectedVersion must be a positive integer');
    fromBodyNum = fromBody;
  }
  if (fromBodyNum !== undefined && typeof fromHeader === 'number' && fromHeader !== fromBodyNum) {
    throw new VersionInputError('expectedVersion and If-Match disagree');
  }
  return fromBodyNum ?? (typeof fromHeader === 'number' ? fromHeader : null);
}

export const etag = (version: number) => `"${version}"`;
