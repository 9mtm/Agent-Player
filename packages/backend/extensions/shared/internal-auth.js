/**
 * Authorization for an extension's AI tool calling its own HTTP routes
 * (S0-Q.18). Extension routes are owner/admin-only by default, so a tool
 * acting for the user of the current agent turn sends a short-lived token for
 * that user instead of an unverified user-id header. The route guard then
 * checks the user's role and status as for any other request.
 */

import { generateToken } from '../../src/auth/jwt.js';
import { getDatabase } from '../../src/db/index.js';

/** Authorization header for `userId` (active users only), valid for two minutes. */
export function internalAuthHeaders(userId) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('This tool needs a signed-in user');
  }
  const user = getDatabase()
    .prepare('SELECT status, token_version FROM users WHERE id = ?')
    .get(userId);
  if (!user || user.status !== 'active') {
    throw new Error('This tool needs an active user account');
  }
  return { Authorization: `Bearer ${generateToken(userId, user.token_version || 1, '2m')}` };
}
