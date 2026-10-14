/**
 * Identity repository on PostgreSQL (B2.2a): the same createIdentity /
 * createIdentityAuth code as SQLite, over pgUsersStore. Scope rules and the
 * sign-in order of checks (S0-Q.20/21) are therefore identical.
 *
 * Teams and invitations (teams.ts) are not ported yet (B2.2b): on
 * PostgreSQL those methods refuse with NotOnPostgresError instead of reading
 * the SQLite file behind the user's back.
 */

import { createIdentity, type IdentityRepository } from '../identity.js';
import { createIdentityAuth } from '../identity-auth.js';
import type { TeamsRepository } from '../teams.js';
import { pgUsersStore } from './users-store.js';

export class NotOnPostgresError extends Error {
  readonly statusCode = 501;
}

const TEAM_METHODS = [
  'teams', 'createTeam', 'team', 'updateTeam', 'deleteTeam', 'members', 'removeMember',
  'setMemberRole', 'invite', 'myInvitations', 'teamInvitations', 'acceptInvitation', 'cancelInvitation',
] as const satisfies readonly (keyof TeamsRepository)[];

const notPorted = async (): Promise<never> => {
  throw new NotOnPostgresError('Teams are not available on PostgreSQL yet');
};

export const pgTeamsNotPorted = Object.fromEntries(TEAM_METHODS.map((m) => [m, notPorted])) as unknown as TeamsRepository;

export const pgIdentityAuth = createIdentityAuth(pgUsersStore);

export const pgIdentity: IdentityRepository = createIdentity(pgUsersStore, pgIdentityAuth, pgTeamsNotPorted);
