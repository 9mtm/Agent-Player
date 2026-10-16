import { SessionClient, createSameOriginTransport, isAppOrigin } from './session';

/** Build-selected only. Construction never sends a request. The page talks
 * only to its own loopback origin (127.0.0.1:42522 from the CLI, a random
 * 127.0.0.1 port inside the desktop app). */
export function createEntryClient(enabled: boolean, browser: Pick<Window, 'location' | 'fetch'>): SessionClient | undefined {
  if (enabled === false) return undefined;
  const origin = browser.location.origin;
  if (enabled !== true || !isAppOrigin(origin)) {
    throw new Error('Live candidate requires its loopback application origin');
  }
  return new SessionClient({ live: createSameOriginTransport(origin, browser.fetch.bind(browser)) });
}
