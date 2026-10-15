// SEC-CAL-01: calendar sync requests go through safe-fetch. Unit checks with
// an injected DNS lookup and transport (no request leaves the process), the
// save-time URL check on the calendar routes, and a sync of a source whose
// stored URL is an IP literal (refused before any DNS or connection).
// Run: node --import tsx --test test/calendar-ssrf.test.mjs
// Throwaway DB + cwd, random test-only secrets, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'ap-cal-ssrf-'));
mkdirSync(join(dir, '.data'), { recursive: true });
process.chdir(dir);
process.env.HOME = dir;
process.env.DATABASE_PATH = join(dir, '.data', 'agent-player.db');
process.env.JWT_SECRET = randomBytes(64).toString('hex'); // throwaway, test only
process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex'); // throwaway, test only
delete process.env.AGENT_PLAYER_DB;

const quiet = { log: console.log, info: console.info, error: console.error };
console.log = () => {}; console.info = () => {}; console.error = () => {};
const { getDatabase, closeDatabase } = await import('../src/db/database.ts');
await getDatabase().initialize();
const { q } = await import('../src/repositories/sql-steps.ts');
const cal = await import('../src/services/calendar-sync.ts');
const { default: Fastify } = await import('fastify');
const { registerAuthGate } = await import('../src/auth/auth-gate.ts');
const { generateToken } = await import('../src/auth/jwt.ts');
const { registerCalendarRoutes } = await import('../src/api/routes/calendar.ts');
const app = Fastify();
registerAuthGate(app);
await app.register(registerCalendarRoutes);
await app.ready();
await q.run(`INSERT INTO users (id, email, username, password_hash, role, status) VALUES ('ss-user', 'ss@example.test', 'ss', 'x', 'user', 'active')`);
const auth = { authorization: `Bearer ${generateToken('ss-user', 1)}` };

test.after(async () => {
  await app.close();
  Object.assign(console, quiet);
  closeDatabase();
  process.chdir('/');
  rmSync(dir, { recursive: true, force: true });
});

const ICS = 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n';
function stubNet(addresses, responses = []) {
  const seen = { lookups: [], requests: [] };
  return {
    seen,
    net: {
      lookup: async (host) => { seen.lookups.push(host); return addresses.map((address) => ({ address, family: address.includes(':') ? 6 : 4 })); },
      transport: async (req) => {
        seen.requests.push({ host: req.url.hostname, address: req.address, headers: req.headers });
        return responses.shift() ?? { status: 200, headers: { 'content-type': 'text/calendar' }, body: Buffer.from(ICS) };
      },
    },
  };
}

test('URL checks: http, IP literals, ports and credentials are refused before any lookup', () => {
  for (const bad of ['http://cal.example.com/a.ics', 'https://127.0.0.1/a.ics', 'https://[::1]/a.ics', 'https://2130706433/a.ics',
    'https://cal.example.com:8443/a.ics', 'https://u:p@cal.example.com/a.ics', 'ftp://cal.example.com/a.ics', 'not a url']) {
    assert.throws(() => cal.icalFetchUrl(bad), (e) => e.name === 'SafeFetchError', bad);
  }
  assert.equal(cal.icalFetchUrl('webcal://cal.example.com/a.ics').toString(), 'https://cal.example.com/a.ics');
});

test('iCal fetch: a private/loopback DNS answer is refused with no request', async () => {
  for (const address of ['127.0.0.1', '10.0.0.5', '169.254.169.254', '192.168.1.2', '::1', 'fd00::1']) {
    const { net, seen } = stubNet(['93.184.216.34', address]);
    await assert.rejects(cal.fetchICalText('https://cal.example.com/a.ics', net), (e) => e.code === 'blocked_address', address);
    assert.equal(seen.requests.length, 0, address);
  }
});

test('iCal fetch: a public answer is fetched pinned to the checked address; other-host redirects and wrong types refused', async () => {
  const ok = stubNet(['93.184.216.34']);
  assert.equal(await cal.fetchICalText('webcal://cal.example.com/a.ics', ok.net), ICS);
  assert.deepEqual(ok.seen.requests.map((r) => [r.host, r.address]), [['cal.example.com', '93.184.216.34']]);
  const redirect = stubNet(['93.184.216.34'], [{ status: 302, headers: { location: 'https://evil.example.net/x' }, body: Buffer.alloc(0) }]);
  await assert.rejects(cal.fetchICalText('https://cal.example.com/a.ics', redirect.net), (e) => e.code === 'host_not_allowed' || e.code === 'redirect_host');
  const html = stubNet(['93.184.216.34'], [{ status: 200, headers: { 'content-type': 'text/html' }, body: Buffer.from('<html>') }]);
  await assert.rejects(cal.fetchICalText('https://cal.example.com/a.ics', html.net), (e) => e.code === 'content_type');
});

test('Google fetch: only www.googleapis.com, with the bearer header', async () => {
  const g = stubNet(['142.250.0.10'], [{ status: 200, headers: { 'content-type': 'application/json' }, body: Buffer.from('{"items":[]}') }]);
  assert.deepEqual(await cal.fetchGoogleJson('https://www.googleapis.com/calendar/v3/x', 'tok', g.net), { items: [] });
  assert.equal(g.seen.requests[0].headers.Authorization, 'Bearer tok');
  await assert.rejects(cal.fetchGoogleJson('https://evil.example.net/x', 'tok', stubNet(['93.184.216.34']).net), (e) => e.code === 'host_not_allowed');
});

test('routes: saving an iCal/WebCal source with an unsafe URL answers 400; a host name is accepted', async () => {
  for (const url of ['http://cal.example.com/a.ics', 'https://127.0.0.1/a.ics', 'https://169.254.169.254/latest', 'https://cal.example.com:22/a.ics']) {
    const r = await app.inject({ method: 'POST', url: '/api/calendar/sources', headers: auth, payload: { name: 'x', type: 'ical', url } });
    assert.equal(r.statusCode, 400, url);
  }
  const ok = await app.inject({ method: 'POST', url: '/api/calendar/sources', headers: auth, payload: { name: 'ok', type: 'webcal', url: 'webcal://cal.example.com/a.ics' } });
  assert.equal(ok.statusCode, 200, ok.body);
  const put = await app.inject({ method: 'PUT', url: `/api/calendar/sources/${ok.json().source.id}`, headers: auth, payload: { url: 'https://10.0.0.1/a.ics' } });
  assert.equal(put.statusCode, 400);
});

test('sync of a stored IP-literal URL fails closed with a code, no upstream text', async () => {
  await q.run(`INSERT INTO calendar_sources (id, user_id, name, type, url, sync_enabled) VALUES ('ss-src', 'ss-user', 'old', 'ical', 'https://127.0.0.1/a.ics', 1)`);
  await assert.rejects(cal.syncCalendarSource('ss-src'), /refused or failed \(ip_literal\)/);
  const row = await q.one(`SELECT sync_status, sync_error FROM calendar_sources WHERE id = 'ss-src'`);
  assert.deepEqual(row, { sync_status: 'error', sync_error: 'Calendar fetch refused or failed (ip_literal)' });
});
