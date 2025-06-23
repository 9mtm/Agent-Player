import api from "./api";
import type { CreateAgentData } from "../types";

// Specialized Roles for Child Agents
export const SpecializedRoles = {
  RESEARCHER: "researcher",
  ANALYZER: "analyzer",
  CREATOR: "creator",
  MODERATOR: "moderator",
  ASSISTANT: "assistant",
  SPECIALIST: "specialist",
  COORDINATOR: "coordinator",
  VALIDATOR: "validator",
} as const;

export type SpecializedRole =
  (typeof SpecializedRoles)[keyof typeof SpecializedRoles];

// Task Types for Child Agents
export const TaskTypes = {
  RESEARCH: "research",
  ANALYSIS: "analysis",
  CREATION: "creation",
  MODERATION: "moderation",
  ASSISTANCE: "assistance",
  COORDINATION: "coordination",
  VALIDATION: "validation",
  MONITORING: "monitoring",
} as const;

export type TaskType = (typeof TaskTypes)[keyof typeof TaskTypes];

// Child Agent Types
export interface ChildAgent {
  id: number;
  name: string;
  description?: string;
  parent_agent_id: number;
  parent_agent_name?: string;
  specialization: string;
  status: "active" | "inactive" | "training";
  capabilities: string[];
  training_progress?: number;
  performance_score?: number;
  tasks_completed?: number;
  learning_enabled: boolean;
  autonomy_level: string;
  created_at: string;
  updated_at?: string;
}

// Additional Child Agent Types
export interface ChildAgentTask {
  id: number;
  title: string;
  description?: string;
  type: TaskType;
  status: "pending" | "running" | "completed" | "failed";
  priority: "low" | "medium" | "high";
  progress: number;
  agent_id: number;
  created_at: string;
  updated_at?: string;
}

export interface ChildAgentLearning {
  id: number;
  agent_id: number;
  learning_type: string;
  progress: number;
  accuracy: number;
  created_at: string;
}

export interface ChildAgentPerformance {
  id: number;
  agent_id: number;
  metric_name: string;
  metric_value: number;
  period: string;
  created_at: string;
}

export interface ChildAgentTemplate {
  id: number;
  name: string;
  description?: string;
  specialization: SpecializedRole;
  default_capabilities: string[];
  template_config: Record<string, any>;
}

export interface CreateChildAgentRequest {
  name: string;
  description?: string;
  parent_agent_id: number;
  specialization: SpecializedRole;
  capabilities: string[];
  learning_enabled?: boolean;
  autonomy_level?: string;
}

export interface UpdateChildAgentRequest {
  name?: string;
  description?: string;
  specialization?: SpecializedRole;
  capabilities?: string[];
  status?: "active" | "inactive" | "training";
  learning_enabled?: boolean;
  autonomy_level?: string;
}

export interface ChildAgentAnalytics {
  total_agents: number;
  active_agents: number;
  tasks_completed: number;
  average_performance: number;
  specialization_distribution: Record<SpecializedRole, number>;
}

// Child Agent Endpoints - Updated to use new unified structure
const CHILD_AGENTS_ENDPOINTS = {
  list: "/agents/child",
  create: "/agents/child",
  get: (id: number) => `/agents/${id}`,
  update: (id: number) => `/agents/${id}`,
  delete: (id: number) => `/agents/${id}`,
  byParent: (parentId: number) => `/agents/${parentId}/children`,
  status: (id: number) => `/agents/${id}/test`,
} as const;

// Child Agent Service - Updated for new API structure
export const childAgentsService = {
  // Get all child agents
  async getChildAgents(): Promise<ChildAgent[]> {
    try {
      const response = await api.get(CHILD_AGENTS_ENDPOINTS.list);
      return response.data.data || response.data || [];
    } catch (error) {
      console.error("Error getting child agents:", error);
      return [];
    }
  },

  // Get child agent by ID
  async getChildAgent(id: number): Promise<ChildAgent | null> {
    try {
      const response = await api.get(CHILD_AGENTS_ENDPOINTS.get(id));
      return response.data.data || response.data;
    } catch (error) {
      console.error("Error getting child agent:", error);
      return null;
    }
  },

  // Create new child agent
  async createChildAgent(
    agentData: CreateAgentData & { parent_agent_id: number }
  ): Promise<{ success: boolean; agent?: ChildAgent; error?: string }> {
    try {
      const response = await api.post(CHILD_AGENTS_ENDPOINTS.create, agentData);

      if (response.data && response.data.success !== false) {
        const agent = response.data.data || response.data;
        return { success: true, agent };
      } else {
        return {
          success: false,
          error: response.data.message || "Failed to create child agent",
        };
      }
    } catch (error: any) {
      console.error("Error creating child agent:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to create child agent",
      };
    }
  },

  // Update child agent
  async updateChildAgent(
    id: number,
    agentData: Partial<ChildAgent>
  ): Promise<{ success: boolean; agent?: ChildAgent; error?: string }> {
    try {
      const response = await api.put(
        CHILD_AGENTS_ENDPOINTS.update(id),
        agentData
      );

      if (response.data && response.data.success !== false) {
        const agent = response.data.data || response.data;
        return { success: true, agent };
      } else {
        return {
          success: false,
          error: response.data.message || "Failed to update child agent",
        };
      }
    } catch (error: any) {
      console.error("Error updating child agent:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to update child agent",
      };
    }
  },

  // Delete child agent
  async deleteChildAgent(
    id: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.delete(CHILD_AGENTS_ENDPOINTS.delete(id));

      if (response.data && response.data.success !== false) {
        return { success: true };
      } else {
        return {
          success: false,
          error: response.data.message || "Failed to delete child agent",
        };
      }
    } catch (error: any) {
      console.error("Error deleting child agent:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to delete child agent",
      };
    }
  },

  // Get child agents by parent ID
  async getChildAgentsByParent(parentId: number): Promise<ChildAgent[]> {
    try {
      const response = await api.get(CHILD_AGENTS_ENDPOINTS.byParent(parentId));
      return response.data.data || response.data || [];
    } catch (error) {
      console.error("Error getting child agents by parent:", error);
      return [];
    }
  },

  // Test child agent
  async testChildAgent(
    id: number,
    testMessage?: string
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const requestData = testMessage ? { test_message: testMessage } : {};
      const response = await api.post(
        CHILD_AGENTS_ENDPOINTS.status(id),
        requestData
      );

      if (response.data && response.data.success !== false) {
        return { success: true, result: response.data.data || response.data };
      } else {
        return {
          success: false,
          error: response.data.message || "Child agent test failed",
        };
      }
    } catch (error: any) {
      console.error("Error testing child agent:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Child agent test failed",
      };
    }
  },

  // Update child agent status
  async updateChildAgentStatus(
    id: number,
    status: "active" | "inactive" | "training"
  ): Promise<{ success: boolean; agent?: ChildAgent; error?: string }> {
    return await this.updateChildAgent(id, { status });
  },
};

export default childAgentsService;
