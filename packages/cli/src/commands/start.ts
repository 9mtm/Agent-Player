/**
 * Start Command
 */

import chalk from 'chalk';
import { spawn } from 'child_process';
import { success, error, info } from '../utils/formatting.js';

export async function startCommand(options: { daemon?: boolean }): Promise<void> {
  info('Starting Agent Player backend...');

  if (options.daemon) {
    // Start as daemon
    const child = spawn('npm', ['start'], {
      cwd: '../../backend',
      detached: true,
      stdio: 'ignore'
    });

    child.unref();
    success('Backend started in daemon mode');
  } else {
    // Start in foreground
    console.log(chalk.gray('Starting backend in foreground mode...'));
    console.log(chalk.gray('Press Ctrl+C to stop\n'));

    const child = spawn('npm', ['start'], {
      cwd: '../../backend',
      stdio: 'inherit'
    });

    child.on('exit', (code) => {
      if (code === 0) {
        success('Backend stopped');
      } else {
        error(`Backend exited with code ${code}`);
      }
    });
  }
}
