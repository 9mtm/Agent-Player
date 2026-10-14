/**
 * Credentials repository on PostgreSQL (B2.2b-2): the same createCredentials
 * logic and scope rules as SQLite (repositories/credentials.ts) over the
 * PostgreSQL credential storage (credentials/storage.ts with pgRunner) and
 * pgAudit. Values stay encrypted exactly as on SQLite; this layer returns
 * masked hints only.
 */

import { createCredentials, type CredentialsRepository } from '../credentials.js';
import { credentialManagerFor } from '../../credentials/manager.js';
import { credentialStorageFor } from '../../credentials/storage.js';
import { pgAudit } from './audit.js';

export const pgCredentials: CredentialsRepository = createCredentials({
  manager: () => credentialManagerFor('postgres'),
  storage: () => credentialStorageFor('postgres'),
  audit: pgAudit,
});
