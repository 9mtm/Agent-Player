import api from "./api";
import type { Agent } from "../types";

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

// Authentication helper - NEW ADDITION
function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Define agent creation data type
interface CreateAgentData {
  name: string;
  description: string;
  type: string;
  capabilities?: string[];
  llmConfig: {
    provider: string;
    model: string;
    deployment: "online" | "local";
    apiKey: string;
    localConfig?: {
      host: string;
      port: string;
      endpoint: string;
    };
    localEndpoints?: Array<{
      id: string;
      name: string;
      host: string;
      port: string;
      endpoint: string;
      model: string;
      isActive: boolean;
    }>;
  };
  settings: {
    autoResponse: boolean;
    learning: boolean;
    maxConcurrency: number;
    temperature: number;
    maxTokens: number;
  };
  parent_agent_id?: number;
  user_id?: number;
}

// Helper function to handle both old and new response formats
function extractData<T>(response: any): T[] {
  // If response has 'success' and 'data' properties (new format)
  if (response && response.success && response.data) {
    if (Array.isArray(response.data)) return response.data;
    if (response.data.agents && Array.isArray(response.data.agents))
      return response.data.agents;
    return [];
  }

  // If response has 'data' property (standard format)
  if (response && typeof response === "object" && "data" in response) {
    if (Array.isArray(response.data)) return response.data;
    if (response.data.agents && Array.isArray(response.data.agents))
      return response.data.agents;
    return [];
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

      // Ensure authentication headers are included
      const headers = getAuthHeaders();
      const response = await api.get(AGENTS_ENDPOINTS.list, { headers });

      console.log("📊 Raw API Response:", response.data);
      const agents = extractData<Agent>(response.data);
      console.log("✅ Extracted agents:", agents);

      return agents;
    } catch (error) {
      console.error("❌ Error loading agents:", error);
      if ((error as any)?.response?.status === 401) {
        console.warn("🔒 Authentication error - redirecting to login");
        window.location.href = "/login";
      }
      return [];
    }
  },

  // Get main agents only
  async getMainAgents(): Promise<Agent[]> {
    try {
      console.log(
        "🔗 Loading main agents from:",
        `${api.defaults.baseURL}${AGENTS_ENDPOINTS.main}`
      );

      const headers = getAuthHeaders();
      const response = await api.get(AGENTS_ENDPOINTS.main, { headers });

      console.log("📊 Main agents response:", response.data);
      const agents = extractData<Agent>(response.data);
      console.log("✅ Main agents extracted:", agents);

      return agents;
    } catch (error) {
      console.error("❌ Error loading main agents:", error);
      if ((error as any)?.response?.status === 401) {
        console.warn("🔒 Authentication error - redirecting to login");
        window.location.href = "/login";
      }
      return [];
    }
  },

  // Get child agents only
  async getChildAgents(): Promise<Agent[]> {
    try {
      console.log(
        "🔗 Loading child agents from:",
        `${api.defaults.baseURL}${AGENTS_ENDPOINTS.child}`
      );

      const headers = getAuthHeaders();
      const response = await api.get(AGENTS_ENDPOINTS.child, { headers });

      console.log("📊 Child agents response:", response.data);
      const agents = extractData<Agent>(response.data);
      console.log("✅ Child agents extracted:", agents);

      return agents;
    } catch (error) {
      console.error("❌ Error loading child agents:", error);
      if ((error as any)?.response?.status === 401) {
        console.warn("🔒 Authentication error - redirecting to login");
        window.location.href = "/login";
      }
      return [];
    }
  },

  // Create new agent
  async createAgent(
    agentData: CreateAgentData
  ): Promise<{ success: boolean; agent?: Agent; error?: string }> {
    try {
      console.log("🔵 Creating agent:", agentData);

      // Transform frontend data to backend format
      const backendData = {
        name: agentData.name,
        description: agentData.description,
        agent_type: agentData.type || "main",
        model_provider: agentData.llmConfig.provider,
        model_name: agentData.llmConfig.model,
        system_prompt: "You are a helpful AI assistant.",
        temperature: agentData.settings.temperature,
        max_tokens: agentData.settings.maxTokens,
        api_key: agentData.llmConfig.apiKey,
        parent_agent_id: agentData.parent_agent_id || null,
      };

      const headers = getAuthHeaders();
      const response = await api.post(AGENTS_ENDPOINTS.create, backendData, {
        headers,
      });

      console.log("📊 Create response:", response.data);

      // Handle new response format
      if (response.data && response.data.success !== false) {
        const agent_id = response.data.data?.agent_id || response.data.data?.id;
        return {
          success: true,
          agent: {
            id: agent_id,
            ...backendData,
            created_at: new Date().toISOString(),
          } as Agent,
        };
      } else {
        return {
          success: false,
          error: response.data.message || "Failed to create agent",
        };
      }
    } catch (error: unknown) {
      console.error("❌ Error creating agent:", error);
      let errorMessage = "Failed to create agent";
      if (typeof error === "object" && error !== null) {
        const err = error as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        errorMessage =
          err.response?.data?.message || err.message || errorMessage;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      if ((error as any)?.response?.status === 401) {
        console.warn("🔒 Authentication error - redirecting to login");
        window.location.href = "/login";
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  // Create new child agent
  async createChildAgent(
    agentData: CreateAgentData & { parent_agent_id: number }
  ): Promise<{ success: boolean; agent?: Agent; error?: string }> {
    try {
      console.log("🔵 Creating child agent:", agentData);

      // Transform frontend data to backend format
      const backendData = {
        name: agentData.name,
        description: agentData.description,
        parent_agent_id: agentData.parent_agent_id,
        model_provider: agentData.llmConfig?.provider || "openai",
        model_name: agentData.llmConfig?.model || "gpt-3.5-turbo",
        system_prompt: "You are a specialized AI assistant.",
        temperature: agentData.settings?.temperature || 0.7,
        max_tokens: agentData.settings?.maxTokens || 1024,
        api_key: agentData.llmConfig?.apiKey || "",
      };

      const headers = getAuthHeaders();
      const response = await api.post(
        AGENTS_ENDPOINTS.createChild,
        backendData,
        { headers }
      );

      console.log("📊 Create child response:", response.data);

      // Handle new response format
      if (response.data && response.data.success !== false) {
        const agent_id = response.data.data?.agent_id || response.data.data?.id;
        return {
          success: true,
          agent: {
            id: agent_id,
            ...backendData,
            agent_type: "child",
            created_at: new Date().toISOString(),
          } as Agent,
        };
      } else {
        return {
          success: false,
          error: response.data.message || "Failed to create child agent",
        };
      }
    } catch (error: unknown) {
      console.error("❌ Error creating child agent:", error);
      let errorMessage = "Failed to create child agent";
      if (typeof error === "object" && error !== null) {
        const err = error as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        errorMessage =
          err.response?.data?.message || err.message || errorMessage;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      if ((error as any)?.response?.status === 401) {
        console.warn("🔒 Authentication error - redirecting to login");
        window.location.href = "/login";
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  // Get single agent
  async getAgent(id: number): Promise<Agent | null> {
    try {
      const headers = getAuthHeaders();
      const response = await api.get(AGENTS_ENDPOINTS.get(id), { headers });
      return response.data.data || response.data;
    } catch (error: unknown) {
      console.error("Error getting agent:", error);
      if ((error as any)?.response?.status === 401) {
        console.warn("🔒 Authentication error - redirecting to login");
        window.location.href = "/login";
      }
      return null;
    }
  },

  // Update agent
  async updateAgent(
    id: number,
    agentData: Partial<Agent>
  ): Promise<{ success: boolean; agent?: Agent; error?: string }> {
    try {
      const headers = getAuthHeaders();
      const response = await api.put(AGENTS_ENDPOINTS.update(id), agentData, {
        headers,
      });

      if (response.data && response.data.success !== false) {
        const agent = response.data.data || response.data;
        return { success: true, agent };
      } else {
        return {
          success: false,
          error: response.data.message || "Failed to update agent",
        };
      }
    } catch (error: unknown) {
      console.error("Error updating agent:", error);
      let errorMessage = "Failed to update agent";
      if (typeof error === "object" && error !== null) {
        const err = error as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        errorMessage =
          err.response?.data?.message || err.message || errorMessage;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      if ((error as any)?.response?.status === 401) {
        console.warn("🔒 Authentication error - redirecting to login");
        window.location.href = "/login";
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  // Delete agent
  async deleteAgent(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      const headers = getAuthHeaders();
      const response = await api.delete(AGENTS_ENDPOINTS.delete(id), {
        headers,
      });

      if (response.data && response.data.success !== false) {
        return { success: true };
      } else {
        return {
          success: false,
          error: response.data.message || "Failed to delete agent",
        };
      }
    } catch (error: unknown) {
      console.error("Error deleting agent:", error);
      let errorMessage = "Failed to delete agent";
      if (typeof error === "object" && error !== null) {
        const err = error as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        errorMessage =
          err.response?.data?.message || err.message || errorMessage;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      if ((error as any)?.response?.status === 401) {
        console.warn("🔒 Authentication error - redirecting to login");
        window.location.href = "/login";
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  // Test agent
  async testAgent(
    id: number,
    testMessage?: string
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const requestData = testMessage
        ? { message: testMessage }
        : { message: "Hello! This is a test message." };

      const headers = getAuthHeaders();
      const response = await api.post(AGENTS_ENDPOINTS.test(id), requestData, {
        headers,
      });

      if (response.data && response.data.success !== false) {
        return { success: true, result: response.data.data || response.data };
      } else {
        return {
          success: false,
          error: response.data.message || "Agent test failed",
        };
      }
    } catch (error: unknown) {
      console.error("Error testing agent:", error);
      let errorMessage = "Agent test failed";
      if (typeof error === "object" && error !== null) {
        const err = error as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        errorMessage =
          err.response?.data?.message || err.message || errorMessage;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      if ((error as any)?.response?.status === 401) {
        console.warn("🔒 Authentication error - redirecting to login");
        window.location.href = "/login";
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  // Get agent children
  async getAgentChildren(id: number): Promise<Agent[]> {
    try {
      const headers = getAuthHeaders();
      const response = await api.get(AGENTS_ENDPOINTS.children(id), {
        headers,
      });
      return extractData<Agent>(response.data);
    } catch (error) {
      console.error("Error getting agent children:", error);
      if ((error as any)?.response?.status === 401) {
        console.warn("🔒 Authentication error - redirecting to login");
        window.location.href = "/login";
      }
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
        type: (originalAgent as any).agent_type || "main",
        llmConfig: {
          provider: (originalAgent as any).model_provider || "openai",
          model: (originalAgent as any).model_name || "gpt-4",
          deployment: "online" as const,
          apiKey: (originalAgent as any).api_key || "",
        },
        settings: {
          autoResponse: true,
          learning: true,
          maxConcurrency: 1,
          temperature: (originalAgent as any).temperature || 0.7,
          maxTokens: (originalAgent as any).max_tokens || 2048,
        },
      };

      return await this.createAgent(duplicateData);
    } catch (error: unknown) {
      console.error("Error duplicating agent:", error);
      let errorMessage = "Failed to duplicate agent";
      if (typeof error === "object" && error !== null) {
        const err = error as { message?: string };
        errorMessage = err.message || errorMessage;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      if ((error as any)?.response?.status === 401) {
        console.warn("🔒 Authentication error - redirecting to login");
        window.location.href = "/login";
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  // Get agent statistics
  async getAgentStatistics(): Promise<any> {
    try {
      const headers = getAuthHeaders();
      const response = await api.get(AGENTS_ENDPOINTS.statistics, { headers });
      return response.data.data || response.data;
    } catch (error: unknown) {
      console.error("Error getting agent statistics:", error);
      if ((error as any)?.response?.status === 401) {
        console.warn("🔒 Authentication error - redirecting to login");
        window.location.href = "/login";
      }
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

      if ((error as any)?.response?.status === 401) {
        console.warn("🔒 Authentication error - redirecting to login");
        window.location.href = "/login";
      }

      return {
        success: false,
        error: error.message || "Failed to toggle agent status",
      };
    }
  },
};

export default agentsService;
