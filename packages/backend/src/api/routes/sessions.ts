/**
 * Sessions API Routes
 *
 * SECURITY (S0-Q.11): every /api/sessions* route needs a valid bearer token of
 * an active user. The user always comes from the token; sessions of other users
 * answer 404 (there is no owner-wide session view).
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { sessionsDb, messagesDb } from '../../db/index.js';
import { authenticateActiveUser } from '../../auth/route-guards.js';

function callerId(request: FastifyRequest): string {
  return (request as any).sessionsUserId as string;
}

export async function sessionsRoutes(fastify: FastifyInstance) {
  // Encapsulated to this plugin: applies to the session routes only.
  fastify.addHook('preHandler', async (request, reply) => {
    const user = authenticateActiveUser(request);
    if (!user) return reply.code(401).send({ error: 'Authentication required' });
    (request as any).sessionsUserId = user.id;
  });

  /** True if the session exists and belongs to the caller. */
  const owns = (request: FastifyRequest, id: string) => sessionsDb.ownerOf(id) === callerId(request);
  const notFound = (reply: any) => reply.status(404).send({ error: 'Session not found' });

  // GET /api/sessions - List the caller's sessions
  fastify.get('/api/sessions', async (request) => {
    const sessions = sessionsDb.list(callerId(request));
    return { sessions };
  });

  // POST /api/sessions - Create new session (owned by the caller)
  fastify.post<{
    Body: { title?: string; model?: string; systemPrompt?: string }
  }>('/api/sessions', async (request) => {
    const { title, model, systemPrompt } = request.body || {};
    const session = sessionsDb.create({ title, model, systemPrompt }, callerId(request));
    return { session };
  });

  // GET /api/sessions/:id - Get session by ID
  fastify.get<{
    Params: { id: string }
  }>('/api/sessions/:id', async (request, reply) => {
    if (!owns(request, request.params.id)) return notFound(reply);
    const session = sessionsDb.get(request.params.id);
    if (!session) return notFound(reply);
    return { session };
  });

  const update = async (request: FastifyRequest<{ Params: { id: string }; Body: { title?: string; model?: string } }>, reply: any) => {
    if (!owns(request, request.params.id)) return notFound(reply);
    const { title, model } = request.body || {};
    const session = sessionsDb.update(request.params.id, { title, model });
    if (!session) return notFound(reply);
    return { session };
  };

  // PUT /api/sessions/:id - Update session (full replacement)
  fastify.put<{ Params: { id: string }; Body: { title?: string; model?: string } }>('/api/sessions/:id', update);

  // PATCH /api/sessions/:id - Update session (partial update)
  fastify.patch<{ Params: { id: string }; Body: { title?: string; model?: string } }>('/api/sessions/:id', update);

  // DELETE /api/sessions/:id - Delete session
  fastify.delete<{
    Params: { id: string }
  }>('/api/sessions/:id', async (request, reply) => {
    if (!owns(request, request.params.id)) return notFound(reply);
    const deleted = sessionsDb.delete(request.params.id);
    if (!deleted) return notFound(reply);
    return { success: true };
  });

  // GET /api/sessions/:id/messages - Get session messages
  fastify.get<{
    Params: { id: string }
  }>('/api/sessions/:id/messages', async (request, reply) => {
    if (!owns(request, request.params.id)) return notFound(reply);
    const messages = messagesDb.list(request.params.id);
    return { messages };
  });

  // POST /api/sessions/:id/messages - Add message to session
  fastify.post<{
    Params: { id: string };
    Body: { role: string; content: string; model?: string; tokens?: number }
  }>('/api/sessions/:id/messages', async (request, reply) => {
    if (!owns(request, request.params.id)) return notFound(reply);
    const body = request.body || ({} as any);
    if (!['user', 'assistant', 'system'].includes(body.role) || typeof body.content !== 'string') {
      return reply.status(400).send({ error: 'role (user|assistant|system) and content are required' });
    }
    const message = messagesDb.create(request.params.id, {
      role: body.role, content: body.content, model: body.model, tokens: body.tokens,
    });
    return { message };
  });

  // DELETE /api/sessions/:id/messages - Clear session messages
  fastify.delete<{
    Params: { id: string }
  }>('/api/sessions/:id/messages', async (request, reply) => {
    if (!owns(request, request.params.id)) return notFound(reply);
    const count = messagesDb.clear(request.params.id);
    return { success: true, deleted: count };
  });
}
