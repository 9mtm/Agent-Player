/**
 * Toast text for a failed setup step (FU-04). Pure: no fetch, no React.
 *
 * Since H-ERR-01 every 5xx answers { error: 'Internal error', code:
 * 'internal_error' } with no `message`, so the page maps that to a fixed
 * text. 4xx bodies keep their own short `message` (or `error`), which the
 * setup routes write as fixed strings.
 */

export const SETUP_INTERNAL_ERROR_TEXT =
    'Setup step failed on the server. Check the server log, run `agent-player doctor`, and try again.';

function stringField(body: unknown, key: 'message' | 'error' | 'code'): string | undefined {
    if (!body || typeof body !== 'object') return undefined;
    const v = (body as Record<string, unknown>)[key];
    return typeof v === 'string' && v.trim() ? v : undefined;
}

/** Text for a non-2xx setup reply: fixed text for 5xx / internal_error, else the 4xx message. */
export function setupErrorMessage(httpStatus: number, body: unknown, fallback: string): string {
    if (stringField(body, 'code') === 'internal_error' || httpStatus >= 500) return SETUP_INTERNAL_ERROR_TEXT;
    return stringField(body, 'message') ?? stringField(body, 'error') ?? fallback;
}

/** Read a reply body as JSON, or null when it is not JSON. */
export async function readJsonBody(response: { json(): Promise<unknown> }): Promise<unknown> {
    try {
        return await response.json();
    } catch {
        return null;
    }
}
