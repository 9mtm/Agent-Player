require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('../node_modules/react');
const { renderToStaticMarkup } = require('../node_modules/react-dom/server');
const { allowedConnector, connectorResponse } = require('../src/connectors-contract.js');
const { allowed } = require('../scripts/application-server.cjs');
const { ConnectorsController, parseSecrets, splitArgs } = require('../src/connectors.ts');
const { SessionClient } = require('../src/session.ts');
const { createLoginMock } = require('../src/session-mock.ts');

const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const L = ['http:', '', '127.0.0.1:3333/mcp'].join('/');
test('connector routes: reviewed shapes only; secret values never come back', () => {
  for (const [m, p, b, ok] of [
    ['POST', '/api/mcp/servers', { name: 'cal', transport: 'http', url: L, headers: { Authorization: 'x' } }, true],
    ['POST', '/api/mcp/servers', { name: 'Bad Name', transport: 'http', url: L }, false],
    ['POST', '/api/mcp/servers', { name: 'fs', transport: 'stdio', command: 'npx', args: ['-y', 'pkg'], env: { KEY: 'v' } }, true],
    ['POST', '/api/mcp/servers', { name: 'fs', transport: 'stdio', command: 'npx', cwd: '/' }, false],
    ['POST', `/api/mcp/servers/${ID}/enable`, undefined, true],
    ['POST', `/api/mcp/servers/${ID}/enable`, { launchHash: 'sha256:abcdef1234' }, true],
    ['PUT', `/api/mcp/servers/${ID}/tools/read_file`, { requiresApproval: false }, true],
    ['DELETE', `/api/mcp/servers/${ID}`, undefined, true],
  ]) { assert.equal(allowedConnector(m, p, b), ok, `${m} ${p}`); assert.equal(allowed(m, p, b), ok, `bridge ${m} ${p}`); }
  const view = connectorResponse('/api/mcp/servers', 200, { servers: [{ id: ID, name: 'cal', transport: 'http', url: L, headers: { Authorization: '********' }, enabled: true, tools: [{ name: 'list', requiresApproval: true }] }] });
  assert.deepEqual(view.servers[0].headerNames, ['Authorization']);
  assert.ok(!JSON.stringify(view).includes('*****'), 'masked values are not passed on either');
  assert.deepEqual(connectorResponse('/api/mcp/servers', 200, view), view, 'stable twice');
  const approval = connectorResponse(`/api/mcp/servers/${ID}/enable`, 409, { code: 'launch_approval_required', error: 'x', launch: { command: 'npx', args: ['-y', 'pkg'], envNames: ['KEY'] }, launchHash: 'sha256:abc' });
  assert.equal(approval.launchHash, 'sha256:abc'); assert.deepEqual(approval.launch.args, ['-y', 'pkg']);
  assert.deepEqual(splitArgs('npx -y "my pkg" /tmp'), ['npx', '-y', 'my pkg', '/tmp']);
  assert.deepEqual(parseSecrets('A=1\n\nB = two'), { A: '1', B: 'two' });
  assert.equal(typeof parseSecrets('no equals'), 'string');
});

test('connectors: add, approve a program launch, discover tools, remove', async t => {
  const base = createLoginMock(); const servers = new Map();
  const live = async r => {
    if (!r.path.startsWith('/api/mcp')) return base(r);
    const id = r.path.split('/')[4];
    if (r.path === '/api/mcp/servers' && r.method === 'GET') return { status: 200, body: { servers: [...servers.values()] } };
    if (r.path === '/api/mcp/servers') { const s = { id: ID, name: r.body.name, transport: r.body.transport, command: r.body.command, args: r.body.args ?? [], env: Object.fromEntries(Object.keys(r.body.env ?? {}).map(k => [k, '****'])), enabled: false, tools: [] }; servers.set(ID, s); return { status: 201, body: s }; }
    const s = servers.get(id);
    if (r.path.endsWith('/enable')) { if (!r.body) return { status: 409, body: { code: 'launch_approval_required', launch: { command: s.command, args: s.args, envNames: Object.keys(s.env) }, launchHash: 'sha256:launch1' } }; s.enabled = true; return { status: 200, body: s }; }
    if (r.path.endsWith('/refresh')) { s.tools = [{ name: 'read_file', requiresApproval: false }]; return { status: 200, body: { server: s, discovered: 1, skipped: [] } }; }
    if (r.method === 'DELETE') { servers.delete(id); return { status: 200, body: { deleted: true } }; }
    return { status: 404, body: { code: 'not_found' } };
  };
  const client = new SessionClient({ live }); client.selectMode('live'); await client.login('demo@example.invalid', 'mock-only');
  const c = new ConnectorsController(client);
  await c.load();
  assert.equal(await c.add({ name: 'fs', description: '', kind: 'program', command: 'npx -y pkg /tmp', args: '', url: '', allowRemote: false, secrets: 'KEY=secret' }), null);
  await c.enable(ID);
  assert.deepEqual(c.getSnapshot().approval.launch, { command: 'npx', args: ['-y', 'pkg', '/tmp'], envNames: ['KEY'] });
  await c.approve();
  assert.equal(c.getSnapshot().servers[0].enabled, true);
  assert.equal(c.getSnapshot().servers[0].tools.length, 1, 'tools are read right after turning on');
  assert.match(c.getSnapshot().notice, /Found 1 tools/);
  const { ConnectorsSection } = require('../src/ConnectorsSection.tsx');
  assert.match(renderToStaticMarkup(React.createElement(ConnectorsSection, { client, active: false })), /Connectors/);
  await c.remove(ID);
  assert.equal(c.getSnapshot().servers.length, 0);
});
