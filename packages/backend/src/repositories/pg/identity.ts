/**
 * Identity repository on PostgreSQL (B2.2a/B2.2b): the same createIdentity /
 * createIdentityAuth / createTeams code as SQLite, over pgUsersStore and
 * pgRunner. Scope rules, the sign-in order of checks (S0-Q.20/21) and the
 * team rules are therefore identical.
 */

import { createIdentity, type IdentityRepository } from '../identity.js';
import { createIdentityAuth } from '../identity-auth.js';
import { pgUsersStore } from './users-store.js';
import { pgTeams } from './teams.js';

export const pgIdentityAuth = createIdentityAuth(pgUsersStore);

export const pgIdentity: IdentityRepository = createIdentity(pgUsersStore, pgIdentityAuth, pgTeams);
