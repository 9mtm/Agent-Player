/**
 * Custom Workflow Engine - Types
 *
 * NO Vercel Workflow SDK - написано с нуля!
 */

export type NodeType = 'trigger' | 'action' | 'condition' | 'loop' | 'data';

export type TriggerType = 'schedule' | 'webhook' | 'channel' | 'manual';
export type ActionType = 'skill' | 'api' | 'message' | 'desktop' | 'script';
export type ConditionOperator = 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';

// Base node interface
export interface WorkflowNode {
  id: string;
  type: NodeType;
  data: Record<string, any>;
  position?: { x: number; y: number }; // For React Flow
}

// Trigger nodes
export interface TriggerNode extends WorkflowNode {
  type: 'trigger';
  data: {
    triggerType: TriggerType;
    schedule?: string; // Cron expression
    webhookPath?: string;
    channelId?: string;
  };
}

// Action nodes
export interface ActionNode extends WorkflowNode {
  type: 'action';
  data: {
    actionType: ActionType;
    skillName?: string;
    apiUrl?: string;
    apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    apiHeaders?: Record<string, string>;
    apiBody?: string;
    message?: string;
    channelId?: string;
  };
}

// Condition nodes
export interface ConditionNode extends WorkflowNode {
  type: 'condition';
  data: {
    field: string;
    operator: ConditionOperator;
    value: any;
  };
}

// Loop nodes
export interface LoopNode extends WorkflowNode {
  type: 'loop';
  data: {
    arrayPath: string; // Path to array in context
    itemVariable: string; // Variable name for current item
  };
}

// Data transformation nodes
export interface DataNode extends WorkflowNode {
  type: 'data';
  data: {
    operation: 'transform' | 'filter' | 'merge' | 'split';
    config: Record<string, any>;
  };
}

// Edge (connection between nodes)
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: 'true' | 'false'; // For condition nodes
}

// Complete workflow
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: Date;
  updatedAt: Date;
}

// Execution context
export interface ExecutionContext {
  [key: string]: any;
}

// Execution result
export interface ExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number; // ms
}

// Execution log entry
export interface ExecutionLogEntry {
  nodeId: string;
  timestamp: Date;
  success: boolean;
  data?: any;
  error?: string;
}

// Complete execution log
export interface ExecutionLog {
  workflowId: string;
  executionId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  entries: ExecutionLogEntry[];
  finalResult?: ExecutionResult;
}
