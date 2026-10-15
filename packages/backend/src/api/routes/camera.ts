/**
 * Camera Sessions API
 *
 * POST   /api/camera/sessions          create/start a session
 * PATCH  /api/camera/sessions/:id      end session (set ended_at, duration, file_id)
 * GET    /api/camera/sessions          list sessions (recent first)
 * DELETE /api/camera/sessions/:id      delete session record
 *
 * GET    /api/camera/room/:roomId      get room info (for WebRTC signaling)
 * POST   /api/camera/room/:roomId/signal  exchange WebRTC signal (offer/answer/ice)
 */

import { backgroundEnabled } from '../../config/background.js';
import type { FastifyInstance } from 'fastify';
import { q } from '../../repositories/sql-steps.js';
import { randomUUID } from 'node:crypto';

interface CameraSession {
  id: string;
  room_id: string;
  user_id: string;
  agent_id: string;
  mode: 'vision' | 'record' | 'call';
  started_at: string;
  ended_at: string | null;
  duration_s: number | null;
  file_id: string | null;
  frame_count: number;
  notes: string;
  created_at: string;
}

// In-memory signal store for WebRTC (per room, ephemeral)
// callerIce = ICE candidates from the caller (offerer) → consumed by callee
// calleeIce = ICE candidates from the callee (answerer) → consumed by caller
const roomSignals = new Map<string, {
  offer?: any;
  answer?: any;
  callerIce: any[];
  calleeIce: any[];
  createdAt: number;
}>();

// Clean up old rooms every 30 minutes (RUN-ISO F2: not with AGENT_PLAYER_BACKGROUND=off)
if (backgroundEnabled()) {
  setInterval(() => {
    const cutoff = Date.now() - 30 * 60 * 1000;
    for (const [id, room] of roomSignals) {
      if (room.createdAt < cutoff) roomSignals.delete(id);
    }
  }, 5 * 60 * 1000).unref(); // housekeeping only: never keeps the process alive
}

export async function cameraRoutes(fastify: FastifyInstance): Promise<void> {

  // POST /api/camera/sessions — start session
  fastify.post('/api/camera/sessions', async (request, reply) => {
    const { mode = 'vision', agent_id = '', room_id, notes = '' } = request.body as any;
    const id = randomUUID();
    const roomId = room_id || randomUUID();
    const now = new Date().toISOString();

    await q.run(`
      INSERT INTO camera_sessions (id, room_id, user_id, agent_id, mode, started_at, notes)
      VALUES (?, ?, 'local', ?, ?, ?, ?)`,
      id, roomId, agent_id, mode, now, notes);

    const session = await q.one<CameraSession>('SELECT * FROM camera_sessions WHERE id = ?', id);
    return reply.send({ session, roomId });
  });

  // PATCH /api/camera/sessions/:id — end session
  fastify.patch<{ Params: { id: string } }>('/api/camera/sessions/:id', async (request, reply) => {
    const { id } = request.params;
    const { file_id, frame_count, notes } = request.body as any;

    const session = await q.one<CameraSession>('SELECT * FROM camera_sessions WHERE id = ?', id);
    if (!session) return reply.status(404).send({ error: 'Session not found' });

    const now = new Date().toISOString();
    const startMs = new Date(session.started_at).getTime();
    const endMs = new Date(now).getTime();
    const duration_s = Math.round((endMs - startMs) / 1000);

    await q.run(`
      UPDATE camera_sessions
      SET ended_at = ?, duration_s = ?, file_id = COALESCE(?, file_id),
          frame_count = COALESCE(?, frame_count), notes = COALESCE(?, notes)
      WHERE id = ?`,
      now, duration_s, file_id ?? null, frame_count ?? null, notes ?? null, id);

    const updated = await q.one<CameraSession>('SELECT * FROM camera_sessions WHERE id = ?', id);
    return reply.send({ session: updated });
  });

  // GET /api/camera/sessions — list (most recent first)
  fastify.get('/api/camera/sessions', async (request, reply) => {
    const { limit = '20', offset = '0', mode } = request.query as any;
    let sql = 'SELECT * FROM camera_sessions';
    const params: Array<string | number> = [];
    if (mode) { sql += ' WHERE mode = ?'; params.push(String(mode)); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    // Bound integers on both drivers (a non-numeric value reached the SQL before).
    const lim = Number.parseInt(String(limit), 10);
    const off = Number.parseInt(String(offset), 10);
    params.push(Number.isFinite(lim) ? Math.min(Math.max(lim, 1), 200) : 20, Number.isFinite(off) ? Math.max(off, 0) : 0);
    const sessions = await q.all<CameraSession>(sql, ...params);
    return reply.send({ sessions, total: sessions.length });
  });

  // DELETE /api/camera/sessions/:id
  fastify.delete<{ Params: { id: string } }>('/api/camera/sessions/:id', async (request, reply) => {
    await q.run('DELETE FROM camera_sessions WHERE id = ?', request.params.id);
    return reply.send({ success: true });
  });

  // ─── WebRTC Signaling ────────────────────────────────────────────────────────

  // GET /api/camera/room/:roomId — get current signals for room
  fastify.get<{ Params: { roomId: string } }>('/api/camera/room/:roomId', async (request, reply) => {
    const { roomId } = request.params;
    const room = roomSignals.get(roomId) ?? null;
    return reply.send({ roomId, room });
  });

  // POST /api/camera/room/:roomId/signal — post offer/answer/ICE candidate
  fastify.post<{ Params: { roomId: string } }>('/api/camera/room/:roomId/signal', async (request, reply) => {
    const { roomId } = request.params;
    const { type, data } = request.body as { type: 'offer' | 'answer' | 'ice'; data: any };

    if (!roomSignals.has(roomId)) {
      roomSignals.set(roomId, { callerIce: [], calleeIce: [], createdAt: Date.now() });
    }
    const room = roomSignals.get(roomId)!;
    const { from } = request.body as any; // 'caller' | 'callee'

    if (type === 'offer') room.offer = data;
    else if (type === 'answer') room.answer = data;
    else if (type === 'ice') {
      if (from === 'callee') room.calleeIce.push(data);
      else room.callerIce.push(data);
    }

    return reply.send({ success: true, roomId });
  });

  // DELETE /api/camera/room/:roomId — clear room signals
  fastify.delete<{ Params: { roomId: string } }>('/api/camera/room/:roomId', async (request, reply) => {
    roomSignals.delete(request.params.roomId);
    return reply.send({ success: true });
  });
}
