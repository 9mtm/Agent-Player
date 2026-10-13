// S0-Q.1: Host header allow-list (DNS rebinding protection) and loopback default bind.
// Run: node --import tsx --test test/host-check.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { parseHostHeader, getAllowedHosts, isAllowedHost, registerHostCheck } from '../src/middleware/host-check.ts';

test('parseHostHeader handles names, ports and IPv6', () => {
  assert.equal(parseHostHeader('LocalHost:41522'), 'localhost');
  assert.equal(parseHostHeader('127.0.0.1'), '127.0.0.1');
  assert.equal(parseHostHeader('[::1]:41522'), '::1');
  assert.equal(parseHostHeader('example.com.'), 'example.com');
  assert.equal(parseHostHeader(''), null);
  assert.equal(parseHostHeader(undefined), null);
  assert.equal(parseHostHeader('evil.com@localhost'), null);
  assert.equal(parseHostHeader('[::1]junk'), null);
  assert.equal(parseHostHeader('localhost:abc'), null);
});

test('allow-list: loopback always, extras from ALLOWED_HOSTS and a specific HOST', () => {
  const defaults = getAllowedHosts('', undefined);
  assert.ok(isAllowedHost('localhost:41521', defaults));
  assert.ok(isAllowedHost('127.0.0.1:41522', defaults));
  assert.ok(isAllowedHost('[::1]:41522', defaults));
  assert.ok(isAllowedHost('app.localhost', defaults));
  assert.ok(!isAllowedHost('attacker.example:41522', defaults));
  assert.ok(!isAllowedHost('192.168.1.10:41522', defaults));
  assert.ok(!isAllowedHost(undefined, defaults));

  const extra = getAllowedHosts('agent.lan, Example.com:443', '100.64.0.5');
  assert.ok(isAllowedHost('agent.lan', extra));
  assert.ok(isAllowedHost('example.com', extra));
  assert.ok(isAllowedHost('100.64.0.5:41522', extra));
  assert.ok(!getAllowedHosts('', '0.0.0.0').has('0.0.0.0'));
});

test('onRequest hook rejects a rebinding Host with 421 and passes loopback', async () => {
  const app = Fastify();
  registerHostCheck(app, getAllowedHosts('', undefined));
  app.get('/ping', async () => ({ ok: true }));
  await app.ready();

  const good = await app.inject({ method: 'GET', url: '/ping', headers: { host: 'localhost:41522' } });
  assert.equal(good.statusCode, 200);
  const bad = await app.inject({ method: 'GET', url: '/ping', headers: { host: 'rebind.attacker.example' } });
  assert.equal(bad.statusCode, 421);
  await app.close();
});

test('config binds to loopback by default', async () => {
  const saved = process.env.HOST;
  delete process.env.HOST;
  try {
    const { config } = await import(`../src/config/index.ts?default-host`);
    assert.equal(config.host, '127.0.0.1');
  } finally {
    if (saved !== undefined) process.env.HOST = saved;
  }
});
