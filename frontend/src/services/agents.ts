import api from "./api";
import type { Agent, CreateAgentData } from "../types";

// Configuration - Updated to use new API structure
const AGENTS_ENDPOINTS = {
  list: "/agents",
  main: "/agents/main",
  child: "/agents/child",
  create: "/agents",
  createChild: "/agents/child",
  get: (id: number) => `/agents/${id}`,
  update: (id: number) => `/agents/${id}`,
  delete: (id: number) => `/agents/${id}`,
  test: (id: number) => `/agents/${id}/test`,
  children: (id: number) => `/agents/${id}/children`,
  statistics: "/agents/statistics/overview",
} as const;

// Helper function to handle both old and new response formats
function extractData<T>(response: any): T[] {
  // If response has 'success' and 'data' properties (new format)
  if (response && response.success && response.data) {
    return Array.isArray(response.data) ? response.data : [];
  }

  // If response has 'data' property (standard format)
  if (response && typeof response === "object" && "data" in response) {
    return Array.isArray(response.data) ? response.data : [];
  }

  // If response is directly an array (old format)
  if (Array.isArray(response)) {
    return response;
  }

  // Fallback: empty array
  console.warn("Unknown response format:", response);
  return [];
}

// Basic CRUD Operations - Updated for new API structure
export const agentsService = {
  // List all agents
  async getAgents(): Promise<Agent[]> {
    try {
      console.log(
        "🔗 Loading agents from:",
        `${api.defaults.baseURL}${AGENTS_ENDPOINTS.list}`
      );
      const response = await api.get(AGENTS_ENDPOINTS.list);

      console.log("📊 Raw API Response:", response.data);
      const agents = extractData<Agent>(response.data);
      console.log("✅ Extracted agents:", agents);

      return agents;
    } catch (error) {
      console.error("❌ Error loading agents:", error);
      return [];
    }
  },

  // Get main agents only
  async getMainAgents(): Promise<Agent[]> {
    try {
      const response = await api.get(AGENTS_ENDPOINTS.main);
      return extractData<Agent>(response.data);
    } catch (error) {
      console.error("❌ Error loading main agents:", error);
      return [];
    }
  },

  // Get child agents only
  async getChildAgents(): Promise<Agent[]> {
    try {
      const response = await api.get(AGENTS_ENDPOINTS.child);
      return extractData<Agent>(response.data);
    } catch (error) {
      console.error("❌ Error loading child agents:", error);
      return [];
    }
  },

  // Create new agent
  async createAgent(
    agentData: CreateAgentData
  ): Promise<{ success: boolean; agent?: Agent; error?: string }> {
    try {
      console.log("🔵 Creating agent:", agentData);
      const response = await api.post(AGENTS_ENDPOINTS.create, agentData);

      console.log("📊 Create response:", response.data);

      // Handle new response format
      if (response.data && response.data.success !== false) {
        const agent =
          response.data.data?.agent ||
          response.data.data ||
          response.data.agent ||
          response.data;
        return { success: true, agent };
      } else {
        return {
          success: false,
          error: response.data.message || "Failed to create agent",
        };
      }
    } catch (error: any) {
      console.error("❌ Error creating agent:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to create agent",
      };
    }
  },

  // Create new child agent
  async createChildAgent(
    agentData: CreateAgentData & { parent_agent_id: number }
  ): Promise<{ success: boolean; agent?: Agent; error?: string }> {
    try {
      console.log("🔵 Creating child agent:", agentData);
      const response = await api.post(AGENTS_ENDPOINTS.createChild, agentData);

      console.log("📊 Create child response:", response.data);

      // Handle new response format
      if (response.data && response.data.success !== false) {
        const agent =
          response.data.data?.agent ||
          response.data.data ||
          response.data.agent ||
          response.data;
        return { success: true, agent };
      } else {
        return {
          success: false,
          error: response.data.message || "Failed to create child agent",
        };
      }
    } catch (error: any) {
      console.error("❌ Error creating child agent:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to create child agent",
      };
    }
  },

  // Get single agent
  async getAgent(id: number): Promise<Agent | null> {
    try {
      const response = await api.get(AGENTS_ENDPOINTS.get(id));
      return response.data.data || response.data;
    } catch (error) {
      console.error("Error getting agent:", error);
      return null;
    }
  },

  // Update agent
  async updateAgent(
    id: number,
    agentData: Partial<Agent>
  ): Promise<{ success: boolean; agent?: Agent; error?: string }> {
    try {
      const response = await api.put(AGENTS_ENDPOINTS.update(id), agentData);

      if (response.data && response.data.success !== false) {
        const agent = response.data.data || response.data;
        return { success: true, agent };
      } else {
        return {
          success: false,
          error: response.data.message || "Failed to update agent",
        };
      }
    } catch (error: any) {
      console.error("Error updating agent:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to update agent",
      };
    }
  },

  // Delete agent
  async deleteAgent(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.delete(AGENTS_ENDPOINTS.delete(id));

      if (response.data && response.data.success !== false) {
        return { success: true };
      } else {
        return {
          success: false,
          error: response.data.message || "Failed to delete agent",
        };
      }
    } catch (error: any) {
      console.error("Error deleting agent:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          error.message ||
          "Failed to delete agent",
      };
    }
  },

  // Test agent
  async testAgent(
    id: number,
    testMessage?: string
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const requestData = testMessage ? { test_message: testMessage } : {};
      const response = await api.post(AGENTS_ENDPOINTS.test(id), requestData);

      if (response.data && response.data.success !== false) {
        return { success: true, result: response.data.data || response.data };
      } else {
        return {
          success: false,
          error: response.data.message || "Agent test failed",
        };
      }
    } catch (error: any) {
      console.error("Error testing agent:", error);
      return {
        success: false,
        error:
          error.response?.data?.message || error.message || "Agent test failed",
      };
    }
  },

  // Get agent children
  async getAgentChildren(id: number): Promise<Agent[]> {
    try {
      const response = await api.get(AGENTS_ENDPOINTS.children(id));
      return extractData<Agent>(response.data);
    } catch (error) {
      console.error("Error getting agent children:", error);
      return [];
    }
  },

  // Duplicate agent
  async duplicateAgent(
    id: number
  ): Promise<{ success: boolean; agent?: Agent; error?: string }> {
    try {
      // Since duplicate endpoint doesn't exist in new API, we'll get the agent and create a copy
      const originalAgent = await this.getAgent(id);
      if (!originalAgent) {
        return { success: false, error: "Original agent not found" };
      }

      const duplicateData = {
        name: `${originalAgent.name} (Copy)`,
        description: originalAgent.description,
        agent_type: originalAgent.agent_type || "main",
        configuration: originalAgent.configuration,
        is_active: true,
      };

      return await this.createAgent(duplicateData);
    } catch (error: any) {
      console.error("Error duplicating agent:", error);
      return {
        success: false,
        error: error.message || "Failed to duplicate agent",
      };
    }
  },

  // Get agent statistics
  async getAgentStatistics(): Promise<any> {
    try {
      const response = await api.get(AGENTS_ENDPOINTS.statistics);
      return response.data.data || response.data;
    } catch (error) {
      console.error("Error getting agent statistics:", error);
      return {
        total_agents: 0,
        active_agents: 0,
        inactive_agents: 0,
        main_agents: 0,
        child_agents: 0,
      };
    }
  },

  // Legacy compatibility methods
  async getPerformanceAnalytics(): Promise<any> {
    return await this.getAgentStatistics();
  },

  async getUsageAnalytics(): Promise<any> {
    return await this.getAgentStatistics();
  },

  async getComparisonAnalytics(): Promise<any> {
    return await this.getAgentStatistics();
  },

  // Toggle agent status (activate/deactivate)
  async toggleAgentStatus(
    id: number
  ): Promise<{ success: boolean; agent?: Agent; error?: string }> {
    try {
      const agent = await this.getAgent(id);
      if (!agent) {
        return { success: false, error: "Agent not found" };
      }

      return await this.updateAgent(id, { is_active: !agent.is_active });
    } catch (error: any) {
      console.error("Error toggling agent status:", error);
      return {
        success: false,
        error: error.message || "Failed to toggle agent status",
      };
    }
  },
};

export default agentsService;
