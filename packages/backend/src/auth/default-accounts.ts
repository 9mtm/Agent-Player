/**
 * Built-in and seeded accounts that must never be usable for login (S0-Q.2).
 *
 * Older versions created internal users with passwords written in the source code,
 * and the development seed created owner/admin/user accounts with fixed passwords.
 * Those databases may still contain them, so login refuses them by id and by password.
 */

/** Internal users that exist only so legacy data has an owner id. */
export const SYSTEM_ACCOUNT_IDS: ReadonlySet<string> = new Set(['mock-user', '1']);

/** Passwords that were published in this repository's source code. */
const PUBLISHED_DEFAULT_PASSWORDS: ReadonlySet<string> = new Set([
  'admin123',
  'user123',
  'system-user-not-for-login',
  'demo-user-password',
]);

export function isSystemAccount(userId: string): boolean {
  return SYSTEM_ACCOUNT_IDS.has(userId);
}

export function isPublishedDefaultPassword(password: string): boolean {
  return PUBLISHED_DEFAULT_PASSWORDS.has(password);
}

/** Ids of accounts that count as a real owner/admin (system accounts excluded). */
export const OWNER_EXISTS_SQL =
  "SELECT 1 FROM users WHERE role IN ('owner', 'admin') AND id NOT IN ('mock-user', '1') LIMIT 1";
