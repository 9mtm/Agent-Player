import api from "./api";

// Workflow Types
export interface Workflow {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  is_template: boolean;
  template_id?: number;
  owner_id: number;

  // Metadata
  tags: string[];
  category?: string;
  version: string;
  metadata: Record<string, any>;

  // Execution settings
  trigger_type: string;
  trigger_config: Record<string, any>;
  execution_mode: string;
  timeout_seconds: number;
  max_retries: number;
  retry_delay_seconds: number;

  // Schedule settings
  schedule_enabled: boolean;
  schedule_cron?: string;
  schedule_timezone?: string;

  // Statistics
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  average_duration: number;
  last_executed?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface WorkflowNode {
  id: number;
  workflow_id: number;
  node_id: string;
  name: string;
  description?: string;
  node_type: string;

  // Position and UI
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  color?: string;

  // Configuration
  config: Record<string, any>;
  inputs: Record<string, any>;
  outputs: Record<string, any>;

  // Execution settings
  timeout_seconds?: number;
  retry_count?: number;
  condition?: string;

  // Status tracking
  is_enabled: boolean;
  last_execution_status?: string;
  last_execution_time?: string;

  created_at: string;
  updated_at: string;
}

export interface WorkflowConnection {
  id: number;
  workflow_id: number;
  source_node_id: string;
  target_node_id: string;
  source_port: string;
  target_port: string;
  condition?: string;
  label?: string;
  is_enabled: boolean;
  created_at: string;
}

export interface WorkflowExecution {
  id: number;
  workflow_id: number;
  execution_id: string;
  trigger_type: string;
  trigger_data?: Record<string, any>;

  // Status and timing
  status: string;
  started_at: string;
  completed_at?: string;
  duration?: number;

  // Results
  success: boolean;
  error_message?: string;
  result_data?: Record<string, any>;

  // Execution context
  execution_context: Record<string, any>;
  node_executions_count: number;
  failed_nodes: number;

  // Metadata
  triggered_by?: string;
  metadata: Record<string, any>;
}

export interface WorkflowNodeExecution {
  id: number;
  workflow_execution_id: number;
  node_id: string;
  node_name: string;
  node_type: string;

  // Execution details
  status: string;
  started_at: string;
  completed_at?: string;
  duration?: number;

  // Input/Output
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;

  // Results
  success: boolean;
  error_message?: string;
  retry_count: number;

  // Metadata
  execution_metadata: Record<string, any>;
}

export interface WorkflowTemplate {
  id: number;
  name: string;
  description?: string;
  category: string;
  difficulty_level: string;

  // Template data
  workflow_data: Record<string, any>;
  nodes_data: Record<string, any>[];
  connections_data: Record<string, any>[];

  // Usage stats
  usage_count: number;
  rating: number;
  reviews_count: number;

