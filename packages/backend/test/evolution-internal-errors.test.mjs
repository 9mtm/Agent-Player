// FU-03: an unexpected error in the evolution and personality routes returns
// the fixed body { error: 'Internal error', code: 'internal_error' } on 500.
// The error message (it can hold SQL, paths, tokens or the prompt) never
// reaches the client, and the server log gets only safe fields plus the route.
// Typed 4xx errors keep their codes.
// The internal error is forced by a stub: database statements on the agent /
// evolution tables throw an error whose message is a secret.
// Run: node --import tsx --test test/evolution-internal-errors.test.mjs
// Throwaway DB + cwd, random test-only secrets, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';

const backendDir = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'ap-evolution-500-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
process.env.MEMORY_EMBEDDINGS = 'hash';

const SECRET = 'INTERNAL-SECRET-sk-ant-api03-zyxwvutsrqponmlkjih /Users/someone/private.db';

const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => { throw new Error(`unexpected network call in test: ${String(url)}`); };

const quiet = { log: console.log, warn: console.warn, info: console.info, error: console.error };
const logged = [];
const capture = (...a) => { logged.push(a.map((x) => (typeof x === 'string' ? x : (x instanceof Error ? `${x.message} ${x.stack}` : JSON.stringify(x) ?? String(x)))).join(' ')); };
console.log = capture; console.warn = capture; console.info = capture; console.error = capture;

