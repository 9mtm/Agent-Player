/**
 * Fixed notices for POST /api/settings/test results (FU-04).
 * Pure: no fetch, no React.
 *
 * The backend never forwards the provider's response text; it answers a
 * code (and the upstream status number). The page shows the notice for the
 * code and never prints server-supplied text.
 */

export type ConnectionTestCode =
    | 'invalid_key'
    | 'provider_rate_limited'
    | 'provider_unavailable'
    | 'provider_rejected'
    | 'provider_unreachable'
    | 'key_not_configured'
    | 'invalid_provider'
    | 'internal_error';

const NOTICES: Record<ConnectionTestCode, string> = {
    invalid_key: 'The provider rejected the API key. Check the key and try again.',
    provider_rate_limited: 'The provider is rate limiting requests. Wait a moment and try again.',
    provider_unavailable: 'The provider is having problems right now. Try again later.',
    provider_rejected: 'The provider rejected the test request. Check the key and the model name.',
    provider_unreachable: 'Could not reach the provider. Check the network connection.',
    key_not_configured: 'No API key is saved for this provider. Save a key first.',
    invalid_provider: 'This provider cannot be tested here.',
    internal_error: 'The connection test failed on the server. Check the server log and try again.',
};

const FORBIDDEN = 'Only the owner can run the connection test.';
const SIGNED_OUT = 'Sign in again to run the connection test.';
const FALLBACK = 'Connection test failed.';

function codeOf(body: unknown): string | undefined {
    if (!body || typeof body !== 'object') return undefined;
    const c = (body as { code?: unknown }).code;
    return typeof c === 'string' ? c : undefined;
}

function upstreamStatusOf(body: unknown): number | undefined {
    if (!body || typeof body !== 'object') return undefined;
    const s = (body as { status?: unknown }).status;
    return typeof s === 'number' && Number.isInteger(s) && s >= 100 && s <= 599 ? s : undefined;
}

/** Notice for a failed test: by code first, then by HTTP status. */
export function connectionTestNotice(httpStatus: number, body: unknown): string {
    const code = codeOf(body);
    if (code && Object.prototype.hasOwnProperty.call(NOTICES, code)) {
        const text = NOTICES[code as ConnectionTestCode];
        const upstream = upstreamStatusOf(body);
        return upstream !== undefined && code !== 'internal_error' ? `${text} (HTTP ${upstream})` : text;
    }
    if (httpStatus === 401) return SIGNED_OUT;
    if (httpStatus === 403) return FORBIDDEN;
    if (httpStatus >= 500) return NOTICES.internal_error;
    return FALLBACK;
}

/** Providers that POST /api/settings/test can check with a stored key. */
export function isKeyTestProvider(provider: string): provider is 'claude' | 'openai' {
    return provider === 'claude' || provider === 'openai';
}
