/**
 * Per-launch token (INSTALLER-05, desktop app).
 *
 * The desktop app starts this backend on a random loopback port and puts a
 * fresh random token in `AGENT_PLAYER_LAUNCH_TOKEN`. One root `onRequest`
 * hook, registered before every other hook, then refuses every request that
 * does not carry the same token in `X-Agent-Player-Launch`, so another
 * program on this computer that finds the port cannot use the API. The
 * app's own UI bridge adds the header; the page never sees the token.
 *
 * Unset (CLI, dev servers, tests): no check, nothing changes.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';

export const LAUNCH_TOKEN_ENV = 'AGENT_PLAYER_LAUNCH_TOKEN';
export const LAUNCH_HEADER = 'x-agent-player-launch';
const SHAPE = /^[A-Za-z0-9_-]{43}$/;

const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest();

/** The configured token, null when unset; throws on a malformed value (refuse to start). */
export function launchTokenFromEnv(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = env[LAUNCH_TOKEN_ENV];
  if (raw === undefined || raw === '') return null;
  if (!SHAPE.test(raw)) throw new Error(`${LAUNCH_TOKEN_ENV} is malformed`);
  return raw;
}

export function registerLaunchToken(fastify: FastifyInstance, token: string | null = launchTokenFromEnv()): void {
  if (token === null) return;
  const expected = digest(token);
  fastify.addHook('onRequest', async (request, reply) => {
    const got = request.headers[LAUNCH_HEADER];
    if (typeof got === 'string' && timingSafeEqual(digest(got), expected)) return;
    return reply.code(403).send({ error: 'Forbidden', code: 'launch_token' });
  });
}
