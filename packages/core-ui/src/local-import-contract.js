// Wire contract for importing memories from other agents on this computer
// (MEM-IMPORT-01), shared by the browser client and the local bridge. Owner only.

const ID = /^[0-9a-f]{32}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const record = x => typeof x === 'object' && x !== null && !Array.isArray(x);
const str = (x, max) => (typeof x === 'string' ? x.slice(0, max) : null);
const n = x => (Number.isSafeInteger(x) && x >= 0 ? x : 0);
export const LOCAL_IMPORT_PATH = '/api/memory/import/local';
export const MAX_IMPORT_SESSIONS = 20;

export function localImportPath(path) {
  if (path === LOCAL_IMPORT_PATH) return { kind: 'local' };
  const m = /^\/api\/memory\/import\/local\/jobs\/([^/?#]+)$/.exec(path);
  return m && UUID.test(m[1]) ? { kind: 'job', id: m[1] } : null;
}
export function localImportRoute(path) { return localImportPath(path) !== null; }

export function allowedLocalImport(method, path, body) {
  const p = localImportPath(path);
  if (!p) return false;
  if (method === 'GET') return body === undefined;
  return p.kind === 'local' && method === 'POST' && record(body) && Object.keys(body).length === 1 && Array.isArray(body.sessionIds)
    && body.sessionIds.length >= 1 && body.sessionIds.length <= MAX_IMPORT_SESSIONS && body.sessionIds.every(x => typeof x === 'string' && ID.test(x)) && new Set(body.sessionIds).size === body.sessionIds.length;
}

function job(x) {
  if (!record(x) || typeof x.id !== 'string' || !UUID.test(x.id)) return null;
  return { id: x.id, total: n(x.total), done: n(x.done), proposed: n(x.proposed), errors: n(x.errors), status: ['running', 'done', 'error'].includes(x.status) ? x.status : 'error', notice: str(x.notice, 300) };
}
const CODES = { 400: ['invalid_input'], 403: ['not_loopback', 'forbidden'], 404: ['not_found'], 409: ['import_running'] };
/** Reviewed fields only (stable when applied twice). */
export function localImportResponse(path, status, body) {
  const p = localImportPath(path);
  if (!p) throw Error('protocol');
  if (status !== 200 && status !== 202) { const code = record(body) ? body.code : undefined; return (CODES[status] ?? []).includes(code) ? { code } : null; }
  if (!record(body)) throw Error('protocol');
  if (p.kind === 'job' || status === 202) { const j = job(body.job); if (!j) throw Error('protocol'); return { job: j }; }
  if (!Array.isArray(body.sessions)) throw Error('protocol');
  const j = job(body.job);
  return { archive: str(body.archive, 200) ?? '', ...(j ? { job: j } : {}),
    sessions: body.sessions.slice(0, 400).filter(s => record(s) && typeof s.id === 'string' && ID.test(s.id) && ['claude-code', 'codex'].includes(s.source)).map(s => ({
      id: s.id, source: s.source, cwd: str(s.cwd, 1024), title: str(s.title, 200) ?? '', startedAt: str(s.startedAt, 40), updatedAt: str(s.updatedAt, 40) ?? '', bytes: n(s.bytes), turns: n(s.turns),
      imported: record(s.imported) ? { importedAt: str(s.imported.importedAt, 40) ?? '', proposed: n(s.imported.proposed) } : null })) };
}
