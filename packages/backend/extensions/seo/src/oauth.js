/**
 * Google OAuth Flow for Search Console Integration
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { getCredentialManager, CredentialType } from '../../../src/credentials/index.js';

/** User of this request, as verified by the extension route guard (S0-Q.18). */
function getUserIdFromRequest(request) {
  return request.authUserId || null;
}

/**
 * OAuth `state` values (S0-Q.18): random, single use, bound server-side to
 * the user and domain that started the flow, valid for 10 minutes. The
 * callback trusts only what is stored here, never data decoded from `state`.
 *
 * F-08: each state is also bound to the browser that started the flow. The
 * authorize step sets an HttpOnly cookie with a random nonce; only its
 * SHA-256 hash is kept with the state. The callback is accepted only when the
 * browser presents the same nonce, so a callback URL started by someone else
 * (login CSRF / account linking) is refused.
 */
const STATE_TTL_MS = 10 * 60 * 1000;
export const OAUTH_COOKIE = 'ap_seo_oauth';
const OAUTH_COOKIE_PATH = '/api/ext/seo/oauth/google';

const sha256 = (value) => createHash('sha256').update(value).digest();

/** Read one cookie value from the raw Cookie header (no cookie plugin needed). */
export function readCookie(request, name) {
  const header = request.headers?.cookie;
  if (typeof header !== 'string') return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

function oauthCookie(value, { secure, maxAge }) {
  return [
    `${OAUTH_COOKIE}=${value}`,
    `Path=${OAUTH_COOKIE_PATH}`,
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}
const MAX_PENDING_STATES = 1000;
const pendingStates = new Map();

/**
 * Create a state for this user and domain. Returns { state, nonce }: the
 * nonce goes into the browser cookie, only its hash is stored here.
 */
export function createOAuthState(userId, domainId, now = Date.now()) {
  for (const [key, entry] of pendingStates) {
    if (entry.expiresAt <= now) pendingStates.delete(key);
  }
  while (pendingStates.size >= MAX_PENDING_STATES) {
    pendingStates.delete(pendingStates.keys().next().value);
  }
  const state = randomBytes(32).toString('hex');
  const nonce = randomBytes(32).toString('hex');
  pendingStates.set(state, {
    userId,
    domainId: String(domainId),
    nonceHash: sha256(nonce),
    expiresAt: now + STATE_TTL_MS,
  });
  return { state, nonce };
}

/**
 * Consume a state: returns { userId, domainId } once, or null (unknown,
 * reused, expired, or not presented by the browser that started the flow).
 * A missing or wrong nonce does not consume the state.
 */
export function consumeOAuthState(state, nonce, now = Date.now()) {
  if (typeof state !== 'string' || !/^[0-9a-f]{64}$/.test(state)) return null;
  if (typeof nonce !== 'string' || !/^[0-9a-f]{64}$/.test(nonce)) return null;
  const entry = pendingStates.get(state);
  if (!entry) return null;
  if (!timingSafeEqual(sha256(nonce), entry.nonceHash)) return null;
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
  const secureCookie = (request) => REDIRECT_URI.startsWith('https:') || request.protocol === 'https';
  const credentials = getCredentialManager();

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

      // Random single-use state, bound server-side to this user and domain,
      // and to this browser through an HttpOnly nonce cookie.
      const { state, nonce } = createOAuthState(userId, domain.id);
      reply.header('set-cookie', oauthCookie(nonce, { secure: secureCookie(request), maxAge: STATE_TTL_MS / 1000 }));

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
      console.error('[SEO OAuth] Authorize failed:', error);
      return reply.code(500).send({ error: 'Failed to start Google authorization' });
    }
  });

  // Handle OAuth callback
  fastify.get('/oauth/google/callback', async (request, reply) => {
    try {
      const { code, state } = request.query;

      // Public route (Google redirects the browser here without our token):
      // the state must be one this server issued, unused and unexpired, and
      // the browser must hold the nonce cookie set when the flow started.
      const pending = consumeOAuthState(state, readCookie(request, OAUTH_COOKIE));
      // The nonce cookie is single use: always clear it.
      reply.header('set-cookie', oauthCookie('', { secure: secureCookie(request), maxAge: 0 }));
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

      // Store the token encrypted through the credential manager, owned by
      // the user who started the flow (never in plaintext).
      const name = `gsc-refresh-token-${domain_id}`;
      const value = tokens.refresh_token || tokens.access_token;
      const existing = await credentials.getByName(name, userId);
      let credentialId;
      if (existing) {
        await credentials.update(existing.id, { value });
        credentialId = existing.id;
      } else {
        const created = await credentials.create({
          name,
          type: CredentialType.OAUTH_TOKEN,
          value,
          description: 'Google Search Console OAuth token (SEO extension)',
          userId,
        });
        credentialId = created.id;
      }

      // Update domain with credential ID
      db().prepare(`
        UPDATE seo_domains SET gsc_credential_id = ? WHERE id = ? AND user_id = ?
      `).run(credentialId, domain_id, userId);

      // Redirect to frontend
      return reply.redirect(`/dashboard/seo/settings?gsc_connected=true`);
    } catch (error) {
      // Details stay in the server log; the browser gets a fixed code.
      console.error('[SEO OAuth] Callback failed:', error);
      return reply.redirect(`/dashboard/seo/settings?gsc_error=connection_failed`);
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

      // Delete the credential only if it belongs to this user.
      const credential = await credentials.get(domain.gsc_credential_id);
      if (credential && credential.userId === userId) {
        await credentials.delete(credential.id);
      }

      // Clear domain credential ID
      db().prepare('UPDATE seo_domains SET gsc_credential_id = NULL WHERE id = ?').run(domain_id);

      return { success: true };
    } catch (error) {
      console.error('[SEO OAuth] Revoke failed:', error);
      return reply.code(500).send({ error: 'Failed to revoke Google authorization' });
    }
  });
}
