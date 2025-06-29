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

// Authentication helper - NEW
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

// Helper function to handle response formats
function extractData<T>(response: any): T[] {
  if (response && response.success && response.data) {
    if (Array.isArray(response.data)) return response.data;
    if (response.data.agents && Array.isArray(response.data.agents))
      return response.data.agents;
    return [];
  }

  if (response && typeof response === "object" && "data" in response) {
    if (Array.isArray(response.data)) return response.data;
    if (response.data.agents && Array.isArray(response.data.agents))
      return response.data.agents;
    return [];
  }

  if (Array.isArray(response)) {
    return response;
  }

  console.warn("Unknown response format:", response);
  return [];
}

// Improved Agents Service with Authentication
export const agentsServiceImproved = {
  // Get all agents with auth
  async getAgents(): Promise<Agent[]> {
    try {
      console.log("🔗 Loading agents with authentication...");

      const headers = getAuthHeaders();
      console.log("🔑 Using headers:", headers);

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

  // Get main agents with auth
  async getMainAgents(): Promise<Agent[]> {
    try {
      console.log("🔗 Loading main agents with authentication...");

      const headers = getAuthHeaders();
      const response = await api.get(AGENTS_ENDPOINTS.main, { headers });

      console.log("📊 Main agents response:", response.data);
      const agents = extractData<Agent>(response.data);

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

  // Get child agents with auth
  async getChildAgents(): Promise<Agent[]> {
    try {
      console.log("🔗 Loading child agents with authentication...");

      const headers = getAuthHeaders();
      const response = await api.get(AGENTS_ENDPOINTS.child, { headers });

      console.log("📊 Child agents response:", response.data);
      const agents = extractData<Agent>(response.data);

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

  // Create agent with proper backend format
  async createAgent(
    agentData: CreateAgentData
  ): Promise<{ success: boolean; agent?: Agent; error?: string }> {
    try {
      console.log("🔵 Creating agent with auth:", agentData);

      // Transform to backend format
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

      if ((error as any)?.response?.status === 401) {
        console.warn("🔒 Authentication error - redirecting to login");
        window.location.href = "/login";
        return { success: false, error: "Authentication required" };
      }

      let errorMessage = "Failed to create agent";
      if (typeof error === "object" && error !== null) {
        const err = error as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        errorMessage =
          err.response?.data?.message || err.message || errorMessage;
      }

      return { success: false, error: errorMessage };
    }
  },

  // Create child agent with proper format
  async createChildAgent(
    agentData: CreateAgentData & { parent_agent_id: number }
  ): Promise<{ success: boolean; agent?: Agent; error?: string }> {
    try {
      console.log("🔵 Creating child agent with auth:", agentData);

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

      if ((error as any)?.response?.status === 401) {
        console.warn("🔒 Authentication error - redirecting to login");
        window.location.href = "/login";
        return { success: false, error: "Authentication required" };
      }

      let errorMessage = "Failed to create child agent";
      if (typeof error === "object" && error !== null) {
        const err = error as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        errorMessage =
          err.response?.data?.message || err.message || errorMessage;
      }

      return { success: false, error: errorMessage };
    }
  },

  // Test agent with auth
  async testAgent(
    id: number,
    testMessage?: string
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      const requestData = {
        message: testMessage || "Hello! This is a test message.",
      };

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

      if ((error as any)?.response?.status === 401) {
        console.warn("🔒 Authentication error - redirecting to login");
        window.location.href = "/login";
        return { success: false, error: "Authentication required" };
      }

      let errorMessage = "Agent test failed";
      if (typeof error === "object" && error !== null) {
        const err = error as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        errorMessage =
          err.response?.data?.message || err.message || errorMessage;
      }

      return { success: false, error: errorMessage };
    }
  },

  // Delete agent with auth
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

      if ((error as any)?.response?.status === 401) {
        console.warn("🔒 Authentication error - redirecting to login");
        window.location.href = "/login";
        return { success: false, error: "Authentication required" };
      }

      let errorMessage = "Failed to delete agent";
      if (typeof error === "object" && error !== null) {
        const err = error as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        errorMessage =
          err.response?.data?.message || err.message || errorMessage;
      }

      return { success: false, error: errorMessage };
    }
  },

  // Get agent statistics with auth
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
};

export default agentsServiceImproved;
