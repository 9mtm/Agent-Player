/**
 * Chat turn ids and client idempotency keys (BE-UI-01).
 *
 * Every POST /api/chat turn gets a `runId` (this turn) and a `messageId`
 * (the assistant message it produces). Both are added to every SSE `data:`
 * frame, to the non-stream JSON body and to the `X-Run-Id` /
 * `X-Message-Id` response headers.
 *
 * A client may send `Idempotency-Key: <8-128 of A-Z a-z 0-9 _ - . :>`.
 * A repeat of the same key by the same user within 10 minutes does not run
 * the turn again:
 *  - finished  -> the original outcome is returned (JSON body as it was; a
 *                 stream is replayed as one text frame + one done frame, with
 *                 the original ids and `replayed: true`);
 *  - running   -> 409 { code: 'idempotency_in_progress', runId, messageId };
 *  - same key, different request (any message, agent, session, stream
 *    flag, model or option differs) -> 422 { code: 'idempotency_key_reused' }.
 *
 * Running entries are never evicted (CHAT-01): at the 2,000-entry cap the
 * oldest finished entry is dropped; when only running entries remain, a new
 * keyed turn is refused (429 rate_limited) rather than forgetting a running
 * one, which would let a retry run the turn twice. A running entry is
 * dropped only when it is older than RUNNING_STALE_MS (a turn that never
 * ended, e.g. the process lost the response).
 *
 * State lives in process memory only (lost on restart), keyed by a hash of
 * user + key; the request is kept only as a hash. The outcome text is kept
 * in memory for the replay (capped), never logged.
 */

import { createHash, randomUUID } from 'node:crypto';
import type { FastifyReply } from 'fastify';
import { SSE_HEADERS, chunkText } from './chat-sse.js';

export const IDEMPOTENCY_TTL_MS = 10 * 60_000;
const RUNNING_STALE_MS = 60 * 60_000;
let maxEntries = 2_000;
const MAX_STORED_CONTENT = 256 * 1024;
/** Each replayed text frame carries at most this much UTF-8 text. */
export const REPLAY_FRAME_BYTES = 16 * 1024;
const KEY_PATTERN = /^[A-Za-z0-9_.:-]{8,128}$/;

export interface ChatTurnIds { runId: string; messageId: string }

export type Outcome =
  | { kind: 'json'; status: number; body: unknown }
  | { kind: 'stream'; status: number; content: string; truncated: boolean; done: boolean };

export interface Entry {
  hash: string;
  fingerprint: string;
  ids: ChatTurnIds;
  createdAt: number;
  state: 'running' | 'done';
  outcome?: Outcome;
}

const entries = new Map<string, Entry>();

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

function prune(now = Date.now()): void {
  for (const [k, e] of entries) {
    const age = now - e.createdAt;
    if (e.state === 'done' ? age > IDEMPOTENCY_TTL_MS : age > RUNNING_STALE_MS) entries.delete(k);
  }
}

/** Make room for one entry: drop the oldest finished ones; never a running one. */
function makeRoom(): boolean {
  if (entries.size < maxEntries) return true;
  for (const [k, e] of entries) {
    if (e.state !== 'done') continue;
    entries.delete(k);
    if (entries.size < maxEntries) return true;
  }
  return false;
}

