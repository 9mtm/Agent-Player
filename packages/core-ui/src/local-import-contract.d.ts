export type LocalSession = { id: string; source: 'claude-code' | 'codex'; cwd: string | null; title: string; startedAt: string | null; updatedAt: string; bytes: number; turns: number; imported: { importedAt: string; proposed: number } | null };
export type ImportJob = { id: string; total: number; done: number; proposed: number; errors: number; status: 'running' | 'done' | 'error'; notice: string | null };
export const LOCAL_IMPORT_PATH: '/api/memory/import/local';
export const MAX_IMPORT_SESSIONS: number;
export function localImportPath(path: string): { kind: 'local' } | { kind: 'job'; id: string } | null;
export function localImportRoute(path: string): boolean;
export function allowedLocalImport(method: string, path: string, body?: unknown): boolean;
export function localImportResponse(path: string, status: number, body: unknown): unknown;
