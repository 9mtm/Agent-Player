export const CHAT_BYTES: number;
export const FRAME_BYTES: number;
export const REQUEST_BYTES: number;
export const CHAT_DEADLINE_MS: number;
export const CHAT_IDLE_MS: number;
export type ChatBody = { messages: { role: 'user' | 'assistant'; content: string }[]; stream: true; sessionId: string; agentId?: string };
export type ChatIds = { runId: string; messageId: string };
export type ChatFrame = ChatIds & { type?: 'text' | 'done' | 'error' | 'tool_start' | 'tool_result'; content?: string; error?: string; code?: 'model_unavailable'; done?: boolean; replayed?: boolean; incomplete?: boolean; truncated?: boolean; step?: number };
export function record(x: unknown): x is Record<string, unknown>;
export function validKey(x: unknown): x is string;
export function validId(x: unknown): x is string;
export function validChatBody(x: unknown): x is ChatBody;
export function chatError(status: number, body: unknown): ({ code?: string } & Partial<ChatIds>) | null;
export function projectFrame(x: unknown): ChatFrame | undefined;
export class SSEParser {
  constructor(ids?: ChatIds);
  ids?: ChatIds;
  terminal: boolean;
  push(bytes: Uint8Array): ChatFrame[];
  finish(): void;
}
