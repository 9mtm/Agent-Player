/**
 * Public Chat Rooms API Routes
 * Multi-user chat rooms with AI agents, customizable avatars, and embeddable widgets
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDatabase } from '../../db/index.js';
import { getUserIdFromRequest } from '../../auth/jwt.js';
import { randomUUID } from 'crypto';
import { readPersonality, readMemory } from '../../services/agent-files.js';
import { handleError } from '../error-handler.js';

interface PublicChatRoom {
  id: string;
  name: string;
  description: string | null;
  owner_user_id: string;
  model: string;
  system_prompt: string | null;
  agent_id: string | null;
  workflow_id: string | null;
  skills: string | null;
  avatar_url: string | null;
  avatar_gender: string;
  bg_color: string;
  bg_scene: string;
  wall_text: string | null;
  wall_logo_url: string | null;
  wall_video_url: string | null;
  wall_layout: string | null;
  fx_state: string | null;
  is_public: number;
  require_auth: number;
  allowed_users: string | null;
  max_message_length: number;
  rate_limit_seconds: number;
  enable_voice: number;
  enable_avatar: number;
  enable_developer_mode: number;
  embed_enabled: number;
  embed_size: string;
  embed_theme: string;
  message_count: number;
  participant_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Check if user can access room
 */
function canAccessRoom(room: PublicChatRoom, userId?: string): boolean {
  // Public room without auth requirement
  if (room.is_public && !room.require_auth) return true;

  // Public room with auth requirement
  if (room.is_public && room.require_auth && userId) return true;

  // Private room
  if (!room.is_public && userId) {
    const allowedUsers = room.allowed_users ? JSON.parse(room.allowed_users) : [];
    return room.owner_user_id === userId || allowedUsers.includes(userId);
  }

  return false;
}

/**
 * Get user ID (optional - may be null for anonymous users)
 */
function getOptionalUserId(request: FastifyRequest): string | null {
  try {
    return getUserIdFromRequest(request);
  } catch {
    return null;
  }
}

/**
 * Stream AI response for public chat room
 */
