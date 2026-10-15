/**
 * Board tools for agents (BOARD-02). An agent sees, comments on and moves
 * only the board cards it is assigned to, on its run user's boards. The run
 * user and agent come from the trusted run context, never from the model.
 */

import type { Tool, ToolExecutionContext, ToolResult } from '../types.js';
import { BoardError, agentCards, agentCheck, agentChecklist, agentComment, agentMove } from '../../services/task-board.js';

const fail = (text: string): ToolResult => ({ content: [{ type: 'text', text }], error: text });

function who(context?: ToolExecutionContext): { ownerId: string; agentId: string } | null {
  const ownerId = typeof context?.userId === 'string' && context.userId ? context.userId : null;
  const agentId = typeof context?.agentId === 'string' && context.agentId ? context.agentId : null;
  return ownerId && agentId ? { ownerId, agentId } : null;
}

const boardError = (err: unknown): ToolResult => {
  if (err instanceof BoardError) return fail(err.status === 404 ? 'That card is not one of your board cards.' : err.message);
  throw err;
};

export const boardMyCardsTool: Tool = {
  name: 'board_my_cards',
  description: 'List the company board cards you are assigned to (title, column, priority, due date, departments, id). Use the id with board_comment and board_move.',
  input_schema: { type: 'object', properties: {} },
  async execute(_params, context): Promise<ToolResult> {
    const w = who(context); if (!w) return fail('No agent run: board cards are not available here.');
    const cards = await agentCards(w.ownerId, w.agentId);
    if (cards.length === 0) return { content: [{ type: 'text', text: 'You have no board cards.' }], details: { cards: [] } };
    const lines = cards.map((c) => `- [${c.id}] ${c.title} — column: ${c.column}, priority: ${c.priority}${c.dueDate ? `, due ${c.dueDate}` : ''}${c.departments.length ? `, departments: ${c.departments.join(', ')}` : ''}`);
    return { content: [{ type: 'text', text: `Your board cards:\n${lines.join('\n')}` }], details: { cards } };
  },
};

export const boardCommentTool: Tool = {
  name: 'board_comment',
  description: 'Add a comment to one of your board cards: progress, a question for the owner, or a result summary. Keep it short and factual.',
  input_schema: {
    type: 'object',
    properties: {
      card_id: { type: 'string', description: 'Card id from board_my_cards' },
      comment: { type: 'string', description: 'The comment (up to 4000 characters)' },
    },
    required: ['card_id', 'comment'],
  },
  async execute(params, context): Promise<ToolResult> {
    const w = who(context); if (!w) return fail('No agent run: board cards are not available here.');
    try {
      const count = await agentComment(w.ownerId, w.agentId, params.card_id, params.comment);
      return { content: [{ type: 'text', text: `Comment added (${count} on this card).` }], details: { comments: count } };
    } catch (err) { return boardError(err); }
  },
};

export const boardMoveTool: Tool = {
  name: 'board_move',
  description: 'Move one of your board cards to another column by its name, e.g. "In progress" when you start and "Review" when you finish. The owner decides when a card is "Done".',
  input_schema: {
    type: 'object',
    properties: {
      card_id: { type: 'string', description: 'Card id from board_my_cards' },
      column: { type: 'string', description: 'Column name, e.g. "In progress" or "Review"' },
    },
    required: ['card_id', 'column'],
  },
  async execute(params, context): Promise<ToolResult> {
    const w = who(context); if (!w) return fail('No agent run: board cards are not available here.');
    try {
      const r = await agentMove(w.ownerId, w.agentId, params.card_id, params.column);
      return { content: [{ type: 'text', text: `Card moved to "${r.column}".` }], details: r };
    } catch (err) { return boardError(err); }
  },
};

export const boardChecklistTool: Tool = {
  name: 'board_checklist',
  description: 'Show the checklist of one of your board cards (item ids, text, done). Tick items with board_check as you finish them.',
  input_schema: { type: 'object', properties: { card_id: { type: 'string', description: 'Card id from board_my_cards' } }, required: ['card_id'] },
  async execute(params, context): Promise<ToolResult> {
    const w = who(context); if (!w) return fail('No agent run: board cards are not available here.');
    try {
      const items = await agentChecklist(w.ownerId, w.agentId, params.card_id);
      if (items.length === 0) return { content: [{ type: 'text', text: 'This card has no checklist.' }], details: { items } };
      return { content: [{ type: 'text', text: items.map((i) => `- [${i.done ? 'x' : ' '}] ${i.text} (id ${i.id})`).join('\n') }], details: { items } };
    } catch (err) { return boardError(err); }
  },
};

export const boardCheckTool: Tool = {
  name: 'board_check',
  description: 'Tick (done: true) or untick (done: false) a checklist item on one of your board cards.',
  input_schema: {
    type: 'object',
    properties: { card_id: { type: 'string' }, item_id: { type: 'string', description: 'Item id from board_checklist' }, done: { type: 'boolean' } },
    required: ['card_id', 'item_id', 'done'],
  },
  async execute(params, context): Promise<ToolResult> {
    const w = who(context); if (!w) return fail('No agent run: board cards are not available here.');
    try {
      const items = await agentCheck(w.ownerId, w.agentId, params.card_id, params.item_id, params.done);
      const done = items.filter((i) => i.done).length;
      return { content: [{ type: 'text', text: `Checklist: ${done} of ${items.length} done.` }], details: { done, total: items.length } };
    } catch (err) { return boardError(err); }
  },
};
