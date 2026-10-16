export type ActivityKind = 'created' | 'moved' | 'done' | 'comment' | 'archived' | 'restored';
export const ACTIVITY_KINDS: readonly ActivityKind[];
export const MAX_CHAT_CARDS: number;
export type CardActivity = { id: string; kind: ActivityKind; actorKind: 'user' | 'agent'; actorId: string; detail: string; createdAt: string };
export type PlanProgress = { done: number; total: number; active: string | null; steps: { title: string; status: 'pending' | 'active' | 'done' | 'skipped' }[] };
export type AgentProgress = { agentId: string; replies: number; lastAt: string | null; running: boolean; plan: PlanProgress | null };
export type ChatProgress = { running: boolean; agents: AgentProgress[] };
export type ChatCard = {
  id: string; boardId: string; boardName: string; title: string; column: string; columnId: string; done: boolean; archived: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent'; type: 'task' | 'idea' | 'bug' | 'milestone' | 'request'; agents: string[]; comments: number;
  checklist: { done: number; total: number }; createdAt: string; updatedAt: string; activity: CardActivity[];
};
export function chatBoardPath(path: string): { kind: 'chat-cards'; conversation: string } | { kind: 'card-chat'; board: string; card: string } | null;
export function chatCardsPath(id: string): string;
export function cardChatPath(board: string, card: string): string;
export function validChatCard(x: unknown): boolean;
export function chatBoardRoute(path: string): boolean;
export function allowedChatBoard(method: string, path: string, body?: unknown): boolean;
export function chatBoardResponse(path: string, status: number, body: unknown): unknown;
