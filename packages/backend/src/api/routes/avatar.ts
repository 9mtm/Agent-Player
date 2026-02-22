import type { FastifyInstance } from 'fastify';
import { getDatabase } from '../../db/index.js';
import { getAudioService } from '../../services/audio-service.js';
import { generateLipsync, isRhubarbAvailable } from '../../services/lipsync-service.js';
import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { handleError } from '../error-handler.js';

/**
 * Avatar API Routes
 * Handles user avatar settings (Ready Player Me URLs, voice preferences)
 */
export async function registerAvatarRoutes(fastify: FastifyInstance) {
  fastify.log.info('[Avatar API] ✅ Routes registered');

  // GET /api/avatar/settings - Get user's avatar settings
  fastify.get<{
    Querystring: { userId: string };
  }>('/api/avatar/settings', async (request, reply) => {
    try {
      const { userId } = request.query;

      if (!userId) {
        return reply.status(400).send({ error: 'userId is required' });
      }

      // Get settings from database
      const db = getDatabase();
      const settings = db.prepare(`
        SELECT
          id,
          user_id as userId,
          rpm_avatar_url as rpmAvatarUrl,
          voice_provider as voiceProvider,
          voice_id as voiceId,
          language_preference as languagePreference,
          bg_color as bgColor,
          bg_scene as bgScene,
          wall_text as wallText,
          wall_logo_url as wallLogoUrl,
          wall_video_url as wallVideoUrl,
          wall_spotify_url as wallSpotifyUrl,
          wall_layout as wallLayout,
          created_at as createdAt,
          updated_at as updatedAt
        FROM avatar_settings
        WHERE user_id = ?
      `).get(userId);

      if (!settings) {
        // Return default settings if not found
        return reply.send({
          success: true,
          settings: {
            userId,
            rpmAvatarUrl: null,
            voiceProvider: 'openai',
            voiceId: 'alloy',
            languagePreference: 'auto',
            bgColor: '#09090b',
            bgScene: 'none',
            wallText: '',
            wallLogoUrl: '',
            wallVideoUrl: '',
            wallSpotifyUrl: '',
            wallLayout: '{}'
          }
        });
      }

      return reply.send({
        success: true,
        settings
      });
    } catch (error: any) {
      fastify.log.error('Get avatar settings error:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Avatar] Get settings failed');
    }
  });

  // POST /api/avatar/settings - Update user's avatar settings
  fastify.post<{
    Body: {
      userId: number;
      rpmAvatarUrl?: string;
      voiceProvider?: string;
      voiceId?: string;
      languagePreference?: string;
      bgColor?: string;
      bgScene?: string;
      wallText?: string;
      wallLogoUrl?: string;
      wallVideoUrl?: string;
      wallSpotifyUrl?: string;
      wallLayout?: string;
    };
  }>('/api/avatar/settings', async (request, reply) => {
    try {
      const { userId, rpmAvatarUrl, voiceProvider, voiceId, languagePreference, bgColor, bgScene, wallText, wallLogoUrl, wallVideoUrl, wallSpotifyUrl, wallLayout } = request.body;

      if (!userId) {
        return reply.status(400).send({ error: 'userId is required' });
      }

      // Check if settings exist
      const db = getDatabase();
      const existing = db.prepare('SELECT id FROM avatar_settings WHERE user_id = ?').get(userId);

      if (existing) {
        // Update existing settings
        const updates: string[] = [];
        const values: any[] = [];

        if (rpmAvatarUrl !== undefined) {
          updates.push('rpm_avatar_url = ?');
          values.push(rpmAvatarUrl);
        }
        if (voiceProvider !== undefined) {
          updates.push('voice_provider = ?');
          values.push(voiceProvider);
        }
        if (voiceId !== undefined) {
          updates.push('voice_id = ?');
          values.push(voiceId);
        }
        if (languagePreference !== undefined) {
          updates.push('language_preference = ?');
          values.push(languagePreference);
        }
        if (bgColor !== undefined) {
          updates.push('bg_color = ?');
          values.push(bgColor);
        }
        if (bgScene !== undefined) {
          updates.push('bg_scene = ?');
          values.push(bgScene);
        }
        if (wallText !== undefined) {
          updates.push('wall_text = ?');
          values.push(wallText);
        }
        if (wallLogoUrl !== undefined) {
          updates.push('wall_logo_url = ?');
          values.push(wallLogoUrl);
        }
        if (wallVideoUrl !== undefined) {
          updates.push('wall_video_url = ?');
          values.push(wallVideoUrl);
        }
        if (wallSpotifyUrl !== undefined) {
          updates.push('wall_spotify_url = ?');
          values.push(wallSpotifyUrl);
        }
        if (wallLayout !== undefined) {
          updates.push('wall_layout = ?');
          values.push(wallLayout);
        }

        if (updates.length > 0) {
          updates.push('updated_at = CURRENT_TIMESTAMP');
          values.push(userId);

          db.prepare(`
            UPDATE avatar_settings
            SET ${updates.join(', ')}
            WHERE user_id = ?
          `).run(...values);
        }
      } else {
        // Insert new settings
        db.prepare(`
          INSERT INTO avatar_settings (
            user_id,
            rpm_avatar_url,
            voice_provider,
            voice_id,
            language_preference,
            bg_color,
            bg_scene,
            wall_text,
            wall_logo_url,
            wall_video_url,
            wall_spotify_url,
            wall_layout
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          userId,
          rpmAvatarUrl || null,
          voiceProvider || 'openai',
          voiceId || 'alloy',
          languagePreference || 'auto',
          bgColor || '#09090b',
          bgScene || 'none',
          wallText || '',
          wallLogoUrl || '',
          wallVideoUrl || '',
          wallSpotifyUrl || '',
          wallLayout || '{}'
        );
      }

      // Return updated settings
      const settings = db.prepare(`
        SELECT
          id,
          user_id as userId,
          rpm_avatar_url as rpmAvatarUrl,
          voice_provider as voiceProvider,
          voice_id as voiceId,
          language_preference as languagePreference,
          bg_color as bgColor,
          bg_scene as bgScene,
          wall_text as wallText,
          wall_logo_url as wallLogoUrl,
          wall_video_url as wallVideoUrl,
          wall_spotify_url as wallSpotifyUrl,
          wall_layout as wallLayout,
          created_at as createdAt,
          updated_at as updatedAt
        FROM avatar_settings
        WHERE user_id = ?
      `).get(userId);

      return reply.send({
        success: true,
        settings
      });
    } catch (error: any) {
      fastify.log.error('Update avatar settings error:', error.message, error.stack);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Avatar] Update settings failed');
    }
  });

  // GET /api/avatar/voices - Get available voices
  fastify.get('/api/avatar/voices', async (request, reply) => {
    try {
      // OpenAI TTS voices
      const voices = [
        {
          id: 'alloy',
          name: 'Alloy',
          provider: 'openai',
          gender: 'neutral',
          description: 'Balanced and versatile'
        },
        {
          id: 'echo',
          name: 'Echo',
          provider: 'openai',
          gender: 'male',
          description: 'Clear and professional'
        },
        {
          id: 'fable',
          name: 'Fable',
          provider: 'openai',
          gender: 'neutral',
          description: 'Warm and expressive'
        },
        {
          id: 'onyx',
          name: 'Onyx',
          provider: 'openai',
          gender: 'male',
          description: 'Deep and authoritative'
        },
        {
          id: 'nova',
          name: 'Nova',
          provider: 'openai',
          gender: 'female',
          description: 'Bright and energetic'
        },
        {
          id: 'shimmer',
          name: 'Shimmer',
          provider: 'openai',
          gender: 'female',
          description: 'Soft and friendly'
        }
      ];

      return reply.send({
        success: true,
        voices
      });
    } catch (error: any) {
      fastify.log.error('Get voices error:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Avatar] Get voices failed');
    }
  });

  // POST /api/avatar/speak — TTS + optional Rhubarb lipsync
  // Returns audio blob directly (Content-Type: audio/mpeg)
  // Header X-Lipsync-Data: JSON array of mouth cues (if Rhubarb available)
  // Header X-Rhubarb-Available: "true" | "false"
  fastify.post<{
    Body: { text: string; language?: string; voice?: string };
  }>('/api/avatar/speak', async (request, reply) => {
    try {
      const { text, language = 'auto', voice } = request.body;
      if (!text?.trim()) return reply.status(400).send({ error: 'text is required' });

      const audioService = getAudioService();
      const { audioId } = await audioService.textToSpeech({ text, language, voice });
      const audioPath = path.join(process.cwd(), '.data', 'audio', `${audioId}.mp3`);

      if (!fs.existsSync(audioPath)) {
        return reply.status(500).send({ error: 'Audio file not found after TTS' });
      }

      // Try Rhubarb lipsync (soft-dependency)
      let lipsyncHeader = '[]';
      if (isRhubarbAvailable()) {
        const cues = await generateLipsync(audioPath);
        if (cues) lipsyncHeader = JSON.stringify(cues);
      }

      const audioBuffer = fs.readFileSync(audioPath);

      return reply
        .header('Content-Type', 'audio/mpeg')
        .header('X-Lipsync-Data', lipsyncHeader)
        .header('X-Rhubarb-Available', isRhubarbAvailable() ? 'true' : 'false')
        .header('Access-Control-Expose-Headers', 'X-Lipsync-Data, X-Rhubarb-Available')
        .send(audioBuffer);
    } catch (error: any) {
      fastify.log.error('Avatar speak error:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Avatar] Speak failed');
    }
  });

  // POST /api/tts — alias for SupportChatBlock (returns raw audio blob)
  fastify.post<{
    Body: { text: string; language?: string; voice?: string };
  }>('/api/tts', async (request, reply) => {
    try {
      const { text, language = 'auto', voice } = request.body;
      if (!text?.trim()) return reply.status(400).send({ error: 'text is required' });

      const audioService = getAudioService();
      const { audioId } = await audioService.textToSpeech({ text, language, voice });
      const audioPath = path.join(process.cwd(), '.data', 'audio', `${audioId}.mp3`);

      if (!fs.existsSync(audioPath)) return reply.status(500).send({ error: 'Audio file not found' });

      const audioBuffer = fs.readFileSync(audioPath);
      return reply.header('Content-Type', 'audio/mpeg').send(audioBuffer);
    } catch (error: any) {
      fastify.log.error('TTS error:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Avatar] TTS failed');
    }
  });

  // POST /api/avatar/upload-logo — upload logo image for wall board, returns local URL
  fastify.post('/api/avatar/upload-logo', async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) return reply.status(400).send({ error: 'No file provided' });

      // Validate image type
      const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!allowed.includes(data.mimetype)) {
        return reply.status(400).send({ error: 'Only image files are allowed' });
      }

      // Ensure logos directory exists
      const logosDir = path.join(process.cwd(), '.data', 'logos');
      if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });

      // Generate unique filename with original extension
      const ext = path.extname(data.filename || 'logo.png') || '.png';
      const filename = `logo_${Date.now()}${ext}`;
      const filePath = path.join(logosDir, filename);

      // Save file
      const buffer = await data.toBuffer();
      fs.writeFileSync(filePath, buffer);

      const url = `/api/avatar/logo/${filename}`;
      fastify.log.info(`[Avatar] Logo uploaded: ${filename}`);
      return reply.send({ success: true, url, filename });
    } catch (error: any) {
      fastify.log.error('Logo upload error:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Avatar] Logo upload failed');
    }
  });

  // GET /api/avatar/logo/:filename — serve uploaded logo image
  fastify.get<{ Params: { filename: string } }>('/api/avatar/logo/:filename', async (request, reply) => {
    try {
      const { filename } = request.params;
      // Security: reject path traversal
      if (filename.includes('..') || filename.includes('/')) {
        return reply.status(400).send({ error: 'Invalid filename' });
      }
      const filePath = path.join(process.cwd(), '.data', 'logos', filename);
      if (!fs.existsSync(filePath)) return reply.status(404).send({ error: 'Not found' });

      const ext = path.extname(filename).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
      };
      const mime = mimeMap[ext] || 'application/octet-stream';
      const buffer = fs.readFileSync(filePath);
      return reply
        .header('Content-Type', mime)
        .header('Cache-Control', 'public, max-age=86400')
        .send(buffer);
    } catch (error: any) {
      return reply.status(500).send({ error: 'Failed to serve logo' });
    }
  });


  // ── Avatar Collection Routes ────────────────────────────────────────────────

  // GET /api/avatars/system — list all system avatars from public/avatars/system/
  fastify.get('/api/avatars/system', async (request, reply) => {
    try {
      const projectRoot = path.join(process.cwd(), '..', '..');
      const systemDir = path.join(projectRoot, 'public', 'avatars', 'system');

      if (!fs.existsSync(systemDir)) {
        return reply.send({ success: true, avatars: [] });
      }

      const entries = fs.readdirSync(systemDir, { withFileTypes: true });
      const avatars = [];

      for (const entry of entries) {
        // Flat GLB file directly in system/
        if (entry.isFile() && /\.(glb|gltf)$/i.test(entry.name)) {
          const slug = entry.name.replace(/\.(glb|gltf)$/i, '');
          const label = slug.replace(/_/g, ' ');
          avatars.push({
            id: slug,
            name: label,
            description: '',
            glbUrl: `/avatars/system/${entry.name}`,
            previewUrl: null,
            bgColor: '#0a0a0a',
            bgScene: 'none',
            tags: [],
          });
          continue;
        }

        // Subdirectory layout: system/<slug>/avatar.glb
        if (!entry.isDirectory()) continue;
        const slug = entry.name;
        const dir = path.join(systemDir, slug);

        let config: any = {};
        const configPath = path.join(dir, 'config.json');
        if (fs.existsSync(configPath)) {
          try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch {}
        }

        const hasGlb = fs.existsSync(path.join(dir, 'avatar.glb'));
        if (!hasGlb) continue;

        const hasPreview = fs.existsSync(path.join(dir, 'preview.png'));

        avatars.push({
          id: slug,
          name: config.name || slug,
          description: config.description || '',
          glbUrl: `/avatars/system/${slug}/avatar.glb`,
          previewUrl: hasPreview ? `/avatars/system/${slug}/preview.png` : null,
          bgColor: config.bgColor || '#0a0a0a',
          bgScene: config.bgScene || 'none',
          tags: config.tags || [],
        });
      }

      return reply.send({ success: true, avatars });
    } catch (error: any) {
      fastify.log.error('List system avatars error:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Avatar] List system avatars failed');
    }
  });

  // GET /api/avatars?userId= — list all user's saved avatars
  fastify.get<{ Querystring: { userId: string } }>('/api/avatars', async (request, reply) => {
    try {
      const { userId } = request.query;
      if (!userId) return reply.status(400).send({ error: 'userId is required' });

      const db = getDatabase();

      // Auto-import existing rpm_avatar_url if no avatars yet
      const existing = db.prepare('SELECT COUNT(*) as cnt FROM user_avatars WHERE user_id = ?').get(userId) as { cnt: number };
      if (existing.cnt === 0) {
        const settings = db.prepare('SELECT rpm_avatar_url FROM avatar_settings WHERE user_id = ?').get(userId) as { rpm_avatar_url: string | null } | undefined;
        if (settings?.rpm_avatar_url) {
          db.prepare(`
            INSERT INTO user_avatars (user_id, name, source, glb_url, is_active)
            VALUES (?, 'My Avatar', 'rpm', ?, 1)
          `).run(userId, settings.rpm_avatar_url);
        }
      }

      const avatars = db.prepare(`
        SELECT
          id, user_id as userId, name, source,
          glb_url as glbUrl, local_glb_path as localGlbPath,
          preview_url as previewUrl, bg_color as bgColor, bg_scene as bgScene,
          is_active as isActive, created_at as createdAt
        FROM user_avatars
        WHERE user_id = ?
        ORDER BY is_active DESC, created_at ASC
      `).all(userId);

      // Sync active avatar to users.avatar_url for profile API
      const activeAvatar = avatars.find((a: any) => a.isActive);
      if (activeAvatar) {
        const effectiveUrl = activeAvatar.localGlbPath || activeAvatar.glbUrl;
        db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(effectiveUrl, userId);
      }

      return reply.send({ success: true, avatars });
    } catch (error: any) {
      fastify.log.error('List avatars error:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Avatar] List avatars failed');
    }
  });

  // POST /api/avatars — add avatar by URL or from system
  fastify.post<{
    Body: { userId: string; name?: string; source: string; glbUrl?: string; previewUrl?: string; bgColor?: string; bgScene?: string };
  }>('/api/avatars', async (request, reply) => {
    try {
      const { userId, name, source, glbUrl, previewUrl, bgColor, bgScene } = request.body;
      if (!userId) return reply.status(400).send({ error: 'userId is required' });
      if (!glbUrl && source !== 'upload') return reply.status(400).send({ error: 'glbUrl is required' });

      const db = getDatabase();
      const id = randomBytes(8).toString('hex');

      // Auto-activate if this is the user's first avatar
      const existingCount = db.prepare('SELECT COUNT(*) as count FROM user_avatars WHERE user_id = ?').get(userId) as { count: number };
      const isActive = existingCount.count === 0 ? 1 : 0;

      db.prepare(`
        INSERT INTO user_avatars (id, user_id, name, source, glb_url, preview_url, bg_color, bg_scene, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, userId,
        name || 'New Avatar',
        source || 'url',
        glbUrl || null,
        previewUrl || null,
        bgColor || '#0a0a0a',
        bgScene || 'none',
        isActive
      );

      const avatar = db.prepare(`
        SELECT id, user_id as userId, name, source, glb_url as glbUrl,
          local_glb_path as localGlbPath, preview_url as previewUrl,
          bg_color as bgColor, bg_scene as bgScene, is_active as isActive, created_at as createdAt
        FROM user_avatars WHERE id = ?
      `).get(id);

      return reply.send({ success: true, avatar });
    } catch (error: any) {
      fastify.log.error('Add avatar error:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Avatar] Add avatar failed');
    }
  });

  // PATCH /api/avatars/:id — update name/bg/scene
  fastify.patch<{
    Params: { id: string };
    Body: { name?: string; bgColor?: string; bgScene?: string };
  }>('/api/avatars/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const { name, bgColor, bgScene } = request.body;

      const db = getDatabase();
      const updates: string[] = [];
      const values: any[] = [];

      if (name !== undefined) { updates.push('name = ?'); values.push(name); }
      if (bgColor !== undefined) { updates.push('bg_color = ?'); values.push(bgColor); }
      if (bgScene !== undefined) { updates.push('bg_scene = ?'); values.push(bgScene); }

      if (updates.length === 0) return reply.send({ success: true });

      values.push(id);
      db.prepare(`UPDATE user_avatars SET ${updates.join(', ')} WHERE id = ?`).run(...values);

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error('Update avatar error:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Avatar] Update avatar failed');
    }
  });

  // PATCH /api/avatars/:id/activate — set as active avatar for user
  fastify.patch<{
    Params: { id: string };
    Body: { userId: string };
  }>('/api/avatars/:id/activate', async (request, reply) => {
    try {
      const { id } = request.params;
      const { userId } = request.body;
      if (!userId) return reply.status(400).send({ error: 'userId is required' });

      const db = getDatabase();

      // Deactivate all for this user, then activate the selected one
      db.prepare('UPDATE user_avatars SET is_active = 0 WHERE user_id = ?').run(userId);
      db.prepare('UPDATE user_avatars SET is_active = 1 WHERE id = ? AND user_id = ?').run(id, userId);

      // Sync to avatar_settings AND users table for backward compat + profile API
      const avatar = db.prepare(`
        SELECT glb_url as glbUrl, local_glb_path as localGlbPath
        FROM user_avatars WHERE id = ?
      `).get(id) as { glbUrl: string | null; localGlbPath: string | null } | undefined;

      if (avatar) {
        const effectiveUrl = avatar.localGlbPath || avatar.glbUrl;

        // Update avatar_settings (for avatar viewer)
        const hasSettings = db.prepare('SELECT id FROM avatar_settings WHERE user_id = ?').get(userId);
        if (hasSettings) {
          db.prepare('UPDATE avatar_settings SET rpm_avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?').run(effectiveUrl, userId);
        } else {
          db.prepare('INSERT INTO avatar_settings (user_id, rpm_avatar_url) VALUES (?, ?)').run(userId, effectiveUrl);
        }

        // Update users.avatar_url (for profile API + World Builder)
        db.prepare('UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(effectiveUrl, userId);
      }

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error('Activate avatar error:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Avatar] Activate avatar failed');
    }
  });

  // DELETE /api/avatars/:id — remove avatar (+ delete file if uploaded)
  fastify.delete<{
    Params: { id: string };
    Querystring: { userId: string };
  }>('/api/avatars/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const { userId } = request.query;
      if (!userId) return reply.status(400).send({ error: 'userId is required' });

      const db = getDatabase();
      const avatar = db.prepare(`
        SELECT source, local_glb_path as localGlbPath, is_active as isActive
        FROM user_avatars WHERE id = ? AND user_id = ?
      `).get(id, userId) as { source: string; localGlbPath: string | null; isActive: number } | undefined;

      if (!avatar) return reply.status(404).send({ error: 'Avatar not found' });

      // Delete uploaded file if exists
      if (avatar.localGlbPath) {
        const projectRoot = path.join(process.cwd(), '..', '..');
        const absPath = path.join(projectRoot, 'public', avatar.localGlbPath.replace(/^\//, ''));
        const avatarDir = path.dirname(absPath);
        try {
          if (fs.existsSync(avatarDir)) fs.rmSync(avatarDir, { recursive: true, force: true });
        } catch {}
      }

      db.prepare('DELETE FROM user_avatars WHERE id = ? AND user_id = ?').run(id, userId);

      // If deleted avatar was active, activate the first remaining one
      if (avatar.isActive) {
        const next = db.prepare('SELECT id, glb_url as glbUrl, local_glb_path as localGlbPath FROM user_avatars WHERE user_id = ? LIMIT 1').get(userId) as any;
        if (next) {
          db.prepare('UPDATE user_avatars SET is_active = 1 WHERE id = ?').run(next.id);
          const url = next.localGlbPath || next.glbUrl;
          db.prepare('UPDATE avatar_settings SET rpm_avatar_url = ? WHERE user_id = ?').run(url, userId);
          db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(url, userId);
        } else {
          // No avatars left - clear the users.avatar_url
          db.prepare('UPDATE users SET avatar_url = NULL WHERE id = ?').run(userId);
        }
      }

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error('Delete avatar error:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Avatar] Delete avatar failed');
    }
  });

  // POST /api/avatars/upload — upload GLB file → save to public/avatars/user/{userId}/{id}/
  fastify.post<{ Querystring: { userId: string; name?: string } }>('/api/avatars/upload', async (request, reply) => {
    try {
      const { userId, name } = request.query;
      if (!userId) return reply.status(400).send({ error: 'userId is required' });

      const data = await request.file();
      if (!data) return reply.status(400).send({ error: 'No file provided' });

      const allowed = ['model/gltf-binary', 'application/octet-stream', 'model/gltf+json'];
      const ext = path.extname(data.filename || 'avatar.glb').toLowerCase();
      if (ext !== '.glb' && ext !== '.gltf') {
        return reply.status(400).send({ error: 'Only .glb or .gltf files are allowed' });
      }

      const id = randomBytes(8).toString('hex');
      const projectRoot = path.join(process.cwd(), '..', '..');
      const avatarDir = path.join(projectRoot, 'public', 'avatars', 'user', userId, id);
      fs.mkdirSync(avatarDir, { recursive: true });

      const glbFilename = 'avatar' + ext;
      const glbPath = path.join(avatarDir, glbFilename);
      const buffer = await data.toBuffer();
      fs.writeFileSync(glbPath, buffer);

      const localGlbPath = `/avatars/user/${userId}/${id}/${glbFilename}`;

      const db = getDatabase();
      // Auto-activate if this is the user's first avatar
      const existingCount = db.prepare('SELECT COUNT(*) as count FROM user_avatars WHERE user_id = ?').get(userId) as { count: number };
      const isActive = existingCount.count === 0 ? 1 : 0;

      db.prepare(`
        INSERT INTO user_avatars (id, user_id, name, source, local_glb_path, is_active)
        VALUES (?, ?, ?, 'upload', ?, ?)
      `).run(id, userId, name || data.filename || 'Uploaded Avatar', localGlbPath, isActive);

      const avatar = db.prepare(`
        SELECT id, user_id as userId, name, source, glb_url as glbUrl,
          local_glb_path as localGlbPath, preview_url as previewUrl,
          bg_color as bgColor, bg_scene as bgScene, is_active as isActive, created_at as createdAt
        FROM user_avatars WHERE id = ?
      `).get(id);

      fastify.log.info(`[Avatar] GLB uploaded: ${localGlbPath}`);
      return reply.send({ success: true, avatar });
    } catch (error: any) {
      fastify.log.error('Avatar upload error:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Avatar] Upload failed');
    }
  });

  // POST /api/avatars/:id/localize — download existing avatar's remote glbUrl to local storage
  fastify.post<{ Params: { id: string } }>('/api/avatars/:id/localize', async (request, reply) => {
    try {
      const { id } = request.params;
      const db = getDatabase();

      const avatar = db.prepare(`
        SELECT id, user_id as userId, glb_url as glbUrl, local_glb_path as localGlbPath
        FROM user_avatars WHERE id = ?
      `).get(id) as { id: string; userId: string; glbUrl: string | null; localGlbPath: string | null } | undefined;

      if (!avatar) return reply.status(404).send({ error: 'Avatar not found' });
      if (avatar.localGlbPath) return reply.send({ success: true, message: 'Already local' });
      if (!avatar.glbUrl) return reply.status(400).send({ error: 'No remote URL to download' });

      const projectRoot = path.join(process.cwd(), '..', '..');
      const avatarDir = path.join(projectRoot, 'public', 'avatars', 'user', avatar.userId, id);
      fs.mkdirSync(avatarDir, { recursive: true });

      // Download GLB
      const glbResponse = await fetch(avatar.glbUrl);
      if (!glbResponse.ok) throw new Error(`Failed to download GLB: HTTP ${glbResponse.status}`);
      const glbBuffer = await glbResponse.arrayBuffer();
      fs.writeFileSync(path.join(avatarDir, 'avatar.glb'), Buffer.from(glbBuffer));
      const localGlbPath = `/avatars/user/${avatar.userId}/${id}/avatar.glb`;

      // Try preview (RPM)
      let localPreviewUrl: string | null = null;
      const rpmMatch = avatar.glbUrl.match(/models\.readyplayer\.me\/([a-f0-9]+)\.glb/);
      if (rpmMatch) {
        try {
          const previewRes = await fetch(`https://models.readyplayer.me/${rpmMatch[1]}.png`);
          if (previewRes.ok) {
            const previewBuf = await previewRes.arrayBuffer();
            fs.writeFileSync(path.join(avatarDir, 'preview.png'), Buffer.from(previewBuf));
            localPreviewUrl = `/avatars/user/${avatar.userId}/${id}/preview.png`;
          }
        } catch {}
      }

      db.prepare(`
        UPDATE user_avatars SET local_glb_path = ?, preview_url = COALESCE(?, preview_url) WHERE id = ?
      `).run(localGlbPath, localPreviewUrl, id);

      const updated = db.prepare(`
        SELECT id, user_id as userId, name, source, glb_url as glbUrl,
          local_glb_path as localGlbPath, preview_url as previewUrl,
          bg_color as bgColor, bg_scene as bgScene, is_active as isActive, created_at as createdAt
        FROM user_avatars WHERE id = ?
      `).get(id);

      fastify.log.info(`[Avatar] Localized: ${localGlbPath}`);
      return reply.send({ success: true, avatar: updated });
    } catch (error: any) {
      fastify.log.error('Avatar localize error:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Avatar] Localize failed');
    }
  });

  // POST /api/avatars/download — download GLB (+ preview) from URL → save locally
  fastify.post<{
    Body: { userId: string; name?: string; glbUrl: string };
  }>('/api/avatars/download', async (request, reply) => {
    try {
      const { userId, name, glbUrl } = request.body;
      if (!userId) return reply.status(400).send({ error: 'userId is required' });
      if (!glbUrl) return reply.status(400).send({ error: 'glbUrl is required' });

      const id = randomBytes(8).toString('hex');
      const projectRoot = path.join(process.cwd(), '..', '..');
      const avatarDir = path.join(projectRoot, 'public', 'avatars', 'user', userId, id);
      fs.mkdirSync(avatarDir, { recursive: true });

      // Download GLB file
      const glbResponse = await fetch(glbUrl);
      if (!glbResponse.ok) throw new Error(`Failed to download GLB: HTTP ${glbResponse.status}`);
      const glbBuffer = await glbResponse.arrayBuffer();
      fs.writeFileSync(path.join(avatarDir, 'avatar.glb'), Buffer.from(glbBuffer));
      const localGlbPath = `/avatars/user/${userId}/${id}/avatar.glb`;

      // Try to download preview image (auto-detect RPM avatars)
      let localPreviewUrl: string | null = null;
      const rpmMatch = glbUrl.match(/models\.readyplayer\.me\/([a-f0-9]+)\.glb/);
      if (rpmMatch) {
        try {
          const previewRes = await fetch(`https://models.readyplayer.me/${rpmMatch[1]}.png`);
          if (previewRes.ok) {
            const previewBuf = await previewRes.arrayBuffer();
            fs.writeFileSync(path.join(avatarDir, 'preview.png'), Buffer.from(previewBuf));
            localPreviewUrl = `/avatars/user/${userId}/${id}/preview.png`;
          }
        } catch {} // preview is optional
      }

      const db = getDatabase();
      // Auto-activate if this is the user's first avatar
      const existingCount = db.prepare('SELECT COUNT(*) as count FROM user_avatars WHERE user_id = ?').get(userId) as { count: number };
      const isActive = existingCount.count === 0 ? 1 : 0;

      db.prepare(`
        INSERT INTO user_avatars (id, user_id, name, source, local_glb_path, preview_url, is_active)
        VALUES (?, ?, ?, 'url', ?, ?, ?)
      `).run(id, userId, name || 'Downloaded Avatar', localGlbPath, localPreviewUrl, isActive);

      const avatar = db.prepare(`
        SELECT id, user_id as userId, name, source, glb_url as glbUrl,
          local_glb_path as localGlbPath, preview_url as previewUrl,
          bg_color as bgColor, bg_scene as bgScene, is_active as isActive, created_at as createdAt
        FROM user_avatars WHERE id = ?
      `).get(id);

      fastify.log.info(`[Avatar] Downloaded: ${localGlbPath}`);
      return reply.send({ success: true, avatar });
    } catch (error: any) {
      fastify.log.error('Avatar download error:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Avatar] Download failed');
    }
  });

  // GET /api/avatars/:id — get single avatar by ID
  fastify.get<{ Params: { id: string } }>('/api/avatars/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const db = getDatabase();
      const avatar = db.prepare(`
        SELECT id, user_id as userId, name, source, glb_url as glbUrl,
          local_glb_path as localGlbPath, preview_url as previewUrl,
          bg_color as bgColor, bg_scene as bgScene, is_active as isActive, created_at as createdAt
        FROM user_avatars WHERE id = ?
      `).get(id);
      if (!avatar) return reply.status(404).send({ error: 'Avatar not found' });
      return reply.send({ success: true, avatar });
    } catch (error: any) {
      fastify.log.error('Get avatar by ID error:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Avatar] Get avatar failed');
    }
  });

  // POST /api/avatar/background/upload — upload image/video as custom background
  fastify.post<{ Params: never; Querystring: { userId?: string } }>(
    '/api/avatar/background/upload',
    async (request, reply) => {
      try {
        const userId = (request.query as { userId?: string }).userId || '1';
        const data = await request.file();
        if (!data) return reply.status(400).send({ error: 'No file provided' });

        const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov'];
        const ext = path.extname(data.filename || 'bg').toLowerCase();
        if (!allowedExts.includes(ext)) {
          return reply.status(400).send({ error: `Unsupported file type: ${ext}` });
        }

        const projectRoot = path.join(process.cwd(), '..', '..');
        const bgDir = path.join(projectRoot, 'public', 'backgrounds', userId);
        fs.mkdirSync(bgDir, { recursive: true });

        const filename = `bg-${Date.now()}${ext}`;
        const filePath = path.join(bgDir, filename);
        const buffer = await data.toBuffer();
        fs.writeFileSync(filePath, buffer);

        const webPath = `/backgrounds/${userId}/${filename}`;
        fastify.log.info(`[Avatar] Background uploaded: ${webPath}`);
        return reply.send({ success: true, url: webPath });
      } catch (error: any) {
        fastify.log.error('Background upload error:', error);
        // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
        return handleError(reply, error, 'internal', '[Avatar] Background upload failed');
      }
    }
  );

  // ── End Avatar Collection Routes ────────────────────────────────────────────

  // POST /api/stt — alias for SupportChatBlock (multipart, returns transcript)
  fastify.post('/api/stt', async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) return reply.status(400).send({ error: 'No audio file provided' });
      const buffer = await data.toBuffer();
      const audioService = getAudioService();
      const result = await audioService.transcribe(buffer, data.filename || 'speech.wav');
      return reply.send({ text: result.text, language: result.language });
    } catch (error: any) {
      fastify.log.error('STT error:', error);
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Avatar] STT failed');
    }
  });
}
