// BOARD-01 wire contract: the company task board. Shared by the browser
// boundary and the local bridge: a strict allow-list of requests and a
// projection of every response to the reviewed fields (never error text).
import { validAgentId } from './agent-id.js';
import { department } from './hire-contract.js';

export const BOARDS_PATH = '/api/boards';
export const priorities = ['low', 'normal', 'high', 'urgent'];
export const MAX_TITLE = 200;
export const MAX_DESCRIPTION = 5000;
export const MAX_COMMENT = 4000;
const MAX_CARDS = 5000;

const record = x => !!x && typeof x === 'object' && !Array.isArray(x);
const onlyKeys = (x, keys) => Object.keys(x).every(k => keys.includes(k));
const id = x => typeof x === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(x);
const version = x => Number.isSafeInteger(x) && x > 0;
// eslint-disable-next-line no-control-regex
const badChars = /[\u0000-\u0008\u000B-\u001F\u007F‪-‮⁦-⁩]/u;
const textOk = (x, max, required) => typeof x === 'string' && x.length <= max * 2 && [...x].length <= max && !badChars.test(x) && (!required || x.trim().length > 0);
const lineOk = (x, max) => textOk(x, max, true) && !/\n/.test(x);
const date = x => x === null || (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x));
const agents = x => Array.isArray(x) && x.length <= 50 && x.every(validAgentId) && new Set(x).size === x.length;
const departments = x => Array.isArray(x) && x.length <= 12 && x.every(department) && new Set(x).size === x.length;

