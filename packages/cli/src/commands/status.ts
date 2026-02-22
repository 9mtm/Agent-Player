/**
 * Status Command
 *
 * Show Agent Player backend status
 */

import ora from 'ora';
import chalk from 'chalk';
import { getApiClient } from '../utils/api-client.js';
import { success, error, header, createTable } from '../utils/formatting.js';

export async function statusCommand(): Promise<void> {
  const spinner = ora('Checking backend status...').start();
  const client = getApiClient();

  try {
    const isRunning = await client.isBackendRunning();

    if (!isRunning) {
      spinner.fail('Backend is not running');
      console.log(chalk.gray('\nRun "agent-player start" to start the backend\n'));
      return;
    }

    const status = await client.getStatus();
    spinner.succeed('Backend is running');

    // Get additional info
    const skills = await client.getSkills();
    const channels = await client.getChannels();
    const jobs = await client.getJobs();

    // Display status
    header('Agent Player Status');

    const table = createTable(['Component', 'Status', 'Details']);

    table.push(
      ['Backend', chalk.green('● Running'), `Version ${status.version}`],
      ['Skills', chalk.cyan(skills.length.toString()), `${skills.filter((s: any) => s.enabled).length} enabled`],
      ['Channels', chalk.cyan(channels.length.toString()), `${channels.filter((c: any) => c.connected).length} connected`],
      ['Jobs', chalk.cyan(jobs.length.toString()), `${jobs.filter((j: any) => j.enabled).length} active`]
    );

    console.log(table.toString());

    // API Info
    console.log(chalk.gray(`\nAPI: http://localhost:3001`));
    console.log(chalk.gray(`Last check: ${new Date(status.timestamp).toLocaleTimeString()}\n`));

  } catch (err: any) {
    spinner.fail('Failed to get status');
    error(err.message);
  }
}
