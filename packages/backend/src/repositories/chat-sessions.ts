/**
 * Chat sessions and messages (B2.2d-8) on the process driver (SQLite or
 * PostgreSQL). Replaces the synchronous SQLite-only SessionsRepository for
 * the API (`sessionsDb` / `messagesDb` in db/index.ts); the class stays for
 * the SQLite dev seed.
 *
 * Message order: created_at has one-second resolution on SQLite, so ties
 * are broken by id. New message ids are time-ordered (orderedId, UUIDv7), so
 * that tie-break is insertion order on both drivers (older rows with random
 * UUIDs keep their created_at order and only ties among them stay random).
 */

import { randomUUID } from 'node:crypto';
import type { ChatMessage, ChatSession } from '../db/repositories/sessions.js';
import { orderedId } from './ordered-id.js';
import { q, sql, one, run, type Step } from './sql-steps.js';

export async function findChatSession(id: string): Promise<ChatSession | undefined> {
  return q.one<ChatSession>('SELECT * FROM chat_sessions WHERE id = ?', id);
}

export async function listUserChatSessions(userId: string, limit = 50): Promise<ChatSession[]> {
  return q.all<ChatSession>('SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC, id DESC LIMIT ?', userId, limit);
}

export async function createChatSession(input: { user_id: string; title?: string; model: string; system_prompt?: string }): Promise<ChatSession> {
  const id = randomUUID();
  await q.run(
    `INSERT INTO chat_sessions (id, user_id, title, model, system_prompt) VALUES (?, ?, ?, ?, ?)`,
    id, input.user_id, input.title || null, input.model, input.system_prompt || null);
  return (await findChatSession(id))!;
}

export async function updateChatSession(id: string, updates: { title?: string; model?: string; system_prompt?: string }): Promise<ChatSession | undefined> {
  const fields: string[] = [];
  const params: Array<string | null> = [];
  if (updates.title !== undefined) { fields.push('title = ?'); params.push(updates.title); }
  if (updates.model !== undefined) { fields.push('model = ?'); params.push(updates.model); }
  if (updates.system_prompt !== undefined) { fields.push('system_prompt = ?'); params.push(updates.system_prompt); }
  if (fields.length === 0) return findChatSession(id);
  fields.push('updated_at = CURRENT_TIMESTAMP');
  await q.run(`UPDATE chat_sessions SET ${fields.join(', ')} WHERE id = ?`, ...params, id);
  return findChatSession(id);
}

/** Deletes the session; its messages go with it (ON DELETE CASCADE on both drivers). */
export async function deleteChatSession(id: string): Promise<boolean> {
  return (await q.run('DELETE FROM chat_sessions WHERE id = ?', id)).changes > 0;
}

export async function listChatMessages(sessionId: string): Promise<ChatMessage[]> {
  return q.all<ChatMessage>('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC, id ASC', sessionId);
}

/** Adds a message and bumps the session's updated_at, in one transaction. */
export async function createChatMessage(input: { session_id: string; role: ChatMessage['role']; content: string }): Promise<ChatMessage> {
  const id = orderedId();
  return sql().tx(function* (): Step<ChatMessage> {
    yield* run('INSERT INTO chat_messages (id, session_id, role, content) VALUES (?, ?, ?, ?)', id, input.session_id, input.role, input.content);
    yield* run('UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', input.session_id);
    return (yield* one<ChatMessage>('SELECT * FROM chat_messages WHERE id = ?', id))!;
  });
}

/** Deletes every message of a session; resolves the number removed. */
export async function clearChatMessages(sessionId: string): Promise<number> {
  return (await q.run('DELETE FROM chat_messages WHERE session_id = ?', sessionId)).changes;
}
