/**
 * Onboard Command
 *
 * First-time setup happens in the web wizard: /setup creates the owner
 * account, then /onboarding (shown after the first sign-in) configures the
 * agent. The backend's old /api/onboarding/start route (a terminal wizard run
 * inside the server) has been removed, so this command points to the web
 * wizard instead of calling it.
 */

import chalk from 'chalk';
import { ApiClient } from '../utils/api-client.js';
import { getFrontendUrl } from '../utils/auth-store.js';

export async function onboardCommand(deps: { log?: (msg: string) => void; client?: ApiClient } = {}): Promise<void> {
  const log = deps.log ?? ((m: string) => console.log(m));
  const client = deps.client ?? new ApiClient();
  const web = getFrontendUrl();

  const isRunning = await client.isBackendRunning();
  if (!isRunning) {
    log(chalk.yellow(`\nBackend is not running at ${client.getBaseUrl()}`));
    log(chalk.gray('Start it with "agent-player start", then run "agent-player onboard" again.\n'));
    return;
  }

  log(chalk.cyan('\nOnboarding runs in the web wizard:'));
  log(chalk.white(`  ${web}/onboarding`));
  log(chalk.gray(`\nOn a new installation ${web}/setup creates the owner account first.`));
  log(chalk.gray('Then use "agent-player login" to sign in from the terminal.\n'));
}