async function streamPublicChatResponse(
  reply: FastifyReply,
  room: PublicChatRoom,
  roomId: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt: string,
  userId: string | null,
  displayName: string
) {
  const db = getDatabase();

  // Set up SSE headers
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  let fullResponse = '';
  const assistantMessageId = randomUUID();

  try {
    // Determine provider and model
    const provider = room.model.startsWith('claude') ? 'anthropic' :
                     room.model.startsWith('gpt') ? 'openai' :
                     room.model.startsWith('gemini') ? 'google' : 'ollama';

    // Use Claude API for Anthropic models
    if (provider === 'anthropic') {
      const { ClaudeClient } = await import('../../llm/claude-client.js');
      const claudeClient = new ClaudeClient();

      // Build messages array
      const messages = history.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Stream from Claude
      const stream = claudeClient.streamMessage({
        model: room.model,
        systemPrompt,
        messages,
        maxTokens: 4096,
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
          const text = chunk.delta.text;
          fullResponse += text;

          // Send SSE event
          reply.raw.write(`data: ${JSON.stringify({ type: 'content', content: text })}\n\n`);
        }
      }
    } else if (provider === 'ollama') {
      // Ollama streaming
      const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

      const ollamaMessages = [
        { role: 'system', content: systemPrompt },
        ...history,
      ];

      const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: room.model,
          messages: ollamaMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Ollama request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(Boolean);

          for (const line of lines) {
            try {
              const json = JSON.parse(line);
              if (json.message?.content) {
                const text = json.message.content;
                fullResponse += text;
                reply.raw.write(`data: ${JSON.stringify({ type: 'content', content: text })}\n\n`);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } else {
      // Fallback: simple response
      fullResponse = 'AI provider not configured for this model.';
      reply.raw.write(`data: ${JSON.stringify({ type: 'content', content: fullResponse })}\n\n`);
    }

    // Store AI response in database
    db.prepare(`
      INSERT INTO public_chat_messages (id, room_id, user_id, username, role, content)
      VALUES (?, ?, ?, ?, 'assistant', ?)
    `).run(assistantMessageId, roomId, null, 'AI', fullResponse);

    // Update message count
    db.prepare('UPDATE public_chat_rooms SET message_count = message_count + 1 WHERE id = ?').run(roomId);

    // Send completion event
    reply.raw.write(`data: ${JSON.stringify({ type: 'done', messageId: assistantMessageId })}\n\n`);
  } catch (error: any) {
    // SECURITY: Don't expose error details in SSE stream (H-09)
    console.error('[PublicChat] Streaming error:', error);
    reply.raw.write(`data: ${JSON.stringify({ type: 'error', error: 'Chat request failed' })}\n\n`);
  } finally {
    reply.raw.end();
  }
}

export async function registerPublicChatRoutes(fastify: FastifyInstance) {
  const db = getDatabase();

  // ══════════════════════════════════════════════════════════════════════════════
  // Room Management
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/public-chat/rooms
   * Create new chat room (auth required)
   */
  fastify.post('/api/public-chat/rooms', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const body = request.body as any;

      const roomId = randomUUID();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO public_chat_rooms (
          id, name, description, owner_user_id,
          model, system_prompt, agent_id, workflow_id, skills,
          avatar_url, avatar_gender, bg_color, bg_scene,
          wall_text, wall_logo_url, wall_video_url, wall_layout, fx_state,
          is_public, require_auth, allowed_users,
          max_message_length, rate_limit_seconds,
          enable_voice, enable_avatar, enable_developer_mode,
          embed_enabled, embed_size, embed_theme,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?
        )
      `).run(
        roomId,
        body.name,
        body.description || null,
        userId,
        body.model || 'claude-sonnet-4.5',
        body.system_prompt || null,
        body.agent_id || null,
        body.workflow_id || null,
        body.skills ? JSON.stringify(body.skills) : null,
        body.avatar_url || null,
        body.avatar_gender || 'female',
        body.bg_color || '#09090b',
        body.bg_scene || 'none',
        body.wall_text || null,
        body.wall_logo_url || null,
        body.wall_video_url || null,
        body.wall_layout ? JSON.stringify(body.wall_layout) : null,
        body.fx_state ? JSON.stringify(body.fx_state) : null,
        body.is_public !== undefined ? (body.is_public ? 1 : 0) : 1,
        body.require_auth ? 1 : 0,
        body.allowed_users ? JSON.stringify(body.allowed_users) : null,
        body.max_message_length || 1000,
        body.rate_limit_seconds !== undefined ? body.rate_limit_seconds : 5,
        body.enable_voice !== undefined ? (body.enable_voice ? 1 : 0) : 1,
        body.enable_avatar !== undefined ? (body.enable_avatar ? 1 : 0) : 1,
        body.enable_developer_mode ? 1 : 0,
        body.embed_enabled !== undefined ? (body.embed_enabled ? 1 : 0) : 1,
        body.embed_size || 'medium',
        body.embed_theme || 'auto',
        now,
        now
      );

      const room = db.prepare('SELECT * FROM public_chat_rooms WHERE id = ?').get(roomId);

      return { success: true, room };
    } catch (error: any) {
      if (error.message?.includes('Unauthorized')) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[PublicChat] Operation failed');
    }
  });

  /**
   * GET /api/public-chat/rooms
   * List all public rooms (or user's rooms if filter=my)
   */
  fastify.get('/api/public-chat/rooms', async (request, reply) => {
    const { filter } = request.query as { filter?: string };
    const userId = getOptionalUserId(request);

    let rooms: PublicChatRoom[];

    if (filter === 'my' && userId) {
      // User's rooms
      rooms = db.prepare(`
        SELECT * FROM public_chat_rooms
        WHERE owner_user_id = ?
        ORDER BY created_at DESC
      `).all(userId) as PublicChatRoom[];
    } else {
      // All public rooms
      rooms = db.prepare(`
        SELECT * FROM public_chat_rooms
        WHERE is_public = 1
        ORDER BY created_at DESC
      `).all() as PublicChatRoom[];
    }

    return { rooms };
  });

  /**
   * GET /api/public-chat/rooms/:id
   * Get room details (for joining)
   */
  fastify.get('/api/public-chat/rooms/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = getOptionalUserId(request);

    const room = db.prepare('SELECT * FROM public_chat_rooms WHERE id = ?').get(id) as PublicChatRoom | undefined;

    if (!room) {
      return reply.code(404).send({ error: 'Room not found' });
    }

    // Check access
    if (!canAccessRoom(room, userId || undefined)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    return { room };
  });

  /**
   * PUT /api/public-chat/rooms/:id
   * Update room settings (owner only)
   */
  fastify.put('/api/public-chat/rooms/:id', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { id } = request.params as { id: string };
      const body = request.body as any;

      const room = db.prepare('SELECT * FROM public_chat_rooms WHERE id = ?').get(id) as PublicChatRoom | undefined;

      if (!room) {
        return reply.code(404).send({ error: 'Room not found' });
      }

      if (room.owner_user_id !== userId) {
        return reply.code(403).send({ error: 'Only room owner can update settings' });
      }

      const updates: string[] = [];
      const values: any[] = [];

      // Build dynamic UPDATE query
      const fields = [
        'name', 'description', 'model', 'system_prompt', 'agent_id', 'workflow_id', 'skills',
        'avatar_url', 'avatar_gender', 'bg_color', 'bg_scene',
        'wall_text', 'wall_logo_url', 'wall_video_url', 'wall_layout', 'fx_state',
        'is_public', 'require_auth', 'allowed_users',
        'max_message_length', 'rate_limit_seconds',
        'enable_voice', 'enable_avatar', 'enable_developer_mode',
        'embed_enabled', 'embed_size', 'embed_theme'
      ];

      for (const field of fields) {
        if (body[field] !== undefined) {
          updates.push(`${field} = ?`);

          // Handle JSON fields
          if (['skills', 'allowed_users', 'wall_layout', 'fx_state'].includes(field) && typeof body[field] === 'object') {
            values.push(JSON.stringify(body[field]));
          }
          // Handle boolean fields
          else if (['is_public', 'require_auth', 'enable_voice', 'enable_avatar', 'enable_developer_mode', 'embed_enabled'].includes(field)) {
            values.push(body[field] ? 1 : 0);
          }
          // Regular fields
          else {
            values.push(body[field]);
          }
        }
      }

      if (updates.length > 0) {
        updates.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);

        db.prepare(`
          UPDATE public_chat_rooms
          SET ${updates.join(', ')}
          WHERE id = ?
        `).run(...values);
      }

      const updatedRoom = db.prepare('SELECT * FROM public_chat_rooms WHERE id = ?').get(id);

      return { success: true, room: updatedRoom };
    } catch (error: any) {
      if (error.message?.includes('Unauthorized')) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[PublicChat] Operation failed');
    }
  });

  /**
   * DELETE /api/public-chat/rooms/:id
   * Delete room (owner only)
   */
  fastify.delete('/api/public-chat/rooms/:id', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { id } = request.params as { id: string };

      const room = db.prepare('SELECT * FROM public_chat_rooms WHERE id = ?').get(id) as PublicChatRoom | undefined;

      if (!room) {
        return reply.code(404).send({ error: 'Room not found' });
      }

      if (room.owner_user_id !== userId) {
        return reply.code(403).send({ error: 'Only room owner can delete room' });
      }

      // Delete room (CASCADE will delete messages and participants)
      db.prepare('DELETE FROM public_chat_rooms WHERE id = ?').run(id);

      return { success: true };
    } catch (error: any) {
      if (error.message?.includes('Unauthorized')) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[PublicChat] Operation failed');
    }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // Chat Messages
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/public-chat/rooms/:id/messages
   * Get room messages (paginated)
   */
  fastify.get('/api/public-chat/rooms/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { limit = 50, offset = 0 } = request.query as { limit?: number; offset?: number };
    const userId = getOptionalUserId(request);

    const room = db.prepare('SELECT * FROM public_chat_rooms WHERE id = ?').get(id) as PublicChatRoom | undefined;

    if (!room) {
      return reply.code(404).send({ error: 'Room not found' });
    }

    if (!canAccessRoom(room, userId || undefined)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    const messages = db.prepare(`
      SELECT * FROM public_chat_messages
      WHERE room_id = ?
      ORDER BY created_at ASC
      LIMIT ? OFFSET ?
    `).all(id, limit, offset);

    return { messages };
  });

  /**
   * POST /api/public-chat/rooms/:id/messages
   * Send message (SSE streaming AI response)
   */
  fastify.post('/api/public-chat/rooms/:id/messages', async (request, reply) => {
    const { id: roomId } = request.params as { id: string };
    const { content, username } = request.body as { content: string; username?: string };
    const userId = getOptionalUserId(request);

    const room = db.prepare('SELECT * FROM public_chat_rooms WHERE id = ?').get(roomId) as PublicChatRoom | undefined;

    if (!room) {
      return reply.code(404).send({ error: 'Room not found' });
    }

    if (!canAccessRoom(room, userId || undefined)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    // Validate message length
    if (content.length > room.max_message_length) {
      return reply.code(400).send({
        error: `Message too long (max ${room.max_message_length} characters)`
      });
    }

    // Get username
    const displayName = userId
      ? (db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any)?.name || 'User'
      : (username || 'Anonymous');

    // Store user message
    const userMessageId = randomUUID();
    db.prepare(`
      INSERT INTO public_chat_messages (id, room_id, user_id, username, role, content)
      VALUES (?, ?, ?, ?, 'user', ?)
    `).run(userMessageId, roomId, userId || null, displayName, content);

    // Update message count
    db.prepare('UPDATE public_chat_rooms SET message_count = message_count + 1 WHERE id = ?').run(roomId);

    // Get recent message history (last 20 messages)
    const recentMessages = db.prepare(`
      SELECT * FROM public_chat_messages
      WHERE room_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(roomId) as any[];

    // Build conversation history (reverse to chronological order)
    const history = recentMessages.reverse().map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Load agent files if agent is configured
    let personalityContent = '';
    let memoryContent = '';
    if (room.agent_id) {
      try {
        personalityContent = await readPersonality(room.agent_id);
        memoryContent = await readMemory(room.agent_id);
      } catch {
        // No agent files, will use room system_prompt
      }
    }

    // Build system prompt (priority: room > agent PERSONALITY.md > default)
    const systemPrompt =
      room.system_prompt ||
      personalityContent ||
      'You are a helpful AI assistant in a public chat room.';

    // Add memory if available
    let fullSystemPrompt = systemPrompt;
    if (memoryContent) {
      fullSystemPrompt += `\n\n## Agent Memory\n${memoryContent}`;
    }

    // Stream AI response
    await streamPublicChatResponse(
      reply,
      room,
      roomId,
      history,
      fullSystemPrompt,
      userId || null,
      displayName
    );
  });

  /**
   * DELETE /api/public-chat/messages/:id
   * Delete message (owner/sender only)
   */
  fastify.delete('/api/public-chat/messages/:id', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { id } = request.params as { id: string };

      const message = db.prepare('SELECT * FROM public_chat_messages WHERE id = ?').get(id) as any;

      if (!message) {
        return reply.code(404).send({ error: 'Message not found' });
      }

      const room = db.prepare('SELECT * FROM public_chat_rooms WHERE id = ?').get(message.room_id) as PublicChatRoom;

      // Only room owner or message sender can delete
      if (room.owner_user_id !== userId && message.user_id !== userId) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      db.prepare('DELETE FROM public_chat_messages WHERE id = ?').run(id);

      return { success: true };
    } catch (error: any) {
      if (error.message?.includes('Unauthorized')) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[PublicChat] Operation failed');
    }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // Participants
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/public-chat/rooms/:id/join
   * Join room (returns participant info)
   */
  fastify.post('/api/public-chat/rooms/:id/join', async (request, reply) => {
    const { id: roomId } = request.params as { id: string };
    const { username } = request.body as { username?: string };
    const userId = getOptionalUserId(request);

    const room = db.prepare('SELECT * FROM public_chat_rooms WHERE id = ?').get(roomId) as PublicChatRoom | undefined;

    if (!room) {
      return reply.code(404).send({ error: 'Room not found' });
    }

    if (!canAccessRoom(room, userId || undefined)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    // Get display name
    let displayName = username || 'Anonymous';
    if (userId) {
      const user = db.prepare('SELECT full_name, username FROM users WHERE id = ?').get(userId) as any;
      displayName = user?.full_name || user?.username || 'User';
    }

    // Check if already joined
    const existing = db.prepare(`
      SELECT * FROM public_chat_participants
      WHERE room_id = ? AND (user_id = ? OR username = ?)
    `).get(roomId, userId || null, displayName);

    if (existing) {
      // Update last_seen_at
      db.prepare(`
        UPDATE public_chat_participants
        SET last_seen_at = ?
        WHERE id = ?
      `).run(new Date().toISOString(), (existing as any).id);

      return { success: true, participant: existing };
    }

    // Create participant
    const participantId = randomUUID();
    db.prepare(`
      INSERT INTO public_chat_participants (id, room_id, user_id, username)
      VALUES (?, ?, ?, ?)
    `).run(participantId, roomId, userId || null, displayName);

    // Update participant count
    db.prepare('UPDATE public_chat_rooms SET participant_count = participant_count + 1 WHERE id = ?').run(roomId);

    const participant = db.prepare('SELECT * FROM public_chat_participants WHERE id = ?').get(participantId);

    return { success: true, participant };
  });

  /**
   * POST /api/public-chat/rooms/:id/leave
   * Leave room
   */
  fastify.post('/api/public-chat/rooms/:id/leave', async (request, reply) => {
    const { id: roomId } = request.params as { id: string };
    const userId = getOptionalUserId(request);

    if (!userId) {
      return reply.code(400).send({ error: 'Cannot leave as anonymous user' });
    }

    db.prepare(`
      DELETE FROM public_chat_participants
      WHERE room_id = ? AND user_id = ?
    `).run(roomId, userId);

    // Update participant count (ensure it doesn't go negative)
    db.prepare(`
      UPDATE public_chat_rooms
      SET participant_count = MAX(0, participant_count - 1)
      WHERE id = ?
    `).run(roomId);

    return { success: true };
  });

  /**
   * GET /api/public-chat/rooms/:id/participants
   * Get active participants
   */
  fastify.get('/api/public-chat/rooms/:id/participants', async (request, reply) => {
    const { id: roomId } = request.params as { id: string };
    const userId = getOptionalUserId(request);

    const room = db.prepare('SELECT * FROM public_chat_rooms WHERE id = ?').get(roomId) as PublicChatRoom | undefined;

    if (!room) {
      return reply.code(404).send({ error: 'Room not found' });
    }

    if (!canAccessRoom(room, userId || undefined)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    const participants = db.prepare(`
      SELECT * FROM public_chat_participants
      WHERE room_id = ?
      ORDER BY joined_at ASC
    `).all(roomId);

    return { participants };
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // Embed Code
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/public-chat/rooms/:id/embed-code
   * Get iframe embed code
   */
  fastify.get('/api/public-chat/rooms/:id/embed-code', async (request, reply) => {
    const { id: roomId } = request.params as { id: string };
    const userId = getOptionalUserId(request);

    const room = db.prepare('SELECT * FROM public_chat_rooms WHERE id = ?').get(roomId) as PublicChatRoom | undefined;

    if (!room) {
      return reply.code(404).send({ error: 'Room not found' });
    }

    if (!canAccessRoom(room, userId || undefined)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    if (!room.embed_enabled) {
      return reply.code(403).send({ error: 'Embedding is disabled for this room' });
    }

    // Determine dimensions based on size
    const dimensions: Record<string, { width: number; height: number }> = {
      small: { width: 300, height: 400 },
      medium: { width: 500, height: 600 },
      large: { width: 800, height: 800 },
      full: { width: 100, height: 100 } // Percentage
    };

    const size = dimensions[room.embed_size] || dimensions.medium;
    const widthStr = room.embed_size === 'full' ? '100%' : `${size.width}px`;
    const heightStr = room.embed_size === 'full' ? '100%' : `${size.height}px`;

    const embedUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:41521'}/room/embed/${roomId}?size=${room.embed_size}&theme=${room.embed_theme}`;

    const iframeCode = `<!-- Agent Player Public Chat Room -->
<iframe
  src="${embedUrl}"
  width="${widthStr}"
  height="${heightStr}"
  frameborder="0"
  allow="microphone"
  title="${room.name}"
></iframe>`;

    const scriptCode = `<!-- Agent Player Public Chat Room (Dynamic Loading) -->
<script>
  (function() {
    const iframe = document.createElement('iframe');
    iframe.src = '${embedUrl}';
    iframe.width = '${widthStr}';
    iframe.height = '${heightStr}';
    iframe.frameBorder = '0';
    iframe.allow = 'microphone';
    iframe.title = '${room.name}';
    document.getElementById('chat-container').appendChild(iframe);
  })();
</script>
<div id="chat-container"></div>`;

    return {
      iframeCode,
      scriptCode,
      embedUrl
    };
  });
}