const { getDatabase, closeDatabase } = await import(join(backendDir, 'src/db/database.ts'));
const db = getDatabase();
await db.initialize();
db.prepare(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES ('ie-owner', 'ie-owner@example.test', 'ie-owner', 'x', 'owner', 'active')`).run();
db.prepare(`INSERT INTO agents_config (id, name, system_prompt) VALUES ('ie-agent', 'Agent', 'You help.')`).run();
db.prepare(`INSERT INTO agent_evolution_config (agent_id, enabled) VALUES ('ie-agent', 1)`).run();
const HISTORY_ID = randomUUID();
db.prepare(`INSERT INTO agent_evolution_history (id, agent_id, evolution_type, change_description, trigger_reason) VALUES (?, 'ie-agent', 'prompt_update', 'x', 'y')`).run(HISTORY_ID);

const { registerAuthGate } = await import(join(backendDir, 'src/auth/auth-gate.ts'));
const { default: evolutionRoutes } = await import(join(backendDir, 'src/api/routes/evolution.ts'));
const { agentPersonalityRoutes } = await import(join(backendDir, 'src/api/routes/agent-personality.ts'));
const { repositories } = await import(join(backendDir, 'src/repositories/index.ts'));
const { INTERNAL_ERROR_BODY } = await import(join(backendDir, 'src/api/error-handler.ts'));
const { generateToken } = await import(join(backendDir, 'src/auth/jwt.ts'));
const { default: Fastify } = await import('fastify');

const app = Fastify();
registerAuthGate(app);
await app.register(evolutionRoutes);
await app.register(agentPersonalityRoutes);
await app.ready();
Object.assign(console, quiet);

test.after(async () => {
  globalThis.fetch = realFetch;
  await app.close();
  closeDatabase();
  process.chdir(backendDir);
  rmSync(dir, { recursive: true, force: true });
});

const auth = { authorization: `Bearer ${generateToken('ie-owner', 1)}` };
const TABLES = /agent_evolution|agent_learning|agent_activity|agent_performance|evolution_proposal|agents_config|agent_personality/i;

/** Statements on the agent / evolution tables throw an error carrying SECRET. */
async function withFailingDb(fn) {
  const original = db.prepare;
  db.prepare = function (sql) {
    if (TABLES.test(sql)) throw Object.assign(new Error(`SQLITE broke: ${SECRET} in ${sql}`), { name: 'SqliteError', code: 'SQLITE_ERROR', stderr: SECRET });
    return original.call(this, sql);
  };
  const s = { log: console.log, warn: console.warn, error: console.error, info: console.info };
  console.log = capture; console.warn = capture; console.error = capture; console.info = capture;
  try { return await fn(); } finally { db.prepare = original; Object.assign(console, s); }
}

function assertGeneric500(res, label) {
  assert.equal(res.statusCode, 500, `${label}: 500`);
  assert.deepEqual(res.json(), { ...INTERNAL_ERROR_BODY }, `${label}: fixed body`);
  assert.deepEqual(res.json(), { error: 'Internal error', code: 'internal_error' });
  assert.ok(!res.body.includes('INTERNAL-SECRET'), `${label}: no message in the body`);
  assert.ok(!res.body.includes('sk-ant-api03'), `${label}: no token in the body`);
  assert.ok(!res.body.includes('/Users/someone'), `${label}: no path in the body`);
}

function assertSafeLog(route) {
  const all = logged.join('\n');
  assert.ok(!all.includes('INTERNAL-SECRET'), 'no secret in the log');
  assert.ok(!all.includes('SQLITE broke'), 'no error message in the log');
  const line = logged.find((l) => l.includes(route) && l.includes('internal error'));
  assert.ok(line, `the log names the route (${route})`);
  assert.match(line, /"name":"SqliteError"/);
  assert.match(line, /"code":"SQLITE_ERROR"/);
}

const evolutionCases = [
  ['GET', '/api/evolution/ie-agent/status', undefined, 'GET /api/evolution/:agentId/status'],
  ['POST', '/api/evolution/ie-agent/analyze', { periodDays: 7 }, 'POST /api/evolution/:agentId/analyze'],
  ['POST', '/api/evolution/ie-agent/evolve', {}, 'POST /api/evolution/:agentId/evolve'],
  ['POST', '/api/evolution/ie-agent/personality-proposal', {}, 'POST /api/evolution/:agentId/personality-proposal'],
  ['POST', '/api/evolution/evolve-all', {}, 'POST /api/evolution/evolve-all'],
  ['GET', '/api/evolution/ie-agent/history', undefined, 'GET /api/evolution/:agentId/history'],
  ['POST', `/api/evolution/ie-agent/rollback/${HISTORY_ID}`, {}, 'POST /api/evolution/:agentId/rollback/:evolutionId'],
  ['GET', '/api/evolution/ie-agent/proposals', undefined, 'GET /api/evolution/:agentId/proposals'],
  ['GET', `/api/evolution/ie-agent/proposals/${randomUUID()}`, undefined, 'GET /api/evolution/:agentId/proposals/:proposalId'],
  ['POST', `/api/evolution/ie-agent/proposals/${randomUUID()}/approve`, { expectedReviewHash: 'x' }, 'POST /api/evolution/:agentId/proposals/:proposalId/approve'],
  ['POST', `/api/evolution/ie-agent/proposals/${randomUUID()}/reject`, { expectedReviewHash: 'x' }, 'POST /api/evolution/:agentId/proposals/:proposalId/reject'],
  ['POST', `/api/evolution/ie-agent/proposals/${randomUUID()}/cancel`, { expectedReviewHash: 'x' }, 'POST /api/evolution/:agentId/proposals/:proposalId/cancel'],
  ['GET', '/api/evolution/ie-agent/insights', undefined, 'GET /api/evolution/:agentId/insights'],
  ['PUT', '/api/evolution/ie-agent/config', { enabled: 0 }, 'PUT /api/evolution/:agentId/config'],
  ['POST', `/api/evolution/ie-agent/measure/${HISTORY_ID}`, {}, 'POST /api/evolution/:agentId/measure/:evolutionId'],
];

for (const [method, url, payload, route] of evolutionCases) {
  test(`evolution ${route}: an internal error returns the generic 500 only`, async () => {
    logged.length = 0;
    const res = await withFailingDb(() => app.inject({ method, url, headers: auth, ...(payload ? { payload } : {}) }));
    assertGeneric500(res, route);
    assertSafeLog(`[Evolution API] ${route}`);
  });
}

test('evolution typed 4xx codes are unchanged', async () => {
  const miss = await app.inject({ method: 'GET', url: `/api/evolution/ie-agent/proposals/${randomUUID()}`, headers: auth });
  assert.equal(miss.statusCode, 404);
  assert.deepEqual(miss.json(), { error: 'Proposal not found', code: 'not_found' });
  const rb = await app.inject({ method: 'POST', url: `/api/evolution/ie-agent/rollback/${randomUUID()}`, headers: auth, payload: {} });
  assert.equal(rb.statusCode, 404);
  assert.equal(rb.json().code, 'not_found');
  const noCfg = await app.inject({ method: 'GET', url: '/api/evolution/no-such-agent/status', headers: auth });
  assert.equal(noCfg.statusCode, 404);
});

// Personality routes: the repository methods are stubbed to throw the secret.
const personalityCases = [
  ['GET', '/api/agents/ie-agent/personality/current', undefined, 'currentPersonality', 'GET /api/agents/:id/personality/current'],
  ['GET', '/api/agents/ie-agent/personality/versions', undefined, 'personalityVersions', 'GET /api/agents/:id/personality/versions'],
  ['POST', '/api/agents/ie-agent/personality/versions', { preset: 'x' }, 'savePersonality', 'agent_personality.save'],
  ['POST', '/api/agents/ie-agent/personality/lock', {}, 'setPersonalityLocked', 'agent_personality.lock'],
  ['POST', '/api/agents/ie-agent/personality/rollback', { version: 1 }, 'rollbackPersonality', 'agent_personality.rollback'],
  ['POST', '/api/agents/ie-agent/personality/proposals', { traits: {}, reason: 'r' }, 'createPersonalityProposal', 'agent_personality.proposal.create'],
  ['GET', '/api/agents/ie-agent/personality/proposals', undefined, 'personalityProposals', 'GET /api/agents/:id/personality/proposals'],
  ['GET', `/api/agents/ie-agent/personality/proposals/${randomUUID()}`, undefined, 'personalityProposal', 'GET /api/agents/:id/personality/proposals/:pid'],
  ['POST', `/api/agents/ie-agent/personality/proposals/${randomUUID()}/approve`, { expectedReviewHash: 'x' }, 'approvePersonalityProposal', 'agent_personality.proposal.approve'],
  ['POST', `/api/agents/ie-agent/personality/proposals/${randomUUID()}/reject`, { expectedReviewHash: 'x' }, 'rejectPersonalityProposal', 'agent_personality.proposal.reject'],
  ['POST', `/api/agents/ie-agent/personality/proposals/${randomUUID()}/cancel`, { expectedReviewHash: 'x' }, 'cancelPersonalityProposal', 'agent_personality.proposal.cancel'],
];

for (const [method, url, payload, fn, route] of personalityCases) {
  test(`personality ${route}: an internal error returns the generic 500 only`, async () => {
    const original = repositories.agents[fn];
    assert.equal(typeof original, 'function', `repositories.agents.${fn} exists`);
    repositories.agents[fn] = async () => { throw Object.assign(new Error(`repo broke: ${SECRET}`), { name: 'SqliteError', code: 'SQLITE_ERROR' }); };
    logged.length = 0;
    const s = { log: console.log, warn: console.warn, error: console.error, info: console.info };
    console.log = capture; console.warn = capture; console.error = capture; console.info = capture;
    try {
      const res = await app.inject({ method, url, headers: auth, ...(payload ? { payload } : {}) });
      assertGeneric500(res, route);
      const all = logged.join('\n');
      assert.ok(!all.includes('INTERNAL-SECRET') && !all.includes('repo broke'), 'no message in the log');
      assert.ok(logged.some((l) => l.includes(`[Personality] ${route} internal error`)), 'the log names the route');
    } finally {
      repositories.agents[fn] = original;
      Object.assign(console, s);
    }
  });
}
