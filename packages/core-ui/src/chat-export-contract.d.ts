export const MAX_MARKDOWN: number;
export const MAX_FILENAME: number;
export type ChatExport = { filename: string; markdown: string; turns: number; totalTurns: number; truncated: boolean; redacted: number };
export function chatExportPath(id: string, tools?: boolean): string;
export function exportPath(path: string): { id: string; tools: boolean } | null;
export function chatExportRoute(path: string): boolean;
export function allowedChatExport(method: string, path: string, body?: unknown): boolean;
export function safeFilename(x: unknown): string;
export function chatExportResponse(path: string, status: number, body: unknown): unknown;
