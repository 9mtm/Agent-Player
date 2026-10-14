/**
 * Repositories (B1-core): async, actor-first data access with central scope
 * checks for identity, credentials, agents, memory, task runs and audit.
 *
 * The driver is chosen once, at load, by db/pg/config.ts dbDriver():
 * SQLite unless AGENT_PLAYER_DB=postgres (with AGENT_PLAYER_PG_URL).
 *
 * B2.2a (partial PostgreSQL): on 'postgres' only identity (accounts, sign-in,
 * profile; not teams), audit.record and the sign-in throttle use PostgreSQL;
 * credentials, agents, memory and task runs, the auth gate's token check and
 * every non-repository module still use SQLite. So 'postgres' is for the
 * B2 integration tests, not for running the app yet (B2.2b ports the rest).
 */

import { sqliteAgents, type AgentsRepository } from './agents.js';
import { sqliteAudit, type AuditRepository } from './audit.js';
import { sqliteCredentials, type CredentialsRepository } from './credentials.js';
import { sqliteIdentity, type IdentityRepository } from './identity.js';
import { sqliteMemory, type MemoryRepository } from './memory.js';
import { sqliteTaskRuns, type TaskRunsRepository } from './task-runs.js';
import { pgIdentity } from './pg/identity.js';
import { pgAudit } from './pg/audit.js';
import { sqliteLoginThrottle, pgLoginThrottle, type LoginThrottle } from './login-throttle.js';
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

/** The repositories for a driver (B2.2a: PostgreSQL for identity and audit only). */
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

export type { Actor, ActorKind, ActorRole } from './actor.js';
export { withTransaction } from './transaction.js';
export { withPgActorTransaction } from './pg/transaction.js';
