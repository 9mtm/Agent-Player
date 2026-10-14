/**
 * Teams, members and invitations on PostgreSQL (B2.2b): the same
 * createTeams logic and SQL as SQLite (teams.ts) over pgRunner. The two
 * multi-statement writes run in withPgActorTransaction (pgRunner.batch).
 */

import { createTeams, type TeamsRepository } from '../teams.js';
import { pgRunner } from './sql-runner.js';

export const pgTeams: TeamsRepository = createTeams(pgRunner);
