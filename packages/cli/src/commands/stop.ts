/**
 * Stop Command
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { success, error, info } from '../utils/formatting.js';

const execAsync = promisify(exec);

export async function stopCommand(): Promise<void> {
  info('Stopping Agent Player backend...');

  try {
    if (process.platform === 'win32') {
      // Windows
      await execAsync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq Agent Player*"');
    } else {
      // Unix
      await execAsync('pkill -f "agent-player"');
    }

    success('Backend stopped');
  } catch (err: any) {
    error('Failed to stop backend');
    console.log('You may need to stop it manually');
  }
}
