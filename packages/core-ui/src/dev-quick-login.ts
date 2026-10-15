/**
 * Development quick sign-in (local testing only).
 *
 * A button on the live sign-in form fills the email and password of a test
 * account, so the owner and the developer can test quickly. Two locks:
 *  1. The accounts exist only in a bundle built with
 *     `node scripts/build.cjs --candidate --live-entry --dev-quick-login`,
 *     which reads them from the Git-ignored dev-accounts.local.json. Normal
 *     and candidate builds compile `null` here.
 *  2. Even in such a bundle, the button shows only when the page itself is
 *     served from a loopback host (127.0.0.1, localhost, [::1]).
 * It only fills the form; signing in is still the server's decision.
 */

export interface DevAccount {
  label: string;
  email: string;
  password: string;
}

declare const __DEV_QUICK_LOGIN__: DevAccount[] | null;

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

/** True for a loopback host name (what location.hostname gives). */
export function isLoopbackHost(hostname: string): boolean {
  return LOOPBACK.has(String(hostname).toLowerCase());
}

/** The compiled-in accounts, if any, as a clean list (never throws). */
export function compiledDevAccounts(source: unknown = typeof __DEV_QUICK_LOGIN__ !== 'undefined' ? __DEV_QUICK_LOGIN__ : null): DevAccount[] {
  if (!Array.isArray(source)) return [];
  return source.filter((a): a is DevAccount => !!a && typeof a === 'object'
    && typeof a.email === 'string' && a.email.length > 0
    && typeof a.password === 'string' && a.password.length > 0)
    .map(a => ({ label: typeof a.label === 'string' && a.label ? a.label : a.email, email: a.email, password: a.password }));
}

/** Accounts to offer on this page: none unless both locks are open. */
export function devQuickLoginAccounts(hostname: string, source?: unknown): DevAccount[] {
  if (!isLoopbackHost(hostname)) return [];
  return source === undefined ? compiledDevAccounts() : compiledDevAccounts(source);
}
