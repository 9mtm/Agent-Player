/**
 * Sandbox System
 * Docker-based isolation for secure command execution
 */

export * from './types.js';
export * from './docker-manager.js';
export * from './executor.js';
export * from './config.js';

import { getDockerManager } from './docker-manager.js';
import { getSandboxExecutor, SandboxExecutor } from './executor.js';
import type { SandboxConfig } from './types.js';

/**
 * Initialize the sandbox system
 */
export async function initializeSandbox(
  config?: Partial<SandboxConfig>,
  agentId?: string
): Promise<SandboxExecutor> {
  const executor = getSandboxExecutor(config);
  await executor.initialize(agentId);
  return executor;
}

/**
 * Cleanup all sandbox resources
 */
export async function cleanupSandbox(): Promise<void> {
  const docker = getDockerManager();
  await docker.cleanup();
}

/**
 * Get sandbox system status
 */
export function getSandboxStatus(): {
  dockerAvailable: boolean;
  activeSessions: number;
  stats: ReturnType<SandboxExecutor['getStats']>;
} {
  const docker = getDockerManager();
  const executor = getSandboxExecutor();

  return {
    dockerAvailable: docker.getActiveSessions().length > 0 || executor.getConfig().mode !== 'off',
    activeSessions: docker.getActiveSessions().length,
    stats: executor.getStats(),
  };
}
