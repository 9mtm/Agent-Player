/**
 * Database Module - Real SQLite with better-sqlite3
 * Central access point for all database operations
 */
export { DatabaseManager, getDatabase, closeDatabase } from './database.js';
// Repositories
export { UsersRepository } from './repositories/users.js';
export { SessionsRepository } from './repositories/sessions.js';
export { SkillsRepository } from './repositories/skills.js';
// Convenience function to get all repositories
import { getDatabase } from './database.js';
import { UsersRepository } from './repositories/users.js';
import { SessionsRepository } from './repositories/sessions.js';
import { SkillsRepository } from './repositories/skills.js';
let repositories = null;
/**
 * Get all repository instances
 */
export function getRepositories() {
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
export async function initializeDatabase() {
    const db = getDatabase();
    await db.initialize();
}
// Backward compatibility: Legacy API for sessions and messages
// These use the new repositories under the hood
const repos = getRepositories();
// Legacy Sessions API (uses SessionsRepository under the hood)
export const sessionsDb = {
    list() {
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
    get(id) {
        const session = repos.sessions.findSessionById(id);
        if (!session)
            return null;
        return {
            id: session.id,
            title: session.title,
            model: session.model,
            systemPrompt: session.system_prompt,
            createdAt: session.created_at,
            updatedAt: session.updated_at
        };
    },
    create(input) {
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
    update(id, input) {
        const session = repos.sessions.updateSession(id, {
            title: input.title,
            model: input.model
        });
        if (!session)
            return null;
        return {
            id: session.id,
            title: session.title,
            model: session.model,
            systemPrompt: session.system_prompt,
            createdAt: session.created_at,
            updatedAt: session.updated_at
        };
    },
    delete(id) {
        return repos.sessions.deleteSession(id);
    },
    touch(id) {
        repos.sessions.updateSession(id, {});
    }
};
// Legacy Messages API (uses SessionsRepository under the hood)
export const messagesDb = {
    list(sessionId) {
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
    get(id) {
        const message = repos.sessions.findMessageById(id);
        if (!message)
            return null;
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
    create(sessionId, input) {
        const message = repos.sessions.createMessage({
            session_id: sessionId,
            role: input.role,
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
    clear(sessionId) {
        repos.sessions.deleteSessionMessages(sessionId);
        return 0;
    }
};
// Export default for backward compatibility
export default getDatabase();
