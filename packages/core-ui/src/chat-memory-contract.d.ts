export const MAX_REMEMBER: number;
export const MAX_CHAT_MEMORIES: number;
export type RememberDrawer = 'project' | 'owner' | 'experience';
export const REMEMBER_DRAWERS: readonly RememberDrawer[];
export type RememberType = 'fact' | 'event' | 'context' | 'insight' | 'preference' | 'skill' | 'relationship' | 'task';
export const REMEMBER_TYPES: readonly RememberType[];
export type ChatMemoryStatus = 'saved' | 'removed' | 'pending' | 'rejected' | 'stale' | 'cancelled';
export const CHAT_MEMORY_STATUSES: readonly ChatMemoryStatus[];
export type ChatMemory = {
  id: string; kind: 'remembered' | 'proposed'; messageId: string | null; drawerId: string; text: string;
  memoryId: string | null; proposalId: string | null; status: ChatMemoryStatus; createdAt: string;
};
export function chatMemoryPath(path: string): string | null;
export function chatMemoriesPath(id: string): string;
export function validRemember(x: unknown): boolean;
export function chatMemoryRoute(path: string): boolean;
export function allowedChatMemory(method: string, path: string, body?: unknown): boolean;
export function chatMemoryResponse(path: string, status: number, body: unknown): unknown;
