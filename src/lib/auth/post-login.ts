/**
 * Post-login routing (F-05, decision D-ONBOARDING), kept pure so it can be
 * unit-tested.
 *
 * - After a successful login, an owner whose onboarding is not completed goes
 *   to /onboarding (the wizard shown after the first owner login).
 * - Everyone else (and an owner when the onboarding state could not be read)
 *   goes to the default page.
 * - Finishing or skipping the wizard goes to the home/chat page.
 */

export const ONBOARDING_PATH = '/onboarding';
export const DEFAULT_AFTER_LOGIN_PATH = '/dashboard';
/** Main-agent chat is home (design decision); the wizard ends there. */
export const HOME_CHAT_PATH = '/chat';

/** Interprets the body of backend `GET /api/onboarding`; null when unusable. */
export function parseOnboardingCompleted(body: unknown): boolean | null {
  if (!body || typeof body !== 'object') return null;
  const state = (body as { state?: unknown }).state;
  if (!state || typeof state !== 'object') return null;
  const { completed } = state as { completed?: unknown };
  return typeof completed === 'boolean' ? completed : null;
}

/**
 * Where to go after login. `onboardingCompleted` is null when unknown
 * (not asked, backend unreachable, error): no wizard redirect then.
 */
export function postLoginRedirect(role: string | null | undefined, onboardingCompleted: boolean | null): string {
  if (role === 'owner' && onboardingCompleted === false) return ONBOARDING_PATH;
  return DEFAULT_AFTER_LOGIN_PATH;
}

/** Only an owner needs the onboarding state to decide. */
export function needsOnboardingCheck(role: string | null | undefined): boolean {
  return role === 'owner';
}
