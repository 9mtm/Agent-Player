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
 *   personalityProposals / proposal      owner only
 *   createPersonalityProposal            owner or admin (source 'owner')
 *   proposePersonalityDrift              server code (system -> source
 *                                        'evolution') or an agent run for its
 *                                        OWN agent outside a channel turn
 *                                        (source 'agent'); never a route
 *   approve / rejectPersonalityProposal  the owner account only (not even
 *                                        system: drift never applies without
 *                                        the owner's decision)
 *
 * Personality never grants tools; grants are permissions. agents_config
 * CRUD and naming live in agents-config.ts (same repository, B1.6).
 *
 * SQLite implementation over tools/grants.ts and services/personality-store.ts.
 */

import type { Actor } from './actor.js';
import { ScopeError, MSG, requireActor, requireAdmin, requireOwner } from './scope.js';
import type { Tool } from '../tools/types.js';
import { getAgentGrantView, setAgentGrants, type GrantView } from '../tools/grants.js';
import {
  getCurrentPersonality,
  listPersonalityVersions,
  rollbackPersonality,
  savePersonalityVersion,
  setPersonalityLocked,
  approvePersonalityProposal,
  createPersonalityProposal,
  getPersonalityProposal,
  listPersonalityProposals,
  rejectPersonalityProposal,
  type PersonalityProposal,
  type PersonalityVersion,
  type ProposalStatus,
  type SaveInput,
} from '../services/personality-store.js';

import { sqliteAgentConfigs, type AgentConfigsRepository } from './agents-config.js';

type Available = ReadonlyArray<Pick<Tool, 'name' | 'execClass'>>;

export interface AgentsRepository extends AgentConfigsRepository {
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
  personalityProposals(actor: Actor | null | undefined, agentId: string, status?: ProposalStatus): Promise<PersonalityProposal[] | null>;
  personalityProposal(actor: Actor | null | undefined, agentId: string, id: string): Promise<PersonalityProposal | null>;
  createPersonalityProposal(actor: Actor | null | undefined, agentId: string, input: unknown): Promise<PersonalityProposal>;
  /** Internal (Evolution / an agent run): never exposed as a route. */
  proposePersonalityDrift(actor: Actor | null | undefined, agentId: string, input: { traits?: unknown; delta?: unknown; reason: unknown; evidence?: unknown }): Promise<PersonalityProposal>;
  approvePersonalityProposal(actor: Actor | null | undefined, agentId: string, id: string, expectedReviewHash: unknown): Promise<{ proposal: PersonalityProposal; version: PersonalityVersion }>;
  rejectPersonalityProposal(actor: Actor | null | undefined, agentId: string, id: string, expectedReviewHash: unknown, note?: unknown): Promise<PersonalityProposal>;
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

/** The owner's own account (no system actor): decisions on drift proposals. */
function ownerAccount(actor: Actor | null | undefined): Actor & { userId: string } {
  const a = requireOwner(actor);
  if (a.kind !== 'user' || !a.userId) throw new ScopeError(403, MSG.owner);
  return a as Actor & { userId: string };
}

/** Who may file a drift proposal internally, and as which source. */
function internalProposer(actor: Actor | null | undefined, agentId: string): { source: 'agent' | 'evolution'; createdBy: string } {
  const a = requireActor(actor);
  if (a.kind === 'system') return { source: 'evolution', createdBy: 'evolution' };
  if (a.kind === 'agent') {
    // Only for its own agent, with an active user, and never while answering an outsider.
    if (a.channel || !a.agentId || a.agentId !== agentId || !a.userId || a.role === 'none') throw new ScopeError(403, MSG.agent);
    return { source: 'agent', createdBy: `agent:${a.agentId}` };
  }
  if (a.kind === 'service') throw new ScopeError(403, MSG.service);
  throw new ScopeError(403, 'Use the personality proposals API');
}

export const sqliteAgents: AgentsRepository = {
  ...sqliteAgentConfigs,

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

  async personalityProposals(actor, agentId, status) {
    requireOwner(actor);
    return listPersonalityProposals(agentId, status);
  },

  async personalityProposal(actor, agentId, id) {
    requireOwner(actor);
    return getPersonalityProposal(agentId, id);
  },

  async createPersonalityProposal(actor, agentId, input) {
    const a = requireAdmin(actor);
    return createPersonalityProposal(agentId, input, 'owner', by(a));
  },

  async proposePersonalityDrift(actor, agentId, input) {
    const { source, createdBy } = internalProposer(actor, agentId);
    return createPersonalityProposal(agentId, input, source, createdBy);
  },

  async approvePersonalityProposal(actor, agentId, id, expectedReviewHash) {
    const a = ownerAccount(actor);
    return approvePersonalityProposal(agentId, id, a.userId, expectedReviewHash);
  },

  async rejectPersonalityProposal(actor, agentId, id, expectedReviewHash, note) {
    const a = ownerAccount(actor);
    return rejectPersonalityProposal(agentId, id, a.userId, expectedReviewHash, note);
  },
};
