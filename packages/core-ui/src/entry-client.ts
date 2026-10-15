import { SessionClient, createSameOriginTransport } from './session';

/** Build-selected only. Construction never sends a request. */
export function createEntryClient(enabled: boolean, browser: Pick<Window, 'location' | 'fetch'>): SessionClient | undefined {
  if (enabled === false) return undefined;
  if (enabled !== true || browser.location.origin !== 'http://127.0.0.1:42522') {
    throw new Error('Live candidate requires its fixed application origin');
  }
  return new SessionClient({ live: createSameOriginTransport('http://127.0.0.1:42522', browser.fetch.bind(browser)) });
}
