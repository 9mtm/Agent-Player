require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApplicationServer, stage1Route, allowed, parseLaunchArgs } = require('../scripts/application-server.cjs');
const { HEADERS } = require('../scripts/preview.cjs');
const { fictionalPersonalityProposal } = require('../src/personality-fixture.ts');
const { fixtureProposal, fixtureContext } = require('../src/memory-fixture.ts');
const user = { id: 'fictional-owner', email: 'fiction@example.invalid', username: 'Fiction', role: 'owner' };
const token = 'fictional-token';
const hash = 'a'.repeat(64);
const personality = structuredClone(fictionalPersonalityProposal);
const pp = `/api/agents/${personality.agentId}/personality/proposals`;
const memory = { ...fixtureProposal(fixtureContext), id: 'p1' };
const listen = server => new Promise((resolve, reject) => {
  server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve(server.address().port));
});
const close = server => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
async function setup(t, handler) {
  const hits = [];
  const upstream = http.createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    hits.push({ method: req.method, path: req.url, headers: req.headers });
    res.setHeader('Content-Type', 'application/json');
    if (handler) return handler(req, res);
    const replies = {
      '/api/setup/status': { setupComplete: false, setupRequired: true, message: 'Setup required' },
      '/api/auth/login': { user: { ...user, privateField: 'omit-this' }, token, deviceToken: 'd'.repeat(43) },
      '/api/auth/me': { user }, '/api/auth/logout': { success: true },
      '/api/agents': { agents: [{ id: 'main', name: 'Fiction', version: 1 }] },
      '/api/agents/main': { agent: { id: 'main', name: 'Fiction', version: 1 } },
      '/api/memory/proposals': { proposals: [] }, '/api/memory/proposals?status=pending': { proposals: [] },
      '/api/memory/proposals/p1': memory,
      '/api/memory/files/owner?agentId=main': { drawer: { kind: 'owner' }, drawerId: 'owner', agentId: 'main', revision: 1, hash, count: 0, content: '', path: 'omit-this' },
      [pp]: { agentId: personality.agentId, proposals: [personality] },
      [`${pp}/${personality.id}`]: personality,
    };
    res.end(JSON.stringify(replies[req.url] || {}));
  });
  t.after(() => close(upstream));
  const upstreamPort = await listen(upstream);
  const app = createApplicationServer({ channel: 'candidate', upstreamPort, stage1ReadOnly: true });
  t.after(() => close(app));
  const port = await listen(app), origin = `http://127.0.0.1:${port}`;
  const request = (path, { method = 'GET', body, headers = {} } = {}) => new Promise((resolve, reject) => {
    const bytes = body === undefined ? undefined : JSON.stringify(body);
    const merged = { Origin: origin, Accept: 'application/json', Authorization: `Bearer ${token}`, ...(bytes ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bytes) } : {}), ...headers };
    for (const key of Object.keys(merged)) if (merged[key] === undefined) delete merged[key];
    const req = http.request({ hostname: '127.0.0.1', port, method, path, headers: merged, agent: false }, res => {
      const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject); req.end(bytes);
  });
  return { hits, request, upstreamPort, origin };
}
test('stage1 forwards only bounded reads and login/logout; retains projection and security headers', async t => {
  const s = await setup(t);
  const reads = ['/api/setup/status', '/api/auth/me', '/api/agents', '/api/agents/main', '/api/memory/proposals', '/api/memory/proposals?status=pending', '/api/memory/proposals/p1', '/api/memory/files/owner?agentId=main', pp, `${pp}/${personality.id}`];
  for (const path of reads) {
    const response = await s.request(path, { headers: path === '/api/setup/status' ? { Authorization: undefined } : {} });
    assert.equal(response.status, 200, path); assert.ok(!response.text.includes('omit-this'));
    for (const [key, value] of Object.entries(HEADERS)) assert.equal(response.headers[key.toLowerCase()], value);
  }
  const login = await s.request('/api/auth/login', { method: 'POST', body: { email: 'fiction@example.invalid', password: 'synthetic-only' }, headers: { Authorization: undefined, Cookie: 'fiction-only=discard' } });
  assert.equal(login.status, 200); assert.ok(!login.text.includes('omit-this')); assert.equal(JSON.parse(login.text).token, token);
  assert.equal((await s.request('/api/auth/logout', { method: 'POST' })).status, 200);
  assert.equal(s.hits.length, reads.length + 2);
  for (const hit of s.hits) {
    assert.equal(hit.headers.host, `127.0.0.1:${s.upstreamPort}`); assert.equal(hit.headers.origin, s.origin);
    assert.equal(hit.headers.cookie, undefined); assert.equal(hit.headers.accept, 'application/json');
  }
});
test('stage1 denied mutations, chat, reserved names and arbitrary reads have zero upstream hits', async t => {
  const s = await setup(t);
  const denied = [
    ['POST', '/api/chat', { agentId: 'main', sessionId: 'fictional-session', stream: true, messages: [{ role: 'user', content: 'fictional' }] }],
    ['POST', '/api/agents/name-suggestion', { language: 'en', exclude: [] }],
    ['PUT', '/api/agents/main', { name: 'Fiction', expectedVersion: 1 }],
    ...['approve', 'reject'].flatMap(action => [
      ['POST', `/api/memory/proposals/p1/${action}`, { expectedReviewHash: hash }],
      ['POST', `${pp}/${personality.id}/${action}`, { expectedReviewHash: personality.reviewHash }],
    ]),
    ...['versions', 'lock', 'unlock', 'rollback', 'proposals'].map(action => ['POST', `/api/agents/main/personality/${action}`, {}]),
    ['DELETE', '/api/agents/main'], ['PATCH', '/api/agents/main', {}],
    ['POST', '/api/setup/admin', {}], ['POST', '/api/setup/complete'],
    ...['/api/agents/status', '/api/agents/STATUS', '/api/agents/name-suggestion', '/api/skills/marketplace/available', '/api/avatars?userId=fiction', '/api/avatar', '/api/setup/check', '/api/ai-tools/ollama/models', '/api/agents/main/tool-grants', '/api/agents/main/files', '/api/agents/main/personality/current', '/api/agents/main/personality/versions', '/api/agents/main/memory', '/api/agents/status/personality/proposals', '/api/agents/name-suggestion/personality/proposals'].flatMap(path => [['GET', path], ['HEAD', path], ['OPTIONS', path]]),
    ...['/api/agents/%73tatus', '/api/agents/st%61tus', '/api/agents/%2573tatus', '/api/agents/status/', '/api/agents/status?x=1', '/api/agents/STATUS', '/api/agents/status%2f', '/api/agents/status%5c', '/api/agents/main/../status', '/api/%63hat', '/api/chat/', '/api/chat?x=1', '/api/agents/%6eame-suggestion', '/api/memory/proposals/p1/%61pprove', `${pp}/${personality.id}/%72eject`, '/api/auth/%6cogin', '/api/auth/login?x=1', '/api/auth/logout/'].map(path => ['POST', path, {}]),
    ...['/api/agents/%73tatus', '/api/agents/st%61tus', '/api/agents/%2573tatus', '/api/agents/status/', '/api/agents/status?x=1', '/api/agents/status%2f', '/api/agents/main/../status'].map(path => ['GET', path]),
  ];
  for (const [method, path, body] of denied) {
    if (['/api/chat', '/api/agents/name-suggestion', '/api/agents/main'].includes(path) && ['POST', 'PUT'].includes(method)) assert.equal(allowed(method, path, body), true);
    const response = await s.request(path, { method, body, headers: path === '/api/chat' ? { 'Idempotency-Key': 'fictional-stage1-key' } : {} });
    assert.equal(response.status, 403, `${method} ${path}`);
    assert.equal(response.text, method === 'HEAD' ? '' : '{"code":"stage1_read_only"}');
    assert.equal(response.headers['retry-after'], undefined);
    assert.equal(s.hits.length, 0, `${method} ${path}`);
  }
});
test('stage1 retains Host, Origin, auth, header, body and canonical parameter checks', async t => {
  const s = await setup(t);
  const vectors = [
    ['/api/auth/me', { headers: { Host: 'wrong.invalid' } }, 421],
    ['/api/auth/me', { headers: { Origin: 'http://wrong.invalid' } }, 403],
    ['/api/auth/me', { headers: { 'Sec-Fetch-Site': 'cross-site' } }, 403],
    ['/api/auth/me', { headers: { Authorization: undefined } }, 401],
    ['/api/auth/me', { headers: { 'X-HTTP-Method-Override': 'POST' } }, 400],
    ['/api/auth/me', { body: {} }, 400],
    ['/api/setup/status', {}, 401],
    ['/api/auth/login', { method: 'POST', body: { email: 'a', password: 'b' }, headers: { Authorization: undefined, Origin: undefined } }, 403],
    ['/api/auth/login', { method: 'POST', body: { email: 'a', password: 'b', extra: true }, headers: { Authorization: undefined } }, 400],
    ['/api/auth/logout', { method: 'POST', body: {} }, 400],
    ['/api/memory/files/%6fwner?agentId=main', {}, 403],
    ['/api/memory/files/owner?agentId=main&extra=1', {}, 403],
    ['/api/memory/files/owner?agentId=..', {}, 403],
    ['/api/auth/me?extra=1', {}, 403],
    ['/api/agents/%6dain', {}, 403],
    ['/%61pi/agents/status', {}, 400],
  ];
  for (const [path, options, status] of vectors) {
    assert.equal((await s.request(path, options)).status, status, path); assert.equal(s.hits.length, 0);
  }
});
test('stage1 upstream errors are sanitized and attempted once', async t => {
  const s = await setup(t, (_req, res) => { res.statusCode = 403; res.end(JSON.stringify({ code: 'forbidden', secret: 'omit-this' })); });
  const response = await s.request('/api/auth/me');
  assert.equal(response.status, 403); assert.equal(response.text, '{"code":"forbidden"}'); assert.equal(s.hits.length, 1);
});
test('stage1 backend read-only boundary precedes every domain projection and makes one call', async t => {
  let status = 403, code = 'read_only_stage';
  const s = await setup(t, (_req, res) => {
    res.statusCode = status;
    res.end(JSON.stringify({ code, secret: 'omit-this', message: 'omit-this', path: 'omit-this',
      agent: { secret: 'omit-this' }, proposals: [{ secret: 'omit-this' }], nested: { code: 'omit-this' } }));
  });
  const paths = ['/api/agents', '/api/agents/main', '/api/memory/proposals',
    '/api/memory/proposals?status=pending', '/api/memory/proposals/p1',
    '/api/memory/files/owner?agentId=main', pp, `${pp}/${personality.id}`];
  const vectors = [
    [403, 'read_only_stage', '{"code":"read_only_stage"}'],
    [403, 'arbitrary_upstream_code', 'null'],
    [403, 'read_only_stage_suffix', 'null'],
    [403, ['read_only_stage'], 'null'],
    [403, { code: 'read_only_stage' }, 'null'],
    [401, 'read_only_stage', 'null'],
    [409, 'read_only_stage', 'null'],
    [500, 'read_only_stage', 'null'],
    [403, 'forbidden', '{"code":"forbidden"}'],
    [401, 'unauthenticated', '{"code":"unauthenticated"}'],
  ];
  for (const path of paths) {
    for (const [upstreamStatus, upstreamCode, expected] of vectors) {
      status = upstreamStatus; code = upstreamCode;
      const before = s.hits.length;
      const response = await s.request(path);
      assert.equal(response.status, status, path);
      assert.equal(response.text, expected, `${path}: ${status} ${JSON.stringify(code)}`);
      assert.equal(response.headers['retry-after'], undefined);
      assert.equal(s.hits.length, before + 1, path);
      assert.equal(s.hits[before].path, path);
      assert.equal(s.hits[before].method, 'GET');
    }
  }
});
test('stage1 option is strictly boolean and default ordinary mutation policy is preserved', () => {
  for (const stage1ReadOnly of ['false', 'true', null, 0, 1, {}]) assert.throws(() => createApplicationServer({ channel: 'candidate', stage1ReadOnly }), /stage1/);
  assert.equal(allowed('PUT', '/api/agents/main', { name: 'Fiction', expectedVersion: 1 }), true);
  assert.equal(stage1Route('PUT', '/api/agents/main'), false);
  assert.equal(stage1Route('GET', '/api/memory/files/project%3Afiction?agentId=main'), true);
});

test('CLI requires explicit exact stage1 flag; invalid options never fall back to ordinary mode', () => {
  for (const channel of ['candidate', 'current']) {
    const base = ['--enable-isolated-api', `--${channel}`];
    assert.deepEqual(parseLaunchArgs(base), { channel, stage1ReadOnly: false });
    assert.deepEqual(parseLaunchArgs([...base, '--stage1-read-only']), { channel, stage1ReadOnly: true });
    for (const extra of ['--stage1', '--stage1-read-only=false', '--stage1-read-only=true', '--upstream=42521', '']) assert.equal(parseLaunchArgs([...base, extra]), null);
    assert.equal(parseLaunchArgs([...base, '--stage1-read-only', '--stage1-read-only']), null);
  }
  for (const args of [[], ['--stage1-read-only'], ['--enable-isolated-api', '--stage1-read-only'], ['--candidate', '--enable-isolated-api', '--stage1-read-only']]) assert.equal(parseLaunchArgs(args), null);
});
