/**
 * Agent Connect runtime policy (S0-Q.6).
 *
 * Channel settings arrive over HTTP, so nothing in them may decide which
 * program runs or where it writes:
 * - The Python interpreter comes only from the server environment
 *   (AGENT_CONNECT_PYTHON) or a fixed default, never from channel config.
 * - The adapter state directory is always inside a server-controlled base
 *   directory (AGENT_CONNECT_STATE_DIR, default ~/.agent-connect).
 * - Provider environment variables are limited to names that belong to the
 *   selected channel; names that point at files, programs, libraries or
 *   interpreter behaviour are refused.
 *
 * The worker process itself is spawned by agent-connect-dpro with its own
 * minimal environment (PATH, HOME, LANG, TEMP, SSL_CERT_* …), so server
 * secrets such as ENCRYPTION_KEY or JWT_SECRET are never inherited.
 */
import { homedir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { CHANNEL_CATALOG } from 'agent-connect-dpro';

export const DEFAULT_PYTHON = 'python';

/** Interpreter for the adapter worker: server environment or fixed default. */
export function resolvePythonExecutable(env = process.env) {
  const configured = typeof env.AGENT_CONNECT_PYTHON === 'string' ? env.AGENT_CONNECT_PYTHON.trim() : '';
  return configured || DEFAULT_PYTHON;
}

/** Server-controlled base directory for all adapter state. */
export function stateBaseDirectory(env = process.env) {
  const configured = typeof env.AGENT_CONNECT_STATE_DIR === 'string' ? env.AGENT_CONNECT_STATE_DIR.trim() : '';
  return resolve(configured || join(homedir(), '.agent-connect'));
}

const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/**
 * True when a requested state directory is an acceptable relative name:
 * one or more simple segments, no absolute path, no `..`, no backslashes.
 */
export function isValidStateDirectory(requested) {
  if (requested === undefined) return true;
  if (typeof requested !== 'string' || !requested || requested.length > 200) return false;
  if (isAbsolute(requested) || requested.includes('\\') || requested.includes('\0')) return false;
  return requested.split('/').every(segment => SAFE_SEGMENT.test(segment) && segment !== '..' && !/^\.+$/.test(segment));
}

/**
 * Absolute state directory for a channel. A requested value is only a
 * sub-path of the base directory; anything else throws.
 */
export function resolveStateDirectory(channelId, requested, env = process.env) {
  const base = stateBaseDirectory(env);
  if (!isValidStateDirectory(requested)) throw new Error('Invalid Agent Connect state directory');
  const target = resolve(base, requested === undefined ? channelId : requested);
  const rel = relative(base, target);
  if (!rel || rel.startsWith('..') || isAbsolute(rel) || rel.split(sep).includes('..')) {
    throw new Error('Agent Connect state directory must stay inside the server state directory');
  }
  return target;
}

// Extra name prefixes for channels whose variables do not follow the
// channel id or the prefix of their required variables.
const EXTRA_PREFIXES = {
  relay: ['GATEWAY_RELAY_'],
  sms: ['SMS_', 'TWILIO_'],
  whatsapp_cloud: ['WHATSAPP_'],
  homeassistant: ['HASS_', 'HOMEASSISTANT_'],
  google_chat: ['GOOGLE_CHAT_'],
  msgraph_webhook: ['MSGRAPH_'],
  wecom_callback: ['WECOM_'],
  qqbot: ['QQ_', 'QQBOT_'],
};

// Never accepted, whatever the channel: values that name files, programs,
// libraries, directories or change interpreter/loader behaviour.
const DENIED_NAME_PART = /(^|_)(PATH|PATHS|DIR|DIRS|DIRECTORY|FILE|BIN|BINARY|EXE|EXECUTABLE|CMD|COMMAND|COMMANDS|SCRIPT|SHELL|PRELOAD|LIBRARY|LIB|MODULE|MODULES|PLUGIN|PLUGINS|HOOK|HOOKS|CLI)(_|$)/;
const DENIED_NAME_PREFIX = /^(LD_|DYLD_|PYTHON|NODE_|HERMES_|SSL_|REQUESTS_|CURL_|HTTP_PROXY|HTTPS_PROXY|ALL_PROXY|NO_PROXY)/;

const catalogById = new Map(CHANNEL_CATALOG.map(channel => [channel.id, channel]));

/** Name prefixes a channel's provider variables may use. */
export function channelEnvPrefixes(channelId) {
  const channel = catalogById.get(channelId);
  if (!channel) return [];
  const prefixes = new Set([channelId.toUpperCase() + '_', ...(EXTRA_PREFIXES[channelId] || [])]);
  for (const name of channel.requiredEnv || []) {
    const first = name.split('_')[0];
    if (first) prefixes.add(first + '_');
  }
  return [...prefixes];
}

/** True when `key` may be passed to the adapter worker for this channel. */
export function isAllowedEnvironmentKey(channelId, key) {
  if (typeof key !== 'string' || !/^[A-Z][A-Z0-9_]{0,127}$/.test(key)) return false;
  const channel = catalogById.get(channelId);
  if (!channel) return false;
  if (DENIED_NAME_PREFIX.test(key)) return false;
  // Required names are part of the provider contract; still refuse
  // file/program-like names among them.
  if (DENIED_NAME_PART.test(key)) return false;
  if ((channel.requiredEnv || []).includes(key)) return true;
  return channelEnvPrefixes(channelId).some(prefix => key.startsWith(prefix) && key.length > prefix.length);
}

/** Validate a provider environment object for one channel. */
export function isValidEnvironment(channelId, environment) {
  if (environment === undefined) return true;
  if (!environment || typeof environment !== 'object' || Array.isArray(environment)) return false;
  const entries = Object.entries(environment);
  if (entries.length > 64) return false;
  return entries.every(([key, value]) => isAllowedEnvironmentKey(channelId, key)
    && typeof value === 'string' && value.length <= 16384 && !value.includes('\0'));
}

/** Copy only allowed variables (defence in depth for stored configs). */
export function filterEnvironment(channelId, environment) {
  const result = {};
  if (!environment || typeof environment !== 'object' || Array.isArray(environment)) return result;
  for (const [key, value] of Object.entries(environment)) {
    if (isAllowedEnvironmentKey(channelId, key) && typeof value === 'string' && !value.includes('\0')) result[key] = value;
  }
  return result;
}

/**
 * Options for PythonTransport. Interpreter and state directory never come
 * from `config`; a stored legacy `python_executable` is ignored.
 */
export function transportOptions(channelId, config = {}, env = process.env) {
  return {
    pythonExecutable: resolvePythonExecutable(env),
    stateDirectory: resolveStateDirectory(channelId, config.state_directory, env),
    settings: config.settings && typeof config.settings === 'object' && !Array.isArray(config.settings) ? config.settings : {},
    environment: filterEnvironment(channelId, config.environment),
  };
}
