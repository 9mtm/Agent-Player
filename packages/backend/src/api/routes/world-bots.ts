import type { FastifyInstance } from 'fastify';
import { dialect, one, q, run, sql, type Step } from '../../repositories/sql-steps.js';
import { forUpdate, nowText } from '../../db/pg/dialect.js';
import { randomUUID } from 'crypto';
import { handleError } from '../error-handler.js';

import { getUserIdFromRequestSafe } from '../../auth/jwt.js';

// F-02: the shared check (signature with the real JWT_SECRET, expiry and
// token_version), so tokens ended by logout are refused here too. The old
// local copy fell back to a hard-coded secret and skipped token_version.
function getUserIdFromRequest(request: any): string | null {
  return getUserIdFromRequestSafe(request);
}

const BOT_WITH_AGENT = `
        SELECT
          wb.*,
          a.name as agent_name,
          a.emoji as agent_emoji,
          a.avatar_url as agent_avatar_url
        FROM world_bots wb
        LEFT JOIN agents_config a ON wb.agent_id = a.id
        WHERE wb.id = ?
      `;

type BotOutcome = { status: 404; error: string } | { status: 200; bot?: unknown };

/** The caller's own world, locked for the rest of the transaction (PostgreSQL). */
function* ownWorldStep(worldId: string, userId: string): Step<boolean> {
  const d = yield* dialect();
  return !!(yield* one(`SELECT id FROM user_worlds WHERE id = ? AND user_id = ?${forUpdate(d)}`, worldId, userId));
}

/**
 * B2.2c: every query runs on the process driver (sql-steps). world_bots
 * timestamps are TEXT on both drivers: the update writes nowText (the former
 * datetime("now") quoted "now" as an identifier, which PostgreSQL refuses).
 * Create, update and delete check the world's owner and the bot and write in
 * one transaction, with the world row locked on PostgreSQL.
 */
