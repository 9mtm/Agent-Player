import type { FastifyInstance } from 'fastify';
import { getDatabase } from '../../db/index.js';
import { getUserIdFromRequest as getAuthUserId } from '../../auth/jwt.js';
import { handleError } from '../error-handler.js';
import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';

// SECURITY: Use centralized JWT verification from auth/jwt.ts

interface ProfileRow {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  bio: string;
  company: string;
  location: string;
  website: string;
  timezone: string;
  profile_picture_url: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

function getUserIdFromRequest(request: any, reply: any): string | null {
  try {
    return getAuthUserId(request);
  } catch {
    return null;
  }
}

export async function profileRoutes(fastify: FastifyInstance) {
  // GET /api/profile — load current user profile
  fastify.get('/api/profile', async (request, reply) => {
    try {
      fastify.log.info('[Profile API] 🔍 GET /api/profile called');

      const userId = getUserIdFromRequest(request, reply);
      fastify.log.info('[Profile API] 🔍 User ID from JWT:', userId);

      if (!userId) {
        fastify.log.error('[Profile API] ❌ Unauthorized - no user ID');
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const db = getDatabase();
      const row = db.prepare(`
        SELECT id, email, username, full_name, bio, company, location, website, timezone,
               profile_picture_url, avatar_url, role, created_at
        FROM users WHERE id = ?
      `).get(userId) as ProfileRow | undefined;

      fastify.log.info('[Profile API] 🔍 Database row:', row);

      if (!row) {
        fastify.log.error('[Profile API] ❌ User not found in database');
        return reply.status(404).send({ error: 'User not found' });
      }

      const nameParts = (row.full_name || '').split(' ');
      const response = {
        success: true,
        profile: {
          id: row.id,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          email: row.email,
          username: row.username,
          bio: row.bio || '',
          company: row.company || '',
          location: row.location || '',
          website: row.website || '',
          timezone: row.timezone || 'UTC',
          profilePictureUrl: row.profile_picture_url || null,
          avatarUrl: row.avatar_url || null,  // 3D GLB model for avatar viewer
          role: row.role,
          createdAt: row.created_at,
        },
      };

      fastify.log.info('[Profile API] ✅ Returning profile');
      fastify.log.info('[Profile API] 🔍 profile_picture_url:', row.profile_picture_url);
      fastify.log.info('[Profile API] 🔍 avatar_url:', row.avatar_url);

      return reply.send(response);
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Profile] Get profile failed');
    }
  });

  // PUT /api/profile — save profile fields
  fastify.put<{
    Body: {
      firstName?: string;
      lastName?: string;
      email?: string;
      username?: string;
      bio?: string;
      company?: string;
      location?: string;
      website?: string;
      timezone?: string;
    };
  }>('/api/profile', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request, reply);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const db = getDatabase();
      const { firstName, lastName, email, username, bio, company, location, website, timezone } = request.body;

      const fullName = [firstName || '', lastName || ''].filter(Boolean).join(' ') || null;

      db.prepare(`
        UPDATE users SET
          full_name = COALESCE(?, full_name),
          email = COALESCE(?, email),
          username = COALESCE(?, username),
          bio = COALESCE(?, bio),
          company = COALESCE(?, company),
          location = COALESCE(?, location),
          website = COALESCE(?, website),
          timezone = COALESCE(?, timezone),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        fullName,
        email || null,
        username || null,
        bio ?? null,
        company ?? null,
        location ?? null,
        website ?? null,
        timezone ?? null,
        userId
      );

      return reply.send({ success: true });
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Profile] Update profile failed');
    }
  });

  // POST /api/profile/picture — upload profile picture
  fastify.post('/api/profile/picture', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request, reply);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const data = await request.file();
      if (!data) return reply.status(400).send({ error: 'No file provided' });

      const ext = path.extname(data.filename || 'photo.jpg').toLowerCase();
      const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      if (!allowed.includes(ext)) {
        return reply.status(400).send({ error: 'Only image files allowed' });
      }

      const projectRoot = path.join(process.cwd(), '..', '..');
      const uploadDir = path.join(projectRoot, 'public', 'storage', 'profiles');
      fs.mkdirSync(uploadDir, { recursive: true });

      const filename = `user-${userId}-${randomBytes(4).toString('hex')}${ext}`;
      const buffer = await data.toBuffer();
      fs.writeFileSync(path.join(uploadDir, filename), buffer);

      const picUrl = `/storage/profiles/${filename}`;

      const db = getDatabase();
      db.prepare(`UPDATE users SET profile_picture_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(picUrl, userId);

      return reply.send({ success: true, url: picUrl });
    } catch (error: any) {
      // SECURITY: Use centralized error handler to prevent info disclosure (H-09)
      return handleError(reply, error, 'internal', '[Profile] Upload picture failed');
    }
  });
}
