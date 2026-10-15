// CHAT-REBUILD-01 wire contract: saved conversations and resumable chat runs.
// Shared by the browser boundary and the local bridge: a strict allow-list of
// requests, a projection of every response to the reviewed fields (never error
// text), and the parser for a run's numbered event stream.

export const CONVERSATIONS_PATH = '/api/chat/conversations';
export const MAX_MESSAGE = 100000;
export const MAX_TITLE = 120;
/** One reader connection lasts at most this long; the client re-attaches with after=<seq>. */
export const RUN_STREAM_MS = 5 * 60 * 1000;
/** No byte (event or heartbeat) for this long ends a reader connection. */
export const RUN_IDLE_MS = 45 * 1000;
/** One SSE frame of a run (tool output is cut to 6,000 characters by the server). */
export const RUN_FRAME_BYTES = 128 * 1024;

const record = x => !!x && typeof x === 'object' && !Array.isArray(x);
const onlyKeys = (x, keys) => Object.keys(x).every(k => keys.includes(k));
const uuid = x => typeof x === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/.test(x);
export const validRunId = x => typeof x === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{7,127}$/.test(x);
const agentId = x => typeof x === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(x) && !x.includes('..');
// eslint-disable-next-line no-control-regex
const badChars = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;
const text = (x, max) => typeof x === 'string' && x.length <= max && !badChars.test(x);
const title = x => typeof x === 'string' && x.length <= MAX_TITLE && !/[\u0000-\u001F\u007F]/.test(x);
const str = (x, max) => (typeof x === 'string' ? x.slice(0, max) : '');
const num = x => (Number.isFinite(x) && x >= 0 ? Math.round(x) : undefined);

