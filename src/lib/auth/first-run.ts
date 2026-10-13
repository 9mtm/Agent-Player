/**
 * First-run routing decisions (F-01), kept pure so they can be unit-tested.
 *
 * - While the backend says setup is required, every page goes to /setup.
 * - /setup is reachable without signing in.
 * - Once setup is done, /setup goes to /login (the login page sends a
 *   signed-in user on to the dashboard).
 * - There is no open self-registration page (/register is not public).
 */

export const SETUP_PATH = '/setup';
export const LOGIN_PATH = '/login';

/** Pages that render without a signed-in user. */
// /avatar-lab is a static dev test page for our own avatar pipeline (no user data).
export const PUBLIC_PATHS = [LOGIN_PATH, SETUP_PATH, '/avatar-lab'] as const;

/** True for a public path itself or a sub-path of it (`/login`, `/login/x`), never `/loginx`. */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

/** Interprets the body of backend `GET /api/setup/status`; null when unusable. */
export function parseSetupStatus(body: unknown): boolean | null {
  if (!body || typeof body !== 'object') return null;
  const { setupComplete } = body as { setupComplete?: unknown };
  return typeof setupComplete === 'boolean' ? setupComplete : null;
}

/**
 * Where the browser must go for this page, or null to stay.
 * `setupComplete` is null when the backend could not be asked: no redirect then
 * (the normal sign-in check still protects private pages).
 */
export function firstRunRedirect(pathname: string, setupComplete: boolean | null): string | null {
  if (setupComplete === null) return null;
  const onSetup = pathname === SETUP_PATH || pathname.startsWith(SETUP_PATH + '/');
  if (!setupComplete) return onSetup ? null : SETUP_PATH;
  return onSetup ? LOGIN_PATH : null;
}