  // Metadata
  tags: string[];
  author?: string;
  version: string;
  is_featured: boolean;
  is_public: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface WorkflowAnalytics {
  workflow_id: number;
  workflow_name: string;
  period_days: number;

  // Execution metrics
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_rate: number;

  // Performance metrics
  average_duration: number;
  min_duration: number;
  max_duration: number;
  total_runtime: number;

  // Node metrics
  most_failed_nodes: Array<{ node_id: string; failure_count: number }>;
  slowest_nodes: Array<{ node_id: string; average_duration: number }>;
  node_success_rates: Record<string, number>;

  // Trend data
  daily_executions: Array<{
    date: string;
    count: number;
    success_rate: number;
  }>;
  hourly_distribution: Array<{ hour: number; count: number }>;

  // Error analysis
  error_patterns: Array<{ error_type: string; count: number; nodes: string[] }>;

  generated_at: string;
}

// Request Types
export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  trigger_type?: string;
  trigger_config?: Record<string, any>;
  execution_mode?: string;
  timeout_seconds?: number;
  max_retries?: number;
  category?: string;
  tags?: string[];
}

export interface UpdateWorkflowRequest extends Partial<CreateWorkflowRequest> {
  is_active?: boolean;
  schedule_enabled?: boolean;
  schedule_cron?: string;
  schedule_timezone?: string;
}

export interface CreateNodeRequest {
  node_id: string;
  name: string;
  description?: string;
  node_type: string;
  position_x: number;
  position_y: number;
  width?: number;
  height?: number;
  config?: Record<string, any>;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
}

export interface CreateConnectionRequest {
  source_node_id: string;
  target_node_id: string;
  source_port: string;
  target_port: string;
  condition?: string;
  label?: string;
}

export interface ExecuteWorkflowRequest {
  trigger_data?: Record<string, any>;
  execution_context?: Record<string, any>;
  override_settings?: Record<string, any>;
}

export interface WorkflowListParams {
  skip?: number;
  limit?: number;
  is_active?: boolean;
  category?: string;
  tags?: string[];
  search?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

// Node Types
export const NodeTypes = {
  START: "start",
  END: "end",
  ACTION: "action",
  CONDITION: "condition",
  LOOP: "loop",
  DELAY: "delay",
  WEBHOOK: "webhook",
  HTTP_REQUEST: "http_request",
  DATABASE: "database",
  EMAIL: "email",
  NOTIFICATION: "notification",
  BOARD_ACTION: "board_action",
  AGENT_ACTION: "agent_action",
} as const;

export type NodeType = (typeof NodeTypes)[keyof typeof NodeTypes];

// Trigger Types
export const TriggerTypes = {
  MANUAL: "manual",
  WEBHOOK: "webhook",
  SCHEDULE: "schedule",
  BOARD_EVENT: "board_event",
  AGENT_EVENT: "agent_event",
  API_CALL: "api_call",
} as const;

export type TriggerType = (typeof TriggerTypes)[keyof typeof TriggerTypes];

// Workflows Service
class WorkflowsService {
  // Workflow CRUD
  async getWorkflows(params: WorkflowListParams = {}): Promise<{
    workflows: Workflow[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await api.get("/workflows", { params });
    return response.data;
  }

  async getWorkflow(id: number): Promise<Workflow> {
    const response = await api.get(`/workflows/${id}`);
    return response.data;
  }

  async createWorkflow(workflowData: CreateWorkflowRequest): Promise<Workflow> {
    const response = await api.post("/workflows", workflowData);
    return response.data;
  }

  async updateWorkflow(
    id: number,
    workflowData: UpdateWorkflowRequest
  ): Promise<Workflow> {
    const response = await api.put(`/workflows/${id}`, workflowData);
    return response.data;
  }

  async deleteWorkflow(id: number): Promise<void> {
    await api.delete(`/workflows/${id}`);
  }

  async duplicateWorkflow(id: number, name?: string): Promise<Workflow> {
    const response = await api.post(`/workflows/${id}/duplicate`, {
      name,
    });
    return response.data;
  }

  // Node Management
  async getNodes(workflowId: number): Promise<WorkflowNode[]> {
    const response = await api.get(`/workflows/${workflowId}/nodes`);
    return response.data;
  }

  async createNode(
    workflowId: number,
    nodeData: CreateNodeRequest
  ): Promise<WorkflowNode> {
    const response = await api.post(`/workflows/${workflowId}/nodes`, nodeData);
    return response.data;
  }

  async updateNode(
    workflowId: number,
    nodeId: string,
    nodeData: Partial<CreateNodeRequest>
  ): Promise<WorkflowNode> {
    const response = await api.put(
      `/workflows/${workflowId}/nodes/${nodeId}`,
      nodeData
    );
    return response.data;
  }

  async deleteNode(workflowId: number, nodeId: string): Promise<void> {
    await api.delete(`/workflows/${workflowId}/nodes/${nodeId}`);
  }

  // Connection Management
  async getConnections(workflowId: number): Promise<WorkflowConnection[]> {
    const response = await api.get(`/workflows/${workflowId}/connections`);
    return response.data;
  }

  async createConnection(
    workflowId: number,
    connectionData: CreateConnectionRequest
  ): Promise<WorkflowConnection> {
    const response = await api.post(
      `/workflows/${workflowId}/connections`,
      connectionData
    );
    return response.data;
  }

  async deleteConnection(
    workflowId: number,
    connectionId: number
  ): Promise<void> {
    await api.delete(`/workflows/${workflowId}/connections/${connectionId}`);
  }

  // Execution
  async executeWorkflow(
    workflowId: number,
    executionData: ExecuteWorkflowRequest = {}
  ): Promise<WorkflowExecution> {
    const response = await api.post(
      `/workflows/${workflowId}/execute`,
      executionData
    );
    return response.data;
  }

  async stopExecution(
    executionId: string
  ): Promise<{ message: string; success: boolean }> {
    const response = await api.post(
      `/workflows/executions/${executionId}/stop`
    );
    return response.data;
  }

  async getExecution(executionId: string): Promise<WorkflowExecution> {
    const response = await api.get(`/workflows/executions/${executionId}`);
    return response.data;
  }

  async getExecutions(
    workflowId: number,
    limit: number = 50
  ): Promise<WorkflowExecution[]> {
    const response = await api.get(`/workflows/${workflowId}/executions`, {
      params: { limit },
    });
    return response.data;
  }

  async getNodeExecutions(
    executionId: string
  ): Promise<WorkflowNodeExecution[]> {
    const response = await api.get(
      `/workflows/executions/${executionId}/nodes`
    );
    return response.data;
  }

  // Templates
  async getTemplates(
    category?: string,
    difficulty?: string
  ): Promise<WorkflowTemplate[]> {
    const params: Record<string, string> = {};
    if (category) params.category = category;
    if (difficulty) params.difficulty = difficulty;

    const response = await api.get("/workflows/templates", { params });
    return response.data;
  }

  async createFromTemplate(
    templateId: number,
    workflowData: Record<string, any>
  ): Promise<Workflow> {
    const response = await api.post(
      `/workflows/templates/${templateId}/create`,
      workflowData
    );
    return response.data;
  }

  async saveAsTemplate(
    workflowId: number,
    templateData: Partial<WorkflowTemplate>
  ): Promise<WorkflowTemplate> {
    const response = await api.post(
      `/workflows/${workflowId}/save-as-template`,
      templateData
    );
    return response.data;
  }

  // Analytics
  async getAnalytics(
    workflowId: number,
    days: number = 30
  ): Promise<WorkflowAnalytics> {
    const response = await api.get(`/workflows/${workflowId}/analytics`, {
      params: { days },
    });
    return response.data;
  }

  async exportWorkflow(
    workflowId: number,
    format: "json" | "yaml" = "json"
  ): Promise<Blob> {
    const response = await api.get(`/workflows/${workflowId}/export`, {
      params: { format },
      responseType: "blob",
    });
    return response.data;
  }

  async importWorkflow(
    workflowData: any,
    format: "json" | "yaml" = "json"
  ): Promise<Workflow> {
    const response = await api.post("/workflows/import", workflowData, {
      params: { format },
    });
    return response.data;
  }

  // Scheduling
  async enableSchedule(
    workflowId: number,
    cron: string,
    timezone?: string
  ): Promise<{ message: string; next_run: string }> {
    const response = await api.post(
      `/workflows/${workflowId}/schedule/enable`,
      {
        cron,
        timezone,
      }
    );
    return response.data;
  }

  async disableSchedule(workflowId: number): Promise<{ message: string }> {
    const response = await api.post(
      `/workflows/${workflowId}/schedule/disable`
    );
    return response.data;
  }

  async getScheduleStatus(
    workflowId: number
  ): Promise<{ enabled: boolean; next_run?: string; last_run?: string }> {
    const response = await api.get(`/workflows/${workflowId}/schedule/status`);
    return response.data;
  }

  // Webhooks
  async createWebhook(
    workflowId: number,
    webhookConfig?: Record<string, any>
  ): Promise<{ webhook_url: string; webhook_id: string }> {
    const response = await api.post(
      `/workflows/${workflowId}/webhook`,
      webhookConfig
    );
    return response.data;
  }

  async deleteWebhook(
    workflowId: number,
    webhookId: string
  ): Promise<{ message: string }> {
    const response = await api.delete(
      `/workflows/${workflowId}/webhook/${webhookId}`
    );
    return response.data;
  }

  // Node Types and Configurations
  async getNodeTypes(): Promise<
    Array<{
      type: string;
      name: string;
      description: string;
      config_schema: Record<string, any>;
    }>
  > {
    const response = await api.get("/workflows/node-types");
    return response.data;
  }

  async getNodeTypeConfig(nodeType: string): Promise<{
    config_schema: Record<string, any>;
    examples: Record<string, any>[];
  }> {
    const response = await api.get(`/workflows/node-types/${nodeType}/config`);
    return response.data;
  }

  // Validation
  async validateWorkflow(
    workflowId: number
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const response = await api.post(`/workflows/${workflowId}/validate`);
    return response.data;
  }

  async validateNode(
    workflowId: number,
    nodeId: string,
    config: Record<string, any>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const response = await api.post(
      `/workflows/${workflowId}/nodes/${nodeId}/validate`,
      { config }
    );
    return response.data;
  }

  // Testing
  async testWorkflow(
    workflowId: number,
    testData: Record<string, any> = {}
  ): Promise<{
    success: boolean;
    execution_id: string;
    results: Record<string, any>;
  }> {
    const response = await api.post(`/workflows/${workflowId}/test`, testData);
    return response.data;
  }

  async testNode(
    workflowId: number,
    nodeId: string,
    testData: Record<string, any> = {}
  ): Promise<{
    success: boolean;
    output: Record<string, any>;
    errors?: string[];
  }> {
    const response = await api.post(
      `/workflows/${workflowId}/nodes/${nodeId}/test`,
      testData
    );
    return response.data;
  }

  // Utilities
  async searchWorkflows(
    query: string,
    filters: Record<string, any> = {}
  ): Promise<Workflow[]> {
    const response = await api.get("/workflows/search", {
      params: { q: query, ...filters },
    });
    return response.data;
  }

  async getWorkflowStatistics(): Promise<{
    total_workflows: number;
    active_workflows: number;
    total_executions: number;
    success_rate: number;
    average_duration: number;
  }> {
    const response = await api.get("/workflows/statistics");
    return response.data;
  }

  // Real-time updates
  subscribeToWorkflowUpdates(
    workflowId: number,
    callback: (update: any) => void
  ): WebSocket | null {
    if (typeof WebSocket !== "undefined") {
      const ws = new WebSocket(
        `ws://localhost:8000/workflows/${workflowId}/ws`
      );

      ws.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data);
          callback(update);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      return ws;
    }
    return null;
  }
}

export default new WorkflowsService();
