/**
 * Memory scope of a tool run (CORE-03).
 *
 * The user is always the run's user (context.userId), never a model-supplied
 * `userId` parameter. The drawers are the ones selected for the turn
 * (context.memoryDrawers, see memory/drawers.ts selectDrawers). Without a run
 * user nothing is read or written. Without a
 * selection, the user's own owner + experience drawers are used. A channel
 * turn (an outsider is answered) reads no drawers unless the server opted in
 * with OUTSIDER_AGENT_MEMORY=true (S0-A.14).
 */

import type { ToolExecutionContext } from '../types.js';
import { selectDrawers, type DrawerRef } from '../../memory/drawers.js';
import { outsiderAgentMemoryEnabled } from '../../services/outsider-memory.js';

/** The run's user, or null (fail closed). A `userId` in tool params is never used. */
export function toolMemoryUser(context?: ToolExecutionContext): string | null {
  return typeof context?.userId === 'string' && context.userId ? context.userId : null;
}

/** Narrowness order used to pick the drawer a derived memory is saved into. */
const NARROWEST: ReadonlyArray<DrawerRef['kind']> = ['task', 'people', 'project', 'experience', 'owner'];

/** The narrowest of the given drawers (e.g. task before project before owner), or null. */
export function narrowestDrawer(drawers: readonly DrawerRef[]): DrawerRef | null {
  for (const kind of NARROWEST) {
    const d = drawers.find((x) => x.kind === kind);
    if (d) return d;
  }
  return null;
}

export function toolMemoryDrawers(context?: ToolExecutionContext): DrawerRef[] {
  if (context?.toolPolicy && !outsiderAgentMemoryEnabled()) return selectDrawers({ audience: 'outsider' });
  if (context?.memoryDrawers) return context.memoryDrawers;
  return selectDrawers({ audience: 'owner' });
}
