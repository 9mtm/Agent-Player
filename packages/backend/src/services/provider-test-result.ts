/**
 * Client-safe result of a model-provider connection test (FU-04).
 *
 * The upstream response body is controlled by the provider and can echo the
 * key, the account or the organisation, so it is never read into a reply or
 * a log. The reply names only a fixed code and the upstream HTTP status.
 */

export type ProviderTestCode =
  | 'invalid_key'
  | 'provider_rate_limited'
  | 'provider_unavailable'
  | 'provider_rejected'
  | 'provider_unreachable';

export interface ProviderTestFailure {
  success: false;
  error: 'Connection test failed';
  code: ProviderTestCode;
  status?: number;
}

/** Fixed code for an upstream HTTP status (non-2xx). */
export function providerStatusCode(status: number): ProviderTestCode {
  if (status === 401 || status === 403) return 'invalid_key';
  if (status === 429) return 'provider_rate_limited';
  if (status >= 500 && status <= 599) return 'provider_unavailable';
  return 'provider_rejected';
}

/** Reply body for an upstream non-2xx answer: fixed text, code and status number only. */
export function providerRejectedBody(status: number): ProviderTestFailure {
  const s = Number.isInteger(status) && status >= 100 && status <= 599 ? status : undefined;
  return {
    success: false,
    error: 'Connection test failed',
    code: s === undefined ? 'provider_rejected' : providerStatusCode(s),
    ...(s === undefined ? {} : { status: s }),
  };
}

/** Reply body when the provider could not be reached (DNS, TLS, refused, timeout). */
export function providerUnreachableBody(): ProviderTestFailure {
  return { success: false, error: 'Connection test failed', code: 'provider_unreachable' };
}
