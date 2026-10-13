/**
 * SECURITY (S0-A.1): the backend now refuses every non-public route without a
 * bearer token. Many browser pages still call the backend with a bare
 * fetch(`${BACKEND_URL}/api/...`). This adds the signed-in user's token to
 * those calls - and only to calls whose origin is exactly the backend origin,
 * so the token never goes anywhere else. A request that already carries an
 * Authorization header is left alone.
 */

export interface BackendAuthOptions {
    /** e.g. "http://localhost:41522" */
    backendOrigin: string;
    token: string | null;
    /** Base for relative URLs (the page origin). */
    pageOrigin?: string;
}

function originOf(value: string, base?: string): string | null {
    try {
        return new URL(value, base).origin;
    } catch {
        return null;
    }
}

function requestUrl(input: unknown): string | null {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.href;
    if (input && typeof (input as Request).url === 'string') return (input as Request).url;
    return null;
}

/**
 * The init to use for this fetch call: unchanged, or a copy with the
 * Authorization header added.
 */
export function withBackendAuth(
    input: unknown,
    init: RequestInit | undefined,
    opts: BackendAuthOptions
): RequestInit | undefined {
    if (!opts.token || !/^[A-Za-z0-9._-]+$/.test(opts.token)) return init;
    const url = requestUrl(input);
    if (!url) return init;
    const backendOrigin = originOf(opts.backendOrigin);
    if (!backendOrigin || originOf(url, opts.pageOrigin) !== backendOrigin) return init;

    const isRequest = typeof Request !== 'undefined' && input instanceof Request;
    const headers = new Headers(init?.headers ?? (isRequest ? (input as Request).headers : undefined));
    if (headers.has('authorization')) return init;
    headers.set('Authorization', `Bearer ${opts.token}`);
    return { ...(init || {}), headers };
}

let installed = false;

/** Wrap window.fetch once (browser only). */
export function installBackendAuthFetch(backendOrigin: string, getToken: () => string | null): void {
    if (installed || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
    installed = true;
    const original = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
        original(input, withBackendAuth(input, init, {
            backendOrigin,
            token: getToken(),
            pageOrigin: window.location.origin,
        }));
}
