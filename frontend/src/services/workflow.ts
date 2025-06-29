// Workflow Execution Service
import {
  BaseNodeData,
  NodeExecutionState,
  validateWorkflow,
} from "../pages/Board/components/nodeTypes";
import config from "../config";

interface WorkflowExecutionRequest {
  agent_id: number;
  execution_trigger?: string;
  input_data?: Record<string, unknown>;
}

interface WorkflowExecutionResponse {
  success: boolean;
  execution_id: string;
  status: string;
  nodes_executed: number;
  duration_seconds: number;
  output_data?: Record<string, unknown>;
  error_message?: string;
}

interface WorkflowValidation {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  node_count: number;
  edge_count: number;
}

interface ExecutionStatus {
  success: boolean;
  execution_id: string;
  status: string;
  node_states?: Record<
    string,
    {
      status: string;
      start_time?: string;
      end_time?: string;
      error_message?: string;
    }
  >;
  execution_log?: string[];
}

class WorkflowService {
  private baseUrl = `${config.api.baseURL}/api/v1`;

  async executeWorkflow(
    boardId: string,
    request: WorkflowExecutionRequest
  ): Promise<WorkflowExecutionResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/boards/${boardId}/execute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify(request),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("❌ Workflow execution failed:", error);
      throw error;
    }
  }

  async validateWorkflow(boardId: string): Promise<WorkflowValidation> {
    try {
      const response = await fetch(
        `${this.baseUrl}/boards/${boardId}/validate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.validation;
    } catch (error) {
      console.error("❌ Workflow validation failed:", error);
      throw error;
    }
  }

  async getExecutionStatus(executionId: string): Promise<ExecutionStatus> {
    try {
      const response = await fetch(
        `${this.baseUrl}/workflow/execution/${executionId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("❌ Failed to get execution status:", error);
      throw error;
    }
  }

  async getExecutionHistory(boardId: string, limit = 10) {
    try {
      const response = await fetch(
        `${this.baseUrl}/boards/${boardId}/executions?limit=${limit}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("❌ Failed to get execution history:", error);
      throw error;
    }
  }

  // Client-side workflow validation
  validateWorkflowLocally(
    nodes: BaseNodeData[],
    edges: unknown[]
  ): WorkflowValidation {
    const validation = validateWorkflow(nodes, edges as any[]);

    return {
      is_valid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      node_count: nodes.length,
      edge_count: Array.isArray(edges) ? edges.length : 0,
    };
  }

  // Real-time execution monitoring
  monitorExecution(
    executionId: string,
    onUpdate: (status: ExecutionStatus) => void,
    intervalMs = 1000
  ): () => void {
    const interval = setInterval(async () => {
      try {
        const status = await this.getExecutionStatus(executionId);
        onUpdate(status);

        // Stop monitoring if execution is complete
        if (status.status === "completed" || status.status === "error") {
          clearInterval(interval);
        }
      } catch (error) {
        console.error("❌ Error monitoring execution:", error);
        clearInterval(interval);
      }
    }, intervalMs);

    // Return cleanup function
    return () => clearInterval(interval);
  }

  // Enhanced workflow execution with real-time updates
  async executeWorkflowWithMonitoring(
    boardId: string,
    request: WorkflowExecutionRequest,
    onNodeUpdate: (nodeId: string, state: NodeExecutionState) => void,
    onComplete: (result: WorkflowExecutionResponse) => void,
    onError: (error: Error) => void
  ) {
    try {
      // Start execution
      const result = await this.executeWorkflow(boardId, request);

      if (!result.success) {
        throw new Error(result.error_message || "Workflow execution failed");
      }

      // Monitor execution progress
      const stopMonitoring = this.monitorExecution(
        result.execution_id,
        (status) => {
          // Update node states
          if (status.node_states) {
            Object.entries(status.node_states).forEach(
              ([nodeId, nodeState]) => {
                onNodeUpdate(nodeId, {
                  status: nodeState.status as NodeExecutionState["status"],
                  startTime: nodeState.start_time
                    ? new Date(nodeState.start_time)
                    : undefined,
                  endTime: nodeState.end_time
                    ? new Date(nodeState.end_time)
                    : undefined,
                  error: nodeState.error_message,
                  logs: status.execution_log || [],
                });
              }
            );
          }

          // Check if execution is complete
          if (status.status === "completed") {
            onComplete(result);
            stopMonitoring();
          } else if (status.status === "error") {
            onError(new Error("Workflow execution failed"));
            stopMonitoring();
          }
        }
      );
    } catch (error) {
      onError(error as Error);
    }
  }

  // Workflow simulation for demonstration
  async simulateWorkflowExecution(
    nodes: BaseNodeData[],
    onNodeUpdate: (nodeId: string, state: NodeExecutionState) => void,
    onComplete: () => void
  ) {
    // Simulate execution of each node
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      // Start processing
      onNodeUpdate(node.id, {
        status: "processing",
        startTime: new Date(),
        progress: 0,
      });

      // Simulate processing time
      const processingTime = Math.random() * 2000 + 1000; // 1-3 seconds

      await new Promise((resolve) => {
        const interval = setInterval(() => {
          const progress = Math.min(
            100,
            Math.random() * 20 + (Date.now() % 100)
          );
          onNodeUpdate(node.id, {
            status: "processing",
            progress,
            startTime: new Date(Date.now() - (processingTime * progress) / 100),
          });
        }, 100);

        setTimeout(() => {
          clearInterval(interval);
          resolve(void 0);
        }, processingTime);
      });

      // Complete processing
      onNodeUpdate(node.id, {
        status: "completed",
        startTime: new Date(Date.now() - processingTime),
        endTime: new Date(),
        progress: 100,
      });

      // Small delay between nodes
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    onComplete();
  }
}

// Export singleton instance
export const workflowService = new WorkflowService();
export default workflowService;
