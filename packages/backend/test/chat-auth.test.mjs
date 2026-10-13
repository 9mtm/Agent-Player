// S0-Q.9: POST /api/chat needs a verified bearer token (or a server-created
// channel turn); the user comes from the token, never from the request body.
// middleware/permissions.ts no longer grants `owner` in development.
// Run: node --import tsx --test test/chat-auth.test.mjs
// No model server is contacted: global fetch is stubbed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-chat-auth-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.NODE_ENV = 'development'; // the old mock granted owner in this mode
delete process.env.AGENT_EXEC_TOOLS;
for (const key of Object.keys(process.env)) if (key.startsWith('CHANNEL_AGENT_TOOLS_')) delete process.env[key];

// ---- fetch stub: the "model" calls the probe tool once, then answers -------
let modelCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const target = String(url);
  if (!target.startsWith('https://api.anthropic.com/')) throw new Error(`unexpected network call in test: ${target}`);
  modelCalls++;
  const body = JSON.parse(init.body);
  const last = body.messages[body.messages.length - 1];
  const isToolResult = Array.isArray(last.content) && last.content.some(b => b.type === 'tool_result');
  const offersProbe = (body.tools || []).some(t => t.name === 'whoami_probe');
  const content = !isToolResult && offersProbe
    ? [{ type: 'tool_use', id: 'p1', name: 'whoami_probe', input: {} }]
    : [{ type: 'text', text: 'stub reply' }];
  return new Response(JSON.stringify({ content, stop_reason: content[0].type === 'tool_use' ? 'tool_use' : 'end_turn' }),
    { status: 200, headers: { 'content-type': 'application/json' } });
};

const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
const db = getDatabase();
await db.initialize();
const addUser = (id, role, status = 'active') =>
  db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES (?, ?, ?, 'x', ?, ?)`)
    .run(id, `${id}@example.test`, id, role, status);
addUser('u-owner', 'owner');
addUser('u-member', 'user');
addUser('u-off', 'owner', 'inactive');
db.prepare(`UPDATE agents_config SET provider = 'claude', api_key = ? WHERE is_primary = 1`).run('test-key-' + randomBytes(4).toString('hex'));

const { default: Fastify } = await import('fastify');
const { chatRoutes } = await import('../src/api/routes/chat.ts');
const { createExtensionApi } = await import('../src/plugins/sdk.ts');
const { generateToken } = await import('../src/auth/jwt.ts');
const tools = await import('../src/tools/index.ts');
const policy = await import('../src/tools/channel-policy.ts');
const permissions = await import('../src/middleware/permissions.ts');

// Probe tool: records which user the tool registry runs as.
const seenUsers = [];
tools.registerExtensionTool({
  name: 'whoami_probe', description: 'probe', extensionId: 'probe',
  input_schema: { type: 'object', properties: {} },
  async execute(_params, context) { seenUsers.push(context?.userId); return { content: [{ type: 'text', text: 'ok' }] }; },
});

const app = Fastify();
await app.register(chatRoutes);
// Small app for the permissions middleware.
app.get('/perm/dashboard', { preHandler: permissions.requirePermission('view_dashboard') }, async () => ({ ok: true }));
app.get('/perm/db', { preHandler: permissions.requirePermission('manage_database') }, async () => ({ ok: true }));
await app.ready();
const telegramApi = createExtensionApi('telegram', app, db, null, join(dir, 'extensions', 'telegram'));

test.after(async () => {
  globalThis.fetch = realFetch;
  await app.close();
  closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});

const bearer = (id, version = 1) => ({ authorization: `Bearer ${generateToken(id, version)}` });
const chat = (headers = {}, extra = {}) => app.inject({
  method: 'POST', url: '/api/chat', headers,
  payload: { stream: false, messages: [{ role: 'user', content: 'hi' }], ...extra },
});

test('no token, a bad token, a stale token or an inactive user -> 401 and no model call', async () => {
  modelCalls = 0;
  for (const headers of [
    {},
    { authorization: 'Bearer not-a-jwt' },
    { authorization: `Bearer ${generateToken('u-owner', 1).slice(0, -4)}AAAA` },
    bearer('u-owner', 2), // token_version mismatch
    bearer('u-off'),
    bearer('no-such-user'),
  ]) {
    const res = await chat(headers, { userId: 'u-owner' });
    assert.equal(res.statusCode, 401, JSON.stringify(headers));
  }
  assert.equal(modelCalls, 0);
});

test('body userId is ignored: the token user is used', async () => {
  seenUsers.length = 0; modelCalls = 0;
  const res = await chat(bearer('u-member'), { userId: 'u-owner' });
  assert.equal(res.statusCode, 200);
  assert.ok(modelCalls >= 1);
  assert.deepEqual(seenUsers, ['u-member']);
});

test('a forged channel-turn header is refused even with a body userId', async () => {
  modelCalls = 0;
  const res = await chat({ [policy.CHANNEL_TURN_HEADER]: 'forged' }, { userId: 'u-owner' });
  assert.equal(res.statusCode, 401);
  assert.equal(modelCalls, 0);
});

test('channel turns from server code still work and run as the bound user', async () => {
  process.env.CHANNEL_AGENT_TOOLS_TELEGRAM = 'whoami_probe';
  try {
    seenUsers.length = 0;
    const reply = await telegramApi.processChannelMessage('u-owner', 'telegram:chat-1:sender', 'hi', [],
      { channel: 'telegram', conversationId: 'chat-1' });
    assert.equal(reply, 'stub reply');
    assert.deepEqual(seenUsers, ['u-owner']);
  } finally { delete process.env.CHANNEL_AGENT_TOOLS_TELEGRAM; }
});

test('a server-side turn without a bound user (telephony) works; an ended turn token is refused', async () => {
  const turn = policy.beginChannelTurn({ channel: 'telephony', conversationId: 'call-1' });
  let res;
  try {
    res = await chat({ [policy.CHANNEL_TURN_HEADER]: turn.token }, { userId: 'u-owner' });
  } finally { turn.end(); }
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /stub reply/);
  const after = await chat({ [policy.CHANNEL_TURN_HEADER]: turn.token });
  assert.equal(after.statusCode, 401);
});

test('permissions middleware: no owner grant in development; real token and role', async () => {
  assert.equal(process.env.NODE_ENV, 'development');
  assert.equal((await app.inject({ method: 'GET', url: '/perm/dashboard' })).statusCode, 401);
  assert.equal((await app.inject({ method: 'GET', url: '/perm/dashboard', headers: { authorization: 'Bearer x' } })).statusCode, 401);
  assert.equal((await app.inject({ method: 'GET', url: '/perm/dashboard', headers: bearer('u-off') })).statusCode, 401);
  assert.equal((await app.inject({ method: 'GET', url: '/perm/dashboard', headers: bearer('u-member') })).statusCode, 200);
  assert.equal((await app.inject({ method: 'GET', url: '/perm/db', headers: bearer('u-member') })).statusCode, 403);
  assert.equal((await app.inject({ method: 'GET', url: '/perm/db', headers: bearer('u-owner') })).statusCode, 200);
});