export async function worldBotsRoutes(fastify: FastifyInstance) {
  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/multiverse/:worldId/bots - List all bots in a world
  // ───────────────────────────────────────────────────────────────────────────
  fastify.get('/api/multiverse/:worldId/bots', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { worldId } = request.params as { worldId: string };

      // Check if world exists and user has access (owner or public)
      const world = await q.one(`
        SELECT * FROM user_worlds
        WHERE id = ? AND (user_id = ? OR is_public = 1)
      `, worldId, userId);

      if (!world) {
        return reply.status(404).send({ error: 'World not found or access denied' });
      }

      // Get all bots in the world with agent details
      const bots = await q.all(`
        SELECT
          wb.*,
          a.name as agent_name,
          a.emoji as agent_emoji,
          a.avatar_url as agent_avatar_url
        FROM world_bots wb
        LEFT JOIN agents_config a ON wb.agent_id = a.id
        WHERE wb.world_id = ?
        ORDER BY wb.created_at DESC
      `, worldId);

      return reply.send({ bots });
    } catch (error: any) {
      fastify.log.error('Error fetching world bots:', error);
      return handleError(reply, error, 'internal', '[WorldBots] List failed');
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // POST /api/multiverse/:worldId/bots - Add bot to world
  // ───────────────────────────────────────────────────────────────────────────
  fastify.post('/api/multiverse/:worldId/bots', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { worldId } = request.params as { worldId: string };

      const body = request.body as any;
      const {
        agent_id,
        position_x = 0,
        position_y = 0,
        position_z = 0,
        rotation_y = 0,
        animation_url,
        is_active = 1
      } = body;

      const id = randomUUID();
      const out = await sql().tx(function* (): Step<BotOutcome | { status: 400; error: string }> {
        // Check ownership
        if (!(yield* ownWorldStep(worldId, userId))) return { status: 404, error: 'World not found or access denied' };
        if (!agent_id) return { status: 400, error: 'agent_id is required' };

        // Check if agent exists
        const agent = yield* one('SELECT * FROM agents_config WHERE id = ?', agent_id);
        if (!agent) return { status: 404, error: 'Agent not found' };

        yield* run(`
        INSERT INTO world_bots (
          id, world_id, agent_id, position_x, position_y, position_z,
          rotation_y, animation_url, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        id, worldId, agent_id, position_x, position_y, position_z,
        rotation_y, animation_url ?? null, is_active ? 1 : 0);

        return { status: 200, bot: yield* one(BOT_WITH_AGENT, id) };
      });
      if (out.status !== 200) return reply.status(out.status).send({ error: out.error });
      const bot = out.bot;

      return reply.send({ bot });
    } catch (error: any) {
      fastify.log.error('Error creating world bot:', error);
      return handleError(reply, error, 'internal', '[WorldBots] Create failed');
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PUT /api/multiverse/:worldId/bots/:botId - Update bot
  // ───────────────────────────────────────────────────────────────────────────
  fastify.put('/api/multiverse/:worldId/bots/:botId', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { worldId, botId } = request.params as { worldId: string; botId: string };

      const body = request.body as any;
      const {
        position_x,
        position_y,
        position_z,
        rotation_y,
        animation_url,
        is_active
      } = body;

      const updates: string[] = [];
      const values: any[] = [];

      if (position_x !== undefined) { updates.push('position_x = ?'); values.push(position_x); }
      if (position_y !== undefined) { updates.push('position_y = ?'); values.push(position_y); }
      if (position_z !== undefined) { updates.push('position_z = ?'); values.push(position_z); }
      if (rotation_y !== undefined) { updates.push('rotation_y = ?'); values.push(rotation_y); }
      if (animation_url !== undefined) { updates.push('animation_url = ?'); values.push(animation_url); }
      if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }

      values.push(botId);

      const out = await sql().tx(function* (): Step<BotOutcome> {
        const d = yield* dialect();
        // Check ownership of world
        if (!(yield* ownWorldStep(worldId, userId))) return { status: 404, error: 'World not found or access denied' };

        // Check if bot exists in this world
        const existing = yield* one(`SELECT id FROM world_bots WHERE id = ? AND world_id = ?${forUpdate(d)}`, botId, worldId);
        if (!existing) return { status: 404, error: 'Bot not found in this world' };

        updates.push(`updated_at = ${nowText(d)}`);
        if (updates.length > 1) {
          yield* run(`UPDATE world_bots SET ${updates.join(', ')} WHERE id = ?`, ...values);
        }

        return { status: 200, bot: yield* one(BOT_WITH_AGENT, botId) };
      });
      if (out.status !== 200) return reply.status(out.status).send({ error: out.error });
      const bot = out.bot;

      return reply.send({ bot });
    } catch (error: any) {
      fastify.log.error('Error updating world bot:', error);
      return handleError(reply, error, 'internal', '[WorldBots] Update failed');
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // DELETE /api/multiverse/:worldId/bots/:botId - Remove bot from world
  // ───────────────────────────────────────────────────────────────────────────
  fastify.delete('/api/multiverse/:worldId/bots/:botId', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { worldId, botId } = request.params as { worldId: string; botId: string };

      const out = await sql().tx(function* (): Step<BotOutcome> {
        // Check ownership of world
        if (!(yield* ownWorldStep(worldId, userId))) return { status: 404, error: 'World not found or access denied' };

        // The bot must be in this world: delete only there (one statement)
        const res = yield* run('DELETE FROM world_bots WHERE id = ? AND world_id = ?', botId, worldId);
        if (res.changes === 0) return { status: 404, error: 'Bot not found in this world' };
        return { status: 200 };
      });
      if (out.status !== 200) return reply.status(out.status).send({ error: out.error });
      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error('Error deleting world bot:', error);
      return handleError(reply, error, 'internal', '[WorldBots] Delete failed');
    }
  });
}
