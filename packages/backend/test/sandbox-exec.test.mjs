// S0-Q.3: no host-shell fallback when the Docker sandbox is unavailable.
// Run: node --import tsx --test test/sandbox-exec.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { SandboxExecutor } from '../src/sandbox/executor.ts';

const withEnv = async (value, fn) => {
  const saved = process.env.SANDBOX_ALLOW_HOST_EXEC;
  if (value === undefined) delete process.env.SANDBOX_ALLOW_HOST_EXEC;
  else process.env.SANDBOX_ALLOW_HOST_EXEC = value;
  try { return await fn(); } finally {
    if (saved === undefined) delete process.env.SANDBOX_ALLOW_HOST_EXEC;
    else process.env.SANDBOX_ALLOW_HOST_EXEC = saved;
  }
};

test('sandboxed mode without a container refuses instead of running on the host', async () => {
  await withEnv('true', async () => {
    const executor = new SandboxExecutor({ mode: 'non-main' });
    const result = await executor.execute({ command: 'echo should-not-run' });
    assert.equal(result.blocked, true);
    assert.equal(result.stdout, '');
    assert.match(result.blockReason, /Sandbox is not available/);
  });
});

test("mode 'off' runs on the host only when SANDBOX_ALLOW_HOST_EXEC=true", async () => {
  await withEnv(undefined, async () => {
    const executor = new SandboxExecutor({ mode: 'off' });
    const result = await executor.execute({ command: 'echo should-not-run' });
    assert.equal(result.blocked, true);
    assert.match(result.blockReason, /Host command execution is disabled/);
  });
  await withEnv('true', async () => {
    const executor = new SandboxExecutor({ mode: 'off' });
    const result = await executor.execute({ command: 'echo host-ok' });
    assert.equal(result.blocked, undefined);
    assert.equal(result.stdout.trim(), 'host-ok');
  });
});

test('the config API cannot switch off isolation', () => {
  const executor = new SandboxExecutor({ mode: 'all' });
  executor.updateConfig({ mode: 'off', docker: { privileged: true, network: 'host', image: 'custom:1' }, timeout: 5000 });
  const config = executor.getConfig();
  assert.equal(config.mode, 'all');
  assert.equal(config.docker.privileged, false);
  assert.equal(config.docker.network, 'none');
  assert.equal(config.docker.image, 'custom:1');
  assert.equal(config.timeout, 5000);
});
