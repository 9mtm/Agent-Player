export type TerminalFrame = { type: 'output'; seq: number; data: string } | { type: 'exit'; exitCode: number };
export type TerminalRoute = { kind: 'info' | 'create' } | { kind: 'close' | 'input' | 'resize'; id: string } | { kind: 'stream'; id: string; after: number };
export const TERMINAL_INPUT_CHARS: number;
export const TERMINAL_STREAM_MS: number;
export function terminalPath(path: string): TerminalRoute | null;
export function terminalRoute(path: string): boolean;
export function allowedTerminal(method: string, path: string, body?: unknown): boolean;
export function terminalResponse(path: string, status: number, body: unknown): unknown;
export class TerminalEventParser {
  constructor(after?: number);
  last: number;
  ended: boolean;
  push(bytes: Uint8Array): TerminalFrame[];
  finish(): TerminalFrame[];
}
