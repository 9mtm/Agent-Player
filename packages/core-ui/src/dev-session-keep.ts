import { devQuickLoginAccounts } from './dev-quick-login';
import type { TokenKeep } from './session';

const KEY = 'dpro.dev.session';
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Keeps the sign-in across a page refresh, for the local test build only:
 * a build with dev quick sign-in compiled in, served on a loopback host.
 * The token lives in this tab's session storage and is gone when the tab
 * closes; every other build keeps it in memory only and returns null here.
 */
export function devSessionKeep(hostname: string, store?: Store, accounts?: unknown): TokenKeep | null {
  if (devQuickLoginAccounts(hostname, accounts).length === 0) return null;
  let s: Store | undefined = store;
  try { s ??= globalThis.sessionStorage; } catch { return null; }
  if (!s) return null;
  const tab = s;
  return {
    load() { try { const t = tab.getItem(KEY); return t && /^[A-Za-z0-9._~-]{1,8192}$/.test(t) ? t : null; } catch { return null; } },
    save(token) { try { if (token) tab.setItem(KEY, token); else tab.removeItem(KEY); } catch { /* the sign-in stays in memory only */ } },
  };
}
