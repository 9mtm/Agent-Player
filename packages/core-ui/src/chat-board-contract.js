// CHAT-PRO-02 I step 2 wire contract: chat tasks on the board. Shared by the
// browser boundary and the local bridge: a strict allow-list of requests and a
// projection of every response to the reviewed fields (never error text).
//
//   GET  /api/chat/conversations/:id/cards       cards made from the conversation + who works on it
//   POST /api/chat/conversations/:id/cards       { boardId, columnId?, title, description?, priority?, type?, agents? }
//   GET  /api/boards/:boardId/cards/:cardId/chat the conversation a card came from + who works on it
import { validAgentId } from './agent-id.js';
import { priorities, cardTypes, MAX_TITLE, MAX_DESCRIPTION } from './board-contract.js';

const record = x => !!x && typeof x === 'object' && !Array.isArray(x);
const onlyKeys = (x, keys) => Object.keys(x).every(k => keys.includes(k));
const boardId = x => typeof x === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(x);
const conversationId = x => typeof x === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/.test(x);
// eslint-disable-next-line no-control-regex
const badChars = /[\u0000-\u0008\u000B-\u001F\u007F‪-‮⁦-⁩]/u;
const textOk = (x, max, required) => typeof x === 'string' && x.length <= max * 2 && [...x].length <= max && !badChars.test(x) && (!required || x.trim().length > 0);
const lineOk = (x, max) => textOk(x, max, true) && !/\n/.test(x);
const agents = x => Array.isArray(x) && x.length <= 50 && x.every(validAgentId) && new Set(x).size === x.length;
export const ACTIVITY_KINDS = ['created', 'moved', 'done', 'comment', 'archived', 'restored'];
export const MAX_CHAT_CARDS = 20;
const MAX_ACTIVITY = 20;

/** The chat-board path this request names, or null. */
export function chatBoardPath(path) {
  let m = /^\/api\/chat\/conversations\/([^/?#]+)\/cards$/.exec(path);
  if (m) return conversationId(m[1]) ? { kind: 'chat-cards', conversation: m[1] } : null;
  m = /^\/api\/boards\/([^/?#]+)\/cards\/([^/?#]+)\/chat$/.exec(path);
  if (m) return boardId(m[1]) && boardId(m[2]) ? { kind: 'card-chat', board: m[1], card: m[2] } : null;
  return null;
}
export const chatCardsPath = id => `/api/chat/conversations/${id}/cards`;
export const cardChatPath = (board, card) => `/api/boards/${board}/cards/${card}/chat`;

export function validChatCard(b) {
  if (!record(b) || !onlyKeys(b, ['boardId', 'columnId', 'title', 'description', 'priority', 'type', 'agents']) || !boardId(b.boardId) || !lineOk(b.title, MAX_TITLE)) return false;
  if (b.columnId !== undefined && !boardId(b.columnId)) return false;
  if (b.description !== undefined && !textOk(b.description, MAX_DESCRIPTION, false)) return false;
  if (b.priority !== undefined && !priorities.includes(b.priority)) return false;
  if (b.type !== undefined && !cardTypes.includes(b.type)) return false;
  return b.agents === undefined || agents(b.agents);
}

export function chatBoardRoute(path) { return chatBoardPath(path) !== null; }

export function allowedChatBoard(method, path, body) {
  const p = chatBoardPath(path);
  if (!p) return false;
  if (method === 'GET') return body === undefined;
  return method === 'POST' && p.kind === 'chat-cards' && validChatCard(body);
}

const fail = () => { throw Error('Invalid chat board response'); };
const clip = (x, max) => (typeof x === 'string' ? (x.length > max ? x.slice(0, max) : x) : '');
const when = x => (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?/.test(x) ? x.slice(0, 19) : '');
const count = x => (Number.isSafeInteger(x) && x >= 0 ? x : 0);
const planStatus = ['pending', 'active', 'done', 'skipped'];

function activity(a) {
  if (!record(a) || !boardId(a.id) || !ACTIVITY_KINDS.includes(a.kind) || !['user', 'agent'].includes(a.actorKind)) fail();
  return { id: a.id, kind: a.kind, actorKind: a.actorKind, actorId: clip(a.actorId, 128), detail: clip(a.detail, 400), createdAt: when(a.createdAt) };
}

function chatCard(c) {
  if (!record(c) || !boardId(c.id) || !boardId(c.boardId) || !boardId(c.columnId) || typeof c.title !== 'string' || !Array.isArray(c.agents) || !Array.isArray(c.activity) || c.activity.length > MAX_ACTIVITY) fail();
  return {
    id: c.id, boardId: c.boardId, boardName: clip(c.boardName, 80), title: clip(c.title, MAX_TITLE * 2), column: clip(c.column, 60), columnId: c.columnId,
    done: c.done === true, archived: c.archived === true, priority: priorities.includes(c.priority) ? c.priority : 'normal', type: cardTypes.includes(c.type) ? c.type : 'task',
    agents: c.agents.filter(validAgentId).slice(0, 50), comments: count(c.comments),
    checklist: record(c.checklist) && count(c.checklist.done) <= count(c.checklist.total) ? { done: count(c.checklist.done), total: count(c.checklist.total) } : { done: 0, total: 0 },
    createdAt: when(c.createdAt), updatedAt: when(c.updatedAt), activity: c.activity.map(activity),
  };
}

function plan(p) {
  if (p === null || p === undefined) return null;
  if (!record(p) || !Array.isArray(p.steps) || p.steps.length > 12) fail();
  return { done: count(p.done), total: count(p.total), active: typeof p.active === 'string' ? clip(p.active, 120) : null,
    steps: p.steps.filter(s => record(s) && typeof s.title === 'string').map(s => ({ title: clip(s.title, 120), status: planStatus.includes(s.status) ? s.status : 'pending' })) };
}

function progress(p) {
  if (!record(p) || !Array.isArray(p.agents) || p.agents.length > 100) fail();
  return {
    running: p.running === true,
    agents: p.agents.filter(a => record(a) && validAgentId(a.agentId)).map(a => ({ agentId: a.agentId, replies: count(a.replies), lastAt: when(a.lastAt) || null, running: a.running === true, plan: plan(a.plan) })),
  };
}

const codes = ['invalid_board', 'invalid_request', 'not_found', 'read_only_stage'];

export function chatBoardResponse(path, status, body) {
  const p = chatBoardPath(path);
  if (!p) fail();
  if (status !== 200 && status !== 201) { const code = record(body) ? body.code : undefined; return codes.includes(code) ? { code } : null; }
  if (!record(body)) fail();
  if (p.kind === 'chat-cards' && status === 201) {
    const c = body.card;
    if (!record(c) || !boardId(c.id) || !boardId(c.columnId) || typeof c.title !== 'string') fail();
    return { card: { id: c.id, columnId: c.columnId, title: clip(c.title, MAX_TITLE * 2), conversationId: conversationId(c.conversationId) ? c.conversationId : null } };
  }
  if (p.kind === 'chat-cards') {
    if (!Array.isArray(body.cards) || body.cards.length > MAX_CHAT_CARDS) fail();
    return { cards: body.cards.map(chatCard), progress: progress(body.progress) };
  }
  const conv = body.conversation;
  return {
    conversation: record(conv) && conversationId(conv.id) ? { id: conv.id, title: typeof conv.title === 'string' ? clip(conv.title, 120) : null } : null,
    progress: progress(body.progress),
  };
}
