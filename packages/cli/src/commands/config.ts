/**
 * Config Command
 */

import chalk from 'chalk';
import { success, error, info, header } from '../utils/formatting.js';

type ConfigAction = 'show' | 'set' | 'reset';

export async function configCommand(
  action: ConfigAction,
  key?: string,
  value?: string
): Promise<void> {
  switch (action) {
    case 'show':
      showConfig();
      break;

    case 'set':
      if (!key || !value) {
        error('Please provide key and value');
        return;
      }
      setConfig(key, value);
      break;

    case 'reset':
      resetConfig();
      break;
  }
}

function showConfig(): void {
  header('Current Configuration');

  console.log(chalk.cyan('Backend:'));
  console.log(`  URL: ${process.env.BACKEND_URL || 'http://localhost:3001'}`);
  console.log(`  Port: ${process.env.PORT || '3001'}`);

  console.log(chalk.cyan('\nPaths:'));
  console.log(`  Data: ${process.env.DATA_DIR || './data'}`);
  console.log(`  Skills: ${process.env.SKILLS_DIR || './skills'}`);

  console.log();
}

function setConfig(key: string, value: string): void {
  info(`Setting ${key} = ${value}`);
  // TODO: Implement config storage
  success('Configuration updated');
}

function resetConfig(): void {
  info('Resetting configuration to defaults...');
  // TODO: Implement config reset
  success('Configuration reset');
}
