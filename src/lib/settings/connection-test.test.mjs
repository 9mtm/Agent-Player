// FU-04: fixed notices for the settings connection test, chosen by code.
// Run from the repo root: node --import tsx --test src/lib/settings/connection-test.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { connectionTestNotice, isKeyTestProvider } from './connection-test.ts';

test('codes map to fixed notices with the upstream status', () => {
    assert.match(connectionTestNotice(400, { code: 'invalid_key', status: 401 }), /rejected the API key.*\(HTTP 401\)$/);
    assert.match(connectionTestNotice(400, { code: 'provider_rate_limited', status: 429 }), /rate limiting.*\(HTTP 429\)$/);
    assert.match(connectionTestNotice(400, { code: 'provider_unavailable', status: 503 }), /having problems.*\(HTTP 503\)$/);
    assert.match(connectionTestNotice(400, { code: 'provider_rejected', status: 404 }), /model name.*\(HTTP 404\)$/);
    assert.match(connectionTestNotice(400, { code: 'provider_unreachable' }), /Could not reach/);
    assert.match(connectionTestNotice(400, { code: 'key_not_configured' }), /Save a key/);
    assert.match(connectionTestNotice(500, { error: 'Internal error', code: 'internal_error' }), /server log/);
});

test('server text is never shown', () => {
    const body = { code: 'unknown_code', error: 'sk-secret leaked', message: 'sk-secret' };
    const n = connectionTestNotice(400, body);
    assert.equal(n, 'Connection test failed.');
    assert.ok(!connectionTestNotice(400, { code: 'invalid_key', status: 'sk-secret' }).includes('sk-secret'));
    assert.ok(!connectionTestNotice(400, { code: 'invalid_key', status: 9999 }).includes('9999'));
});

test('falls back by HTTP status without a code', () => {
    assert.match(connectionTestNotice(401, {}), /Sign in/);
    assert.match(connectionTestNotice(403, null), /Only the owner/);
    assert.match(connectionTestNotice(502, 'x'), /server log/);
    assert.equal(connectionTestNotice(400, undefined), 'Connection test failed.');
    assert.match(connectionTestNotice(400, { code: 'toString' }), /^Connection test failed\.$/);
});

test('only key providers use the key test', () => {
    assert.equal(isKeyTestProvider('claude'), true);
    assert.equal(isKeyTestProvider('openai'), true);
    assert.equal(isKeyTestProvider('local'), false);
});
