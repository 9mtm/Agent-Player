/**
 * Saved chat conversations and their turns (CHAT-REBUILD-01).
 *
 * Built on chat_sessions / chat_messages (migration 084 adds the agent,
 * pinned flag and the assistant turn's work: reasoning, tool calls and text
 * in order, its status and duration). Every function takes the caller's user
 * id where it matters; the routes never pass one from the request body.
 */

import { randomUUID } from 'node:crypto';
import { orderedId } from './ordered-id.js';
import { q, sql, one, run, type Step } from './sql-steps.js';

export type TurnStatus = 'complete' | 'stopped' | 'error';

/** One piece of an assistant turn, in the order it happened. */
export type TurnPart =
  | { kind: 'reasoning'; text: string; ms?: number }
  | { kind: 'text'; text: string }
  | { kind: 'tools'; step: number; calls: ToolCallPart[] };

export interface ToolCallPart { id: string; name: string; input: string; output?: string; isError?: boolean; ms?: number }

export interface Conversation {
  id: string;
  title: string | null;
  agentId: string | null;
  pinned: boolean;
  preview: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  parts: TurnPart[] | null;
  status: TurnStatus;
  runId: string | null;
  durationMs: number | null;
  createdAt: string;
}

interface SessionRow { id: string; user_id: string; title: string | null; agent_id: string | null; pinned: number; created_at: string; updated_at: string; preview?: string | null }
interface MessageRow { id: string; role: ConversationMessage['role']; content: string; parts: string | null; status: TurnStatus | null; run_id: string | null; duration_ms: number | null; created_at: string }

const PREVIEW_CHARS = 140;

function toConversation(r: SessionRow): Conversation {
  return {
    id: r.id, title: r.title, agentId: r.agent_id, pinned: !!r.pinned,
    preview: (r.preview ?? '').replace(/\s+/g, ' ').trim().slice(0, PREVIEW_CHARS),
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function parseParts(raw: string | null): TurnPart[] | null {
  if (!raw) return null;
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : null; } catch { return null; }
}

function toMessage(r: MessageRow): ConversationMessage {
  return {
    id: r.id, role: r.role, content: r.content, parts: parseParts(r.parts), status: r.status ?? 'complete',
    runId: r.run_id, durationMs: r.duration_ms, createdAt: r.created_at,
  };
}

const PREVIEW_SQL = `(SELECT m.content FROM chat_messages m WHERE m.session_id = s.id AND m.role = 'user' ORDER BY m.created_at DESC, m.id DESC LIMIT 1)`;

/** The caller's conversations: pinned first, then most recent. */
export async function listConversations(userId: string, limit = 200): Promise<Conversation[]> {
  const rows = await q.all<SessionRow>(
    `SELECT s.*, ${PREVIEW_SQL} AS preview FROM chat_sessions s WHERE s.user_id = ? ORDER BY s.pinned DESC, s.updated_at DESC, s.id DESC LIMIT ?`,
    userId, limit);
  return rows.map(toConversation);
}

/** The conversation if it belongs to the caller (else undefined: the route answers 404). */
export async function findConversation(userId: string, id: string): Promise<Conversation | undefined> {
  const r = await q.one<SessionRow>(`SELECT s.*, ${PREVIEW_SQL} AS preview FROM chat_sessions s WHERE s.id = ? AND s.user_id = ?`, id, userId);
  return r ? toConversation(r) : undefined;
}

export async function createConversation(userId: string, input: { title?: string | null; agentId?: string | null }): Promise<Conversation> {
  const id = randomUUID();
  await q.run('INSERT INTO chat_sessions (id, user_id, title, model, agent_id) VALUES (?, ?, ?, ?, ?)',
    id, userId, input.title?.trim() || null, 'default', input.agentId || null);
  return (await findConversation(userId, id))!;
}

/** Rename and/or pin. Renaming bumps nothing else; pinning does not reorder by time. */
export async function patchConversation(userId: string, id: string, patch: { title?: string | null; pinned?: boolean }): Promise<Conversation | undefined> {
  const fields: string[] = [];
  const params: Array<string | number | null> = [];
  if (patch.title !== undefined) { fields.push('title = ?'); params.push(patch.title?.trim() || null); }
  if (patch.pinned !== undefined) { fields.push('pinned = ?'); params.push(patch.pinned ? 1 : 0); }
  if (fields.length) await q.run(`UPDATE chat_sessions SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, ...params, id, userId);
  return findConversation(userId, id);
}

/** Deletes the conversation and its messages (ON DELETE CASCADE). */
export async function deleteConversation(userId: string, id: string): Promise<boolean> {
  return (await q.run('DELETE FROM chat_sessions WHERE id = ? AND user_id = ?', id, userId)).changes > 0;
}

export async function listConversationMessages(sessionId: string): Promise<ConversationMessage[]> {
  const rows = await q.all<MessageRow>('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC, id ASC', sessionId);
  return rows.map(toMessage);
}

/** A title from the first message: its first line, at most 7 words / 60 characters. */
export function deriveTitle(text: string): string {
  const line = text.replace(/```[\s\S]*?(```|$)/g, ' ').split('\n').map((l) => l.trim()).find(Boolean) ?? '';
  const words = line.replace(/\s+/g, ' ').split(' ').slice(0, 7).join(' ');
  const clipped = words.length > 60 ? `${words.slice(0, 59).trimEnd()}…` : words;
  return clipped || 'New chat';
}

/**
 * Stores the user's message of a run (once per run id) and bumps the
 * conversation; the first message also names an untitled conversation.
 * Returns the stored message (the existing one for a repeated run id).
 */
export async function addUserMessage(sessionId: string, content: string, runId: string): Promise<ConversationMessage> {
  const id = orderedId();
  return sql().tx(function* (): Step<ConversationMessage> {
    const existing = yield* one<MessageRow>("SELECT * FROM chat_messages WHERE run_id = ? AND role = 'user'", runId);
    if (existing) return toMessage(existing);
    yield* run("INSERT INTO chat_messages (id, session_id, role, content, run_id, status) VALUES (?, ?, 'user', ?, ?, 'complete')", id, sessionId, content, runId);
    yield* run('UPDATE chat_sessions SET title = COALESCE(title, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?', deriveTitle(content), sessionId);
    return toMessage((yield* one<MessageRow>('SELECT * FROM chat_messages WHERE id = ?', id))!);
  });
}

/** Stores the assistant's turn of a run (once per run id). */
export async function addAssistantMessage(sessionId: string, input: { runId: string; content: string; parts: TurnPart[]; status: TurnStatus; durationMs: number }): Promise<ConversationMessage> {
  const id = orderedId();
  return sql().tx(function* (): Step<ConversationMessage> {
    const existing = yield* one<MessageRow>("SELECT * FROM chat_messages WHERE run_id = ? AND role = 'assistant'", input.runId);
    if (existing) return toMessage(existing);
    yield* run("INSERT INTO chat_messages (id, session_id, role, content, parts, status, run_id, duration_ms) VALUES (?, ?, 'assistant', ?, ?, ?, ?, ?)",
      id, sessionId, input.content, JSON.stringify(input.parts), input.status, input.runId, Math.max(0, Math.round(input.durationMs)));
    yield* run('UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', sessionId);
    return toMessage((yield* one<MessageRow>('SELECT * FROM chat_messages WHERE id = ?', id))!);
  });
}
