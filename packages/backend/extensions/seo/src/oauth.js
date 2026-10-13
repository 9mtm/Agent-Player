/**
 * Google OAuth Flow for Search Console Integration
 */

import { randomBytes } from 'crypto';

/** User of this request, as verified by the extension route guard (S0-Q.18). */
function getUserIdFromRequest(request) {
  return request.authUserId || null;
}

/**
 * OAuth `state` values (S0-Q.18): random, single use, bound server-side to
 * the user and domain that started the flow, valid for 10 minutes. The
 * callback trusts only what is stored here, never data decoded from `state`.
 */
const STATE_TTL_MS = 10 * 60 * 1000;
const MAX_PENDING_STATES = 1000;
const pendingStates = new Map();

export function createOAuthState(userId, domainId, now = Date.now()) {
  for (const [key, entry] of pendingStates) {
    if (entry.expiresAt <= now) pendingStates.delete(key);
  }
  while (pendingStates.size >= MAX_PENDING_STATES) {
    pendingStates.delete(pendingStates.keys().next().value);
  }
  const state = randomBytes(32).toString('hex');
  pendingStates.set(state, { userId, domainId: String(domainId), expiresAt: now + STATE_TTL_MS });
  return state;
}

/** Consume a state: returns { userId, domainId } once, or null (unknown, reused or expired). */
export function consumeOAuthState(state, now = Date.now()) {
  if (typeof state !== 'string' || !/^[0-9a-f]{64}$/.test(state)) return null;
  const entry = pendingStates.get(state);
  if (!entry) return null;
  pendingStates.delete(state);
  if (entry.expiresAt <= now) return null;
  return { userId: entry.userId, domainId: entry.domainId };
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

      // Only the user's own domain can be connected.
      const domain = db().prepare('SELECT id FROM seo_domains WHERE id = ? AND user_id = ?').get(domain_id, userId);
      if (!domain) {
        return reply.code(404).send({ error: 'Domain not found' });
      }

      // Random single-use state, bound server-side to this user and domain
      const state = createOAuthState(userId, domain.id);

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('https://www.googleapis.com/auth/webmasters.readonly')}&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${encodeURIComponent(state)}`;

      return reply.redirect(authUrl);
    } catch (error) {
      return reply.code(500).send({ error: error.message });
    }
  });

  // Handle OAuth callback
  fastify.get('/oauth/google/callback', async (request, reply) => {
    try {
      const { code, state } = request.query;

      // Public route (Google redirects the browser here without our token):
      // the state must be one this server issued, unused and unexpired,
      // before anything else happens.
      const pending = consumeOAuthState(state);
      if (!pending) {
        return reply.code(400).send({ error: 'Invalid or expired OAuth state' });
      }
      const { userId, domainId: domain_id } = pending;

      if (!code || typeof code !== 'string') {
        return reply.code(400).send({ error: 'No authorization code' });
      }

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
