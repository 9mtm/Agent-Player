/**
 * Task board API (BOARD-01). Owner only (auth gate owner tier, route access
 * 'owner', handler role check).
 *
 *   GET   /api/boards                                  -> { boards: [{id, name}] }  (first call creates the company board)
 *   GET   /api/boards/:id?archived=1                   -> { id, name, columns, cards }
 *   POST  /api/boards/:id/columns          { name }    -> board
 *   PUT   /api/boards/:id/columns/:columnId { name }   -> board
 *   POST  /api/boards/:id/cards            { columnId, title, description?, priority?, dueDate?, agents?, departments? } -> 201 card
 *   PUT   /api/boards/:id/cards/:cardId    { expectedVersion, title?, description?, priority?, dueDate?, agents?, departments?,
 *                                            columnId?, beforeCardId?, archived? } -> card; 409 { code: 'version_conflict', card }
 *   GET   /api/boards/:id/cards/:cardId/comments        -> { comments }
 *   POST  /api/boards/:id/cards/:cardId/comments { body } -> 201 { comments }
 * Errors: 400 { code: 'invalid_board' | 'invalid_version' }, 404 { code: 'not_found' }.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { actorOf } from '../../auth/auth-gate.js';
import { actorOrReply, requireOwner } from '../../repositories/scope.js';
import {
  BoardError, addColumn, addComment, createCard, getBoard, listBoards, listComments, renameColumn, updateCard,
} from '../../services/task-board.js';

const ID = /^[A-Za-z0-9_-]{1,64}$/;

function ownerOf(request: FastifyRequest, reply: FastifyReply): string | null {
  const actor = actorOrReply(reply, actorOf(request), requireOwner);
  return actor ? actor.userId ?? null : null;
}

function objectBody(body: unknown): Record<string, unknown> {
  if (body === undefined || body === null) return {};
  if (typeof body !== 'object' || Array.isArray(body)) throw new BoardError(400, 'invalid_board', 'Body must be a JSON object');
  return body as Record<string, unknown>;
}

function fail(err: unknown, reply: FastifyReply) {
  if (err instanceof BoardError) {
    const extra = (err as BoardError & { current?: unknown }).current;
    return reply.code(err.status).send({ error: err.message, code: err.code, ...(extra ? { card: extra } : {}) });
  }
  throw err;
}

export async function taskBoardRoutes(fastify: FastifyInstance) {
  const config = { access: 'owner' as const };
  type P = { id: string; columnId?: string; cardId?: string };
  const ids = (p: P) => [p.id, p.columnId, p.cardId].every((x) => x === undefined || ID.test(x));

  fastify.get('/api/boards', { config }, async (request, reply) => {
    const owner = ownerOf(request, reply); if (owner === null) return reply;
    return { boards: await listBoards(owner) };
  });

  fastify.get<{ Params: P; Querystring: { archived?: string } }>('/api/boards/:id', { config }, async (request, reply) => {
    const owner = ownerOf(request, reply); if (owner === null) return reply;
    if (!ids(request.params)) return reply.code(404).send({ error: 'Board not found', code: 'not_found' });
    try { return await getBoard(owner, request.params.id, request.query?.archived === '1'); } catch (err) { return fail(err, reply); }
  });

  fastify.post<{ Params: P; Body: unknown }>('/api/boards/:id/columns', { config }, async (request, reply) => {
    const owner = ownerOf(request, reply); if (owner === null) return reply;
    if (!ids(request.params)) return reply.code(404).send({ error: 'Board not found', code: 'not_found' });
    try { return reply.code(201).send(await addColumn(owner, request.params.id, objectBody(request.body))); } catch (err) { return fail(err, reply); }
  });

  fastify.put<{ Params: P; Body: unknown }>('/api/boards/:id/columns/:columnId', { config }, async (request, reply) => {
    const owner = ownerOf(request, reply); if (owner === null) return reply;
    if (!ids(request.params)) return reply.code(404).send({ error: 'Column not found', code: 'not_found' });
    try { return await renameColumn(owner, request.params.id, request.params.columnId!, objectBody(request.body)); } catch (err) { return fail(err, reply); }
  });

  fastify.post<{ Params: P; Body: unknown }>('/api/boards/:id/cards', { config }, async (request, reply) => {
    const owner = ownerOf(request, reply); if (owner === null) return reply;
    if (!ids(request.params)) return reply.code(404).send({ error: 'Board not found', code: 'not_found' });
    try { return reply.code(201).send(await createCard(owner, request.params.id, objectBody(request.body))); } catch (err) { return fail(err, reply); }
  });

  fastify.put<{ Params: P; Body: unknown }>('/api/boards/:id/cards/:cardId', { config }, async (request, reply) => {
    const owner = ownerOf(request, reply); if (owner === null) return reply;
    if (!ids(request.params)) return reply.code(404).send({ error: 'Card not found', code: 'not_found' });
    try { return await updateCard(owner, request.params.id, request.params.cardId!, objectBody(request.body)); } catch (err) { return fail(err, reply); }
  });

  fastify.get<{ Params: P }>('/api/boards/:id/cards/:cardId/comments', { config }, async (request, reply) => {
    const owner = ownerOf(request, reply); if (owner === null) return reply;
    if (!ids(request.params)) return reply.code(404).send({ error: 'Card not found', code: 'not_found' });
    try { return { comments: await listComments(owner, request.params.id, request.params.cardId!) }; } catch (err) { return fail(err, reply); }
  });

  fastify.post<{ Params: P; Body: unknown }>('/api/boards/:id/cards/:cardId/comments', { config }, async (request, reply) => {
    const owner = ownerOf(request, reply); if (owner === null) return reply;
    if (!ids(request.params)) return reply.code(404).send({ error: 'Card not found', code: 'not_found' });
    try {
      return reply.code(201).send({ comments: await addComment(owner, request.params.id, request.params.cardId!, objectBody(request.body), { kind: 'user', id: owner }) });
    } catch (err) { return fail(err, reply); }
  });
}
