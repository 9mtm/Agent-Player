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

import type { FastifyInstance } from 'fastify';
import { getDatabase } from '../../db/index.js';
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

// Clean up old rooms every 30 minutes
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, room] of roomSignals) {
    if (room.createdAt < cutoff) roomSignals.delete(id);
  }
}, 5 * 60 * 1000);

export async function cameraRoutes(fastify: FastifyInstance): Promise<void> {

  // POST /api/camera/sessions — start session
  fastify.post('/api/camera/sessions', async (request, reply) => {
    const { mode = 'vision', agent_id = '', room_id, notes = '' } = request.body as any;
    const db = getDatabase();
    const id = randomUUID();
    const roomId = room_id || randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO camera_sessions (id, room_id, user_id, agent_id, mode, started_at, notes)
      VALUES (?, ?, 'local', ?, ?, ?, ?)
    `).run(id, roomId, agent_id, mode, now, notes);

    const session = db.prepare('SELECT * FROM camera_sessions WHERE id = ?').get(id) as CameraSession;
    return reply.send({ session, roomId });
  });

  // PATCH /api/camera/sessions/:id — end session
  fastify.patch<{ Params: { id: string } }>('/api/camera/sessions/:id', async (request, reply) => {
    const { id } = request.params;
    const { file_id, frame_count, notes } = request.body as any;
    const db = getDatabase();

    const session = db.prepare('SELECT * FROM camera_sessions WHERE id = ?').get(id) as CameraSession | undefined;
    if (!session) return reply.status(404).send({ error: 'Session not found' });

    const now = new Date().toISOString();
    const startMs = new Date(session.started_at).getTime();
    const endMs = new Date(now).getTime();
    const duration_s = Math.round((endMs - startMs) / 1000);

    db.prepare(`
      UPDATE camera_sessions
      SET ended_at = ?, duration_s = ?, file_id = COALESCE(?, file_id),
          frame_count = COALESCE(?, frame_count), notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(now, duration_s, file_id ?? null, frame_count ?? null, notes ?? null, id);

    const updated = db.prepare('SELECT * FROM camera_sessions WHERE id = ?').get(id) as CameraSession;
    return reply.send({ session: updated });
  });

  // GET /api/camera/sessions — list (most recent first)
  fastify.get('/api/camera/sessions', async (request, reply) => {
    const { limit = '20', offset = '0', mode } = request.query as any;
    const db = getDatabase();
    let sql = 'SELECT * FROM camera_sessions';
    const params: any[] = [];
    if (mode) { sql += ' WHERE mode = ?'; params.push(mode); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));
    const sessions = db.prepare(sql).all(...params) as CameraSession[];
    return reply.send({ sessions, total: sessions.length });
  });

  // DELETE /api/camera/sessions/:id
  fastify.delete<{ Params: { id: string } }>('/api/camera/sessions/:id', async (request, reply) => {
    const db = getDatabase();
    db.prepare('DELETE FROM camera_sessions WHERE id = ?').run(request.params.id);
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
