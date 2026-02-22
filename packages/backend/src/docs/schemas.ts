/**
 * OpenAPI Schema Definitions
 * Common schemas used across API endpoints
 */

// ============ Common Schemas ============

export const ErrorResponse = {
  type: 'object',
  properties: {
    error: { type: 'string', description: 'Error message' },
    code: { type: 'string', description: 'Error code' },
  },
  required: ['error'],
} as const;

export const SuccessResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean', description: 'Operation success status' },
  },
  required: ['success'],
} as const;

export const PaginationQuery = {
  type: 'object',
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 50, description: 'Number of items to return' },
    offset: { type: 'integer', minimum: 0, default: 0, description: 'Number of items to skip' },
  },
} as const;

// ============ Multi-Agent Schemas ============

export const AgentDefinition = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Unique agent identifier' },
    name: { type: 'string', description: 'Agent name' },
    description: { type: 'string', description: 'Agent description' },
    role: {
      type: 'string',
      enum: ['leader', 'worker', 'specialist', 'reviewer', 'assistant'],
      description: 'Agent role in team'
    },
    capabilities: {
      type: 'array',
      items: { type: 'string' },
      description: 'Agent capabilities/skills'
    },
    model: { type: 'string', description: 'AI model to use' },
    systemPrompt: { type: 'string', description: 'System prompt for agent' },
    maxConcurrentTasks: { type: 'integer', minimum: 1, default: 3, description: 'Max concurrent tasks' },
  },
  required: ['id', 'name', 'role', 'capabilities'],
} as const;

export const AgentInstance = {
  type: 'object',
  properties: {
    definition: { $ref: '#/components/schemas/AgentDefinition' },
    status: {
      type: 'string',
      enum: ['idle', 'busy', 'waiting', 'error', 'offline'],
      description: 'Current agent status'
    },
    currentTasks: {
      type: 'array',
      items: { type: 'string' },
      description: 'IDs of current tasks'
    },
    completedTasks: { type: 'integer', description: 'Count of completed tasks' },
    failedTasks: { type: 'integer', description: 'Count of failed tasks' },
    lastActivity: { type: 'string', format: 'date-time', description: 'Last activity timestamp' },
    teamId: { type: 'string', description: 'Team membership ID' },
  },
} as const;

export const Task = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Unique task identifier' },
    title: { type: 'string', description: 'Task title' },
    description: { type: 'string', description: 'Task description' },
    priority: {
      type: 'string',
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      description: 'Task priority'
    },
    status: {
      type: 'string',
      enum: ['pending', 'assigned', 'in_progress', 'review', 'completed', 'failed', 'cancelled'],
      description: 'Task status'
    },
    requiredCapabilities: {
      type: 'array',
      items: { type: 'string' },
      description: 'Required agent capabilities'
    },
    assignedTo: { type: 'string', description: 'Assigned agent ID' },
    teamId: { type: 'string', description: 'Team ID' },
    parentId: { type: 'string', description: 'Parent task ID (for subtasks)' },
    dependencies: {
      type: 'array',
      items: { type: 'string' },
      description: 'Dependent task IDs'
    },
    progress: { type: 'integer', minimum: 0, maximum: 100, description: 'Task progress percentage' },
    createdAt: { type: 'string', format: 'date-time' },
    startedAt: { type: 'string', format: 'date-time' },
    completedAt: { type: 'string', format: 'date-time' },
    deadline: { type: 'string', format: 'date-time' },
    error: { type: 'string', description: 'Error message if failed' },
  },
  required: ['title', 'description'],
} as const;

export const TeamDefinition = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Unique team identifier' },
    name: { type: 'string', description: 'Team name' },
    description: { type: 'string', description: 'Team description' },
    objective: { type: 'string', description: 'Team objective' },
    agentIds: {
      type: 'array',
      items: { type: 'string' },
      description: 'Agent IDs in team'
    },
    leaderId: { type: 'string', description: 'Leader agent ID' },
    communicationStyle: {
      type: 'string',
      enum: ['hierarchical', 'flat', 'dynamic'],
      description: 'Team communication style'
    },
    sharedMemory: { type: 'boolean', description: 'Enable shared memory' },
  },
  required: ['name', 'objective', 'agentIds'],
} as const;

