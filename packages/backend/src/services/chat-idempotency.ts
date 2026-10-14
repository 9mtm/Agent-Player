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
 *  - same key, different request (agent, session, stream flag or last
 *    message differ) -> 422 { code: 'idempotency_key_reused' }.
 *
 * State lives in process memory only (lost on restart), keyed by a hash of
 * user + key; the request is kept only as a hash. The outcome text is kept
 * in memory for the replay (capped), never logged.
 */

import { createHash, randomUUID } from 'node:crypto';
import type { FastifyReply } from 'fastify';

export const IDEMPOTENCY_TTL_MS = 10 * 60_000;
const MAX_ENTRIES = 2_000;
const MAX_STORED_CONTENT = 256 * 1024;
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
    if (now - e.createdAt > IDEMPOTENCY_TTL_MS) entries.delete(k);
  }
  while (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value;
    if (oldest === undefined) break;
    entries.delete(oldest);
  }
}

/** Header value -> key, null when absent, 'invalid' when malformed. */
export function parseIdempotencyKey(raw: unknown): string | null | 'invalid' {
  if (raw === undefined || raw === null || raw === '') return null;
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== 'string' || !KEY_PATTERN.test(v)) return 'invalid';
  return v;
}

/** Hash of what makes two requests "the same turn" (no content is stored). */
export function requestFingerprint(parts: { agentId?: string; sessionId?: string; stream: boolean; messages: unknown }): string {
  const msgs = Array.isArray(parts.messages) ? parts.messages : [];
  return sha256(JSON.stringify({ a: parts.agentId ?? null, s: parts.sessionId ?? null, st: parts.stream, n: msgs.length, last: msgs[msgs.length - 1] ?? null }));
}

export function newTurnIds(): ChatTurnIds {
  return { runId: randomUUID(), messageId: randomUUID() };
}

export type BeginResult =
  | { kind: 'new'; ids: ChatTurnIds; entry: Entry | null }
  | { kind: 'replay'; ids: ChatTurnIds; outcome: Outcome }
  | { kind: 'in_progress'; ids: ChatTurnIds }
  | { kind: 'mismatch' };

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
export function resetChatIdempotency(): void { entries.clear(); }

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
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Idempotent-Replayed': 'true',
    'X-Run-Id': ids.runId,
    'X-Message-Id': ids.messageId,
  });
  const base = { runId: ids.runId, messageId: ids.messageId, replayed: true };
  if (outcome.content) {
    reply.raw.write(`data: ${JSON.stringify({ type: 'text', content: outcome.content, done: false, ...(outcome.truncated ? { truncated: true } : {}), ...base })}\n\n`);
  }
  reply.raw.write(`data: ${JSON.stringify({ type: 'done', content: '', done: true, ...(outcome.done ? {} : { incomplete: true }), ...base })}\n\n`);
  reply.raw.end();
  return reply;
}
