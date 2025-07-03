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

// Utility function to calculate API endpoint based on provider and configuration
function calculateApiEndpoint(
  llmConfig: CreateAgentData["llmConfig"]
): string | null {
  if (!llmConfig) return null;

  if (llmConfig.deployment === "local" && llmConfig.localConfig) {
    // For local deployment, construct full URL
    const { host, port, endpoint } = llmConfig.localConfig;
    return `http://${host}:${port}${endpoint}`;
  } else {
    // For online deployment, use provider-specific endpoints
    const providerEndpoints = {
      openai: "https://api.openai.com/v1/chat/completions",
      anthropic: "https://api.anthropic.com/v1/messages",
      google: "https://generativelanguage.googleapis.com/v1beta/models",
      azure: "https://api.cognitive.microsoft.com/sts/v1.0",
      mistral: "https://api.mistral.ai/v1/chat/completions",
      cohere: "https://api.cohere.ai/v1/generate",
      perplexity: "https://api.perplexity.ai/chat/completions",
      huggingface: "https://api-inference.huggingface.co/models",
      together: "https://api.together.xyz/inference",
      replicate: "https://api.replicate.com/v1/predictions",
      openrouter: "https://openrouter.ai/api/v1/chat/completions",
      ai21: "https://api.ai21.com/studio/v1/chat/completions",
      anyscale: "https://api.endpoints.anyscale.com/v1/chat/completions",
      ollama: "http://localhost:11434/v1/chat/completions",
      lmstudio: "http://localhost:1234/v1/chat/completions",
      textgen: "http://localhost:5000/api/v1/chat/completions",
      localai: "http://localhost:8080/v1/chat/completions",
      llamafile: "http://localhost:8080/completion",
      jan: "http://localhost:1337/v1/chat/completions",
      vllm: "http://localhost:8000/v1/chat/completions",
      llamacppserver: "http://localhost:8080/v1/chat/completions",
    };

    return (
      providerEndpoints[llmConfig.provider as keyof typeof providerEndpoints] ||
      null
    );
  }
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
  console.log("🔍 Extracting data from response:", response);

  // If response has 'success' and 'data' properties (new format)
  if (response && response.success && response.data) {
    console.log("✅ Response has success and data properties");
    if (Array.isArray(response.data)) {
      console.log("✅ response.data is array:", response.data);
      return response.data;
    }
    if (response.data.agents && Array.isArray(response.data.agents)) {
      console.log("✅ response.data.agents is array:", response.data.agents);
      return response.data.agents;
    }
    console.log("⚠️ No array found in response.data");
    return [];
  }

  // If response has 'data' property (standard format)
  if (response && typeof response === "object" && "data" in response) {
    console.log("✅ Response has data property");
    if (Array.isArray(response.data)) {
      console.log("✅ response.data is array:", response.data);
      return response.data;
    }
    if (response.data.agents && Array.isArray(response.data.agents)) {
      console.log("✅ response.data.agents is array:", response.data.agents);
      return response.data.agents;
    }
    console.log("⚠️ No array found in response.data");
    return [];
  }

  // If response is directly an array (old format)
  if (Array.isArray(response)) {
    console.log("✅ Response is direct array:", response);
    return response;
  }

  // Fallback: empty array
  console.warn("❌ Unknown response format:", response);
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
      console.log("🔑 Auth headers:", headers ? "Present" : "Missing");

      const response = await api.get(AGENTS_ENDPOINTS.list, { headers });

      console.log("📊 Raw API Response:", response.data);
      console.log("📊 Response status:", response.status);

      const agents = extractData<Agent>(response.data);
      console.log("✅ Extracted agents count:", agents.length);
      console.log("✅ Agents:", agents);

      return agents;
    } catch (error: any) {
      console.error("❌ Error loading agents:", error);
      console.error("❌ Error response:", error.response?.data);
      console.error("❌ Error status:", error.response?.status);

      if (error?.response?.status === 401) {
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
      console.log(
        "🔑 Auth headers for main agents:",
        headers ? "Present" : "Missing"
      );

      const response = await api.get(AGENTS_ENDPOINTS.main, { headers });

      console.log("📊 Main agents response:", response.data);
      console.log("📊 Main agents status:", response.status);

      const agents = extractData<Agent>(response.data);
      console.log("✅ Main agents extracted count:", agents.length);
      console.log("✅ Main agents:", agents);

      return agents;
    } catch (error: any) {
      console.error("❌ Error loading main agents:", error);
      console.error("❌ Main agents error response:", error.response?.data);
      console.error("❌ Main agents error status:", error.response?.status);

      if (error?.response?.status === 401) {
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
      console.log(
        "🔑 Auth headers for child agents:",
        headers ? "Present" : "Missing"
      );

      const response = await api.get(AGENTS_ENDPOINTS.child, { headers });

      console.log("📊 Child agents response:", response.data);
      console.log("📊 Child agents status:", response.status);

      const agents = extractData<Agent>(response.data);
      console.log("✅ Child agents extracted count:", agents.length);
      console.log("✅ Child agents:", agents);

      return agents;
    } catch (error: any) {
      console.error("❌ Error loading child agents:", error);
      console.error("❌ Child agents error response:", error.response?.data);
      console.error("❌ Child agents error status:", error.response?.status);

      if (error?.response?.status === 401) {
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

      // Calculate API endpoint using utility function
      const apiEndpoint = calculateApiEndpoint(agentData.llmConfig);
      console.log("🔗 API endpoint calculated:", apiEndpoint);

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
        api_endpoint: apiEndpoint, // ✅ Using calculated API endpoint!
        parent_agent_id: agentData.parent_agent_id || null,
      };

      console.log("📤 Backend data with API endpoint:", backendData);

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

      // Calculate API endpoint using utility function
      const apiEndpoint = calculateApiEndpoint(agentData.llmConfig);
      console.log("🔗 Child agent API endpoint calculated:", apiEndpoint);

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
        api_endpoint: apiEndpoint, // ✅ Using calculated API endpoint for child agents too!
      };

      console.log(
        "📤 Child agent backend data with API endpoint:",
        backendData
      );

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
    agentData: Partial<Agent> & {
      llmConfig?: CreateAgentData["llmConfig"];
      settings?: CreateAgentData["settings"];
    }
  ): Promise<{ success: boolean; agent?: Agent; error?: string }> {
    try {
      console.log("🔵 Updating agent:", id, agentData);

      // Calculate API endpoint if llmConfig is provided using utility function
      const apiEndpoint = agentData.llmConfig
        ? calculateApiEndpoint(agentData.llmConfig)
        : undefined;
      if (apiEndpoint !== undefined) {
        console.log("🔗 Update API endpoint calculated:", apiEndpoint);
      }

      // Transform frontend data to backend format
      const updateData: Record<string, unknown> = {};

      if (agentData.name) updateData.name = agentData.name;
      if (agentData.description !== undefined)
        updateData.description = agentData.description;
      if (agentData.llmConfig?.provider)
        updateData.model_provider = agentData.llmConfig.provider;
      if (agentData.llmConfig?.model)
        updateData.model_name = agentData.llmConfig.model;
      if (agentData.llmConfig?.apiKey !== undefined)
        updateData.api_key = agentData.llmConfig.apiKey;
      if (agentData.settings?.temperature !== undefined)
        updateData.temperature = agentData.settings.temperature;
      if (agentData.settings?.maxTokens !== undefined)
        updateData.max_tokens = agentData.settings.maxTokens;
      if (apiEndpoint !== undefined) updateData.api_endpoint = apiEndpoint; // ✅ Update API endpoint if calculated

      console.log("📤 Update data with API endpoint:", updateData);

      const headers = getAuthHeaders();
      const response = await api.put(AGENTS_ENDPOINTS.update(id), updateData, {
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