/** The board path this request names, or null. */
export function boardPath(path) {
  let m = /^\/api\/boards\/([^/?#]+)$/.exec(path);
  if (m) return id(m[1]) ? { kind: 'board', board: m[1] } : null;
  m = /^\/api\/boards\/([^/?#]+)\?archived=1$/.exec(path);
  if (m) return id(m[1]) ? { kind: 'board-archived', board: m[1] } : null;
  m = /^\/api\/boards\/([^/?#]+)\/columns$/.exec(path);
  if (m) return id(m[1]) ? { kind: 'columns', board: m[1] } : null;
  m = /^\/api\/boards\/([^/?#]+)\/columns\/([^/?#]+)$/.exec(path);
  if (m) return id(m[1]) && id(m[2]) ? { kind: 'column', board: m[1], column: m[2] } : null;
  m = /^\/api\/boards\/([^/?#]+)\/cards$/.exec(path);
  if (m) return id(m[1]) ? { kind: 'cards', board: m[1] } : null;
  m = /^\/api\/boards\/([^/?#]+)\/cards\/([^/?#]+)$/.exec(path);
  if (m) return id(m[1]) && id(m[2]) ? { kind: 'card', board: m[1], card: m[2] } : null;
  m = /^\/api\/boards\/([^/?#]+)\/cards\/([^/?#]+)\/comments$/.exec(path);
  if (m) return id(m[1]) && id(m[2]) ? { kind: 'comments', board: m[1], card: m[2] } : null;
  return null;
}

export function validNewCard(b) {
  if (!record(b) || !onlyKeys(b, ['columnId', 'title', 'description', 'priority', 'dueDate', 'agents', 'departments']) || !id(b.columnId) || !lineOk(b.title, MAX_TITLE)) return false;
  if (b.description !== undefined && !textOk(b.description, MAX_DESCRIPTION, false)) return false;
  if (b.priority !== undefined && !priorities.includes(b.priority)) return false;
  if (b.dueDate !== undefined && !date(b.dueDate)) return false;
  if (b.agents !== undefined && !agents(b.agents)) return false;
  return b.departments === undefined || departments(b.departments);
}

export function validCardEdit(b) {
  if (!record(b) || !onlyKeys(b, ['expectedVersion', 'title', 'description', 'priority', 'dueDate', 'agents', 'departments', 'columnId', 'beforeCardId', 'archived']) || !version(b.expectedVersion)) return false;
  if (Object.keys(b).length < 2) return false;
  if (b.title !== undefined && !lineOk(b.title, MAX_TITLE)) return false;
  if (b.description !== undefined && !textOk(b.description, MAX_DESCRIPTION, false)) return false;
  if (b.priority !== undefined && !priorities.includes(b.priority)) return false;
  if (b.dueDate !== undefined && !date(b.dueDate)) return false;
  if (b.agents !== undefined && !agents(b.agents)) return false;
  if (b.departments !== undefined && !departments(b.departments)) return false;
  if (b.columnId !== undefined && !id(b.columnId)) return false;
  if (b.beforeCardId !== undefined && b.beforeCardId !== null && !id(b.beforeCardId)) return false;
  if (b.beforeCardId !== undefined && b.columnId === undefined) return false;
  return b.archived === undefined || typeof b.archived === 'boolean';
}

const nameBody = b => record(b) && Object.keys(b).length === 1 && lineOk(b.name, 60);

export function allowedBoard(method, path, body) {
  if (path === BOARDS_PATH) return method === 'GET' && body === undefined;
  const p = boardPath(path);
  if (!p) return false;
  if (p.kind === 'board' || p.kind === 'board-archived') return method === 'GET' && body === undefined;
  if (p.kind === 'columns') return method === 'POST' && nameBody(body);
  if (p.kind === 'column') return method === 'PUT' && nameBody(body);
  if (p.kind === 'cards') return method === 'POST' && validNewCard(body);
  if (p.kind === 'card') return method === 'PUT' && validCardEdit(body);
  if (p.kind === 'comments') return (method === 'GET' && body === undefined) || (method === 'POST' && record(body) && Object.keys(body).length === 1 && textOk(body.body, MAX_COMMENT, true));
  return false;
}

export function boardRoute(path) {
  return path === BOARDS_PATH || boardPath(path) !== null;
}

const fail = () => { throw Error('Invalid board response'); };
const clip = (x, max) => (typeof x === 'string' ? (x.length > max ? x.slice(0, max) : x) : '');
const when = x => (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?/.test(x) ? x.slice(0, 19) : '');

function card(c) {
  if (!record(c) || !id(c.id) || !id(c.columnId) || typeof c.title !== 'string' || !priorities.includes(c.priority) || !version(c.version)
    || !Number.isSafeInteger(c.position) || !Array.isArray(c.agents) || !Array.isArray(c.departments)) fail();
  return {
    id: c.id, columnId: c.columnId, title: clip(c.title, MAX_TITLE * 2), description: clip(c.description, MAX_DESCRIPTION * 2), priority: c.priority,
    position: c.position, dueDate: date(c.dueDate) && c.dueDate ? c.dueDate : null, archived: c.archived === true, version: c.version,
    agents: c.agents.filter(validAgentId).slice(0, 50), departments: c.departments.filter(department).slice(0, 12),
    comments: Number.isSafeInteger(c.comments) && c.comments >= 0 ? c.comments : 0, updatedAt: when(c.updatedAt),
  };
}

function board(b) {
  if (!record(b) || !id(b.id) || !Array.isArray(b.columns) || b.columns.length > 20 || !Array.isArray(b.cards) || b.cards.length > MAX_CARDS) fail();
  return {
    id: b.id, name: clip(b.name, 80),
    columns: b.columns.map(c => { if (!record(c) || !id(c.id) || !Number.isSafeInteger(c.position)) fail(); return { id: c.id, name: clip(c.name, 60), position: c.position }; }),
    cards: b.cards.map(card),
  };
}

function comment(c) {
  if (!record(c) || !id(c.id) || !['user', 'agent'].includes(c.authorKind) || typeof c.body !== 'string') fail();
  return { id: c.id, authorKind: c.authorKind, authorId: clip(c.authorId, 128), body: clip(c.body, MAX_COMMENT * 2), createdAt: when(c.createdAt) };
}

const codes = ['invalid_board', 'invalid_version', 'not_found', 'version_conflict', 'read_only_stage'];
function error(status, body) {
  const code = record(body) ? body.code : undefined;
  if (!codes.includes(code)) return null;
  if (code === 'version_conflict' && record(body.card)) return { code, card: card(body.card) };
  return { code };
}

export function boardResponse(path, status, body) {
  if (status !== 200 && status !== 201) return error(status, body);
  if (path === BOARDS_PATH) {
    if (!record(body) || !Array.isArray(body.boards) || body.boards.length > 50) fail();
    return { boards: body.boards.map(b => { if (!record(b) || !id(b.id)) fail(); return { id: b.id, name: clip(b.name, 80) }; }) };
  }
  const p = boardPath(path);
  if (!p) fail();
  if (p.kind === 'card' || p.kind === 'cards') return card(body);
  if (p.kind === 'comments') {
    if (!record(body) || !Array.isArray(body.comments) || body.comments.length > 500) fail();
    return { comments: body.comments.map(comment) };
  }
  return board(body);
}
