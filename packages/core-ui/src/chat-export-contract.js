// CHAT-PRO-02 F wire contract: export a conversation as Markdown. Shared by the
// browser boundary and the local bridge: a strict allow-list of the one export
// request and a projection of its answer to the reviewed fields (never error
// text). The page turns the Markdown into a file itself (no server file).
//
//   GET /api/chat/conversations/:id/export[?tools=1]   the caller's own conversation as Markdown

/** UTF-16 units the Markdown may have (the backend caps it at 1.5 MB of UTF-8). */
export const MAX_MARKDOWN = 1_500_000;
export const MAX_FILENAME = 90;

const record = x => !!x && typeof x === 'object' && !Array.isArray(x);
const conversationId = x => typeof x === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/.test(x);
const count = x => Number.isSafeInteger(x) && x >= 0 && x <= 1_000_000;

/** The one export path for a conversation. */
export const chatExportPath = (id, tools = false) => `/api/chat/conversations/${id}/export${tools ? '?tools=1' : ''}`;

/** { id, tools } of an export path, or null. */
export function exportPath(path) {
  if (typeof path !== 'string') return null;
  const m = /^\/api\/chat\/conversations\/([^/?#]+)\/export(\?tools=1)?$/.exec(path);
  return m && conversationId(m[1]) ? { id: m[1], tools: m[2] !== undefined } : null;
}

export function chatExportRoute(path) { return typeof path === 'string' && path.startsWith('/api/chat/conversations/') && /\/export(\?|$)/.test(path) && exportPath(path) !== null; }

export function allowedChatExport(method, path, body) {
  return method === 'GET' && body === undefined && exportPath(path) !== null;
}

/** A file name that is safe to save: no path parts or control characters, ends in .md. */
export function safeFilename(x) {
  if (typeof x !== 'string') return 'conversation.md';
  // eslint-disable-next-line no-control-regex
  const base = x.replace(/\.md$/i, '').replace(/[\u0000-\u001F\u007F/\\:*?"<>|‪-‮⁦-⁩]+/gu, ' ').replace(/\s+/g, ' ').trim().replace(/^[.\s]+|[.\s]+$/g, '');
  const cut = [...base].slice(0, MAX_FILENAME - 3).join('').trim();
  return `${cut || 'conversation'}.md`;
}

const fail = () => { throw Error('Invalid chat export response'); };
const codes = ['not_found', 'invalid_request', 'read_only_stage'];

export function chatExportResponse(path, status, body) {
  if (exportPath(path) === null) fail();
  if (status !== 200) { const code = record(body) ? body.code : undefined; return codes.includes(code) ? { code } : null; }
  if (!record(body) || typeof body.markdown !== 'string' || body.markdown.length === 0 || body.markdown.length > MAX_MARKDOWN) fail();
  if (!count(body.turns) || !count(body.totalTurns) || body.turns > body.totalTurns || !count(body.redacted)) fail();
  return {
    filename: safeFilename(body.filename),
    markdown: body.markdown,
    turns: body.turns, totalTurns: body.totalTurns,
    truncated: body.truncated === true,
    redacted: body.redacted,
  };
}
