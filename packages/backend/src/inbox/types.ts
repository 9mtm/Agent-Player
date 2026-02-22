/**
 * Inbox System - Type Definitions
 *
 * Smart inbox for incoming messages from various sources
 * with auto-execution and approval workflows
 */

// ===================
// Core Types
// ===================

export type SourceType =
  | 'whatsapp'
  | 'telegram'
  | 'gmail'
  | 'github'
  | 'discord'
  | 'slack'
  | 'webhook'
  | 'manual'
  | 'other';

export type MessageStatus =
  | 'pending'           // Just received
  | 'processing'        // Being processed
  | 'completed'         // Successfully completed
  | 'failed'            // Failed to execute
  | 'needs_approval';   // Waiting for human approval

export type RiskLevel = 'low' | 'medium' | 'high';

export type ApprovalStatus = 'pending' | 'approved' | 'denied';

// ===================
// Inbox Message
// ===================

export interface InboxMessage {
  // Primary key
  id: string;
  userId: string;

  // Source information
  sourceType: SourceType;
  sourceId?: string;                    // External message/event ID

  // Message content
  message: string;                      // The actual message text
  metadata?: Record<string, any>;       // Extra data (sender, subject, etc.)

  // Processing state
  status: MessageStatus;
  riskLevel?: RiskLevel;
  autoExecuted?: boolean;

  // Approval tracking
  approvalNeeded?: boolean;
  approvalStatus?: ApprovalStatus;
  approvedBy?: string;                  // User ID who approved
  approvedAt?: Date;

  // Execution results
  result?: any;                         // Execution result (JSON)
  error?: string;                       // Error message if failed

  // Timestamps
  receivedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
}

// ===================
// Risk Assessment
// ===================

export type RiskSignalType =
  | 'dangerous_keyword'
  | 'bulk_action'
  | 'external_source'
  | 'system_access'
  | 'destructive_action'
  | 'financial_action';

export interface RiskSignal {
  type: RiskSignalType;
  weight: number;                       // Risk weight (1-10)
  keyword?: string;                     // Matched keyword (if applicable)
  count?: number;                       // Volume count (if applicable)
  source?: string;                      // Source type (if applicable)
  description?: string;                 // Human-readable description
}

export interface RiskAssessment {
  level: RiskLevel;
  signals: RiskSignal[];
  score: number;                        // Total risk score
  recommendation: string;               // Human-readable recommendation
}

// ===================
// Approval Rules
// ===================

export interface ApprovalRule {
  // Primary key
  id: string;
  userId: string;

  // Rule matching criteria
  sourceType?: SourceType;              // Match by source
  actionPattern?: string;               // Regex pattern for actions
  riskLevel?: RiskLevel;                // Match by risk level

  // Rule action
  autoApprove: boolean;
  autoDeny: boolean;
  priority: number;                     // 1-10 (higher = checked first)

  // Metadata
  name: string;
  description?: string;
  enabled: boolean;

  // Learning & statistics
  timesApplied: number;
  confidenceScore: number;              // 0.0-1.0

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ===================
// Inbox Gateway
// ===================

export interface InboxReceipt {
  status: 'completed' | 'pending_approval' | 'processing' | 'failed';
  messageId: string;
  autoExecuted?: boolean;
  approvedByRule?: string;              // Rule ID if auto-approved
  riskLevel?: RiskLevel;
  result?: any;
  error?: string;
}

export interface ExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  executedAt: Date;
}

// ===================
// Database Row Types (from SQLite)
// ===================

export interface InboxMessageRow {
  id: string;
  user_id: string;
  source_type: string;
  source_id: string | null;
  message: string;
  metadata: string;                     // JSON string
  status: string;
  risk_level: string | null;
  auto_executed: number;                // SQLite boolean (0|1)
  approval_needed: number;              // SQLite boolean
  approval_status: string | null;
  approved_by: string | null;
  approved_at: string | null;           // ISO datetime string
  result: string | null;                // JSON string
  error: string | null;
  received_at: string;                  // ISO datetime string
  processed_at: string | null;
  completed_at: string | null;
}

export interface ApprovalRuleRow {
  id: string;
  user_id: string;
  source_type: string | null;
  action_pattern: string | null;
  risk_level: string | null;
  auto_approve: number;                 // SQLite boolean
  auto_deny: number;
  priority: number;
  name: string;
  description: string | null;
  enabled: number;
  times_applied: number;
  confidence_score: number;
  created_at: string;
  updated_at: string;
}

// ===================
// API Request/Response Types
// ===================

export interface CreateInboxMessageRequest {
  message: string;
  sourceType?: SourceType;
  sourceId?: string;
  metadata?: Record<string, any>;
}

export interface ListInboxMessagesQuery {
  status?: MessageStatus;
  riskLevel?: RiskLevel;
  sourceType?: SourceType;
  limit?: number;
  offset?: number;
}

export interface InboxStatsResponse {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  needsApproval: number;
  autoExecuted: number;
  lowRisk: number;
  mediumRisk: number;
  highRisk: number;
}

export interface ApprovalDecision {
  decision: 'approved' | 'denied';
  reason?: string;
}

// ===================
// Rule Suggestion
// ===================

export interface RuleSuggestion {
  name: string;
  description: string;
  sourceType?: SourceType;
  actionPattern?: string;
  riskLevel?: RiskLevel;
  autoApprove: boolean;
  confidence: number;                   // 0.0-1.0
  basedOn: {
    occurrences: number;                // How many times user approved this
    lastApproved: Date;
  };
}

// ===================
// Learning Types
// ===================

export interface ApprovalPattern {
  messagePattern: string;
  sourceType: SourceType;
  riskLevel: RiskLevel;
  approvalRate: number;                 // 0.0-1.0 (always approved = 1.0)
  occurrences: number;
  lastSeen: Date;
}

// ===================
// Helper Types
// ===================

export interface MessageFilter {
  userId: string;
  status?: MessageStatus;
  sourceType?: SourceType;
  riskLevel?: RiskLevel;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}
