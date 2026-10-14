/**
 * Shared actor helpers of the memory repository (B1-core / B1.6): which
 * user's memory an actor reaches and how it is named in versions/audit.
 */

import type { Actor } from './actor.js';
import { ScopeError, MSG, requireMember, requireOwnUser, requireOwner } from './scope.js';
import { agentActor } from '../memory/versions.js';

/**
 * Member account or agent run with a user; returns the user whose memories
 * are reached. Outsider turns pass: the drawers on the actor already follow
 * the outsider policy (none unless OUTSIDER_AGENT_MEMORY=true, S0-A.14).
 */
export function memoryUser(actor: Actor | null | undefined): { a: Actor; userId: string } {
  const a = requireOwnUser(actor, { allowOutsider: true });
  if (!a.userId) throw new ScopeError(403, a.kind === 'system' ? 'A memory needs a user' : MSG.agent);
  return { a, userId: a.userId };
}

/** A member account only (owner/admin/user): its own memory, no agent runs. */
export function memberUser(actor: Actor | null | undefined): { a: Actor; userId: string } {
  return memoryUser(requireMember(actor));
}

/** Version/audit actor label: the account, or `agent:<id>` for an agent run. */
export function versionActor(a: Actor): string {
  return a.kind === 'agent' ? agentActor(a.agentId) : (a.userId ?? 'system');
}

/** The owner account's id (owner-only memory areas act on the owner's own memory). */
export function memoryOwner(actor: Actor | null | undefined): string {
  const a = requireOwner(actor);
  if (!a.userId) throw new ScopeError(403, MSG.owner);
  return a.userId;
}
