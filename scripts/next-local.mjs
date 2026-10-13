#!/usr/bin/env node
/**
 * Runs the Next.js CLI with telemetry disabled (CL-08).
 *
 * Next.js sends anonymous usage data to an external server unless
 * NEXT_TELEMETRY_DISABLED is set. Setting it here works on macOS, Linux and
 * Windows without an extra package (no `VAR=1 cmd` shell syntax).
 *
 * Usage: node scripts/next-local.mjs <next command> [args...]
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');

const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
