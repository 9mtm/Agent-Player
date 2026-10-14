// CLI-02: `agent-player import` reads only the named files, sends them to the
// backend import pipeline, shows a summary without secrets, asks before the
// commit, --dry-run discards, --rollback undoes. fetch is stubbed (no server),
// temp HOME/config dir and temp files only, random test-only secrets.
// Run (from the repo root): node --import tsx --test packages/cli/test/import.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-cli-import-'));
process.env.HOME = dir;
process.env.AGENT_PLAYER_CONFIG_DIR = join(dir, 'config', 'agent-player');
for (const k of ['AGENT_PLAYER_URL', 'BACKEND_URL', 'XDG_CONFIG_HOME']) delete process.env[k];

const TOKEN = 'tok-' + randomBytes(24).toString('hex'); // fake, test only
const SECRET = 'sk-proj-' + randomBytes(24).toString('hex'); // fake, test only
const BATCH = '11111111-2222-4333-8444-555555555555';
const HASH = 'a'.repeat(64);

const store = await import('../src/utils/auth-store.ts');
const { importCommand } = await import('../src/commands/import.ts');
const { selectFiles } = await import('../src/utils/import-files.ts');
store.saveSession(TOKEN, 'http://127.0.0.1:41522', 'owner@example.test');

const work = join(dir, 'work');
mkdirSync(join(work, 'notes', 'deep'), { recursive: true });
mkdirSync(join(work, 'notes', '.hidden'), { recursive: true });
mkdirSync(join(work, '.ssh'), { recursive: true });
writeFileSync(join(work, 'CLAUDE.md'), `# Me\n\nMy key is ${SECRET}\n`);
writeFileSync(join(work, 'AGENTS.md'), '# Rules\n\nRun the tests.\n');
writeFileSync(join(work, 'notes', 'a.md'), '# A\n\ntext a\n');
writeFileSync(join(work, 'notes', 'b.txt'), 'text b\n');
writeFileSync(join(work, 'notes', 'c.json'), '{}');
writeFileSync(join(work, 'notes', '.env'), 'X=1');
writeFileSync(join(work, 'notes', 'deep', 'd.md'), '# D\n\ntext d\n');
writeFileSync(join(work, 'notes', '.hidden', 'h.md'), '# H\n\nhidden\n');
writeFileSync(join(work, '.ssh', 'notes.md'), '# never\n');
writeFileSync(join(work, 'not-named.md'), '# Not named\n\nmust never be read\n');
writeFileSync(join(work, 'id_rsa'), 'x');
writeFileSync(join(work, 'credentials.md'), 'x');
symlinkSync(join(work, 'not-named.md'), join(work, 'link.md'));
symlinkSync(join(work, 'not-named.md'), join(work, 'notes', 'link2.md'));

const calls = [];
let respond;
globalThis.fetch = async (url, init = {}) => {
  const call = { url: String(url), method: init.method, headers: init.headers || {}, body: init.body ? JSON.parse(init.body) : undefined };
  calls.push(call);
  const { status, body } = respond(call);
  return new Response(body === undefined ? '' : JSON.stringify(body), { status });
};

const view = (included = 2) => ({
  batchId: BATCH, version: 1, contentHash: HASH,
  files: [{ name: 'CLAUDE.md', outcome: 'eligible', items: 1 }, { name: 'AGENTS.md', outcome: 'eligible', items: 1 }],
  items: [{ id: 'i1', content: 'My key is [REDACTED:openai_key]' }],
  summary: { files: { total: 2 }, items: { total: 2, included, duplicates: 0 }, redactions: { openai_key: 1 }, byDrawer: { 'project:alpha': included } },
});
const backend = (opts = {}) => (c) => {
  if (c.url.endsWith('/api/memory/import/preview')) return { status: 201, body: opts.view ?? view() };
  if (c.url.endsWith(`/api/memory/import/${BATCH}/commit`)) return { status: 201, body: { batchId: BATCH, proposals: [{ itemId: 'i1', proposalId: 'p1' }, { itemId: 'i2', proposalId: 'p2' }] } };
  if (c.url.endsWith(`/api/memory/import/${BATCH}/cancel`)) return { status: 200, body: opts.cancel ?? { status: 'cancelled', removedProposals: 0, approvedKept: [] } };
  return { status: 404, body: {} };
};

const run = async (paths, options, answer = 'n') => {
  const out = [];
  const asked = [];
  calls.length = 0;
  const code = await importCommand(paths, options, { log: (m) => out.push(m), ask: async (q) => { asked.push(q); return answer; }, cwd: work });
  const all = out.join('\n');
  assert.ok(!all.includes(SECRET), 'secret printed');
  assert.ok(!all.includes(TOKEN), 'token printed');
  return { code, out: all, asked };
};
const sentNames = () => calls.find((c) => c.url.endsWith('/preview'))?.body.files.map((f) => f.name);

test.after(() => rmSync(dir, { recursive: true, force: true }));

