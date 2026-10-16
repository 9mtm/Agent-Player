// CHAT-PRO-02 D wire contract: search inside conversations. Shared by the
// browser boundary and the local bridge: a strict allow-list of the one search
// request and a projection of its response to the reviewed fields (never error
// text). Snippets are plain text; the matches are offsets, never markup.
//
//   GET /api/chat/search?q=<text>[&projectId=<id>][&limit=<n>]   the caller's own conversations containing q

export const SEARCH_PATH = '/api/chat/search';
export const QUERY_MIN = 2;
export const QUERY_MAX = 200;
export const MAX_LIMIT = 200;
/** Conversations one answer lists (title hits and message hits of up to MAX_LIMIT messages). */
export const MAX_RESULTS = MAX_LIMIT * 2;
export const HITS_PER_CONVERSATION = 6;
export const MAX_SNIPPET = 400;
export const MAX_RANGES = 8;

const record = x => !!x && typeof x === 'object' && !Array.isArray(x);
const id = x => typeof x === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/.test(x);
const msgId = x => typeof x === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(x);
// eslint-disable-next-line no-control-regex
const badChars = /[\u0000-\u001F\u007F‪-‮⁦-⁩]/u;

/** A query the backend takes: 2-200 characters after trimming, no control characters. */
export function validQuery(x) {
  if (typeof x !== 'string' || badChars.test(x)) return false;
  const n = [...x.trim()].length;
  return x === x.trim() && n >= QUERY_MIN && n <= QUERY_MAX;
}

/** The one canonical search path (parameters in this order, the query encoded once). */
export function chatSearchPath(query, projectId, limit) {
  let p = `${SEARCH_PATH}?q=${encodeURIComponent(query)}`;
  if (projectId) p += `&projectId=${encodeURIComponent(projectId)}`;
  if (limit !== undefined) p += `&limit=${limit}`;
  return p;
}

/** { query, projectId, limit } of a canonical search path, or null. */
export function searchPath(path) {
  if (typeof path !== 'string' || path.length > 3000) return null;
  const m = /^\/api\/chat\/search\?q=([A-Za-z0-9%._~!*'()-]{1,2400})(?:&projectId=([A-Za-z0-9_-]{8,64}))?(?:&limit=([1-9]\d{0,2}))?$/.exec(path);
  if (!m) return null;
  let query;
  try { query = decodeURIComponent(m[1]); } catch { return null; }
  if (!validQuery(query) || encodeURIComponent(query) !== m[1]) return null;
  if (m[2] !== undefined && !id(m[2])) return null;
  const limit = m[3] === undefined ? undefined : Number(m[3]);
  if (limit !== undefined && limit > MAX_LIMIT) return null;
  return { query, projectId: m[2] ?? null, limit };
}

export function chatSearchRoute(path) { return typeof path === 'string' && path.startsWith(`${SEARCH_PATH}?`); }

export function allowedChatSearch(method, path, body) {
  return method === 'GET' && body === undefined && searchPath(path) !== null;
}

const fail = () => { throw Error('Invalid chat search response'); };
const when = x => (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?/.test(x) ? x.slice(0, 19) : '');
const KINDS = ['title', 'user', 'assistant'];

function hit(h) {
  if (!record(h) || !KINDS.includes(h.kind) || typeof h.snippet !== 'string' || h.snippet.length > MAX_SNIPPET || !Array.isArray(h.ranges) || h.ranges.length > MAX_RANGES) fail();
  if (h.kind === 'title' ? h.messageId !== null : !msgId(h.messageId)) fail();
  const snippet = h.snippet.replace(/[\u0000-\u001F\u007F]/g, ' ');
  let last = 0;
  const ranges = h.ranges.map(r => {
    if (!Array.isArray(r) || r.length !== 2 || !Number.isSafeInteger(r[0]) || !Number.isSafeInteger(r[1]) || r[0] < last || r[1] <= r[0] || r[1] > snippet.length) fail();
    last = r[1];
    return [r[0], r[1]];
  });
  return { kind: h.kind, messageId: h.kind === 'title' ? null : h.messageId, createdAt: when(h.createdAt), snippet, ranges };
}

function result(r) {
  if (!record(r) || !id(r.conversationId) || !Array.isArray(r.hits) || r.hits.length === 0 || r.hits.length > HITS_PER_CONVERSATION) fail();
  return {
    conversationId: r.conversationId,
    title: typeof r.title === 'string' ? r.title.slice(0, 120) : null,
    projectId: id(r.projectId) ? r.projectId : null,
    updatedAt: when(r.updatedAt),
    matchCount: Number.isSafeInteger(r.matchCount) && r.matchCount >= 0 ? Math.min(r.matchCount, MAX_LIMIT) : 0,
    hits: r.hits.map(hit),
  };
}

const codes = ['invalid_request', 'read_only_stage'];

export function chatSearchResponse(path, status, body) {
  const parsed = searchPath(path);
  if (parsed === null) fail();
  if (status !== 200) { const code = record(body) ? body.code : undefined; return codes.includes(code) ? { code } : null; }
  if (!record(body) || body.query !== parsed.query || !Array.isArray(body.results) || body.results.length > MAX_RESULTS) fail();
  return { query: parsed.query, results: body.results.map(result), truncated: body.truncated === true };
}
