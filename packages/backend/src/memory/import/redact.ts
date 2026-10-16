/**
 * Import redactor (CLI-02, stage 2 "scan & redact").
 *
 * Pattern based and conservative: it prefers hiding a harmless string over
 * keeping a real secret. Every match is replaced by `[REDACTED:<type>]`; the
 * original value is never returned, stored, logged or counted by value.
 * A scan is a precaution, not a guarantee: the owner still reviews the
 * sanitized preview.
 *
 * Optional (owner setting): e-mail addresses and phone numbers.
 */

import { randomInt } from 'node:crypto';

export type RedactionType =
  | 'private_key' | 'jwt' | 'bearer_token' | 'basic_auth' | 'url_credentials'
  | 'aws_access_key' | 'aws_secret_key' | 'gcp_api_key' | 'gcp_oauth_token' | 'gcp_client_secret'
  | 'azure_storage_key' | 'azure_sas_signature' | 'azure_connection_string'
  | 'anthropic_key' | 'openai_key' | 'github_token' | 'gitlab_token'
  | 'slack_token' | 'slack_webhook' | 'discord_webhook' | 'stripe_key' | 'huggingface_token'
  | 'npm_token' | 'sendgrid_key' | 'twilio_key' | 'telegram_bot_token' | 'generic_api_key'
  | 'password' | 'secret_assignment'
  | 'email' | 'phone';

export const REDACTION_TYPES: readonly RedactionType[] = [
  'private_key', 'jwt', 'bearer_token', 'basic_auth', 'url_credentials',
  'aws_access_key', 'aws_secret_key', 'gcp_api_key', 'gcp_oauth_token', 'gcp_client_secret',
  'azure_storage_key', 'azure_sas_signature', 'azure_connection_string',
  'anthropic_key', 'openai_key', 'github_token', 'gitlab_token',
  'slack_token', 'slack_webhook', 'discord_webhook', 'stripe_key', 'huggingface_token',
  'npm_token', 'sendgrid_key', 'twilio_key', 'telegram_bot_token', 'generic_api_key',
  'password', 'secret_assignment', 'email', 'phone',
];

export interface RedactOptions {
  emails?: boolean;
  phones?: boolean;
  /**
   * CHAT-SECRETS-01: called with each secret value found; its return value
   * replaces the value instead of `[REDACTED:<type>]` (e.g. a key-store
   * reference). The value is passed to this callback only, never kept here.
   */
  onSecret?: (type: RedactionType, value: string) => string;
}

export interface RedactResult {
  text: string;
  counts: Partial<Record<RedactionType, number>>;
  total: number;
}

export const marker = (type: RedactionType): string => `[REDACTED:${type}]`;
const isMarker = (s: string): boolean => /^\[REDACTED:[a-z_]+\]$/.test(s);
/** A value that already is (the start of) a marker or a key-store reference. */
const isMarkerStart = (s: string): boolean => s.startsWith('[REDACTED') || s.startsWith('[SECRET:');

interface Rule {
  type: RedactionType;
  re: RegExp;
  /** Rebuild the match with the secret part replaced; default: whole match. */
  replace?: (m: string, ...groups: string[]) => string;
  optional?: 'emails' | 'phones';
}

// Words that make the value of `key = value` a secret.
const PASSWORD_KEY = String.raw`[A-Za-z0-9_.-]*(?:password|passwd|passwort|kennwort|pwd|passphrase|passcode)[A-Za-z0-9_.-]*`;
const SECRET_KEY = String.raw`[A-Za-z0-9_.-]*(?:secret|token|api[_-]?key|apikey|access[_-]?key|private[_-]?key|client[_-]?secret|auth[_-]?key|credentials?|session[_-]?key|signing[_-]?key|encryption[_-]?key|master[_-]?key|webhook[_-]?secret)[A-Za-z0-9_.-]*`;

/** Placeholders and references are not secrets. */
function isPlaceholder(value: string, smallNumbersOk = false): boolean {
  // Short numbers after token/secret words are settings (max_tokens: 4096), but a numeric password is a secret.
  if (smallNumbersOk && /^\d{1,6}$/.test(value)) return true;
  return /^(?:\*+|x+|\.{3}|<.*|\$\{?[A-Za-z_][A-Za-z0-9_]*\}?|null|none|true|false|undefined|changeme|redacted|example|your[-_ a-z]*)$/i.test(value);
}

