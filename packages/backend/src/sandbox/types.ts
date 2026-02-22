/**
 * Sandbox System Types
 * Docker-based isolation for command execution
 */

export type SandboxMode = 'off' | 'non-main' | 'all';
export type SandboxScope = 'session' | 'agent' | 'shared' | 'workspace' | 'global';
export type WorkspaceAccess = 'none' | 'ro' | 'rw' | 'read' | 'write';

export interface SandboxConfig {
  /** Sandbox mode: off = disabled, non-main = sandbox non-main threads, all = sandbox everything */
  mode: SandboxMode;
  /** Scope of sandbox: session = per session, agent = per agent, shared = global */
  scope: SandboxScope;
  /** Workspace access level */
  workspaceAccess: WorkspaceAccess;
  /** Docker configuration */
  docker: DockerConfig;
  /** Allowed commands (whitelist) */
  allowedCommands?: string[];
  /** Blocked commands (blacklist) */
  blockedCommands?: string[];
  /** Timeout in milliseconds */
  timeout: number;
  /** Max memory in MB */
  maxMemory: number;
  /** Max CPU cores */
  maxCpu: number;
}

export interface DockerConfig {
  /** Docker image to use */
  image: string;
  /** Volume binds */
  binds?: string[];
  /** Network mode */
  network: 'none' | 'bridge' | 'host';
  /** Environment variables */
  env?: Record<string, string>;
  /** Working directory inside container */
  workDir: string;
  /** User to run as */
  user?: string;
  /** Run in privileged mode */
  privileged?: boolean;
  /** Auto remove container after use */
  autoRemove?: boolean;
}

export interface SandboxSession {
  /** Unique session ID */
  id: string;
  /** Container ID */
  containerId: string;
  /** Container name */
  containerName: string;
  /** Session status */
  status: 'creating' | 'running' | 'stopped' | 'error';
  /** Creation time */
  createdAt: Date;
  /** Last activity time */
  lastActivityAt: Date;
  /** Associated agent ID */
  agentId?: string;
  /** Configuration used */
  config: SandboxConfig;
}

export interface ExecutionRequest {
  /** Command to execute */
  command: string;
  /** Arguments */
  args?: string[];
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Timeout override */
  timeout?: number;
  /** Whether to capture output */
  captureOutput?: boolean;
  /** Input to pipe to stdin */
  stdin?: string;
}

export interface ExecutionResult {
  /** Exit code */
  exitCode: number;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Execution time in ms */
  duration: number;
  /** Whether execution was sandboxed */
  sandboxed: boolean;
  /** Container ID if sandboxed */
  containerId?: string;
  /** Error if any */
  error?: string;
  /** Whether command was blocked */
  blocked?: boolean;
  /** Reason for blocking */
  blockReason?: string;
}

export interface SandboxStats {
  /** Total executions */
  totalExecutions: number;
  /** Sandboxed executions */
  sandboxedExecutions: number;
  /** Blocked executions */
  blockedExecutions: number;
  /** Active containers */
  activeContainers: number;
  /** Average execution time */
  avgExecutionTime: number;
}

/** Dangerous command patterns */
export const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\/(?!\w)/,           // rm -rf /
  /rm\s+-rf\s+\/\*/,               // rm -rf /*
  /mkfs\./,                         // mkfs.*
  /dd\s+if=\/dev\/zero/,           // dd if=/dev/zero
  /:\(\)\{:\|:&\};:/,              // Fork bomb
  /chmod\s+-R\s+777\s+\//,         // chmod -R 777 /
  />(\/dev\/sda|\/dev\/hda)/,      // Write to disk
  /\|\s*(sh|bash|zsh|fish)/,       // Pipe to shell
  /wget.*\|\s*(sh|bash)/,          // wget | sh
  /curl.*\|\s*(sh|bash)/,          // curl | sh
  /eval\s*\(/,                     // eval()
  /\$\(.*\)/,                      // Command substitution
];
