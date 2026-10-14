/**
 * Agents repository (B1-core): tool grants (S1.4) and versioned personality
 * (CORE-01). Scope rules (scope.ts):
 *
 *   grantView / setGrants                owner only
 *   currentPersonality / versions        owner; an agent run reads its OWN
 *                                        agent's current personality only
 *   savePersonality / lock / unlock /
 *   rollbackPersonality                  owner only (never an agent run: a
 *                                        personality or grant change is a
 *                                        permission/config change)
 *
 * Personality never grants tools; grants are permissions. Not yet here
 * (B1-rest): agents_config CRUD and naming (routes/agents-config.ts).
 *
 * SQLite implementation over tools/grants.ts and services/personality-store.ts.
 */

import type { Actor } from './actor.js';
import { ScopeError, MSG, requireActor, requireOwner } from './scope.js';
import type { Tool } from '../tools/types.js';
import { getAgentGrantView, setAgentGrants, type GrantView } from '../tools/grants.js';
import {
  getCurrentPersonality,
  listPersonalityVersions,
  rollbackPersonality,
  savePersonalityVersion,
  setPersonalityLocked,
  type PersonalityVersion,
  type SaveInput,
} from '../services/personality-store.js';

type Available = ReadonlyArray<Pick<Tool, 'name' | 'execClass'>>;

export interface AgentsRepository {
  grantView(actor: Actor | null | undefined, agentId: string, available: Available): Promise<GrantView | null>;
  setGrants(
    actor: Actor | null | undefined,
    agentId: string,
    input: { grants: unknown; parentAgentId?: unknown; expectedVersion?: number | null },
    available: Available,
  ): Promise<{ before: string[]; after: string[]; parentAgentId: string | null; version: number }>;
  currentPersonality(actor: Actor | null | undefined, agentId: string): Promise<PersonalityVersion | null>;
  personalityVersions(actor: Actor | null | undefined, agentId: string): Promise<PersonalityVersion[] | null>;
  savePersonality(actor: Actor | null | undefined, agentId: string, input: SaveInput): Promise<PersonalityVersion>;
  setPersonalityLocked(actor: Actor | null | undefined, agentId: string, locked: boolean): Promise<PersonalityVersion>;
  rollbackPersonality(actor: Actor | null | undefined, agentId: string, toVersion: unknown): Promise<PersonalityVersion>;
}

const by = (a: Actor) => a.userId ?? 'system';

/** Owner, system, or an agent run reading its own agent. */
function ownerOrSelfAgent(actor: Actor | null | undefined, agentId: string): Actor {
  const a = requireActor(actor);
  if (a.kind === 'agent') {
    if (a.agentId && a.agentId === agentId && a.userId && a.role !== 'none') return a;
    throw new ScopeError(403, MSG.agent);
  }
  return requireOwner(a);
}

export const sqliteAgents: AgentsRepository = {
  async grantView(actor, agentId, available) {
    requireOwner(actor);
    return getAgentGrantView(agentId, available);
  },

  async setGrants(actor, agentId, input, available) {
    const a = requireOwner(actor);
    return setAgentGrants(agentId, input, by(a), available);
  },

  async currentPersonality(actor, agentId) {
    ownerOrSelfAgent(actor, agentId);
    return getCurrentPersonality(agentId);
  },

  async personalityVersions(actor, agentId) {
    requireOwner(actor);
    return listPersonalityVersions(agentId);
  },

  async savePersonality(actor, agentId, input) {
    const a = requireOwner(actor);
    return savePersonalityVersion(agentId, input, by(a));
  },

  async setPersonalityLocked(actor, agentId, locked) {
    const a = requireOwner(actor);
    return setPersonalityLocked(agentId, locked, by(a));
  },

  async rollbackPersonality(actor, agentId, toVersion) {
    const a = requireOwner(actor);
    return rollbackPersonality(agentId, toVersion, by(a));
  },
};
