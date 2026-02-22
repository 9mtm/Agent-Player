/**
 * Sessions API Routes
 */

import type { FastifyInstance } from 'fastify';
import { sessionsDb, messagesDb } from '../../db/index.js';

export async function sessionsRoutes(fastify: FastifyInstance) {
  // GET /api/sessions - List all sessions
  fastify.get('/api/sessions', async () => {
    const sessions = sessionsDb.list();
    return { sessions };
  });

  // POST /api/sessions - Create new session
  fastify.post<{
    Body: { title?: string; model?: string; systemPrompt?: string }
  }>('/api/sessions', async (request) => {
    const session = sessionsDb.create(request.body);
    return { session };
  });

  // GET /api/sessions/:id - Get session by ID
  fastify.get<{
    Params: { id: string }
  }>('/api/sessions/:id', async (request, reply) => {
    const session = sessionsDb.get(request.params.id);
    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }
    return { session };
  });

  // PUT /api/sessions/:id - Update session (full replacement)
  fastify.put<{
    Params: { id: string };
    Body: { title?: string; model?: string }
  }>('/api/sessions/:id', async (request, reply) => {
    const session = sessionsDb.update(request.params.id, request.body);
    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }
    return { session };
  });

  // PATCH /api/sessions/:id - Update session (partial update)
  fastify.patch<{
    Params: { id: string };
    Body: { title?: string; model?: string }
  }>('/api/sessions/:id', async (request, reply) => {
    const session = sessionsDb.update(request.params.id, request.body);
    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }
    return { session };
  });

  // DELETE /api/sessions/:id - Delete session
  fastify.delete<{
    Params: { id: string }
  }>('/api/sessions/:id', async (request, reply) => {
    const deleted = sessionsDb.delete(request.params.id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Session not found' });
    }
    return { success: true };
  });

  // GET /api/sessions/:id/messages - Get session messages
  fastify.get<{
    Params: { id: string }
  }>('/api/sessions/:id/messages', async (request, reply) => {
    console.log('[Sessions] 📖 Loading messages for session:', request.params.id);
    const session = sessionsDb.get(request.params.id);
    if (!session) {
      console.log('[Sessions] ❌ Session not found:', request.params.id);
      return reply.status(404).send({ error: 'Session not found' });
    }
    const messages = messagesDb.list(request.params.id);
    console.log('[Sessions] ✅ Messages loaded:', messages.length);
    messages.forEach((m, i) => {
      console.log(`  [${i + 1}] ${m.role}: ${m.content?.slice(0, 50)}...`);
    });
    return { messages };
  });

  // POST /api/sessions/:id/messages - Add message to session
  fastify.post<{
    Params: { id: string };
    Body: { role: string; content: string; model?: string; tokens?: number }
  }>('/api/sessions/:id/messages', async (request, reply) => {
    console.log('[Sessions] 💾 Saving message to session:', request.params.id);
    console.log('  📝 Role:', request.body.role);
    console.log('  📝 Content:', request.body.content?.slice(0, 50) + '...');

    const session = sessionsDb.get(request.params.id);
    if (!session) {
      console.log('[Sessions] ❌ Session not found:', request.params.id);
      return reply.status(404).send({ error: 'Session not found' });
    }
    const message = messagesDb.create(request.params.id, request.body);
    console.log('[Sessions] ✅ Message saved with ID:', message.id);
    return { message };
  });

  // DELETE /api/sessions/:id/messages - Clear session messages
  fastify.delete<{
    Params: { id: string }
  }>('/api/sessions/:id/messages', async (request, reply) => {
    const session = sessionsDb.get(request.params.id);
    if (!session) {
      return reply.status(404).send({ error: 'Session not found' });
    }
    const count = messagesDb.clear(request.params.id);
    return { success: true, deleted: count };
  });
}
