import { createPersonalityMock } from './personality-mock';
import { personalityRoute } from './personality-contract.js';
import { createChatMock } from './chat-mock';
import { createAgentsMock } from './agents-mock';
import { createBoardMock } from './board-mock';
import { allowedRequest } from './session';
import { createMemoryMock } from './memory-mock';
import type { WireTransport } from './session';

/** Explicit offline exercise only. Never wrap this around a failed live transport. */
export function createLoginMock(agents = createAgentsMock(), setup: 'existing-owner' | 'first-run' | 'error' = 'existing-owner'): WireTransport {
  const memory = createMemoryMock();
  const personality = createPersonalityMock();
  const board = createBoardMock();
  const chat = createChatMock();
  let serial = 0;
  let active = '';
  const user = { id: 'mock-owner', email: 'demo@example.invalid', username: 'Offline demo', role: 'owner' };
  return async request => {
    if (!allowedRequest(request.method, request.path, request.body) || Object.keys(request.headers).some(k => k !== 'Authorization' && !(request.path === '/api/chat' && k === 'Idempotency-Key'))) return { status: 400, body: null };
    if (request.signal.aborted) throw new Error('cancelled');
    if (request.path === '/api/setup/status') {
      if (Object.keys(request.headers).length) return { status: 400, body: null };
      if (setup === 'error') return { status: 503, body: null };
      const complete = setup === 'existing-owner';
      return { status: 200, body: { setupComplete: complete, setupRequired: !complete, message: complete ? 'Setup already completed' : 'Setup required' } };
    }
    if (request.path === '/api/auth/login' && request.method === 'POST') {
      if (setup !== 'existing-owner') return { status: 401, body: null };
      const body = request.body as { email?: string; password?: string };
      if (body.email !== user.email || body.password !== 'mock-only') return { status: 401, body: null };
      active = `fictional-session-${++serial}`;
      return { status: 200, body: { user, token: active, deviceToken: `fictional-device-${serial}`.padEnd(43, '_') } };
    }
    if (!active || request.headers.Authorization !== `Bearer ${active}`) return { status: 401, body: null };
    if (request.path === '/api/chat') return chat(request);
    if (request.path === '/api/auth/me') return { status: 200, body: { user } };
    if (request.path === '/api/auth/logout') { active = ''; return { status: 200, body: { success: true } }; }
    if (personalityRoute(request.path)) return personality.transport(request);
    if (request.path === '/api/boards' || request.path.startsWith('/api/boards/')) return board(request);
    if (request.path === '/api/agents' || request.path.startsWith('/api/agents/') || request.path.startsWith('/api/onboarding/team-')) return agents.transport(request);
    if (request.path.startsWith('/api/memory/')) return memory.transport(request);
    // A permission failure exercises protected-content clearing without simulating sign-out.
    return { status: 403, body: null };
  };
}
