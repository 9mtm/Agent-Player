// INSTALLER-05: inside the desktop app the bridge follows the backend's
// current random port and adds the per-launch token; the page never sees it.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { beginBuild, completeBuild } = require('../scripts/build-artifacts.cjs');
const { createApplicationServer, LAUNCH_HEADER } = require('../scripts/application-server.cjs');

const listen = s => new Promise(resolve => s.listen(0, '127.0.0.1', () => resolve(s.address().port)));
const close = s => new Promise(resolve => { s.close(resolve); s.closeAllConnections(); });
const token = 'T'.repeat(43);

function fictionalPackage() {
  const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'core-ui-desktop-'));
  const { buildId, output } = beginBuild(packageRoot, 'candidate', 'live-candidate');
  fs.mkdirSync(path.join(output, 'assets'));
  fs.writeFileSync(path.join(output, 'index.html'), '<!doctype html><meta name="core-ui-entry" content="live-candidate"><title>x</title>');
  fs.writeFileSync(path.join(output, 'THIRD_PARTY_NOTICES.txt'), 'none');
  fs.writeFileSync(path.join(output, 'assets', 'a.js'), '');
  fs.writeFileSync(path.join(output, 'assets', 'a.css'), '');
  completeBuild(packageRoot, buildId, 'candidate');
  return packageRoot;
}

test('desktop bridge: token header added upstream, port read per request, 503 while the backend is down', async t => {
  const seen = [];
  const upstream = http.createServer((req, res) => { seen.push(req.headers[LAUNCH_HEADER.toLowerCase()]); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ setupComplete: false, setupRequired: true, message: 'Setup required' })); });
  const upstreamPort = await listen(upstream); t.after(() => close(upstream));
  let current = null;
  const app = createApplicationServer({ packageRoot: fictionalPackage(), channel: 'candidate', upstreamPort: () => current, launchToken: token });
  const port = await listen(app); t.after(() => close(app));
  const url = `http://127.0.0.1:${port}/api/setup/status`;
  const get = () => fetch(url, { mode: 'same-origin' });
  assert.equal((await get()).status, 503);
  assert.equal(seen.length, 0);
  current = upstreamPort;
  const response = await get();
  assert.equal(response.status, 200);
  assert.ok(!(await response.text()).includes(token));
  assert.deepEqual(seen, [token]);
  assert.equal(response.headers.get(LAUNCH_HEADER), null);
});

test('desktop bridge: malformed launch token or port is refused at creation', () => {
  const packageRoot = fictionalPackage();
  assert.throws(() => createApplicationServer({ packageRoot, channel: 'candidate', upstreamPort: 1, launchToken: 'short' }), /Invalid launch configuration/);
  assert.throws(() => createApplicationServer({ packageRoot, channel: 'candidate', upstreamPort: 0 }), /Invalid launch configuration/);
  assert.doesNotThrow(() => createApplicationServer({ packageRoot, channel: 'candidate', upstreamPort: () => null, launchToken: token }));
});
