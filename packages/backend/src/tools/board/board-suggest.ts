/**
 * The agent suggests a board card for the task of the chat (CHAT-PRO-02 I
 * step 2). It writes nothing: the chat shows the suggestion and only the
 * owner creates the card (the board stays owner-only, like BOARD-02, where an
 * agent works only on cards the owner assigned to it). Self-only, so every
 * agent has it in chat runs without a grant.
 */
import type { Tool, ToolResult } from '../types.js';

export const MAX_SUGGEST_TITLE = 200;
export const MAX_SUGGEST_DESCRIPTION = 2000;
export const MAX_SUGGEST_AGENTS = 10;
export type CardSuggestion = { title: string; description: string; agents: string[]; priority: 'low' | 'normal' | 'high' | 'urgent' };

const fail = (text: string): ToolResult => ({ content: [{ type: 'text', text }], error: text });
// eslint-disable-next-line no-control-regex
const clean = (s: string) => s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim();

/** The suggestion, cleaned, or an error message. Agents are team names as the agent knows them. */
export function cardSuggestion(params: Record<string, unknown>): CardSuggestion | string {
  const title = typeof params.title === 'string' ? clean(params.title).replace(/\s+/g, ' ') : '';
  if (!title) return 'title is required';
  if ([...title].length > MAX_SUGGEST_TITLE) return `title must be at most ${MAX_SUGGEST_TITLE} characters`;
  const description = typeof params.description === 'string' ? [...clean(params.description)].slice(0, MAX_SUGGEST_DESCRIPTION).join('') : '';
  const raw = params.agents === undefined ? [] : params.agents;
  if (!Array.isArray(raw) || raw.length > MAX_SUGGEST_AGENTS || !raw.every((a) => typeof a === 'string' && a.trim() && a.length <= 80)) return `agents must be a list of at most ${MAX_SUGGEST_AGENTS} names`;
  const priority = ['low', 'normal', 'high', 'urgent'].includes(params.priority as string) ? params.priority as CardSuggestion['priority'] : 'normal';
  return { title, description, agents: [...new Set(raw.map((a: string) => a.trim().replace(/^@/, '')))], priority };
}

export const boardSuggestCardTool: Tool = {
  name: 'board_suggest_card',
  selfOnly: true,
  description: 'Suggest turning the task of this chat into a card on the owner\'s board, with the agents of the team it needs. The owner sees the suggestion in the chat and decides whether to create the card; nothing is created by this call. Use it when the owner gives a larger task that several agents or several sessions will work on.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: `Short card title (up to ${MAX_SUGGEST_TITLE} characters)` },
      description: { type: 'string', description: 'What the task is and what done looks like' },
      agents: { type: 'array', items: { type: 'string' }, description: 'Names of the team\'s agents the task needs' },
      priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
    },
    required: ['title'],
  },
  idempotent: true,
  async execute(params): Promise<ToolResult> {
    const s = cardSuggestion(params);
    if (typeof s === 'string') return fail(`Not suggested: ${s}.`);
    return { content: [{ type: 'text', text: `Card suggestion shown to the owner: "${s.title}". The owner decides whether to create it; do not ask again in this reply.` }], details: { suggestion: s } };
  },
};
