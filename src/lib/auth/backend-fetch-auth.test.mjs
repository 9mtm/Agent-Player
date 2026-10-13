// S0-A.1: browser fetches to the backend origin carry the bearer token;
// nothing else does.
// Run from the repo root: node --import tsx --test src/lib/auth/backend-fetch-auth.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { withBackendAuth } from './backend-fetch-auth.ts';

const opts = { backendOrigin: 'http://localhost:41522', token: 'aaa.bbb.ccc', pageOrigin: 'http://localhost:41521' };
const auth = (init) => new Headers(init?.headers).get('authorization');

test('backend-origin calls get the token', () => {
  assert.equal(auth(withBackendAuth('http://localhost:41522/api/agents', undefined, opts)), 'Bearer aaa.bbb.ccc');
  const init = withBackendAuth(new URL('http://localhost:41522/api/x'), { method: 'POST', headers: { 'Content-Type': 'application/json' } }, opts);
  assert.equal(auth(init), 'Bearer aaa.bbb.ccc');
  assert.equal(new Headers(init.headers).get('content-type'), 'application/json');
  assert.equal(init.method, 'POST');
});

test('other origins, relative Next routes and look-alike hosts get nothing', () => {
  for (const url of ['/api/chat', 'https://example.com/api', 'http://localhost:41522.evil.test/api', 'http://localhost:4152/api', 'https://localhost:41522/api']) {
    const init = { headers: { a: 'b' } };
    assert.equal(withBackendAuth(url, init, opts), init, url);
  }
});

test('an existing Authorization header is kept; no token or odd token means no change', () => {
  const init = { headers: { Authorization: 'Bearer other' } };
  assert.equal(withBackendAuth('http://localhost:41522/api', init, opts), init);
  assert.equal(withBackendAuth('http://localhost:41522/api', undefined, { ...opts, token: null }), undefined);
  assert.equal(withBackendAuth('http://localhost:41522/api', undefined, { ...opts, token: 'a b\r\nX: y' }), undefined);
});

test('Request objects keep their headers', () => {
  const req = new Request('http://localhost:41522/api/x', { headers: { 'X-Test': '1' } });
  const init = withBackendAuth(req, undefined, opts);
  assert.equal(auth(init), 'Bearer aaa.bbb.ccc');
  assert.equal(new Headers(init.headers).get('x-test'), '1');
});
