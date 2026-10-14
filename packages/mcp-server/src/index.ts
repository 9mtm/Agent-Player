#!/usr/bin/env node
/**
 * agent-player-mcp: MCP server over stdio for Claude Code / Codex.
 * stdout carries only MCP JSON-RPC messages; diagnostics go to stderr and
 * never include the token.
 */

import { runStdio } from './server.js';

runStdio().catch((err) => {
  process.stderr.write(`agent-player-mcp: failed to start: ${err instanceof Error ? err.message : 'unknown error'}\n`);
  process.exit(1);
});
