/**
 * memory_forget tool (CORE-07): the owner says "forget this" / "انسَ هذا" /
 * "vergiss das". Removes a memory completely (memory/forget.ts): row, version
 * text, index, readable copies, exports; only a tombstone stays.
 *
 * Irreversible, so every call needs one-time owner approval (S1.3,
 * APPROVAL_REQUIRED_TOOLS 'delete'). Never in a turn that answers an
 * outsider. Only the run user's own memories. The result never repeats the
 * memory text (it is kept in the approval record).
 */

import type { Tool, ToolResult, ToolExecutionContext } from '../types.js';
import { toolMemoryUser } from './scope.js';
import { forgetMemory } from '../../memory/forget.js';
import { agentActor } from '../../memory/versions.js';
import { logAudit } from '../../services/audit-logger.js';

const fail = (msg: string): ToolResult => ({ content: [{ type: 'text', text: `Forget refused: ${msg}` }], error: msg });

export const memoryForgetTool: Tool = {
  name: 'memory_forget',
  description: `Forget a memory completely when the owner asks ("forget this", "انسَ هذا", "vergiss das").
Give the memory id (from memory_search). The memory, its history, index entries
and exported copies are erased and cannot be restored. The owner approves
each call first. For an ordinary correction use memory_edit / memory_delete.`,
  input_schema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Memory id to forget' },
    },
    required: ['id'],
  },
  async execute(params: { id?: unknown }, context?: ToolExecutionContext): Promise<ToolResult> {
    const userId = toolMemoryUser(context);
    if (!userId) return fail('no user for this memory');
    if (context?.toolPolicy) return fail('not available when answering someone else');
    if (typeof params.id !== 'string' || !params.id) return fail('id is required');
    const result = await forgetMemory(userId, params.id, agentActor(context?.agentId));
    if (!result) return fail('memory not found');
    logAudit({
      event_type: 'data.delete', event_category: 'data_modification', severity: 'info', user_id: userId,
      resource_type: 'memory', resource_id: result.memoryId, action: 'memory.forget', success: true,
      metadata: { actor: result.actor, drawer: result.drawerId, cancelledProposals: result.cancelledProposals.length },
    });
    return {
      content: [{ type: 'text', text: `Forgotten: memory ${result.memoryId} was erased completely.` }],
      data: { success: true, memoryId: result.memoryId, forgottenAt: result.forgottenAt },
    } as ToolResult;
  },
};
