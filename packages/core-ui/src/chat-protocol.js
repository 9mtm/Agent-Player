// Shared browser/bridge contract. No dependencies, I/O, logging or raw error relay.
export const CHAT_BYTES = 1024 * 1024;
export const FRAME_BYTES = 64 * 1024;
export const REQUEST_BYTES = 128 * 1024;
export const CHAT_DEADLINE_MS = 120000;
export const CHAT_IDLE_MS = 30000;
export const record = x => x !== null && typeof x === 'object' && !Array.isArray(x);
export const validKey = x => typeof x === 'string' && /^[A-Za-z0-9_.:-]{8,128}$/.test(x);
export const validId = x => typeof x === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(x) && !x.includes('..');
const own = (x, keys) => Object.keys(x).every(k => keys.includes(k));
const encoder = new TextEncoder();
export function validChatBody(b) {
  return record(b) && own(b, ['messages', 'stream', 'sessionId', 'agentId']) && b.stream === true
    && validId(b.sessionId) && (b.agentId === undefined || validId(b.agentId))
    && Array.isArray(b.messages) && b.messages.length > 0 && b.messages.length <= 64
    && b.messages.every((m, i) => record(m) && own(m, ['role', 'content']) && m.role === (i % 2 ? 'assistant' : 'user')
      && typeof m.content === 'string' && m.content.length <= 32768 && (m.role !== 'user' || m.content.trim().length > 0))
    && b.messages.at(-1).role === 'user' && encoder.encode(JSON.stringify(b)).length <= REQUEST_BYTES;
}
export function chatError(status, body) {
  const code = record(body) ? body.code : undefined;
  const ids = record(body) && validId(body.runId) && validId(body.messageId) ? { runId: body.runId, messageId: body.messageId } : {};
  if (status === 409 && code === 'idempotency_in_progress' && ids.runId) return { code, ...ids };
  if ((status === 422 && code === 'idempotency_key_reused') || (status === 400 && code === 'invalid_idempotency_key')
    || (status === 401 && code === 'unauthenticated') || (status === 403 && ['inactive_user', 'forbidden', 'origin_not_allowed'].includes(code))
    || (status === 429 && code === 'rate_limited') || ([421, 502].includes(status) && code === 'host_not_allowed')) return { code, ...ids };
  return ids.runId ? ids : null;
}
export function projectFrame(x) {
  if (!record(x) || !validId(x.runId) || !validId(x.messageId)) throw Error('protocol');
  const base = { runId: x.runId, messageId: x.messageId };
  for (const k of ['done', 'replayed', 'incomplete', 'truncated']) {
    if (x[k] !== undefined && typeof x[k] !== 'boolean') throw Error('protocol');
    if (x[k] !== undefined) base[k] = x[k];
  }
  if (x.type !== undefined && typeof x.type !== 'string') throw Error('protocol');
  if (x.type === undefined || x.type === 'text') {
    if (typeof x.content !== 'string' || (x.type === undefined && typeof x.done !== 'boolean')) throw Error('protocol');
    return { ...base, ...(x.type ? { type: x.type } : {}), content: x.content };
  }
  if (x.type === 'done') {
    if (x.done === false || (x.content !== undefined && x.content !== '')) throw Error('protocol');
    return { ...base, type: 'done', done: true };
  }
  if (x.type === 'error') {
    if (typeof x.error !== 'string') throw Error('protocol');
    // Backend has one typed stream error. Never relay exception details.
    return { ...base, type: 'error', error: 'Chat request failed', ...(x.code === 'model_unavailable' ? { code: 'model_unavailable' } : {}) };
  }
  if (x.type === 'tool_start' || x.type === 'tool_result') {
    if (x.done === true) throw Error('protocol');
    if (!Number.isSafeInteger(x.step) || x.step < 0) throw Error('protocol');
    // No tool inputs/results or arbitrary fields cross this bounded chat surface.
    return { ...base, type: x.type, step: x.step };
  }
  return undefined; // Unknown event kinds cannot complete a turn or render arbitrary data.
}
export class SSEParser {
  constructor(ids) {
    this.ids = ids; this.decoder = new TextDecoder('utf-8', { fatal: true });
    this.bytes = 0; this.frames = 0; this.line = ''; this.data = []; this.frameSize = 0;
    this.cr = false; this.terminal = false; this.failed = false;
  }
  push(bytes) {
    if (this.failed) throw Error('protocol');
    try {
      this.bytes += bytes.byteLength;
      if (this.bytes > CHAT_BYTES) throw Error('limit');
      return this.consume(this.decoder.decode(bytes, { stream: true }));
    } catch { this.failed = true; throw Error('protocol'); }
  }
  consume(text) {
    const out = [];
    for (const ch of text) {
      if (this.cr) { this.cr = false; if (ch === '\n') continue; }
      if (ch === '\r' || ch === '\n') {
        this.frameSize += encoder.encode(this.line).length + 1;
        if (this.frameSize > FRAME_BYTES) throw Error('limit');
        if (this.line === '') {
          if (this.data.length) {
            if (++this.frames > 4096 || this.terminal) throw Error('protocol');
            const raw = JSON.parse(this.data.join('\n'));
            const frame = projectFrame(raw);
            if (this.ids && (raw.runId !== this.ids.runId || raw.messageId !== this.ids.messageId)) throw Error('protocol');
            this.ids ??= { runId: raw.runId, messageId: raw.messageId };
            if (frame) { this.terminal = frame.done === true || frame.type === 'done' || frame.type === 'error'; out.push(frame); }
          }
          this.data = []; this.frameSize = 0;
        } else if (this.line === 'data' || this.line.startsWith('data:')) {
          this.data.push(this.line === 'data' ? '' : this.line.slice(5).replace(/^ /, ''));
        } // Comments and SSE metadata (including retry/id/event) are inert.
        this.line = ''; this.cr = ch === '\r';
      } else {
        this.line += ch;
        if (this.line.length + this.frameSize > FRAME_BYTES) throw Error('limit');
      }
    }
    return out;
  }
  finish() {
    if (this.failed) throw Error('protocol');
    this.consume(this.decoder.decode());
    if (this.line || this.data.length || !this.terminal) throw Error('incomplete');
  }
}