function assignment(type: RedactionType, key: string): Rule {
  // key = value, key: value, "key": "value", KEY="value with spaces"
  return {
    type,
    re: new RegExp(String.raw`((?:["'\x60]?)\b${key}["'\x60]?\s*(?::=|=>|[:=])\s*)(?:(["'\x60])([^"'\x60\n]{1,500})\2|([^\s"'\x60,;)}\]]{3,500}))`, 'gi'),
    replace: (m, prefix, quote, quoted, bare) => {
      const value = quoted ?? bare ?? '';
      if (!value || isMarker(value) || isMarkerStart(value)) return m;
      if (isPlaceholder(value, type === 'secret_assignment')) return m;
      return quote ? `${prefix}${quote}${marker(type)}${quote}` : `${prefix}${marker(type)}`;
    },
  };
}

const RULES: Rule[] = [
  // PEM / OpenSSH private keys: the whole block (also an unterminated one).
  { type: 'private_key', re: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----[\s\S]*?(?:-----END [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----|$)/g },
  { type: 'private_key', re: /"private_key"\s*:\s*"[^"]{20,}"/g, replace: () => `"private_key": "${marker('private_key')}"` },
  // Provider formats (before the generic rules, so the type is precise).
  { type: 'anthropic_key', re: /\bsk-ant-[A-Za-z0-9_-]{20,}/g },
  { type: 'openai_key', re: /\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}/g },
  { type: 'github_token', re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{22,}/g },
  { type: 'gitlab_token', re: /\bglpat-[A-Za-z0-9_-]{20,}/g },
  { type: 'slack_webhook', re: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]+/g },
  { type: 'discord_webhook', re: /https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/g },
  { type: 'slack_token', re: /\bxox[abposre]-[A-Za-z0-9-]{10,}/g },
  { type: 'stripe_key', re: /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{16,}|\bwhsec_[A-Za-z0-9]{20,}/g },
  { type: 'aws_access_key', re: /\b(?:AKIA|ASIA|AGPA|AIDA|AROA|ANPA|ANVA|AIPA|ABIA|ACCA)[A-Z0-9]{16}\b/g },
  // The value can end in '+', '/' or '=', so the end is "no further key character", not \b.
  { type: 'aws_secret_key', re: /(\baws_?secret_?(?:access_?)?key["']?\s*[:=]\s*["']?)([A-Za-z0-9/+=]{40})(?![A-Za-z0-9/+=])/gi, replace: (_m, p) => `${p}${marker('aws_secret_key')}` },
  { type: 'gcp_api_key', re: /\bAIza[0-9A-Za-z_-]{35}/g },
  { type: 'gcp_oauth_token', re: /\bya29\.[0-9A-Za-z_-]{20,}/g },
  { type: 'gcp_client_secret', re: /\bGOCSPX-[0-9A-Za-z_-]{20,}/g },
  { type: 'azure_connection_string', re: /\bDefaultEndpointsProtocol=https?;AccountName=[^;\s]+;AccountKey=[^;\s]+(?:;[^\s]*)?/gi },
  { type: 'azure_storage_key', re: /(\b(?:AccountKey|SharedAccessKey)\s*=\s*)([A-Za-z0-9+/]{30,}={0,2})/gi, replace: (_m, p) => `${p}${marker('azure_storage_key')}` },
  { type: 'azure_sas_signature', re: /([?&]sig=)([A-Za-z0-9%+/]{20,}={0,2})/g, replace: (_m, p) => `${p}${marker('azure_sas_signature')}` },
  { type: 'huggingface_token', re: /\bhf_[A-Za-z0-9]{30,}/g },
  { type: 'npm_token', re: /\bnpm_[A-Za-z0-9]{36}\b/g },
  { type: 'sendgrid_key', re: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g },
  { type: 'twilio_key', re: /\bSK[0-9a-f]{32}\b/g },
  { type: 'telegram_bot_token', re: /\b\d{8,10}:AA[A-Za-z0-9_-]{30,}/g },
  { type: 'jwt', re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g },
  // Authorization values.
  { type: 'bearer_token', re: /\b(Bearer)\s+([A-Za-z0-9._~+/=-]{12,})/gi, replace: (m, kind, value) => (isMarkerStart(value) ? m : `${kind} ${marker('bearer_token')}`) },
  { type: 'basic_auth', re: /\b(Basic)\s+([A-Za-z0-9+/]{12,}={0,2})/g, replace: (_m, kind) => `${kind} ${marker('basic_auth')}` },
  // URLs with embedded credentials: keep scheme + user, drop the password.
  { type: 'url_credentials', re: /\b([a-z][a-z0-9+.-]*:\/\/)([^\s/:@]+):([^\s/@]+)@/gi, replace: (m, scheme, user, pass) => (isMarker(pass) ? m : `${scheme}${user}:${marker('url_credentials')}@`) },
  // key = value with a secret-sounding key.
  assignment('password', PASSWORD_KEY),
  assignment('secret_assignment', SECRET_KEY),
  // "my password is hunter2" (EN / DE / AR).
  {
    type: 'password',
    re: /\b((?:password|passwort|kennwort|passcode|pin)\s+(?:is|ist|=|:)\s+)([^\s,;]{3,200})/gi,
    replace: (m, p, v) => (isMarkerStart(v) || isPlaceholder(v) ? m : `${p}${marker('password')}`),
  },
  {
    type: 'password',
    re: /((?:كلمة (?:السر|المرور)|الباسورد|الرمز السري)\s*(?:[:=]|هي|هو)?\s*)([^\s،,;]{3,200})/g,
    replace: (m, p, v) => (isMarkerStart(v) || isPlaceholder(v) ? m : `${p}${marker('password')}`),
  },
  // Long opaque values after "key"/"token" words that the assignment rule missed.
  { type: 'generic_api_key', re: /(\b(?:api|access|secret|auth)[ _-]?(?:key|token)\s+)([A-Za-z0-9_\-]{24,})\b/gi, replace: (m, p, v) => (v.startsWith('REDACTED') ? m : `${p}${marker('generic_api_key')}`) },
  // Optional contact data.
  { type: 'email', optional: 'emails', re: /\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,24}\b/g },
  {
    type: 'phone', optional: 'phones',
    re: /(?<![\w+])\+?\d[\d ().-]{7,20}\d(?![\w])/g,
    replace: (m) => {
      const digits = m.replace(/\D/g, '').length;
      return digits >= 9 && digits <= 15 ? marker('phone') : m;
    },
  },
];

/** Redact secrets (and optionally e-mails / phones). Pure; never logs. */
export function redactImportText(input: string, options: RedactOptions = {}): RedactResult {
  const counts: Partial<Record<RedactionType, number>> = {};
  let total = 0;
  let text = typeof input === 'string' ? input : '';
  // Key-store references ([SECRET:<type>:<id>], CHAT-SECRETS-01) are held as
  // inert markers while the rules run, so no rule reads their parts as a
  // `key: value` secret; they are put back unchanged at the end.
  const held: string[] = [];
  const nonce = letters(randomInt(26 ** 6));
  const hold = (ref: string): string => `[REDACTED:zref_${nonce}_${letters(held.push(ref) - 1)}]`;
  text = text.replace(SECRET_REF_RE, hold);
  for (const rule of RULES) {
    if (rule.optional && !options[rule.optional]) continue;
    text = text.replace(rule.re, (...args: any[]) => {
      const m = args[0] as string;
      // replace() passes (match, ...groups, offset, string[, groups]); keep the captures only.
      const tailNamed = typeof args[args.length - 1] === 'object' && args[args.length - 1] !== null ? 1 : 0;
      const groups = args.slice(1, args.length - 2 - tailNamed) as string[];
      if (isMarker(m)) return m;
      const out = rule.replace ? rule.replace(m, ...groups) : marker(rule.type);
      if (out === m) return out;
      counts[rule.type] = (counts[rule.type] ?? 0) + 1;
      total++;
      if (!options.onSecret) return out;
      // The rule kept everything around the value and put the marker in its place.
      const at = out.indexOf(marker(rule.type));
      const before = out.slice(0, at);
      const after = out.slice(at + marker(rule.type).length);
      if (at < 0 || !m.startsWith(before) || !m.endsWith(after) || m.length < before.length + after.length) return out;
      const value = m.slice(before.length, m.length - after.length);
      return `${before}${hold(options.onSecret(rule.type, value))}${after}`;
    });
  }
  if (held.length) text = text.replace(new RegExp(String.raw`\[REDACTED:zref_${nonce}_([a-z]+)\]`, 'g'), (_m, l: string) => held[fromLetters(l)] ?? '');
  return { text, counts, total };
}

/** A key-store reference left in a chat message instead of a secret (CHAT-SECRETS-01). */
export const SECRET_REF_RE = /\[SECRET:[a-z_]+:[a-z0-9]{6,32}\]/g;

const letters = (n: number): string => { let out = ''; do { out = String.fromCharCode(97 + (n % 26)) + out; n = Math.floor(n / 26); } while (n > 0); return out; };
const fromLetters = (l: string): number => [...l].reduce((n, c) => n * 26 + (c.charCodeAt(0) - 97), 0);

/** Add redaction counts into an accumulator. */
export function addCounts(into: Partial<Record<RedactionType, number>>, from: Partial<Record<RedactionType, number>>): void {
  for (const [k, v] of Object.entries(from)) into[k as RedactionType] = (into[k as RedactionType] ?? 0) + (v ?? 0);
}
