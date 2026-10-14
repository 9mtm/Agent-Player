/**
 * Update Command (INST-11)
 *
 * `agent-player update [--to <ref>] [--fetch] [--stop]`: back up, move the
 * git checkout forward, migrate, health check, roll back automatically on
 * failure. See utils/update.ts.
 */

import chalk from 'chalk';
import { findInstall, NOT_FOUND_MESSAGE, type InstallPaths } from '../utils/install-root.js';
import { runUpdate, type UpdateDeps, type UpdateOptions } from '../utils/update.js';

export async function updateCommand(
  options: UpdateOptions = {},
  deps: Partial<Omit<UpdateDeps, 'paths'>> & { paths?: InstallPaths | null } = {},
): Promise<number> {
  const log = deps.log ?? ((m: string) => console.log(m));
  const paths = deps.paths === undefined ? findInstall() : deps.paths;
  if (!paths) {
    log(chalk.red(NOT_FOUND_MESSAGE));
    return 1;
  }
  const result = await runUpdate(options, { ...deps, paths, log });
  if (result.state === 'refused') log(chalk.red(`Update refused: ${result.reason}`));
  return result.code;
}
