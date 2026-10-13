/**
 * Provider/webhook signature checks for core public webhook routes (S0-A.5).
 * TypeScript port of the extension helpers in extensions/shared/webhook-verify.js.
 * Every check fails closed: a missing secret, header or URL rejects the request.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    /** Raw request body, kept by registerRawBodyParsers() for signature checks. */
    rawBody?: string;
  }
}

/** Constant-time string comparison (false for different lengths or non-strings). */
export function safeEqual(a: unknown, b: unknown): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * JSON and form body parsers for an encapsulated route scope that keep the
 * raw body on `request.rawBody`. Twilio posts application/x-www-form-urlencoded.
 */
export function registerRawBodyParsers(fastify: FastifyInstance): void {
  for (const type of ['application/json', 'application/x-www-form-urlencoded']) {
    if (fastify.hasContentTypeParser(type)) fastify.removeContentTypeParser(type);
  }
  fastify.addContentTypeParser('application/json', { parseAs: 'string', bodyLimit: 1024 * 1024 }, (request, body, done) => {
    const text = String(body);
    request.rawBody = text;
    if (!text) return done(null, {});
    try {
      done(null, JSON.parse(text));
    } catch (error: any) {
      error.statusCode = 400;
      done(error, undefined);
    }
  });
  fastify.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string', bodyLimit: 1024 * 1024 }, (request, body, done) => {
    const text = String(body);
    request.rawBody = text;
    done(null, Object.fromEntries(new URLSearchParams(text)));
  });
}

// ── Twilio (X-Twilio-Signature) ─────────────────────────────────────────────

/**
 * Twilio signature: base64 HMAC-SHA1 (key = auth token) of the full webhook
 * URL followed by every POST parameter name and value, sorted by name.
 */
export function twilioSignature(authToken: string, url: string, params: Record<string, unknown> = {}): string {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + (params[key] ?? ''), url);
  return createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64');
}

/** True only when the auth token, URL and signature are present and the signature matches. */
export function verifyTwilioRequest(request: FastifyRequest, authToken: string | null | undefined, url: string | null): boolean {
  if (!authToken || !url) return false;
  const signature = request.headers['x-twilio-signature'];
  if (typeof signature !== 'string' || !signature) return false;
  const params = request.body && typeof request.body === 'object' ? request.body as Record<string, unknown> : {};
  return safeEqual(signature, twilioSignature(authToken, url, params));
}

/**
 * Public URL the provider called: `baseUrl` plus the path and query as
 * received. Null when no public base URL is configured.
 */
export function publicRequestUrl(request: FastifyRequest, baseUrl: string | null | undefined): string | null {
  if (!baseUrl) return null;
  return `${String(baseUrl).replace(/\/+$/, '')}${request.url}`;
}

// ── Generic inbound webhooks (X-Webhook-Signature) ──────────────────────────

/** Hex HMAC-SHA256 of the raw body with the webhook secret. */
export function webhookSignature(secret: string, rawBody: string): string {
  return createHmac('sha256', secret).update(rawBody, 'utf-8').digest('hex');
}

/**
 * True only when the secret and signature are present and the signature
 * (hex, optionally prefixed "sha256=") matches the raw body.
 */
export function verifyWebhookSignature(secret: string | null | undefined, rawBody: string | undefined, signature: unknown): boolean {
  if (!secret || typeof signature !== 'string' || !signature) return false;
  const given = signature.startsWith('sha256=') ? signature.slice(7) : signature;
  return safeEqual(given.toLowerCase(), webhookSignature(secret, rawBody ?? ''));
}
