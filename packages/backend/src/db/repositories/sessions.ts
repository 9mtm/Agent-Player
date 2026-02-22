/**
 * Chat Sessions Repository
 * Handles chat session and message operations
 */

import { v4 as uuidv4 } from 'uuid';
import { DatabaseManager } from '../database.js';

export interface ChatSession {
  id: string;
  user_id: string;
  title: string | null;
  model: string;
  system_prompt: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface CreateSessionInput {
  user_id: string;
  title?: string;
  model: string;
  system_prompt?: string;
}

export interface CreateMessageInput {
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class SessionsRepository {
  constructor(private db: DatabaseManager) {}

  /**
   * Create a new chat session
   */
  createSession(input: CreateSessionInput): ChatSession {
    const id = uuidv4();

    this.db.execute(
      `INSERT INTO chat_sessions (id, user_id, title, model, system_prompt)
       VALUES (?, ?, ?, ?, ?)`,
      id,
      input.user_id,
      input.title || null,
      input.model,
      input.system_prompt || null
    );

    return this.findSessionById(id)!;
  }

  /**
   * Find session by ID
   */
  findSessionById(id: string): ChatSession | undefined {
    return this.db.queryOne<ChatSession>(
      'SELECT * FROM chat_sessions WHERE id = ?',
      id
    );
  }

  /**
   * Find all sessions for a user
   */
  findUserSessions(user_id: string, limit = 50): ChatSession[] {
    return this.db.query<ChatSession>(
      'SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?',
      user_id,
      limit
    );
  }

  /**
   * Update session
   */
  updateSession(id: string, updates: { title?: string; model?: string; system_prompt?: string }): ChatSession | undefined {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      params.push(updates.title);
    }

    if (updates.model !== undefined) {
      fields.push('model = ?');
      params.push(updates.model);
    }

    if (updates.system_prompt !== undefined) {
      fields.push('system_prompt = ?');
      params.push(updates.system_prompt);
    }

    if (fields.length === 0) {
      return this.findSessionById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    this.db.execute(
      `UPDATE chat_sessions SET ${fields.join(', ')} WHERE id = ?`,
      ...params
    );

    return this.findSessionById(id);
  }

  /**
   * Delete session and all its messages
   */
  deleteSession(id: string): boolean {
    const result = this.db.execute('DELETE FROM chat_sessions WHERE id = ?', id);
    return result.changes > 0;
  }

  /**
   * Create a new message
   */
  createMessage(input: CreateMessageInput): ChatMessage {
    const id = uuidv4();

    this.db.execute(
      `INSERT INTO chat_messages (id, session_id, role, content)
       VALUES (?, ?, ?, ?)`,
      id,
      input.session_id,
      input.role,
      input.content
    );

    // Update session's updated_at
    this.db.execute(
      'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      input.session_id
    );

    return this.findMessageById(id)!;
  }

  /**
   * Find message by ID
   */
  findMessageById(id: string): ChatMessage | undefined {
    return this.db.queryOne<ChatMessage>(
      'SELECT * FROM chat_messages WHERE id = ?',
      id
    );
  }

  /**
   * Get all messages for a session
   */
  getSessionMessages(session_id: string): ChatMessage[] {
    return this.db.query<ChatMessage>(
      'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
      session_id
    );
  }

  /**
   * Delete all messages in a session
   */
  deleteSessionMessages(session_id: string): boolean {
    const result = this.db.execute('DELETE FROM chat_messages WHERE session_id = ?', session_id);
    return result.changes > 0;
  }

  /**
   * Delete a specific message
   */
  deleteMessage(id: string): boolean {
    const result = this.db.execute('DELETE FROM chat_messages WHERE id = ?', id);
    return result.changes > 0;
  }

  /**
   * Get session with messages
   */
  getSessionWithMessages(session_id: string): { session: ChatSession; messages: ChatMessage[] } | null {
    const session = this.findSessionById(session_id);
    if (!session) return null;

    const messages = this.getSessionMessages(session_id);

    return { session, messages };
  }

  /**
   * Count messages in session
   */
  countSessionMessages(session_id: string): number {
    const result = this.db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM chat_messages WHERE session_id = ?',
      session_id
    );
    return result?.count || 0;
  }

  /**
   * Get recent sessions with message count
   */
  getRecentSessionsWithCount(user_id: string, limit = 20): Array<ChatSession & { message_count: number }> {
    return this.db.query(
      `SELECT
        s.*,
        COUNT(m.id) as message_count
       FROM chat_sessions s
       LEFT JOIN chat_messages m ON m.session_id = s.id
       WHERE s.user_id = ?
       GROUP BY s.id
       ORDER BY s.updated_at DESC
       LIMIT ?`,
      user_id,
      limit
    );
  }
}
