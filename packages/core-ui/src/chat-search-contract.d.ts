export const SEARCH_PATH: string;
export const QUERY_MIN: number;
export const QUERY_MAX: number;
export const MAX_LIMIT: number;
export const MAX_RESULTS: number;
export const HITS_PER_CONVERSATION: number;
export const MAX_SNIPPET: number;
export const MAX_RANGES: number;
export type SearchHit = {
  kind: 'title' | 'user' | 'assistant'; messageId: string | null; createdAt: string;
  snippet: string; ranges: Array<[number, number]>;
};
export type SearchResult = {
  conversationId: string; title: string | null; projectId: string | null; updatedAt: string;
  matchCount: number; hits: SearchHit[];
};
export type SearchResponse = { query: string; results: SearchResult[]; truncated: boolean };
export function validQuery(x: unknown): boolean;
export function chatSearchPath(query: string, projectId?: string | null, limit?: number): string;
export function searchPath(path: string): { query: string; projectId: string | null; limit: number | undefined } | null;
export function chatSearchRoute(path: string): boolean;
export function allowedChatSearch(method: string, path: string, body?: unknown): boolean;
export function chatSearchResponse(path: string, status: number, body: unknown): unknown;
