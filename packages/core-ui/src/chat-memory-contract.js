// CHAT-PRO-02 E wire contract: chat memory. Shared by the browser boundary and
// the local bridge: a strict allow-list of requests and a projection of every
// response to the reviewed fields (never error text). Accepting or rejecting an
// agent's proposal uses the existing memory proposal routes (review hash).
//
//   GET  /api/chat/conversations/:id/memories   memories and agent proposals from the conversation
//   POST /api/chat/conversations/:id/memories   "Remember this" { messageId | runId, content, drawer, type?, importance? }
import { validRunId } from './conversation-contract.js';

const record = x => !!x && typeof x === 'object' && !Array.isArray(x);
const conversationId = x => typeof x === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/.test(x);
const messageId = x => typeof x === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/.test(x);
const plainId = x => typeof x === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(x);
// eslint-disable-next-line no-control-regex
const badChars = /[\u0000-\u0008\u000B-\u001F\u007F‪-‮⁦-⁩]/u;
export const MAX_REMEMBER = 4000;
export const MAX_CHAT_MEMORIES = 100;
export const REMEMBER_DRAWERS = ['project', 'owner', 'experience'];
export const REMEMBER_TYPES = ['fact', 'event', 'context', 'insight', 'preference', 'skill', 'relationship', 'task'];
export const CHAT_MEMORY_STATUSES = ['saved', 'removed', 'pending', 'rejected', 'stale', 'cancelled'];

/** The conversation id of a chat-memory path, or null. */
export function chatMemoryPath(path) {
  const m = /^\/api\/chat\/conversations\/([^/?#]+)\/memories$/.exec(path);
  return m && conversationId(m[1]) ? m[1] : null;
}
export const chatMemoriesPath = id => `/api/chat/conversations/${id}/memories`;

export function validRemember(b) {
  if (!record(b) || !Object.keys(b).every(k => ['messageId', 'runId', 'content', 'drawer', 'type', 'importance'].includes(k))) return false;
  if ((b.messageId !== undefined) === (b.runId !== undefined)) return false;
  if (b.messageId !== undefined && !messageId(b.messageId)) return false;
  if (b.runId !== undefined && !validRunId(b.runId)) return false;
  if (typeof b.content !== 'string' || !b.content.trim() || b.content.length > MAX_REMEMBER * 2 || [...b.content].length > MAX_REMEMBER || badChars.test(b.content)) return false;
  if (!REMEMBER_DRAWERS.includes(b.drawer)) return false;
  if (b.type !== undefined && !REMEMBER_TYPES.includes(b.type)) return false;
  return b.importance === undefined || (Number.isInteger(b.importance) && b.importance >= 1 && b.importance <= 10);
}

export function chatMemoryRoute(path) { return path.startsWith('/api/chat/conversations/') && path.endsWith('/memories') && chatMemoryPath(path) !== null; }

export function allowedChatMemory(method, path, body) {
  if (chatMemoryPath(path) === null) return false;
  if (method === 'GET') return body === undefined;
  return method === 'POST' && validRemember(body);
}

const fail = () => { throw Error('Invalid chat memory response'); };
const clip = (x, max) => (typeof x === 'string' ? (x.length > max ? x.slice(0, max) : x) : '');
const when = x => (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?/.test(x) ? x.slice(0, 19) : '');
const drawerId = x => typeof x === 'string' && /^(owner|experience|(project|task|people):[a-z0-9][a-z0-9_-]{0,63})$/.test(x);

function memory(m) {
  if (!record(m) || !plainId(m.id) || !['remembered', 'proposed'].includes(m.kind) || !drawerId(m.drawerId) || !CHAT_MEMORY_STATUSES.includes(m.status)) fail();
  return {
    id: m.id, kind: m.kind, messageId: messageId(m.messageId) ? m.messageId : null, drawerId: m.drawerId, text: clip(m.text, 400),
    memoryId: m.status === 'saved' && plainId(m.memoryId) ? m.memoryId : null, proposalId: plainId(m.proposalId) ? m.proposalId : null,
    status: m.status, createdAt: when(m.createdAt),
  };
}

const codes = ['invalid_request', 'not_found', 'only_secrets', 'read_only_stage'];

export function chatMemoryResponse(path, status, body) {
  if (chatMemoryPath(path) === null) fail();
  if (status !== 200 && status !== 201) { const code = record(body) ? body.code : undefined; return codes.includes(code) ? { code } : null; }
  if (!record(body)) fail();
  if (status === 201) {
    const red = Number.isSafeInteger(body.redacted) && body.redacted >= 0 ? body.redacted : 0;
    return { memory: memory(body.memory), redacted: red, duplicate: body.duplicate === true };
  }
  if (!Array.isArray(body.memories) || body.memories.length > MAX_CHAT_MEMORIES) fail();
  return { memories: body.memories.map(memory) };
}
