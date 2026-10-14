/**
 * Repositories (B1-core): async, actor-first data access with central scope
 * checks for identity, credentials, agents, memory, task runs and audit.
 *
 * The driver is chosen once, at load, by db/pg/config.ts dbDriver():
 * SQLite unless AGENT_PLAYER_DB=postgres (with AGENT_PLAYER_PG_URL).
 *
 * B2.2a/B2.2b-1 (partial PostgreSQL): on 'postgres' identity (accounts,
 * sign-in, profile, teams and invitations), audit.record, the sign-in
 * throttle and its background prune, the auth gate's token check and the
 * route guards' hooks use PostgreSQL; credentials, agents, memory, task runs
 * and every non-repository module still use SQLite. So 'postgres' is for the
 * B2 integration tests, not for running the app yet (B2.2b ports the rest).
 *
 * Transactions: `withTransaction` (SQLite) stays the export for the SQLite
 * repositories (agents-config); the identity area picks its driver's
 * transaction through its store/runner (sql-runner.ts batch,
 * withPgActorTransaction on PostgreSQL).
 */

import { sqliteAgents, type AgentsRepository } from './agents.js';
import { sqliteAudit, type AuditRepository } from './audit.js';
import { sqliteCredentials, type CredentialsRepository } from './credentials.js';
import { sqliteIdentity, type IdentityRepository } from './identity.js';
import { sqliteMemory, type MemoryRepository } from './memory.js';
import { sqliteTaskRuns, type TaskRunsRepository } from './task-runs.js';
import { pgIdentity } from './pg/identity.js';
import { pgAudit } from './pg/audit.js';
import { sqliteLoginThrottle, pgLoginThrottle, startLoginRecordPruning as startPruning, type LoginThrottle } from './login-throttle.js';
import { dbDriver, type DbDriver } from '../db/pg/config.js';

export interface ScopedRepositories {
  identity: IdentityRepository;
  credentials: CredentialsRepository;
  agents: AgentsRepository;
  memory: MemoryRepository;
  taskRuns: TaskRunsRepository;
  audit: AuditRepository;
}

/** The driver the repositories below were built for. */
export const repositoryDriver: DbDriver = dbDriver();

/** The repositories for a driver (B2.2b-1: PostgreSQL for identity incl. teams, and audit.record). */
export function repositoriesFor(driver: DbDriver): ScopedRepositories {
  const pg = driver === 'postgres';
  return {
    identity: pg ? pgIdentity : sqliteIdentity,
    credentials: sqliteCredentials,
    agents: sqliteAgents,
    memory: sqliteMemory,
    taskRuns: sqliteTaskRuns,
    audit: pg ? pgAudit : sqliteAudit,
  };
}

export const repositories: ScopedRepositories = repositoriesFor(repositoryDriver);

/** Sign-in throttle and device tokens for the selected driver. */
export const loginThrottle: LoginThrottle = repositoryDriver === 'postgres' ? pgLoginThrottle : sqliteLoginThrottle;

/** Background prune of sign-in records on the selected driver (S0-Q.21, B2.2b). */
export function startLoginRecordPruning(intervalMs?: number): ReturnType<typeof setInterval> {
  return startPruning(loginThrottle, intervalMs);
}

export type { Actor, ActorKind, ActorRole } from './actor.js';
export { withTransaction } from './transaction.js';
export { withPgActorTransaction } from './pg/transaction.js';
