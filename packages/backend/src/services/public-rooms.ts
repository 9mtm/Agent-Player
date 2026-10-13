/**
 * Anonymous access to public rooms (Q-14, CL-07).
 *
 * Public rooms stay, but visitors without an account may read or post in
 * them only after the owner turns it on in Settings
 * (`PUT /api/settings` `{ publicRooms: { allowAnonymous: true } }`, owner
 * only). Default: off. Signed-in users are not affected.
 */
import { getSettingsManager } from '../settings/index.js';

export function anonymousPublicRoomsEnabled(): boolean {
  try {
    return getSettingsManager().getSettings().publicRooms?.allowAnonymous === true;
  } catch {
    return false; // fail closed
  }
}
