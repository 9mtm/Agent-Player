/**
 * Chat Service - Uses Backend API
 * Unified chat service that communicates with the backend
 */

import { sessionsAPI } from './backend/client';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Session {
  id: string;
  title: string;
  model?: string;
  systemPrompt?: string;
  createdAt: string;
  updatedAt: string;
}

export class ChatService {
  /**
   * Get or create a session
   */
  static async getOrCreateSession(sessionId?: string): Promise<Session> {
    if (sessionId) {
      const session = await sessionsAPI.get(sessionId);
      if (session) {
        return session as unknown as Session;
      }
    }

    // Create new session
    const created = await sessionsAPI.create({ title: 'New Conversation' });
    return created as unknown as Session;
  }

  /**
   * Get session by ID with messages
   */
  static async getSession(sessionId: string): Promise<Session & { messages: Message[] }> {
    const [session, messagesData] = await Promise.all([
      sessionsAPI.get(sessionId),
      sessionsAPI.getMessages(sessionId),
    ]);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return {
      ...(session as unknown as Session),
      messages: messagesData as unknown as Message[],
    };
  }

  /**
   * Save user message
   */
  static async saveUserMessage(sessionId: string, content: string): Promise<Message> {
    return sessionsAPI.addMessage(sessionId, {
      role: 'user',
      content,
    });
  }

  /**
   * Save assistant message
   */
  static async saveAssistantMessage(sessionId: string, content: string, model: string): Promise<Message> {
    return sessionsAPI.addMessage(sessionId, {
      role: 'assistant',
      content,
      model,
    });
  }

  /**
   * Get chat history
   */
  static async getHistory(sessionId: string): Promise<Message[]> {
    const data = await sessionsAPI.getMessages(sessionId);
    return data.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));
  }

  /**
   * List all sessions
   */
  static async listSessions(): Promise<Session[]> {
    const data = await sessionsAPI.list();
    return data as unknown as Session[];
  }

  /**
   * Delete a session
   */
  static async deleteSession(sessionId: string): Promise<void> {
    await sessionsAPI.delete(sessionId);
  }

  /**
   * Clear messages from a session
   */
  static async clearMessages(sessionId: string): Promise<void> {
    await sessionsAPI.clearMessages(sessionId);
  }
}
