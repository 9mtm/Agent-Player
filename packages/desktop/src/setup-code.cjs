'use strict';
/**
 * One-time owner setup code for the desktop app (INSTALLER-05 + INSTALLER-07).
 *
 * Same file format as the CLI (packages/cli/src/utils/setup-token.ts) and the
 * backend (packages/backend/src/auth/setup-token.ts): only the SHA-256 hash is
 * stored in <data dir>/setup-token.json (0600). The plain code goes straight
 * into the window's URL fragment (`#setup=<code>`), which is never sent to a
 * server, never logged and never shown in a terminal.
 */
const { createHash, randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SETUP_TOKEN_FILE = 'setup-token.json';
const SETUP_FLAG_FILE = '.setup_complete';

const setupFinished = dataDir => fs.existsSync(path.join(dataDir, SETUP_FLAG_FILE));

/** A fresh code while the owner does not exist yet (replaces an older one); null when setup is done. */
function issueSetupCode(dataDir, now = new Date()) {
  if (setupFinished(dataDir)) return null;
  const code = randomBytes(32).toString('base64url');
  const hash = createHash('sha256').update(code, 'utf8').digest('hex');
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const file = path.join(dataDir, SETUP_TOKEN_FILE);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify({ v: 1, hash, createdAt: now.toISOString() })}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
  return code;
}

module.exports = { issueSetupCode, setupFinished, SETUP_TOKEN_FILE, SETUP_FLAG_FILE };
