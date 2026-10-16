// CHAT-PRO-02 F: export a conversation as Markdown. The backend writes the
// Markdown (own conversation only, secrets removed); the page saves it as a
// file through a Blob link, so no file is ever made on the server.
import { chatExportPath } from './chat-export-contract.js';
import type { ChatExport } from './chat-export-contract.js';
import type { SessionClient } from './session';

export type ExportResult = { ok: true; file: ChatExport } | { ok: false; message: string };

const record = (x: unknown): x is Record<string, any> => !!x && typeof x === 'object' && !Array.isArray(x);

/** Reads the Markdown of one conversation (tool calls only when asked for). */
export async function fetchExport(client: SessionClient, conversationId: string, tools: boolean): Promise<ExportResult> {
  try {
    const r = await client.request({ method: 'GET', path: chatExportPath(conversationId, tools) } as never);
    if (r.status === 200 && record(r.body) && typeof r.body.markdown === 'string') return { ok: true, file: r.body as ChatExport };
    if (r.status === 404) return { ok: false, message: 'This conversation no longer exists.' };
    return { ok: false, message: 'The export could not be made. Try again.' };
  } catch {
    return { ok: false, message: 'The export could not be made (no connection).' };
  }
}

/** Saves text as a .md file in the browser (Blob + a temporary link). */
export function saveMarkdown(filename: string, markdown: string, doc: Document = document, url: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'> = URL): void {
  const href = url.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
  const a = doc.createElement('a');
  a.href = href;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  doc.body.appendChild(a);
  try { a.click(); } finally {
    a.remove();
    setTimeout(() => url.revokeObjectURL(href), 0);
  }
}

/** A short line after a download: what was saved and what was left out. */
export function exportNote(file: ChatExport): string {
  const parts = [`Saved ${file.filename}`];
  if (file.truncated) parts.push(`only the first ${file.turns} of ${file.totalTurns} messages fit`);
  if (file.redacted) parts.push(`${file.redacted} secret value${file.redacted === 1 ? ' was' : 's were'} left out`);
  return `${parts.join(' · ')}.`;
}

/** Fetches and saves in one step. */
export async function exportConversation(client: SessionClient, conversationId: string, tools: boolean, save: typeof saveMarkdown = saveMarkdown): Promise<ExportResult> {
  const r = await fetchExport(client, conversationId, tools);
  if (r.ok) save(r.file.filename, r.file.markdown);
  return r;
}
