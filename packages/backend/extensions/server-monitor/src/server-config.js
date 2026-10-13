/**
 * Server Monitor - server entry validation and secret masking.
 *
 * SECURITY (S0-Q.18): server entries hold SSH/WHM credentials. Only known
 * fields are accepted, host/port are validated, and stored secrets are never
 * returned (masked hint + has_<key> marker only). A masked value sent back on
 * update keeps the stored secret.
 */

import { maskSecretFields, restoreMaskedFields, isMaskedSecret } from '../../../src/credentials/secret-mask.js';

export const SERVER_TYPES = ['cpanel', 'ssh'];
const DEFAULT_PORT = { cpanel: 2087, ssh: 22 };

const TEXT_FIELDS = ['name', 'username', 'ssh_username'];
const SECRET_FIELDS = ['api_token', 'password', 'ssh_password'];
const HOST_FIELDS = ['host', 'ssh_host'];
const PORT_FIELDS = ['port', 'ssh_port'];

// DNS name (labels of letters/digits/hyphens) or IPv4; bracket-less IPv6.
const HOSTNAME = /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*\.?$/;
const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6 = /^[0-9A-Fa-f:]{2,39}$/;

export class ServerConfigError extends Error {}

/** A bare host name or IP address: no scheme, path, port, credentials or spaces. */
export function isValidHost(value) {
  if (typeof value !== 'string') return false;
  const host = value.trim();
  if (!host || host !== value) return false;
  if (IPV4.test(host)) return true;
  if (host.includes(':')) return IPV6.test(host) && host.split(':').length >= 3;
  return HOSTNAME.test(host);
}

/** Integer 1-65535 (number or numeric string), or null when not valid. */
export function parsePort(value) {
  const n = typeof value === 'string' && /^\d{1,5}$/.test(value.trim()) ? Number(value.trim()) : value;
  return Number.isInteger(n) && n >= 1 && n <= 65535 ? n : null;
}

/**
 * Build a stored entry from client input. `stored` is the existing entry on
 * update (masked secrets keep its values; missing fields keep its values).
 * Throws ServerConfigError on invalid input.
 */
export function sanitizeServerInput(input, stored = null) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ServerConfigError('Body must be an object');
  }
  const merged = stored ? restoreMaskedFields(input, stored) : { ...input };
  const base = stored ? { ...stored } : {};
  const out = {};

  const type = merged.type ?? base.type ?? 'cpanel';
  if (!SERVER_TYPES.includes(type)) throw new ServerConfigError('type must be cpanel or ssh');
  out.type = type;

  for (const key of TEXT_FIELDS) {
    const value = key in merged ? merged[key] : base[key];
    if (value === undefined || value === null || value === '') continue;
    if (typeof value !== 'string' || value.length > 200 || /[\u0000-\u001f]/.test(value)) {
      throw new ServerConfigError(`${key} is not valid`);
    }
    out[key] = value;
  }

  for (const key of HOST_FIELDS) {
    const value = key in merged ? merged[key] : base[key];
    if (value === undefined || value === null || value === '') continue;
    if (!isValidHost(value)) throw new ServerConfigError(`${key} must be a host name or IP address`);
    out[key] = value;
  }

  for (const key of PORT_FIELDS) {
    const value = key in merged ? merged[key] : base[key];
    if (value === undefined || value === null || value === '') continue;
    const port = parsePort(value);
    if (port === null) throw new ServerConfigError(`${key} must be an integer between 1 and 65535`);
    out[key] = port;
  }
  if (out.port === undefined) out.port = DEFAULT_PORT[type];

  for (const key of SECRET_FIELDS) {
    const value = key in merged ? merged[key] : base[key];
    if (value === undefined || value === null || value === '' || isMaskedSecret(value)) continue;
    if (typeof value !== 'string' || value.length > 8192) throw new ServerConfigError(`${key} is not valid`);
    out[key] = value;
  }

  if (!out.name) throw new ServerConfigError('name is required');
  if (!out.host) throw new ServerConfigError('host is required');
  if (!out.username) throw new ServerConfigError('username is required');
  return out;
}

/** Response form of a stored entry: secrets masked, has_<key> markers added. */
export function publicServer(server) {
  return maskSecretFields(server);
}
