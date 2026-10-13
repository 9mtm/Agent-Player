/**
 * Memory scope of a tool run (CORE-03).
 *
 * The user is always the run's user (context.userId), never a model-supplied
 * `userId` parameter. The drawers are the ones selected for the turn
 * (context.memoryDrawers, see memory/drawers.ts selectDrawers). Without a
 * selection, the user's own owner + experience drawers are used. A channel
 * turn (an outsider is answered) reads no drawers unless the server opted in
 * with OUTSIDER_AGENT_MEMORY=true (S0-A.14).
 */

import type { ToolExecutionContext } from '../types.js';
import { selectDrawers, type DrawerRef } from '../../memory/drawers.js';
import { outsiderAgentMemoryEnabled } from '../../services/outsider-memory.js';

export function toolMemoryUser(params: { userId?: unknown }, context?: ToolExecutionContext): string | null {
  if (context?.userId) return context.userId;
  return typeof params.userId === 'string' && params.userId ? params.userId : null;
}

export function toolMemoryDrawers(context?: ToolExecutionContext): DrawerRef[] {
  if (context?.toolPolicy && !outsiderAgentMemoryEnabled()) return selectDrawers({ audience: 'outsider' });
  if (context?.memoryDrawers) return context.memoryDrawers;
  return selectDrawers({ audience: 'owner' });
}
