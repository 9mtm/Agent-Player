/**
 * `agent-player setup` (INST-02 / INST-04): prepare this install for start.
 *
 * Creates the data folders (0700), generates missing secrets into
 * <data dir>/secrets.env (0600; values set in .env win and are not copied;
 * existing values are kept) and records the install folder so `start` works
 * from any folder. Prints names only, never a secret value.
 *
 * INSTALLER-07: while no owner exists it also shows a one-time owner setup
 * code on the terminal (never in a log; see utils/setup-token.ts).
 */

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { findInstall, findRootAbove, pathsFor, recordInstallRoot, NOT_FOUND_MESSAGE, type InstallPaths } from '../utils/install-root.js';
import { addMissingSecrets, inspectSecrets, readInstallDotenv } from '../utils/secrets-file.js';
import { backendDataDir, offerSetupToken, type OfferDeps } from '../utils/setup-token.js';

export function setupCommand(
  deps: { paths?: InstallPaths | null; log?: (m: string) => void; env?: NodeJS.ProcessEnv; cwd?: string; configDir?: string; terminal?: OfferDeps['terminal'] } = {},
): number {
  const log = deps.log ?? ((m: string) => console.log(m));
  let paths = deps.paths === undefined ? findInstall() : deps.paths;
  if (!paths) {
    // First setup from inside an install that the CLI does not live in.
    const here = findRootAbove(deps.cwd ?? process.cwd());
    if (here) paths = pathsFor(here, 'recorded');
  }
  if (!paths) {
    log(chalk.red(NOT_FOUND_MESSAGE));
    return 1;
  }
  for (const dir of [paths.dataDir, paths.logsDir, paths.runDir]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  const statuses = inspectSecrets(paths.dataDir, readInstallDotenv(paths.backendDir, paths.root), deps.env ?? process.env);
  const bad = statuses.filter((s) => s.state === 'placeholder' || s.state === 'bad-format');
  if (bad.length > 0) {
    for (const s of bad) {
      log(chalk.red(`${s.name} (${s.source}) is ${s.state === 'placeholder' ? 'a known placeholder' : 'in the wrong format'}. Remove it so a new one is generated, or set a real random value.`));
    }
    return 1;
  }
  const added = addMissingSecrets(paths.dataDir, statuses.filter((s) => s.state === 'missing').map((s) => s.name));
  const file = path.join(paths.dataDir, 'secrets.env');
  if (added.length) log(chalk.green(`Generated ${added.join(', ')} in ${file} (values not shown).`));
  else log(chalk.gray('All required secrets are already set.'));
  const record = recordInstallRoot(paths.root, deps.configDir);
  log(chalk.gray(`Install folder recorded in ${record}: ${paths.root}`));
  offerSetupToken({ dataDir: backendDataDir(paths.dataDir, deps.env ?? process.env), log, terminal: deps.terminal });
  log('Next: agent-player start   (or: agent-player doctor)');
  return 0;
}
