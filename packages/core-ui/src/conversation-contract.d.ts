export const CONVERSATIONS_PATH: '/api/chat/conversations';
export const PROJECTS_PATH: '/api/chat/projects';
export type WireProject = { id: string; name: string; slug: string; folder: string | null; repoUrl: string | null };
export type WireGit = { branch: string | null; remote: string | null; dirty: boolean | null };
export const MAX_MESSAGE: number;
export const MAX_TITLE: number;
export const RUN_STREAM_MS: number;
export const RUN_IDLE_MS: number;
export const RUN_FRAME_BYTES: number;
export function validRunId(x: unknown): x is string;
export type ConversationPath =
  | { kind: 'list' | 'projects' } | { kind: 'one' | 'messages' | 'runs' | 'project' | 'project-git'; id: string }
  | { kind: 'events'; run: string; after: number } | { kind: 'stop'; run: string };
export function conversationPath(path: string): ConversationPath | null;
export function conversationRoute(path: string): boolean;
export function allowedConversation(method: string, path: string, body?: unknown): boolean;
export function conversationResponse(path: string, status: number, body: unknown): unknown;

export type WireConversation = { id: string; title: string | null; agentId: string | null; projectId: string | null; pinned: boolean; preview: string; createdAt: string; updatedAt: string };
export type WireToolCall = { id: string; name: string; input: string; output?: string; isError?: boolean; ms?: number };
export type WirePart = { kind: 'text'; text: string } | { kind: 'reasoning'; text: string; ms?: number } | { kind: 'tools'; step: number; calls: WireToolCall[] };
export type WireMessage = { id: string; role: 'user' | 'assistant' | 'system'; content: string; parts: WirePart[] | null; status: 'complete' | 'stopped' | 'error'; runId: string | null; durationMs: number | null; createdAt: string };
export type RunEvent = ({ seq: number; at?: number }) & (
  | { type: 'text' | 'reasoning'; content: string }
  | { type: 'tool_start'; step: number; tools: { id: string; name: string; input: string }[] }
  | { type: 'tool_result'; step: number; results: { id: string; name: string; output: string; isError: boolean; ms?: number }[] }
  | { type: 'end'; status: 'complete' | 'stopped' | 'error'; ms: number; code?: 'model_unavailable' });
export function projectRunEvent(x: unknown): RunEvent | undefined;
export class RunEventParser {
  constructor(after?: number);
  last: number;
  ended: boolean;
  push(bytes: Uint8Array): RunEvent[];
  finish(): void;
}
