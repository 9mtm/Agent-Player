/**
 * Actor: who is acting (B1-core).
 *
 * Every repository method takes an Actor first and decides the scope from it
 * (see scope.ts). An Actor is built in exactly two places:
 *
 *  - per request by the auth gate (auth/auth-gate.ts -> `request.actor`), from
 *    the verified bearer token or a live server-created channel turn;
 *  - per tool call by the tools registry (`context.actor`), from the run's
 *    trusted context (user, agent, channel policy, open memory drawers).
 *
 * Nothing else builds one: no route reads a user id from the body or query,
 * and model output never reaches these builders. `SYSTEM_ACTOR` is for server
 * jobs (recovery, schedulers, migrations) only and is never given to a route.
 *
 * Kinds:
 *  - 'user'    a signed-in account; role owner | admin | user | guest
 *  - 'agent'   a tool call inside an agent run for `userId`, limited to the
 *              run's open memory `drawers`; never owner-wide, whatever the
 *              user's role (`role` is the run user's role, for information)
 *  - 'service' a server-created channel/phone turn (an outsider is answered);
 *              `userId` is the account the turn runs as, `channel` its channel
 *  - 'system'  server-internal code with no request behind it
 */

import { getDatabase } from '../db/index.js';
import type { UserRole } from '../auth/route-guards.js';
import type { DrawerRef } from '../memory/drawers.js';
import type { ToolExecutionContext } from '../tools/types.js';
import { toolMemoryDrawers } from '../tools/memory/scope.js';

export type ActorKind = 'user' | 'agent' | 'service' | 'system';
export type ActorRole = UserRole | 'none';

export interface Actor {
  readonly kind: ActorKind;
  /** The account acted for. Always set for 'user'; the run's user for 'agent'. */
  readonly userId?: string;
  /** agents_config.id of the agent run ('agent' only). */
  readonly agentId?: string;
  readonly role: ActorRole;
  /** Channel of a channel turn ('service', or an 'agent' run inside one). */
  readonly channel?: string;
  /** Memory drawers open for an agent run (CORE-03); absent = not an agent run. */
  readonly drawers?: readonly DrawerRef[];
  /** Durable task run the tool call belongs to (CORE-08), for audit only. */
  readonly runId?: string;
}

const ROLES: ReadonlySet<string> = new Set(['owner', 'admin', 'user', 'guest']);

function freeze<T extends object>(value: T): Readonly<T> {
  return Object.freeze(value);
}

/** Actor of a signed-in account (built by the auth gate from the verified token). */
export function userActor(user: { id: string; role: string }): Actor {
  const role: ActorRole = ROLES.has(user.role) ? user.role as UserRole : 'none';
  return freeze({ kind: 'user' as const, userId: user.id, role });
}

/** Actor of a live server-created channel turn (built by the auth gate). */
export function serviceActor(turn: { channel?: string; userId?: string }): Actor {
  return freeze({
    kind: 'service' as const,
    role: 'none' as const,
    ...(turn.userId ? { userId: turn.userId } : {}),
    channel: turn.channel || 'unknown',
  });
}

/** Server-internal code (recovery, schedulers). Never derived from a request. */
export const SYSTEM_ACTOR: Actor = freeze({ kind: 'system' as const, role: 'none' as const });

/** Role of an active account, or 'none' (missing, inactive or unknown role). */
function activeRole(userId: string): ActorRole {
  try {
    const row = getDatabase().prepare('SELECT role, status FROM users WHERE id = ?').get(userId) as { role: string; status: string } | undefined;
    if (!row || row.status !== 'active' || !ROLES.has(row.role)) return 'none';
    return row.role as UserRole;
  } catch {
    return 'none';
  }
}

/**
 * Actor of one tool call, from the run's trusted context only (the user,
 * agent, channel policy and drawers set by server code). Fails closed: no run
 * user -> no userId (every scoped repository call is refused).
 */
export function actorFromToolContext(context?: ToolExecutionContext): Actor {
  const userId = typeof context?.userId === 'string' && context.userId ? context.userId : undefined;
  return freeze({
    kind: 'agent' as const,
    role: userId ? activeRole(userId) : 'none' as const,
    ...(userId ? { userId } : {}),
    ...(context?.agentId ? { agentId: context.agentId } : {}),
    ...(context?.toolPolicy ? { channel: context.toolPolicy.channel } : {}),
    drawers: Object.freeze([...toolMemoryDrawers(context)]),
    ...(context?.taskRun?.runId ? { runId: context.taskRun.runId } : {}),
  });
}

/** The tool call's actor: the one the registry attached, else built from the context. */
export function toolActor(context?: ToolExecutionContext): Actor {
  return context?.actor ?? actorFromToolContext(context);
}

/** Short label for logs/audit metadata (no secrets): `user:<id>`, `agent:<id>`, ... */
export function actorLabel(actor: Actor): string {
  if (actor.kind === 'agent') return `agent:${actor.agentId ?? 'unknown'}`;
  if (actor.kind === 'service') return `service:${actor.channel ?? 'unknown'}`;
  if (actor.kind === 'system') return 'system';
  return `user:${actor.userId}`;
}