/** Canonical JSON: object keys sorted, undefined members dropped (as JSON does). */
function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map((x) => (x === undefined ? 'null' : canonicalJson(x))).join(',')}]`;
  if (v && typeof v === 'object') {
    const keys = Object.keys(v as Record<string, unknown>).filter((k) => (v as any)[k] !== undefined).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson((v as any)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v) ?? 'null';
}

/** Header value -> key, null when absent, 'invalid' when malformed. */
export function parseIdempotencyKey(raw: unknown): string | null | 'invalid' {
  if (raw === undefined || raw === null || raw === '') return null;
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== 'string' || !KEY_PATTERN.test(v)) return 'invalid';
  return v;
}

/**
 * Hash of what makes two requests "the same turn": the whole request that
 * defines it (all messages, agent, session, stream flag, model and options),
 * as canonical JSON. Only the hash is stored.
 */
export function requestFingerprint(parts: { agentId?: string; sessionId?: string; stream: boolean; messages: unknown } & Record<string, unknown>): string {
  return sha256(canonicalJson({ v: 2, ...parts }));
}

export function newTurnIds(): ChatTurnIds {
  return { runId: randomUUID(), messageId: randomUUID() };
}

export type BeginResult =
  | { kind: 'new'; ids: ChatTurnIds; entry: Entry | null }
  | { kind: 'replay'; ids: ChatTurnIds; outcome: Outcome }
  | { kind: 'in_progress'; ids: ChatTurnIds }
  | { kind: 'mismatch' }
  | { kind: 'busy' };

/** Start a turn; with a key, look up an earlier one first. */
export function beginChatTurn(userId: string, key: string | null, fingerprint: string): BeginResult {
  const ids = newTurnIds();
  if (!key) return { kind: 'new', ids, entry: null };
  prune();
  const hash = sha256(`${userId}\u0000${key}`);
  const prev = entries.get(hash);
  if (prev) {
    if (prev.fingerprint !== fingerprint) return { kind: 'mismatch' };
    if (prev.state === 'running' || !prev.outcome) return { kind: 'in_progress', ids: prev.ids };
    return { kind: 'replay', ids: prev.ids, outcome: prev.outcome };
  }
  if (!makeRoom()) return { kind: 'busy' };
  const entry: Entry = { hash, fingerprint, ids, createdAt: Date.now(), state: 'running' };
  entries.set(hash, entry);
  return { kind: 'new', ids, entry };
}

function finish(entry: Entry | null, outcome: Outcome): void {
  if (!entry || entry.state === 'done') return;
  entry.state = 'done';
  entry.outcome = outcome;
}

/** Test hook. */
export function resetChatIdempotency(): void { entries.clear(); maxEntries = 2_000; }

/** Test hook: lower the entry cap. */
export function setChatIdempotencyCap(n: number): void { maxEntries = n; }

function withIds(obj: Record<string, unknown>, ids: ChatTurnIds): Record<string, unknown> {
  return { ...obj, runId: ids.runId, messageId: ids.messageId };
}

/**
 * Put the turn ids on everything this reply sends and record the outcome
 * for the idempotency key (if any). Covers raw SSE writes (every
 * `data: {json}` frame), reply.send JSON bodies and the response headers.
 */
export function instrumentChatReply(reply: FastifyReply, ids: ChatTurnIds, entry: Entry | null): void {
  const raw = reply.raw as any;
  reply.header('X-Run-Id', ids.runId);
  reply.header('X-Message-Id', ids.messageId);

  // SSE (raw) path.
  let content = '';
  let truncated = false;
  let done = false;
  let streamed = false;
  const origWriteHead = raw.writeHead.bind(raw);
  raw.writeHead = (status: number, ...rest: any[]) => {
    streamed = true;
    const headers = rest.find((r: unknown) => r && typeof r === 'object' && !Array.isArray(r)) ?? {};
    const extra = { 'X-Run-Id': ids.runId, 'X-Message-Id': ids.messageId };
    if (rest.length && typeof rest[0] === 'string') return origWriteHead(status, rest[0], { ...headers, ...extra });
    return origWriteHead(status, { ...headers, ...extra });
  };
  const origWrite = raw.write.bind(raw);
  raw.write = (chunk: any, ...rest: any[]) => {
    if (typeof chunk === 'string' && chunk.startsWith('data: ')) {
      const body = chunk.slice(6).replace(/\n+$/, '');
      try {
        const frame = JSON.parse(body);
        if (frame && typeof frame === 'object' && !Array.isArray(frame)) {
          const isText = frame.type === undefined || frame.type === 'text';
          if (isText && typeof frame.content === 'string' && frame.content) {
            if (content.length + frame.content.length <= MAX_STORED_CONTENT) content += frame.content;
            else truncated = true;
          }
          if (frame.done === true || frame.type === 'done') done = true;
          chunk = `data: ${JSON.stringify(withIds(frame, ids))}\n\n`;
        }
      } catch { /* not JSON: pass through unchanged */ }
    }
    return origWrite(chunk, ...rest);
  };
  const origEnd = raw.end.bind(raw);
  raw.end = (...args: any[]) => {
    if (streamed) finish(entry, { kind: 'stream', status: raw.statusCode ?? 200, content, truncated, done });
    return origEnd(...args);
  };

  // JSON (reply.send) path.
  const origSend = reply.send.bind(reply);
  (reply as any).send = (payload?: unknown) => {
    let out = payload;
    if (payload && typeof payload === 'object' && !Array.isArray(payload) && !Buffer.isBuffer(payload) && typeof (payload as any).pipe !== 'function') {
      out = withIds(payload as Record<string, unknown>, ids);
      if (!streamed) finish(entry, { kind: 'json', status: reply.statusCode, body: out });
    }
    return origSend(out);
  };
}

/** Send the stored outcome of an earlier turn with the same key. */
export function replayChatOutcome(reply: FastifyReply, ids: ChatTurnIds, outcome: Outcome): FastifyReply {
  reply.header('Idempotent-Replayed', 'true');
  reply.header('X-Run-Id', ids.runId);
  reply.header('X-Message-Id', ids.messageId);
  if (outcome.kind === 'json') return reply.status(outcome.status).send(outcome.body);
  reply.hijack();
  reply.raw.writeHead(outcome.status, {
    ...SSE_HEADERS,
    'Idempotent-Replayed': 'true',
    'X-Run-Id': ids.runId,
    'X-Message-Id': ids.messageId,
  });
  const base = { runId: ids.runId, messageId: ids.messageId, replayed: true };
  // Bounded frames (CHAT-01): at most REPLAY_FRAME_BYTES of text each; the
  // `truncated` flag, when set, is on the last text frame.
  const parts = chunkText(outcome.content, REPLAY_FRAME_BYTES);
  parts.forEach((content, i) => {
    const last = i === parts.length - 1;
    reply.raw.write(`data: ${JSON.stringify({ type: 'text', content, done: false, ...(last && outcome.truncated ? { truncated: true } : {}), ...base })}\n\n`);
  });
  reply.raw.write(`data: ${JSON.stringify({ type: 'done', content: '', done: true, ...(outcome.done ? {} : { incomplete: true }), ...base })}\n\n`);
  reply.raw.end();
  return reply;
}
