// CHAT-SECRETS-01 wire contract: keys saved from the chat. Shared by the browser
// boundary and the local bridge: a strict allow-list of the three requests and a
// projection of their answers to the reviewed fields (never a value, never error text).
//
//   GET    /api/chat/secrets            the caller's keys saved from the chat (type, reference, chat, dates)
//   DELETE /api/chat/secrets/:id        delete one
//   POST   /api/chat/secrets/cleanup    owner: { apply: boolean } find / move secrets of older saved messages

export const SECRETS_PATH = '/api/chat/secrets';
export const CLEANUP_PATH = '/api/chat/secrets/cleanup';
export const MAX_SECRETS = 500;

const record = x => !!x && typeof x === 'object' && !Array.isArray(x);
const secretId = x => typeof x === 'string' && /^[a-z0-9]{6,32}$/.test(x);
const secretType = x => typeof x === 'string' && /^[a-z_]{2,40}$/.test(x);
const conversationId = x => typeof x === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/.test(x);
const isoDate = x => typeof x === 'string' && x.length <= 40 && !Number.isNaN(Date.parse(x));
const count = x => Number.isSafeInteger(x) && x >= 0 && x <= 10_000_000;

/** A reference left in a chat message instead of a secret. */
export const SECRET_REF = /\[SECRET:([a-z_]{2,40}):([a-z0-9]{6,32})\]/g;

export const secretPath = id => `${SECRETS_PATH}/${id}`;

/** The secret id of a delete path, or null. */
export function secretDeletePath(path) {
  if (typeof path !== 'string') return null;
  const m = /^\/api\/chat\/secrets\/([^/?#]+)$/.exec(path);
  return m && m[1] !== 'cleanup' && secretId(m[1]) ? m[1] : null;
}

export function chatSecretsRoute(path) {
  return path === SECRETS_PATH || path === CLEANUP_PATH || secretDeletePath(path) !== null;
}

export function allowedChatSecrets(method, path, body) {
  if (path === SECRETS_PATH) return method === 'GET' && body === undefined;
  if (path === CLEANUP_PATH) return method === 'POST' && record(body) && Object.keys(body).length === 1 && typeof body.apply === 'boolean';
  return method === 'DELETE' && body === undefined && secretDeletePath(path) !== null;
}

const fail = () => { throw Error('Invalid chat secrets response'); };
const codes = ['not_found', 'invalid_request', 'read_only_stage', 'forbidden'];

function secret(x) {
  if (!record(x) || !secretId(x.id) || !secretType(x.type) || x.ref !== `[SECRET:${x.type}:${x.id}]`) fail();
  if (x.conversationId !== null && !conversationId(x.conversationId)) fail();
  if (!isoDate(x.createdAt) || (x.lastUsed !== null && !isoDate(x.lastUsed))) fail();
  return { id: x.id, type: x.type, ref: x.ref, conversationId: x.conversationId, createdAt: x.createdAt, lastUsed: x.lastUsed };
}

export function chatSecretsResponse(path, status, body) {
  if (!chatSecretsRoute(path)) fail();
  if (status !== 200) { const code = record(body) ? body.code : undefined; return codes.includes(code) ? { code } : null; }
  if (!record(body)) fail();
  if (path === SECRETS_PATH) {
    if (!Array.isArray(body.secrets) || body.secrets.length > MAX_SECRETS) fail();
    return { secrets: body.secrets.map(secret) };
  }
  if (path === CLEANUP_PATH) {
    const r = body.report;
    if (!record(r) || !count(r.conversations) || !count(r.messages) || !count(r.secrets) || typeof r.applied !== 'boolean') fail();
    return { report: { conversations: r.conversations, messages: r.messages, secrets: r.secrets, applied: r.applied } };
  }
  if (body.deleted !== true) fail();
  return { deleted: true };
}
