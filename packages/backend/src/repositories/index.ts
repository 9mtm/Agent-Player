/**
 * Repositories (B1-core): async, actor-first data access with central scope
 * checks for identity, credentials, agents, memory, task runs and audit.
 *
 * The driver is chosen once, at load, by db/pg/config.ts dbDriver():
 * SQLite unless AGENT_PLAYER_DB=postgres (with AGENT_PLAYER_PG_URL).
 *
 * B2.2a/B2.2b-1/B2.2b-2/B2.2b-3 (partial PostgreSQL): on 'postgres'
 * identity (accounts, sign-in, profile, teams and invitations), audit.record,
 * the sign-in throttle and its background prune, the auth gate's token
 * check, the route guards' hooks, credentials (repository, manager, storage),
 * the encryption vault and key manager, and (B2.2b-3) agents (configs,
 * names, personality versions and proposals, tool grants), Evolution
 * proposals, task runs and their steps, verifications, contracts, tool
 * approvals, the small agent's runs, the cost budget and the agents_config /
 * settings reads of credentials/authority.ts use PostgreSQL. Memory and every
 * other non-repository module still use SQLite (B2.2b-4 and later), so
 * 'postgres' is for the B2 integration tests, not for running the app yet.
 *
 * Transactions: `withTransaction` chooses by driver (transaction.ts):
 * withPgActorTransaction on PostgreSQL (async fn; every ported call inside
 * joins it), the synchronous better-sqlite3 transaction on SQLite. Ported
 * modules write their multi-statement work as SQL steps
 * (sql-steps.ts), which run synchronously in db.transaction on SQLite and in
 * withPgTransaction on PostgreSQL.
 */

import { agentsRepository, type AgentsRepository } from './agents.js';
import { sqliteAudit, type AuditRepository } from './audit.js';
import { sqliteCredentials, type CredentialsRepository } from './credentials.js';
import { sqliteIdentity, type IdentityRepository } from './identity.js';
import { sqliteMemory, type MemoryRepository } from './memory.js';
import { taskRunsRepository, type TaskRunsRepository } from './task-runs.js';
import { pgIdentity } from './pg/identity.js';
import { pgAudit } from './pg/audit.js';
import { pgCredentials } from './pg/credentials.js';
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

/** The repositories for a driver (B2.2b-2: PostgreSQL for identity incl. teams, credentials and audit.record). */
export function repositoriesFor(driver: DbDriver): ScopedRepositories {
  const pg = driver === 'postgres';
  return {
    identity: pg ? pgIdentity : sqliteIdentity,
    credentials: pg ? pgCredentials : sqliteCredentials,
    agents: agentsRepository,
    memory: sqliteMemory,
    taskRuns: taskRunsRepository,
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
