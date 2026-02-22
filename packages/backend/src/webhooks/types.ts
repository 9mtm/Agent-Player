/**
 * Webhooks System Types
 * Outbound and inbound webhook management
 */

/** Webhook event types */
export type WebhookEventType =
  // Agent events
  | 'agent.started'
  | 'agent.stopped'
  | 'agent.message'
  | 'agent.error'
  // Session events
  | 'session.created'
  | 'session.ended'
  | 'session.message'
  // Workflow events
  | 'workflow.started'
  | 'workflow.completed'
  | 'workflow.failed'
  | 'workflow.node.executed'
  // System events
  | 'system.startup'
  | 'system.shutdown'
  | 'system.error'
  | 'system.alert'
  // Channel events
  | 'channel.connected'
  | 'channel.disconnected'
  | 'channel.message'
  // Custom events
  | 'custom';

/** Webhook HTTP methods */
export type WebhookMethod = 'POST' | 'PUT' | 'PATCH';

/** Webhook status */
export type WebhookStatus = 'active' | 'paused' | 'failed' | 'disabled';

/** Webhook authentication types */
export type WebhookAuthType = 'none' | 'bearer' | 'basic' | 'api_key' | 'hmac' | 'custom';

/** Outbound webhook configuration */
export interface WebhookConfig {
  /** Unique webhook ID */
  id: string;
  /** Webhook name */
  name: string;
  /** Description */
  description?: string;
  /** Target URL */
  url: string;
  /** HTTP method */
  method: WebhookMethod;
  /** Events to trigger on */
  events: WebhookEventType[];
  /** Current status */
  status: WebhookStatus;
  /** Authentication configuration */
  auth?: WebhookAuth;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Retry configuration */
  retry: RetryConfig;
  /** Secret for payload signing */
  secret?: string;
  /** Filter conditions */
  filters?: WebhookFilter[];
  /** Transform template */
  transform?: string;
  /** Timeout in ms */
  timeout: number;
  /** Creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
  /** Owner ID */
  ownerId?: string;
  /** Tags */
  tags?: string[];
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/** Webhook authentication */
export interface WebhookAuth {
  /** Auth type */
  type: WebhookAuthType;
  /** Token for bearer auth */
  token?: string;
  /** Username for basic auth */
  username?: string;
  /** Password for basic auth */
  password?: string;
  /** API key name (header name) */
  apiKeyName?: string;
  /** API key value */
  apiKeyValue?: string;
  /** HMAC algorithm */
  hmacAlgorithm?: 'sha256' | 'sha512';
  /** HMAC header name */
  hmacHeader?: string;
  /** Custom auth header */
  customHeader?: string;
  /** Custom auth value */
  customValue?: string;
}

/** Retry configuration */
export interface RetryConfig {
  /** Enable retries */
  enabled: boolean;
  /** Max retry attempts */
  maxAttempts: number;
  /** Initial delay in ms */
  initialDelay: number;
  /** Max delay in ms */
  maxDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Retry on status codes */
  retryOnStatus?: number[];
}

/** Webhook filter */
export interface WebhookFilter {
  /** Field to filter on */
  field: string;
  /** Operator */
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'regex';
  /** Value to compare */
  value: string | number | boolean;
}

/** Webhook delivery record */
export interface WebhookDelivery {
  /** Delivery ID */
  id: string;
  /** Webhook ID */
  webhookId: string;
  /** Event type */
  eventType: WebhookEventType;
  /** Event ID */
  eventId: string;
  /** Request URL */
  url: string;
  /** Request method */
  method: WebhookMethod;
  /** Request headers (sanitized) */
  requestHeaders: Record<string, string>;
  /** Request body */
  requestBody: string;
  /** Response status */
  responseStatus?: number;
  /** Response headers */
  responseHeaders?: Record<string, string>;
  /** Response body (truncated) */
  responseBody?: string;
  /** Delivery status */
  status: 'pending' | 'success' | 'failed' | 'retrying';
  /** Attempt number */
  attempt: number;
  /** Duration in ms */
  duration?: number;
  /** Error message */
  error?: string;
  /** Timestamp */
  timestamp: Date;
  /** Next retry timestamp */
  nextRetry?: Date;
}

/** Webhook event payload */
export interface WebhookPayload {
  /** Event ID */
  id: string;
  /** Event type */
  type: WebhookEventType;
  /** Timestamp */
  timestamp: string;
  /** Event data */
  data: Record<string, unknown>;
  /** Source info */
  source: {
    /** Source type */
    type: string;
    /** Source ID */
    id: string;
    /** Source name */
    name?: string;
  };
  /** Webhook metadata */
  webhook: {
    /** Webhook ID */
    id: string;
    /** Webhook name */
    name: string;
    /** Delivery attempt */
    attempt: number;
  };
}

/** Inbound webhook (for receiving external calls) */
export interface InboundWebhook {
  /** Unique ID */
  id: string;
  /** Webhook name */
  name: string;
  /** Description */
  description?: string;
  /** Unique endpoint path */
  path: string;
  /** Secret for validation */
  secret: string;
  /** Allowed IP addresses */
  allowedIps?: string[];
  /** Current status */
  status: 'active' | 'disabled';
  /** Handler action */
  handler: InboundHandler;
  /** Creation timestamp */
  createdAt: Date;
  /** Last triggered */
  lastTriggered?: Date;
  /** Total triggers */
  triggerCount: number;
}

/** Inbound webhook handler */
export interface InboundHandler {
  /** Handler type */
  type: 'workflow' | 'agent' | 'skill' | 'custom';
  /** Target ID (workflow/agent/skill ID) */
  targetId?: string;
  /** Custom handler function name */
  functionName?: string;
  /** Transform incoming data */
  transform?: string;
}

/** Webhook statistics */
export interface WebhookStats {
  /** Total webhooks */
  totalWebhooks: number;
  /** Active webhooks */
  activeWebhooks: number;
  /** Total deliveries (24h) */
  deliveries24h: number;
  /** Successful deliveries (24h) */
  successful24h: number;
  /** Failed deliveries (24h) */
  failed24h: number;
  /** Average response time */
  avgResponseTime: number;
  /** Pending retries */
  pendingRetries: number;
}

/** Default retry configuration */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  enabled: true,
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 60000,
  backoffMultiplier: 2,
  retryOnStatus: [408, 429, 500, 502, 503, 504],
};

/** Default webhook timeout */
export const DEFAULT_WEBHOOK_TIMEOUT = 30000;
