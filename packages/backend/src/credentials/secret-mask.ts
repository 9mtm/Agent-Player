/**
 * Secret masking helpers for API responses.
 *
 * API responses must never carry a full secret value. Routes return a masked
 * form instead (e.g. "••••abcd") and treat a masked value sent back on update
 * as "keep the stored secret".
 */

/** Placeholder used when nothing of the secret may be shown. */
export const SECRET_PLACEHOLDER = '••••••••';

/** Minimum length before the last 4 characters may be shown. */
const MIN_LENGTH_FOR_HINT = 16;

/**
 * Mask a secret value: "••••" + last 4 characters for long values,
 * a fixed placeholder for short ones. Empty input returns ''.
 */
export function maskSecret(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  if (str.length < MIN_LENGTH_FOR_HINT) return SECRET_PLACEHOLDER;
  return `••••${str.slice(-4)}`;
}

/**
 * True when a value sent by a client is a masked placeholder (ours or a legacy
 * one such as "****" or "abcd...wxyz") rather than a new secret.
 */
export function isMaskedSecret(value: unknown): boolean {
  if (typeof value !== 'string' || value === '') return false;
  if (value.includes('•')) return true;
  if (/^\*{4,}$/.test(value)) return true;
  // Legacy settings mask: first 4 + "..." + last 4
  if (/^.{4}\.\.\..{4}$/.test(value)) return true;
  return false;
}

/** Key names treated as secrets inside generic config objects. */
const SECRET_KEY_PATTERN =
  /(pass(word|phrase)?|secret|token|api[_-]?key|apikey|private[_-]?key|credentials?(_json)?|auth[_-]?key|access[_-]?key)$/i;

export function isSecretKey(key: string): boolean {
  return SECRET_KEY_PATTERN.test(key);
}

/**
 * Return a shallow copy of a config object with secret-looking keys masked.
 * Adds `has_<key>: true` for each masked key that had a value.
 */
export function maskSecretFields<T extends Record<string, any>>(config: T | null | undefined): T | null | undefined {
  if (!config || typeof config !== 'object') return config;
  const out: Record<string, any> = Array.isArray(config) ? [...config] : { ...config };
  for (const [key, value] of Object.entries(config)) {
    if (!isSecretKey(key)) continue;
    if (value === null || value === undefined || value === '') continue;
    out[key] = maskSecret(value);
    out[`has_${key}`] = true;
  }
  return out as T;
}

/**
 * Merge an incoming config with the stored one: secret-looking keys whose
 * incoming value is a masked placeholder keep the stored value. `has_<key>`
 * markers added by maskSecretFields are dropped.
 */
export function restoreMaskedFields(
  incoming: Record<string, any>,
  stored: Record<string, any> | null | undefined
): Record<string, any> {
  const out: Record<string, any> = { ...incoming };
  for (const [key, value] of Object.entries(incoming)) {
    if (key.startsWith('has_') && isSecretKey(key.slice(4)) && typeof value === 'boolean') {
      delete out[key];
      continue;
    }
    if (isSecretKey(key) && isMaskedSecret(value)) {
      if (stored && stored[key] !== undefined) out[key] = stored[key];
      else delete out[key];
    }
  }
  return out;
}
