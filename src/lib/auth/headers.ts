/**
 * Authorization header for backend calls from the browser.
 * The backend requires an owner/admin bearer token on extension management
 * routes (config, enable/disable, delete, inspect, audit, analytics).
 */
export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('auth_token') : null;
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}
