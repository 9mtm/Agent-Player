/**
 * Host Header Check Middleware
 * SECURITY: Rejects requests whose Host header is not an allowed name (S0-Q.1).
 *
 * Protects the loopback-bound API against DNS rebinding: a malicious web page can
 * point its own domain at 127.0.0.1, but the browser still sends that domain as Host.
 *
 * Always allowed: localhost, *.localhost, 127.0.0.1, ::1 (any port).
 * Also allowed: the HOST bind address when it is a specific address.
 * Extra names (for server installs behind a domain): ALLOWED_HOSTS=example.com,agent.lan
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/** Hostname part of a Host header value, lower-cased, without port or IPv6 brackets. */
export function parseHostHeader(value: string | undefined): string | null {
  if (!value) return null;
  const host = value.trim().toLowerCase();
  if (!host) return null;

  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    if (end === -1) return null;
    const rest = host.slice(end + 1);
    if (rest && !/^:\d{1,5}$/.test(rest)) return null;
    return host.slice(1, end);
  }

  const match = /^([a-z0-9.-]+)(?::(\d{1,5}))?$/.exec(host);
  if (!match) return null;
  return match[1].replace(/\.$/, '');
}

export function getAllowedHosts(
  env: string | undefined = process.env.ALLOWED_HOSTS,
  bindHost: string | undefined = process.env.HOST,
): Set<string> {
  const allowed = new Set(LOOPBACK_HOSTS);
  // A specific bind address is reachable by that address, so allow it as a Host value.
  if (bindHost && bindHost !== '0.0.0.0' && bindHost !== '::') {
    const name = parseHostHeader(bindHost.includes(':') && !bindHost.startsWith('[') ? `[${bindHost}]` : bindHost);
    if (name) allowed.add(name);
  }
  for (const entry of (env || '').split(',')) {
    const name = parseHostHeader(entry);
    if (name) allowed.add(name);
  }
  return allowed;
}

export function isAllowedHost(value: string | undefined, allowed: Set<string>): boolean {
  const name = parseHostHeader(value);
  if (!name) return false;
  return allowed.has(name) || name.endsWith('.localhost');
}

export function registerHostCheck(fastify: FastifyInstance, allowed: Set<string> = getAllowedHosts()): void {
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!isAllowedHost(request.headers.host, allowed)) {
      request.log.warn({ host: request.headers.host }, '[HostCheck] Rejected request with disallowed Host header');
      return reply.code(421).send({ error: 'Misdirected Request', code: 'host_not_allowed' });
    }
  });
}