export const AgentMessage = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Message ID' },
    from: { type: 'string', description: 'Sender agent ID' },
    to: { type: 'string', description: 'Recipient agent ID' },
    type: {
      type: 'string',
      enum: ['task_assignment', 'task_update', 'task_complete', 'request_help', 'provide_info', 'question', 'answer', 'broadcast', 'handoff'],
      description: 'Message type'
    },
    content: { type: 'string', description: 'Message content' },
    taskId: { type: 'string', description: 'Related task ID' },
    teamId: { type: 'string', description: 'Team ID' },
    timestamp: { type: 'string', format: 'date-time' },
    read: { type: 'boolean', description: 'Read status' },
  },
  required: ['from', 'to', 'type', 'content'],
} as const;

// ============ Browser Schemas ============

export const BrowserConfig = {
  type: 'object',
  properties: {
    headless: { type: 'boolean', default: true, description: 'Run in headless mode' },
    viewportWidth: { type: 'integer', default: 1280, description: 'Viewport width' },
    viewportHeight: { type: 'integer', default: 720, description: 'Viewport height' },
    userAgent: { type: 'string', description: 'Custom user agent' },
    timeout: { type: 'integer', default: 30000, description: 'Default timeout (ms)' },
    navigationTimeout: { type: 'integer', default: 60000, description: 'Navigation timeout (ms)' },
    javascript: { type: 'boolean', default: true, description: 'Enable JavaScript' },
    ignoreHttpsErrors: { type: 'boolean', default: false, description: 'Ignore HTTPS errors' },
  },
} as const;

export const BrowserSession = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Session ID' },
    createdAt: { type: 'string', format: 'date-time' },
    lastActivity: { type: 'string', format: 'date-time' },
    status: {
      type: 'string',
      enum: ['idle', 'navigating', 'interacting', 'waiting', 'error', 'closed'],
      description: 'Session status'
    },
    currentUrl: { type: 'string', description: 'Current page URL' },
    pageTitle: { type: 'string', description: 'Current page title' },
    pageCount: { type: 'integer', description: 'Number of open pages' },
    cookiesCount: { type: 'integer', description: 'Number of cookies' },
    error: { type: 'string', description: 'Error message if any' },
  },
} as const;

export const ElementInfo = {
  type: 'object',
  properties: {
    tagName: { type: 'string', description: 'HTML tag name' },
    id: { type: 'string', description: 'Element ID' },
    classes: { type: 'array', items: { type: 'string' }, description: 'CSS classes' },
    textContent: { type: 'string', description: 'Text content' },
    attributes: { type: 'object', additionalProperties: { type: 'string' }, description: 'Element attributes' },
    isVisible: { type: 'boolean', description: 'Visibility status' },
    isEnabled: { type: 'boolean', description: 'Enabled status' },
    isEditable: { type: 'boolean', description: 'Editable status' },
    boundingBox: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' },
      },
    },
  },
} as const;

export const ScreenshotOptions = {
  type: 'object',
  properties: {
    format: { type: 'string', enum: ['png', 'jpeg', 'webp'], default: 'png' },
    quality: { type: 'integer', minimum: 0, maximum: 100, description: 'Quality for jpeg/webp' },
    fullPage: { type: 'boolean', default: false, description: 'Capture full page' },
    omitBackground: { type: 'boolean', default: false, description: 'Omit background' },
  },
} as const;

// ============ Webhook Schemas ============

