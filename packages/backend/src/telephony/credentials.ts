/**
 * Telephony credentials (F-04).
 *
 * Telephony provider settings (Twilio, Google, Vonage, Teams) are stored through
 * the CredentialManager: every value is encrypted at rest and the record is
 * owned by the installation owner, because the providers read them outside of
 * any request (no caller to scope to). Only an active owner/admin may read
 * (masked) or change them through the API.
 *
 * Values are looked up by name; records saved before F-04 without an owner
 * (user_id NULL) are still read as a fallback.
 */

import { getCredentialManager } from '../credentials/manager.js';
import { isMaskedSecret } from '../credentials/secret-mask.js';
import { CredentialType } from '../credentials/types.js';
import { one, sql } from '../repositories/sql-steps.js';

export const TELEPHONY_SKILL_ID = 'telephony';

export const TELEPHONY_KEYS = {
  twilioAccountSid: 'telephony.twilio.account_sid',
  twilioAuthToken: 'telephony.twilio.auth_token',
  googleProjectId: 'telephony.google.project_id',
  googleCredentialsJson: 'telephony.google.credentials_json',
  publicUrl: 'telephony.public_url',
  vonageApiKey: 'telephony.vonage.api_key',
  vonageApiSecret: 'telephony.vonage.api_secret',
  vonageApplicationId: 'telephony.vonage.application_id',
  vonagePrivateKey: 'telephony.vonage.private_key',
  teamsTenantId: 'telephony.teams.tenant_id',
  teamsClientId: 'telephony.teams.client_id',
  teamsClientSecret: 'telephony.teams.client_secret',
  teamsAccessToken: 'telephony.teams.access_token',
} as const;

/** Id of the active installation owner, or null when there is none yet (process driver, B2.2c). */
export async function getTelephonyOwnerId(): Promise<string | null> {
  const row = await sql().read(one<{ id: string }>(
    "SELECT id FROM users WHERE role = 'owner' AND status = 'active' ORDER BY created_at ASC, id ASC LIMIT 1"
  ));
  return row?.id ?? null;
}

/**
 * Decrypted value of a telephony setting, or null when it is not stored or
 * cannot be decrypted. Never logs the value.
 */
export async function getTelephonySecret(name: string): Promise<string | null> {
  const manager = getCredentialManager();
  const ownerId = await getTelephonyOwnerId();
  try {
    const credential =
      (ownerId ? await manager.getByName(name, ownerId) : null) ??
      (await manager.getByName(name)); // pre-F-04 records without an owner
    if (!credential) return null;
    return await manager.getValue(credential.id);
  } catch {
    console.warn(`[Telephony] Could not read stored setting ${name}`);
    return null;
  }
}

/**
 * Store a telephony setting for the owner (falls back to `callerId` when no
 * owner exists). Empty values and masked placeholders echoed back by a client
 * (e.g. "••••abcd") keep the stored secret; returns false in that case.
 */
export async function setTelephonySecret(
  name: string,
  value: string | undefined | null,
  callerId?: string
): Promise<boolean> {
  if (typeof value !== 'string' || value === '' || isMaskedSecret(value)) return false;

  const userId = (await getTelephonyOwnerId()) ?? callerId;
  if (!userId) throw new Error('No owner account to store telephony credentials for');

  const manager = getCredentialManager();
  const existing = await manager.getByName(name, userId);
  if (existing) {
    await manager.update(existing.id, { value });
  } else {
    await manager.create({
      name,
      type: CredentialType.API_KEY,
      value,
      description: 'Telephony provider setting',
      skillId: TELEPHONY_SKILL_ID,
      userId,
    });
  }

  return true;
}
