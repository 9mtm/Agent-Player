/**
 * Redact secret-looking values from text that leaves the server through a
 * result card (MCP-01b). Pattern based, conservative: it prefers hiding a
 * harmless string over passing a real key along. Never logs what it found.
 */

const REDACTED = '[REDACTED]';

interface Rule { re: RegExp; replace: (m: string, ...g: string[]) => string }

const RULES: Rule[] = [
  // PEM private keys (whole block).
  { re: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?(-----END [A-Z0-9 ]*PRIVATE KEY-----|$)/g, replace: () => REDACTED },
  // JSON Web Tokens.
  { re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, replace: () => REDACTED },
  // Well-known provider key formats.
  { re: /\bsk-(?:ant-|proj-|live_|test_)?[A-Za-z0-9_-]{16,}\b/g, replace: () => REDACTED },
  { re: /\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,}\b/g, replace: () => REDACTED },
  { re: /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/g, replace: () => REDACTED },
  { re: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, replace: () => REDACTED },
  { re: /\bAIza[0-9A-Za-z_-]{35}\b/g, replace: () => REDACTED },
  { re: /\b(?:rk|pk|sk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g, replace: () => REDACTED },
  { re: /\b\d{8,10}:AA[A-Za-z0-9_-]{30,}\b/g, replace: () => REDACTED }, // Telegram bot token
  // Bearer / Basic authorization values.
  { re: /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{16,}/g, replace: (_m, kind) => `${kind} ${REDACTED}` },
  // URLs with embedded credentials.
  { re: /\b([a-z][a-z0-9+.-]*:\/\/)[^\s/:@]+:[^\s/@]+@/gi, replace: (_m, scheme) => `${scheme}${REDACTED}@` },
  // key = value / "key": "value" pairs with a secret-sounding key.
  {
    re: /((?:["']?)[A-Za-z0-9_.-]*(?:password|passwd|pwd|secret|token|api[_-]?key|apikey|access[_-]?key|private[_-]?key|client[_-]?secret)[A-Za-z0-9_.-]*["']?\s*[:=]\s*)(["']?)([^\s"',;]{4,})\2/gi,
    replace: (_m, prefix, quote) => `${prefix}${quote}${REDACTED}${quote}`,
  },
];

/** Text with secret-looking values replaced by [REDACTED], and how many were replaced. */
export function redactSecrets(text: string): { text: string; count: number } {
  if (!text) return { text, count: 0 };
  let count = 0;
  let out = text;
  for (const rule of RULES) {
    out = out.replace(rule.re, (...args: any[]) => {
      const m = args[0] as string;
      const groups = args.slice(1, -2) as string[];
      const r = rule.replace(m, ...groups);
      if (r !== m) count++;
      return r;
    });
  }
  return { text: out, count };
}
