/**
 * Repositories (B1-core): async, actor-first data access with central scope
 * checks for identity, credentials, agents, memory, task runs and audit.
 *
 * Today every repository is implemented on better-sqlite3 (sync under the
 * hood, Promise-returning interfaces). B2 (PostgreSQL) swaps the
 * implementations here without touching routes or tools.
 */

import { sqliteAgents, type AgentsRepository } from './agents.js';
import { sqliteAudit, type AuditRepository } from './audit.js';
import { sqliteCredentials, type CredentialsRepository } from './credentials.js';
import { sqliteIdentity, type IdentityRepository } from './identity.js';
import { sqliteMemory, type MemoryRepository } from './memory.js';
import { sqliteTaskRuns, type TaskRunsRepository } from './task-runs.js';

export interface ScopedRepositories {
  identity: IdentityRepository;
  credentials: CredentialsRepository;
  agents: AgentsRepository;
  memory: MemoryRepository;
  taskRuns: TaskRunsRepository;
  audit: AuditRepository;
}

export const repositories: ScopedRepositories = {
  identity: sqliteIdentity,
  credentials: sqliteCredentials,
  agents: sqliteAgents,
  memory: sqliteMemory,
  taskRuns: sqliteTaskRuns,
  audit: sqliteAudit,
};

export type { Actor, ActorKind, ActorRole } from './actor.js';
export { withTransaction } from './transaction.js';
