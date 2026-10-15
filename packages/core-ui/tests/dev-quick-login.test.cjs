// Development quick sign-in (src/dev-quick-login.ts): local test accounts on
// the live sign-in form, behind two locks (a --dev-quick-login build and a
// loopback host). It only fills the form.
require('./load.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { isLoopbackHost, compiledDevAccounts, devQuickLoginAccounts } = require('../src/dev-quick-login.ts');
const { parseBuildArgs, loadDevAccounts } = require('../scripts/build.cjs');

const ACCOUNTS = [{ label: 'Owner', email: 'owner@isolated.invalid', password: 'fictional-test-value' }, { email: 'b@example.invalid', password: 'x' }];

test('only loopback hosts count as local', () => {
  for (const h of ['127.0.0.1', 'localhost', 'LOCALHOST', '[::1]', '::1']) assert.equal(isLoopbackHost(h), true, h);
  for (const h of ['', '127.0.0.2', '192.168.1.5', 'example.com', 'localhost.example.com', '0.0.0.0']) assert.equal(isLoopbackHost(h), false, h);
});

test('accounts are offered only on a loopback host, and only well-formed ones', () => {
  assert.deepEqual(devQuickLoginAccounts('127.0.0.1', ACCOUNTS).map(a => a.label), ['Owner', 'b@example.invalid']);
  assert.deepEqual(devQuickLoginAccounts('example.com', ACCOUNTS), []);
  assert.deepEqual(devQuickLoginAccounts('127.0.0.1', null), []);
  assert.deepEqual(devQuickLoginAccounts('127.0.0.1', [{ email: 'x' }, null, 'a', { email: '', password: 'p' }]), []);
});

test('a normal build compiles in no accounts (no global defined)', () => {
  assert.deepEqual(compiledDevAccounts(), []);
});

test('build flag: only together with --candidate --live-entry', () => {
  assert.deepEqual(parseBuildArgs(['--candidate', '--live-entry', '--dev-quick-login']), { channel: 'candidate', entryMode: 'live-candidate', devQuickLogin: true });
  for (const args of [['--dev-quick-login'], ['--candidate', '--dev-quick-login'], ['--candidate', '--live-entry', '--dev-quick-login', '--dev-quick-login']]) {
    assert.throws(() => parseBuildArgs(args), args.join(' '));
  }
  assert.deepEqual(parseBuildArgs(['--candidate', '--live-entry']), { channel: 'candidate', entryMode: 'live-candidate' });
});

test('the account file is validated', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'core-ui-dev-login-'));
  try {
    const file = path.join(dir, 'a.json');
    fs.writeFileSync(file, JSON.stringify(ACCOUNTS));
    assert.deepEqual(loadDevAccounts(file).map(a => a.label), ['Owner', 'b@example.invalid']);
    for (const bad of ['not json', '[]', '{}', JSON.stringify([{ email: 'x' }]), JSON.stringify(Array(11).fill(ACCOUNTS[0]))]) {
      fs.writeFileSync(file, bad);
      assert.throws(() => loadDevAccounts(file));
    }
    assert.throws(() => loadDevAccounts(path.join(dir, 'missing.json')));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the button renders only with compiled accounts on a loopback host, and never shows a password', () => {
  const { DevQuickLogin } = require('../src/AuthBoundary.tsx');
  const render = (hostname) => renderToStaticMarkup(createElement(DevQuickLogin, { disabled: false, onFill: () => {}, hostname }));
  assert.equal(render('127.0.0.1'), '', 'no accounts compiled in: nothing');
  globalThis.__DEV_QUICK_LOGIN__ = ACCOUNTS;
  try {
    const html = render('127.0.0.1');
    assert.match(html, /Development quick sign-in/);
    assert.match(html, /Fill Owner/);
    assert.ok(!html.includes('fictional-test-value'), 'the password is never rendered');
    assert.equal(render('example.com'), '', 'not on a non-loopback host');
  } finally {
    delete globalThis.__DEV_QUICK_LOGIN__;
  }
});
