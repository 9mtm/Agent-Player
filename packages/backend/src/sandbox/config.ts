/**
 * Sandbox Default Configuration
 * Centralized configuration for the Docker sandbox system
 */

import type { SandboxConfig } from './types.js';

/**
 * Default sandbox configuration
 * Can be overridden via environment variables or API
 */
export const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
  // Sandbox mode: 'off' | 'non-main' | 'all'
  mode: (process.env.SANDBOX_MODE as SandboxConfig['mode']) || 'non-main',

  // Scope: 'workspace' | 'global'
  scope: (process.env.SANDBOX_SCOPE as SandboxConfig['scope']) || 'workspace',

  // Workspace access: 'none' | 'read' | 'write'
  workspaceAccess: (process.env.SANDBOX_WORKSPACE_ACCESS as SandboxConfig['workspaceAccess']) || 'read',

  // Docker configuration
  docker: {
    image: process.env.SANDBOX_IMAGE || 'agent-sandbox:latest',
    network: (process.env.SANDBOX_NETWORK || 'none') as 'none' | 'bridge' | 'host',
    privileged: process.env.SANDBOX_PRIVILEGED === 'true' || false,
    autoRemove: process.env.SANDBOX_AUTO_REMOVE !== 'false',
    workDir: process.env.SANDBOX_WORK_DIR || '/workspace',
  },

  // Resource limits
  timeout: parseInt(process.env.SANDBOX_TIMEOUT || '30000'), // 30 seconds
  maxMemory: parseInt(process.env.SANDBOX_MAX_MEMORY || '512'), // 512 MB
  maxCpu: parseFloat(process.env.SANDBOX_MAX_CPU || '1'), // 1 CPU
};

/**
 * Sandbox Docker image Dockerfile content
 * For building the sandbox image
 */
export const SANDBOX_DOCKERFILE = `
FROM node:20-alpine

# Install common tools
RUN apk add --no-cache \\
    bash \\
    git \\
    curl \\
    wget \\
    python3 \\
    py3-pip \\
    jq \\
    openssh-client

# Create non-root user for security
RUN addgroup -g 1000 sandbox && \\
    adduser -u 1000 -G sandbox -s /bin/bash -D sandbox

# Set working directory
WORKDIR /workspace

# Switch to non-root user
USER sandbox

# Default command
CMD ["/bin/bash"]
`;

/**
 * Environment variables documentation
 */
export const ENV_VARS = {
  SANDBOX_MODE: {
    description: 'Sandbox isolation mode',
    values: ['off', 'non-main', 'all'],
    default: 'non-main',
  },
  SANDBOX_SCOPE: {
    description: 'Sandbox scope',
    values: ['workspace', 'global'],
    default: 'workspace',
  },
  SANDBOX_WORKSPACE_ACCESS: {
    description: 'Workspace access level',
    values: ['none', 'read', 'write'],
    default: 'read',
  },
  SANDBOX_IMAGE: {
    description: 'Docker image for sandbox',
    default: 'agent-sandbox:latest',
  },
  SANDBOX_NETWORK: {
    description: 'Docker network mode',
    values: ['none', 'bridge', 'host'],
    default: 'none',
  },
  SANDBOX_TIMEOUT: {
    description: 'Command execution timeout (ms)',
    default: '30000',
  },
  SANDBOX_MAX_MEMORY: {
    description: 'Maximum memory (MB)',
    default: '512',
  },
  SANDBOX_MAX_CPU: {
    description: 'Maximum CPU cores',
    default: '1',
  },
};