test('only the named files are read and sent (base64), with the bearer token; summary has counts, no secrets', async () => {
  respond = backend();
  const { code, out, asked } = await run(['CLAUDE.md', 'AGENTS.md'], { from: 'claude-code', drawer: 'project:alpha' }, 'y');
  assert.equal(code, 0, out);
  const pre = calls[0];
  assert.equal(pre.url, 'http://127.0.0.1:41522/api/memory/import/preview');
  assert.equal(pre.headers.Authorization, `Bearer ${TOKEN}`);
  assert.deepEqual(sentNames(), ['CLAUDE.md', 'AGENTS.md'], 'basenames only');
  assert.equal(pre.body.source, 'claude-code');
  assert.equal(pre.body.drawer, 'project:alpha');
  assert.equal(Buffer.from(pre.body.files[0].contentBase64, 'base64').toString(), `# Me\n\nMy key is ${SECRET}\n`, 'raw bytes go to the backend redactor');
  assert.ok(!JSON.stringify(pre.body).includes(work), 'no local paths sent');
  assert.match(out, /Redacted: openai_key 1/);
  assert.match(out, /project:alpha: 2/);
  assert.equal(asked.length, 1, 'asked for confirmation');
  const commit = calls.find((c) => c.url.endsWith('/commit'));
  assert.deepEqual(Object.keys(commit.body).sort(), ['confirm', 'contentHash', 'operationKey', 'version']);
  assert.equal(commit.body.contentHash, HASH);
  assert.equal(commit.body.confirm, true);
  assert.match(commit.body.operationKey, /^[0-9a-f]{32}$/);
  assert.match(out, /2 proposals waiting for your approval/);
  assert.match(out, new RegExp(`--rollback ${BATCH}`));
});

test('declining the confirmation discards the preview; --dry-run never commits', async () => {
  respond = backend();
  const no = await run(['CLAUDE.md'], {}, 'n');
  assert.equal(no.code, 1);
  assert.ok(calls.some((c) => c.url.endsWith('/cancel')));
  assert.ok(!calls.some((c) => c.url.endsWith('/commit')));

  const dry = await run(['CLAUDE.md'], { dryRun: true });
  assert.equal(dry.code, 0);
  assert.equal(dry.asked.length, 0);
  assert.deepEqual(calls.map((c) => c.url.split('/').pop()), ['preview', 'cancel']);
  assert.match(dry.out, /Dry run/);

  const yes = await run(['CLAUDE.md'], { yes: true });
  assert.equal(yes.code, 0);
  assert.equal(yes.asked.length, 0);
  assert.ok(calls.some((c) => c.url.endsWith('/commit')));
});

test('folders only with --recursive; symlinks, hidden folders, credential names and .ssh never read', async () => {
  respond = backend();
  const plain = await run(['notes'], { dryRun: true });
  assert.equal(plain.code, 1);
  assert.match(plain.out, /is a folder \(add --recursive/);
  assert.equal(calls.length, 0, 'nothing sent');

  await run(['notes'], { dryRun: true, recursive: true });
  assert.deepEqual(sentNames(), ['a.md', 'b.txt', 'd.md']);

  const bad = await run(['link.md', 'id_rsa', 'credentials.md', '.ssh/notes.md', 'missing.md', 'notes/c.json', 'notes/.env'], { dryRun: true });
  assert.equal(bad.code, 1);
  assert.equal(calls.length, 0);
  assert.match(bad.out, /link\.md: symbolic link/);
  assert.match(bad.out, /id_rsa: SSH key file/);
  assert.match(bad.out, /credentials\.md: credential file/);
  assert.match(bad.out, /\.ssh\/notes\.md: files under \.ssh/);
  assert.match(bad.out, /missing\.md: not found/);
  assert.match(bad.out, /c\.json: only Markdown/);
  assert.match(bad.out, /\.env: environment file/);
  assert.ok(!bad.out.includes('must never be read'));
});

test('selectFiles never touches files that were not named', () => {
  const sel = selectFiles(['AGENTS.md'], { cwd: work });
  assert.deepEqual(sel.files.map((f) => f.name), ['AGENTS.md']);
  assert.ok(!sel.files.some((f) => f.bytes.toString().includes('must never be read')));
});

test('no session: refused before anything is sent; backend errors shown without secrets', async () => {
  respond = () => ({ status: 413, body: { error: 'The selected files are larger than 10 MiB in total' } });
  const big = await run(['CLAUDE.md'], {});
  assert.equal(big.code, 1);
  assert.match(big.out, /larger than 10 MiB/);

  store.clearSession();
  assert.equal(store.getStoredToken(), null);
  const res = await run(['CLAUDE.md'], {});
  assert.equal(res.code, 1);
  assert.match(res.out, /agent-player login/);
  assert.equal(calls.length, 0);
  store.saveSession(TOKEN, 'http://127.0.0.1:41522', 'owner@example.test');
});

test('--rollback undoes an import; --from validated; nothing to import', async () => {
  respond = backend({ cancel: { status: 'rolled_back', removedProposals: 3, approvedKept: [{ proposalId: 'p1', memoryIds: ['m1'] }] } });
  const rb = await run([], { rollback: BATCH });
  assert.equal(rb.code, 0);
  assert.equal(calls[0].url, `http://127.0.0.1:41522/api/memory/import/${BATCH}/cancel`);
  assert.match(rb.out, /3 pending proposals removed/);
  assert.match(rb.out, /1 approved item stay/);

  const bad = await run(['CLAUDE.md'], { from: 'somewhere' });
  assert.equal(bad.code, 1);
  assert.equal(calls.length, 0);

  const none = await run([], { from: 'chatgpt' });
  assert.equal(none.code, 1);
  assert.match(none.out, /later release/);

  respond = backend({ view: view(0) });
  const empty = await run(['AGENTS.md'], {});
  assert.equal(empty.code, 1);
  assert.match(empty.out, /Nothing to import/);
  assert.ok(calls.some((c) => c.url.endsWith('/cancel')));
});
