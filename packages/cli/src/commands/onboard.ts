/**
 * Onboard Command
 *
 * Interactive onboarding wizard for first-time setup
 */

import chalk from 'chalk';
import { getApiClient } from '../utils/api-client.js';
import { error } from '../utils/formatting.js';

export async function onboardCommand(): Promise<void> {
  const client = getApiClient();

  try {
    // Check if backend is running
    const isRunning = await client.isBackendRunning();

    if (!isRunning) {
      console.log(chalk.yellow('\n⚠️  Backend is not running'));
      console.log(chalk.cyan('\nStarting backend...\n'));

      // Start backend first
      const { spawn } = await import('child_process');
      const backendProcess = spawn('pnpm', ['--filter', '@agent-player/backend', 'dev'], {
        stdio: 'inherit',
        shell: true
      });

      // Wait for backend to start
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Trigger onboarding via API
    console.log(chalk.cyan('\n🚀 Starting Onboarding Wizard...\n'));

    const response = await client.startOnboarding();

    if (response.success) {
      console.log(chalk.green('\n✅ Onboarding completed successfully!\n'));
      console.log(chalk.cyan('You can now use Agent Player with:'));
      console.log(chalk.white('  agent-player start\n'));
    }

  } catch (err: any) {
    error('Onboarding failed');
    console.error(err.message);
  }
}