export const WebhookConfig = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Webhook ID' },
    name: { type: 'string', description: 'Webhook name' },
    url: { type: 'string', format: 'uri', description: 'Target URL' },
    method: { type: 'string', enum: ['POST', 'PUT', 'PATCH'], default: 'POST' },
    events: { type: 'array', items: { type: 'string' }, description: 'Subscribed events' },
    status: { type: 'string', enum: ['active', 'paused', 'disabled'] },
    secret: { type: 'string', description: 'HMAC signing secret' },
    headers: { type: 'object', additionalProperties: { type: 'string' } },
    retry: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', default: true },
        maxAttempts: { type: 'integer', default: 3 },
        initialDelay: { type: 'integer', default: 1000 },
      },
    },
  },
  required: ['name', 'url', 'events'],
} as const;

export const WebhookDelivery = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    webhookId: { type: 'string' },
    eventType: { type: 'string' },
    url: { type: 'string' },
    status: { type: 'string', enum: ['pending', 'success', 'failed', 'retrying'] },
    responseStatus: { type: 'integer' },
    duration: { type: 'integer', description: 'Duration in ms' },
    attempt: { type: 'integer' },
    timestamp: { type: 'string', format: 'date-time' },
    error: { type: 'string' },
  },
} as const;

// ============ Audit Schemas ============

export const AuditEvent = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    timestamp: { type: 'string', format: 'date-time' },
    category: { type: 'string', enum: ['authentication', 'authorization', 'data', 'system', 'api', 'security'] },
    action: { type: 'string' },
    severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
    actor: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        id: { type: 'string' },
        name: { type: 'string' },
      },
    },
    resource: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        id: { type: 'string' },
      },
    },
    result: { type: 'string', enum: ['success', 'failure', 'error'] },
    details: { type: 'object' },
  },
} as const;

// ============ Heartbeat Schemas ============

export const Heartbeat = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    componentId: { type: 'string' },
    status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy', 'unknown'] },
    latency: { type: 'integer', description: 'Latency in ms' },
    timestamp: { type: 'string', format: 'date-time' },
    metadata: { type: 'object' },
  },
} as const;

export const ComponentHealth = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    type: { type: 'string', enum: ['http', 'tcp', 'database', 'custom'] },
    status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy', 'unknown'] },
    lastCheck: { type: 'string', format: 'date-time' },
    uptime: { type: 'number', description: 'Uptime percentage' },
    avgLatency: { type: 'number', description: 'Average latency in ms' },
  },
} as const;

// ============ Encryption Schemas ============

export const VaultEntry = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    category: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    expiresAt: { type: 'string', format: 'date-time' },
    metadata: { type: 'object' },
  },
} as const;

// ============ Stats Schemas ============

export const MultiAgentStats = {
  type: 'object',
  properties: {
    totalAgents: { type: 'integer' },
    activeAgents: { type: 'integer' },
    totalTeams: { type: 'integer' },
    activeTeams: { type: 'integer' },
    tasksCompleted24h: { type: 'integer' },
    tasksFailed24h: { type: 'integer' },
    avgTaskDuration: { type: 'number' },
    messagesExchanged24h: { type: 'integer' },
  },
} as const;

export const BrowserStats = {
  type: 'object',
  properties: {
    activeSessions: { type: 'integer' },
    totalSessions: { type: 'integer' },
    totalNavigations: { type: 'integer' },
    totalActions: { type: 'integer' },
    failedActions: { type: 'integer' },
    totalScreenshots: { type: 'integer' },
    uptime: { type: 'integer', description: 'Uptime in ms' },
  },
} as const;

// Export all schemas for registration
export const schemas = {
  ErrorResponse,
  SuccessResponse,
  PaginationQuery,
  AgentDefinition,
  AgentInstance,
  Task,
  TeamDefinition,
  AgentMessage,
  BrowserConfig,
  BrowserSession,
  ElementInfo,
  ScreenshotOptions,
  WebhookConfig,
  WebhookDelivery,
  AuditEvent,
  Heartbeat,
  ComponentHealth,
  VaultEntry,
  MultiAgentStats,
  BrowserStats,
};
