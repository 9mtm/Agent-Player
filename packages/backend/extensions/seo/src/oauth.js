/**
 * Google OAuth Flow for Search Console Integration
 */

import { randomBytes } from 'crypto';

function getUserIdFromRequest(request) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  return payload.userId || payload.sub || '1';
}

export async function registerOAuthRoutes(fastify) {
  const db = () => fastify.db || fastify.server.db;

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
  const BACKEND_URL = process.env.BACKEND_URL || `http://${process.env.HOST || 'localhost'}:${process.env.PORT || '41522'}`;
  const REDIRECT_URI = `${BACKEND_URL}/api/ext/seo/oauth/google/callback`;

  // Start OAuth flow
  fastify.get('/oauth/google/authorize', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { domain_id } = request.query;

      if (!userId || !domain_id) {
        return reply.code(400).send({ error: 'Missing userId or domain_id' });
      }

      // Store state for callback
      const state = Buffer.from(JSON.stringify({ userId, domain_id })).toString('base64');

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('https://www.googleapis.com/auth/webmasters.readonly')}&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${state}`;

      return reply.redirect(authUrl);
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Handle OAuth callback
  fastify.get('/oauth/google/callback', async (request, reply) => {
    try {
      const { code, state } = request.query;

      if (!code) {
        return reply.code(400).send({ error: 'No authorization code' });
      }

      // Decode state
      const { userId, domain_id } = JSON.parse(Buffer.from(state, 'base64').toString());

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokens.access_token) {
        throw new Error('Failed to get access token');
      }

      // Store tokens in credentials table
      const refreshTokenId = randomBytes(16).toString('hex');

      db().prepare(`
        INSERT INTO credentials (id, user_id, name, type, value)
        VALUES (?, ?, ?, 'oauth_token', ?)
      `).run(
        refreshTokenId,
        userId,
        `gsc-refresh-token-${domain_id}`,
        tokens.refresh_token || tokens.access_token
      );

      // Update domain with credential ID
      db().prepare(`
        UPDATE seo_domains SET gsc_credential_id = ? WHERE id = ? AND user_id = ?
      `).run(refreshTokenId, domain_id, userId);

      // Redirect to frontend
      return reply.redirect(`/dashboard/seo/settings?gsc_connected=true`);
    } catch (error) {
      console.error('[SEO OAuth] Error:', error);
      return reply.redirect(`/dashboard/seo/settings?gsc_error=${encodeURIComponent(error.message)}`);
    }
  });

  // Revoke OAuth
  fastify.post('/oauth/google/revoke/:domain_id', async (request, reply) => {
    try {
      const userId = getUserIdFromRequest(request);
      const { domain_id } = request.params;

      const domain = db().prepare('SELECT * FROM seo_domains WHERE id = ? AND user_id = ?').get(domain_id, userId);

      if (!domain || !domain.gsc_credential_id) {
        return reply.code(404).send({ error: 'No OAuth connection found' });
      }

      // Delete credential
      db().prepare('DELETE FROM credentials WHERE id = ?').run(domain.gsc_credential_id);

      // Clear domain credential ID
      db().prepare('UPDATE seo_domains SET gsc_credential_id = NULL WHERE id = ?').run(domain_id);

      return { success: true };
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });
}