/** The conversation path this request names, or null. */
export function conversationPath(path) {
  if (path === CONVERSATIONS_PATH) return { kind: 'list' };
  let m = /^\/api\/chat\/conversations\/([^/?#]+)$/.exec(path);
  if (m) return uuid(m[1]) ? { kind: 'one', id: m[1] } : null;
  m = /^\/api\/chat\/conversations\/([^/?#]+)\/messages$/.exec(path);
  if (m) return uuid(m[1]) ? { kind: 'messages', id: m[1] } : null;
  m = /^\/api\/chat\/conversations\/([^/?#]+)\/runs$/.exec(path);
  if (m) return uuid(m[1]) ? { kind: 'runs', id: m[1] } : null;
  m = /^\/api\/chat\/runs\/([^/?#]+)\/events(?:\?after=(0|[1-9]\d{0,8}))?$/.exec(path);
  if (m) return validRunId(m[1]) ? { kind: 'events', run: m[1], after: Number(m[2] ?? 0) } : null;
  m = /^\/api\/chat\/runs\/([^/?#]+)\/stop$/.exec(path);
  if (m) return validRunId(m[1]) ? { kind: 'stop', run: m[1] } : null;
  return null;
}

export function conversationRoute(path) { return conversationPath(path) !== null; }

export function allowedConversation(method, path, body) {
  const p = conversationPath(path);
  if (!p) return false;
  if (method === 'GET') return body === undefined && ['list', 'messages', 'events'].includes(p.kind);
  if (method === 'DELETE') return body === undefined && p.kind === 'one';
  if (method === 'POST' && p.kind === 'list') return record(body) && onlyKeys(body, ['title', 'agentId']) && (body.title === undefined || title(body.title)) && (body.agentId === undefined || agentId(body.agentId));
  if (method === 'POST' && p.kind === 'runs') return record(body) && onlyKeys(body, ['runId', 'message', 'model']) && validRunId(body.runId) && text(body.message, MAX_MESSAGE) && body.message.trim().length > 0
    && (body.model === undefined || (typeof body.model === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:\/-]{0,99}$/.test(body.model)));
  if (method === 'POST' && p.kind === 'stop') return body === undefined;
  if (method === 'PUT' && p.kind === 'one') return record(body) && Object.keys(body).length > 0 && onlyKeys(body, ['title', 'pinned']) && (body.title === undefined || body.title === null || title(body.title)) && (body.pinned === undefined || typeof body.pinned === 'boolean');
  return false;
}

function conversation(x) {
  if (!record(x) || !uuid(x.id)) throw Error('protocol');
  return { id: x.id, title: typeof x.title === 'string' ? x.title.slice(0, MAX_TITLE) : null, agentId: agentId(x.agentId) ? x.agentId : null,
    pinned: x.pinned === true, preview: str(x.preview, 200), createdAt: str(x.createdAt, 40), updatedAt: str(x.updatedAt, 40) };
}

function call(x) {
  if (!record(x)) throw Error('protocol');
  return { id: str(x.id, 128), name: str(x.name, 128), input: str(x.input, 8000),
    ...(typeof x.output === 'string' ? { output: x.output.slice(0, 12000) } : {}),
    ...(typeof x.isError === 'boolean' ? { isError: x.isError } : {}), ...(num(x.ms) !== undefined ? { ms: num(x.ms) } : {}) };
}

function part(x) {
  if (!record(x)) throw Error('protocol');
  if (x.kind === 'text') return { kind: 'text', text: str(x.text, 1000000) };
  if (x.kind === 'reasoning') return { kind: 'reasoning', text: str(x.text, 1000000), ...(num(x.ms) !== undefined ? { ms: num(x.ms) } : {}) };
  if (x.kind === 'tools' && Array.isArray(x.calls) && x.calls.length <= 200) return { kind: 'tools', step: num(x.step) ?? 0, calls: x.calls.map(call) };
  return null;
}

function message(x) {
  if (!record(x) || !['user', 'assistant', 'system'].includes(x.role) || typeof x.content !== 'string') throw Error('protocol');
  const parts = Array.isArray(x.parts) && x.parts.length <= 5000 ? x.parts.map(part).filter(Boolean) : null;
  return { id: str(x.id, 64), role: x.role, content: x.content.slice(0, 1000000), parts,
    status: ['complete', 'stopped', 'error'].includes(x.status) ? x.status : 'complete',
    runId: validRunId(x.runId) ? x.runId : null, durationMs: num(x.durationMs) ?? null, createdAt: str(x.createdAt, 40) };
}

const ERROR_CODES = { 400: ['invalid_request'], 404: ['not_found'], 409: ['conversation_busy', 'run_id_reused'], 429: ['rate_limited'] };

/** Reviewed fields only. Throws on a malformed success body. */
export function conversationResponse(path, status, body) {
  const p = conversationPath(path);
  if (!p) throw Error('protocol');
  if (status !== 200 && status !== 201 && status !== 202) {
    const code = record(body) ? body.code : undefined;
    if (!(ERROR_CODES[status] ?? []).includes(code)) return null;
    return { code, ...(code === 'conversation_busy' && validRunId(body.runId) ? { runId: body.runId } : {}) };
  }
  if (!record(body)) throw Error('protocol');
  if (p.kind === 'list' && status === 200) {
    if (!Array.isArray(body.conversations) || body.conversations.length > 1000) throw Error('protocol');
    return { conversations: body.conversations.map(conversation) };
  }
  if (p.kind === 'list' || (p.kind === 'one' && record(body.conversation))) return { conversation: conversation(body.conversation) };
  if (p.kind === 'one') { if (body.ok !== true) throw Error('protocol'); return { ok: true }; }
  if (p.kind === 'messages') {
    if (!Array.isArray(body.messages) || body.messages.length > 20000) throw Error('protocol');
    return { conversation: conversation(body.conversation), messages: body.messages.map(message), activeRunId: validRunId(body.activeRunId) ? body.activeRunId : null };
  }
  if (p.kind === 'runs') {
    if (!validRunId(body.runId)) throw Error('protocol');
    return { runId: body.runId, ...(body.replayed === true ? { replayed: true } : {}), ...(record(body.userMessage) ? { userMessage: message(body.userMessage) } : {}) };
  }
  if (p.kind === 'stop') return { ok: body.ok === true, status: ['stopping', 'complete', 'stopped', 'error'].includes(body.status) ? body.status : 'stopping' };
  throw Error('protocol');
}

/** One run event, reduced to the reviewed fields; undefined for kinds the UI does not show. */
export function projectRunEvent(x) {
  const e = projectEvent(x);
  return e && num(x.at) !== undefined ? { ...e, at: num(x.at) } : e;
}
function projectEvent(x) {
  if (!record(x) || !Number.isSafeInteger(x.seq) || x.seq < 1) throw Error('protocol');
  const seq = x.seq;
  if (x.type === 'text' || x.type === 'reasoning') return { seq, type: x.type, content: str(x.content, RUN_FRAME_BYTES) };
  if (x.type === 'tool_start' && Array.isArray(x.tools) && x.tools.length <= 64) {
    return { seq, type: 'tool_start', step: num(x.step) ?? 0, tools: x.tools.map(t => ({ id: str(t?.id, 128), name: str(t?.name, 128), input: str(t?.input, 8000) })) };
  }
  if (x.type === 'tool_result' && Array.isArray(x.results) && x.results.length <= 64) {
    return { seq, type: 'tool_result', step: num(x.step) ?? 0, results: x.results.map(r => ({ id: str(r?.id, 128), name: str(r?.name, 128), output: str(r?.output, 12000), isError: r?.isError === true, ...(num(r?.ms) !== undefined ? { ms: num(r.ms) } : {}) })) };
  }
  if (x.type === 'end' && ['complete', 'stopped', 'error'].includes(x.status)) {
    return { seq, type: 'end', status: x.status, ms: num(x.ms) ?? 0, ...(x.code === 'model_unavailable' ? { code: 'model_unavailable' } : {}) };
  }
  return undefined;
}

/** Incremental parser for a run's SSE stream: numbered frames in order, comments ignored. */
export class RunEventParser {
  constructor(after = 0) { this.last = after; this.decoder = new TextDecoder('utf-8', { fatal: true }); this.line = ''; this.data = []; this.size = 0; this.cr = false; this.ended = false; }
  push(bytes) { return this.consume(this.decoder.decode(bytes, { stream: true })); }
  consume(chunk) {
    const out = [];
    for (const ch of chunk) {
      if (this.cr) { this.cr = false; if (ch === '\n') continue; }
      if (ch === '\r' || ch === '\n') {
        if (this.line === '') {
          if (this.data.length) {
            const frame = projectRunEvent(JSON.parse(this.data.join('\n')));
            this.data = []; this.size = 0;
            if (frame && frame.seq > this.last) {
              if (this.ended) throw Error('protocol');
              this.last = frame.seq; if (frame.type === 'end') this.ended = true; out.push(frame);
            }
          }
        } else if (this.line.startsWith('data:')) this.data.push(this.line.slice(5).replace(/^ /, ''));
        this.line = ''; this.cr = ch === '\r';
      } else {
        this.line += ch;
        if (++this.size > RUN_FRAME_BYTES) throw Error('limit');
      }
    }
    return out;
  }
  finish() { this.consume(this.decoder.decode()); }
}
