// S0-Q.9: Next.js API routes accept only a backend-verified JWT.
// Run from the repo root: node --import tsx --test src/lib/auth/verify-session.test.mjs
// No network: fetch is passed in as a stub.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pickSessionToken, verifyBackendToken, internalBackendUrl } from './verify-session.ts';

const TOKEN = 'aaa.bbb.ccc';

function stubBackend(users) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), auth: init?.headers?.Authorization });
    const token = (init?.headers?.Authorization || '').replace(/^Bearer /, '');
    const user = users[token];
    return user
      ? new Response(JSON.stringify({ user }), { status: 200, headers: { 'content-type': 'application/json' } })
      : new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  };
  return { fetchImpl, calls };
}

test('token choice: bearer header first; cookie only same-origin; no forged session cookie path', () => {
  assert.equal(pickSessionToken({ authorization: `Bearer ${TOKEN}` }), TOKEN);
  assert.equal(pickSessionToken({ authorization: 'Basic xyz', cookieToken: TOKEN }), null);
  assert.equal(pickSessionToken({ cookieToken: TOKEN, secFetchSite: 'same-origin' }), TOKEN);
  assert.equal(pickSessionToken({ cookieToken: TOKEN }), TOKEN); // non-browser client
  assert.equal(pickSessionToken({ cookieToken: TOKEN, secFetchSite: 'cross-site' }), null);
  assert.equal(pickSessionToken({ cookieToken: TOKEN, secFetchSite: 'same-site' }), null);
  assert.equal(pickSessionToken({}), null);
});

test('verification is done by the backend /api/auth/me on loopback', async () => {
  const { fetchImpl, calls } = stubBackend({ [TOKEN]: { id: 'u1', email: 'o@example.test', role: 'owner', status: 'active', username: 'o' } });
  const user = await verifyBackendToken(TOKEN, { fetchImpl, backendUrl: internalBackendUrl({}) });
  assert.deepEqual(user, { userId: 'u1', email: 'o@example.test', role: 'owner', name: 'o' });
  assert.equal(calls[0].url, 'http://127.0.0.1:41522/api/auth/me');
  assert.equal(calls[0].auth, `Bearer ${TOKEN}`);
  assert.equal(internalBackendUrl({ NEXT_PUBLIC_BACKEND_URL: 'http://localhost:5000' }), 'http://127.0.0.1:5000');
});

test('no token, rejected token, inactive user or a backend error -> null (no dev auto-login)', async () => {
  const { fetchImpl, calls } = stubBackend({ 'off.user.tok': { id: 'u2', role: 'owner', status: 'inactive' } });
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try {
    assert.equal(await verifyBackendToken(null, { fetchImpl }), null);
    assert.equal(calls.length, 0, 'no backend call without a token');
    assert.equal(await verifyBackendToken('unknown.tok.en', { fetchImpl }), null);
    assert.equal(await verifyBackendToken('off.user.tok', { fetchImpl }), null);
    // An old-style unsigned JSON "session" value is not a token at all.
    assert.equal(await verifyBackendToken(JSON.stringify({ userId: 'x', role: 'admin' }), { fetchImpl }), null);
    const failing = async () => { throw new Error('backend down'); };
    assert.equal(await verifyBackendToken(TOKEN, { fetchImpl: failing }), null);
  } finally { process.env.NODE_ENV = prev; }
});
