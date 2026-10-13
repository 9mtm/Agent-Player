/**
 * Provider webhook verification shared by extensions (S0-Q.18).
 *
 * Public webhook routes must prove the request came from the provider before
 * touching any data. Every check fails closed: a missing secret, header or
 * URL means the request is rejected.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

/** Constant-time string comparison (false for different lengths or non-strings). */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Register JSON and form body parsers on an (encapsulated) route scope that
 * keep the raw body on `request.rawBody` for signature checks.
 */
export function registerRawBodyParsers(fastify) {
  for (const type of ['application/json', 'application/x-www-form-urlencoded']) {
    if (fastify.hasContentTypeParser(type)) fastify.removeContentTypeParser(type);
  }
  fastify.addContentTypeParser('application/json', { parseAs: 'string', bodyLimit: 1024 * 1024 }, (request, body, done) => {
    request.rawBody = body;
    if (!body) return done(null, {});
    try {
      done(null, JSON.parse(body));
    } catch (error) {
      error.statusCode = 400;
      done(error);
    }
  });
  fastify.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string', bodyLimit: 1024 * 1024 }, (request, body, done) => {
    request.rawBody = body;
    done(null, Object.fromEntries(new URLSearchParams(body)));
  });
}

// ── Twilio (X-Twilio-Signature) ─────────────────────────────────────────────

/**
 * Twilio signature: base64 HMAC-SHA1 (key = auth token) of the full webhook
 * URL followed by every POST parameter name and value, sorted by name.
 */
export function twilioSignature(authToken, url, params = {}) {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + (params[key] ?? ''), url);
  return createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64');
}

/** True only when the auth token, URL and signature are present and the signature matches. */
export function verifyTwilioRequest(request, authToken, url) {
  if (!authToken || !url) return false;
  const signature = request.headers['x-twilio-signature'];
  if (typeof signature !== 'string' || !signature) return false;
  const params = request.body && typeof request.body === 'object' ? request.body : {};
  return safeEqual(signature, twilioSignature(authToken, url, params));
}

/**
 * Public URL Twilio called for this request: PUBLIC_URL (or `baseUrl`) plus
 * the path and query as received. Null when no public base URL is configured.
 */
export function publicRequestUrl(request, baseUrl = process.env.PUBLIC_URL) {
  if (!baseUrl) return null;
  return `${String(baseUrl).replace(/\/+$/, '')}${request.url}`;
}

// ── Slack (X-Slack-Signature, v0) ───────────────────────────────────────────

export const SLACK_MAX_AGE_SECONDS = 5 * 60;

export function slackSignature(signingSecret, timestamp, rawBody) {
  return 'v0=' + createHmac('sha256', signingSecret).update(`v0:${timestamp}:${rawBody}`).digest('hex');
}

/**
 * Verify a Slack request: signing secret configured, timestamp within five
 * minutes (replay window), and v0 signature over the raw body.
 */
export function verifySlackRequest(request, signingSecret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!signingSecret) return false;
  const timestamp = request.headers['x-slack-request-timestamp'];
  const signature = request.headers['x-slack-signature'];
  if (typeof timestamp !== 'string' || !/^\d{1,12}$/.test(timestamp)) return false;
  if (typeof signature !== 'string') return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > SLACK_MAX_AGE_SECONDS) return false;
  if (typeof request.rawBody !== 'string') return false;
  return safeEqual(signature, slackSignature(signingSecret, timestamp, request.rawBody));
}
