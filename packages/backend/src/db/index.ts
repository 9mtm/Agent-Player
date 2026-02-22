/**
 * Database Module - Real SQLite with better-sqlite3
 * Central access point for all database operations
 */

export { DatabaseManager, getDatabase, closeDatabase } from './database.js';
export type { DatabaseConfig } from './database.js';

// Repositories
export { UsersRepository } from './repositories/users.js';
export type { User, CreateUserInput, UpdateUserInput } from './repositories/users.js';

export { SessionsRepository } from './repositories/sessions.js';
export type { ChatSession, ChatMessage, CreateSessionInput, CreateMessageInput } from './repositories/sessions.js';

export { SkillsRepository } from './repositories/skills.js';
export type { Skill, SkillSettings, SkillSecret, CreateSkillInput } from './repositories/skills.js';

// Convenience function to get all repositories
import { getDatabase } from './database.js';
import { UsersRepository } from './repositories/users.js';
import { SessionsRepository } from './repositories/sessions.js';
import { SkillsRepository } from './repositories/skills.js';

export interface Repositories {
  users: UsersRepository;
  sessions: SessionsRepository;
  skills: SkillsRepository;
}

let repositories: Repositories | null = null;

/**
 * Get all repository instances
 */
export function getRepositories(): Repositories {
  if (!repositories) {
    const db = getDatabase();
    repositories = {
      users: new UsersRepository(db),
      sessions: new SessionsRepository(db),
      skills: new SkillsRepository(db)
    };
  }

  return repositories;
}

/**
 * Initialize database and run migrations
 */
export async function initializeDatabase(): Promise<void> {
  const db = getDatabase();
  await db.initialize();
}

// Backward compatibility: Legacy API for sessions and messages
// These use the new repositories under the hood
const repos = getRepositories();

export interface Session {
  id: string;
  title: string | null;
  model: string | null;
  systemPrompt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  model: string | null;
  tokens: number | null;
  createdAt: string;
}

// Legacy Sessions API (uses SessionsRepository under the hood)
export const sessionsDb = {
  list(): Session[] {
    // For backward compatibility, use mock user ID
    const sessions = repos.sessions.findUserSessions('mock-user');
    return sessions.map(s => ({
      id: s.id,
      title: s.title,
      model: s.model,
      systemPrompt: s.system_prompt,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));
  },

  get(id: string): Session | null {
    const session = repos.sessions.findSessionById(id);
    if (!session) return null;

    return {
      id: session.id,
      title: session.title,
      model: session.model,
      systemPrompt: session.system_prompt,
      createdAt: session.created_at,
      updatedAt: session.updated_at
    };
  },

  create(input: { title?: string; model?: string; systemPrompt?: string }): Session {
    const session = repos.sessions.createSession({
      user_id: 'mock-user', // For backward compatibility
      title: input.title,
      model: input.model || 'gpt-4',
      system_prompt: input.systemPrompt
    });

    return {
      id: session.id,
      title: session.title,
      model: session.model,
      systemPrompt: session.system_prompt,
      createdAt: session.created_at,
      updatedAt: session.updated_at
    };
  },

  update(id: string, input: { title?: string; model?: string }): Session | null {
    const session = repos.sessions.updateSession(id, {
      title: input.title,
      model: input.model
    });

    if (!session) return null;

    return {
      id: session.id,
      title: session.title,
      model: session.model,
      systemPrompt: session.system_prompt,
      createdAt: session.created_at,
      updatedAt: session.updated_at
    };
  },

  delete(id: string): boolean {
    return repos.sessions.deleteSession(id);
  },

  touch(id: string): void {
    repos.sessions.updateSession(id, {});
  }
};

// Legacy Messages API (uses SessionsRepository under the hood)
export const messagesDb = {
  list(sessionId: string): Message[] {
    const messages = repos.sessions.getSessionMessages(sessionId);
    return messages.map(m => ({
      id: m.id,
      sessionId: m.session_id,
      role: m.role,
      content: m.content,
      model: null,
      tokens: null,
      createdAt: m.created_at
    }));
  },

  get(id: string): Message | null {
    const message = repos.sessions.findMessageById(id);
    if (!message) return null;

    return {
      id: message.id,
      sessionId: message.session_id,
      role: message.role,
      content: message.content,
      model: null,
      tokens: null,
      createdAt: message.created_at
    };
  },

  create(sessionId: string, input: { role: string; content: string; model?: string; tokens?: number }): Message {
    const message = repos.sessions.createMessage({
      session_id: sessionId,
      role: input.role as 'user' | 'assistant' | 'system',
      content: input.content
    });

    return {
      id: message.id,
      sessionId: message.session_id,
      role: message.role,
      content: message.content,
      model: input.model || null,
      tokens: input.tokens || null,
      createdAt: message.created_at
    };
  },

  clear(sessionId: string): number {
    repos.sessions.deleteSessionMessages(sessionId);
    return 0;
  }
};

// Export default for backward compatibility
export default getDatabase();
