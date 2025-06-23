/**
 * Chat Service
 * Handles all chat-related API operations with proper error handling and types
 * Updated to use new unified API structure - ALL CODE IN ENGLISH
 */

import api from "./api";

// Types
export interface Message {
  id: number;
  conversation_id: number;
  content: string;
  role: "user" | "assistant" | "system";
  sender_type: string;
  tokens_used?: number;
  model_used?: string;
  response_time_ms?: number;
  created_at: string;
  user_id: number;
}

export interface Conversation {
  id: number;
  title: string;
  description?: string;
  user_id: number;
  agent_id?: number;
  message_count: number;
  total_tokens: number;
  is_active: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at?: string;
  last_message_at?: string;
}

export interface Agent {
  id: number;
  name: string;
  description?: string;
  model_provider: string;
  model_name: string;
  is_active: boolean;
}

export interface CreateConversationRequest {
  title: string;
  description?: string;
  agent_id?: number;
  settings?: Record<string, any>;
}

export interface SendMessageRequest {
  content: string;
  message_type?: string;
  agent_id?: number;
  metadata?: Record<string, any>;
}

export interface ChatAnalytics {
  conversation_id: number;
  total_messages: number;
  total_tokens: number;
  avg_response_time: number;
  user_satisfaction?: number;
  ai_performance_score?: number;
}

class ChatService {
  private getAuthHeaders() {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("authToken") ||
      "demo_token";
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  // Conversation Management - Updated to use new API structure - ALL CODE IN ENGLISH
  async createConversation(data: {
    title: string;
    description?: string;
    agent_id?: number;
    conversation_type?: string;
  }): Promise<Conversation> {
    try {
      const response = await api.post("/chat/conversations", {
        title: data.title,
        description: data.description,
        agent_id: data.agent_id,
        conversation_type: data.conversation_type || "permanent",
      });

      // Handle new response format
      const conversationData = response.data.data || response.data;

      if (conversationData) {
        return {
          id: conversationData.id,
          title: conversationData.title,
          description: conversationData.description || "",
          user_id: conversationData.user_id || 1, // Default user ID
          agent_id: conversationData.agent_id,
          message_count: conversationData.message_count || 0,
          total_tokens: conversationData.total_tokens || 0,
          is_active: conversationData.is_active !== false,
          is_pinned: conversationData.is_pinned || false,
          created_at: conversationData.created_at,
          updated_at:
            conversationData.updated_at || conversationData.created_at,
        };
      }
      throw new Error("Invalid response format");
    } catch (error: unknown) {
      console.error("Error creating conversation:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to create conversation: ${errorMessage}`);
    }
  }

  async getConversations(params?: {
    limit?: number;
    skip?: number;
    search?: string;
    agent_id?: number;
  }): Promise<Conversation[]> {
    try {
      const response = await api.get("/chat/conversations", { params });

      // Handle new response format
      const data = response.data.data || response.data || [];
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Error getting conversations:", error);
      return [];
    }
  }

  async getConversation(conversationId: number): Promise<Conversation> {
    try {
      const response = await api.get(`/chat/conversations/${conversationId}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error("Error getting conversation:", error);
      throw error;
    }
  }

  async updateConversation(
    conversationId: number,
    updates: Partial<Conversation>
  ): Promise<Conversation> {
    try {
      const response = await api.put(
        `/chat/conversations/${conversationId}`,
        updates
      );
      return response.data.data || response.data;
    } catch (error) {
      console.error("Error updating conversation:", error);
      throw error;
    }
  }

  async deleteConversation(conversationId: number): Promise<void> {
    try {
      await api.delete(`/chat/conversations/${conversationId}`);
    } catch (error) {
      console.error("Error deleting conversation:", error);
      throw error;
    }
  }

  // Message Management - Updated to use new API structure - ALL CODE IN ENGLISH
  async getMessages(
    conversationId: number,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<Message[]> {
    try {
      const response = await api.get(
        `/chat/conversations/${conversationId}/messages`,
        { params }
      );

      // Handle new response format
      const messages = response.data.data || response.data || [];
      return Array.isArray(messages) ? messages : [];
    } catch (error) {
      console.error("Error getting messages:", error);
      return [];
    }
  }

  async sendMessage(
    conversationId: number,
    request: SendMessageRequest
  ): Promise<{
    user_message: Message;
    ai_response: Message;
  }> {
    try {
      const response = await api.post(
        `/chat/conversations/${conversationId}/messages`,
        request
      );
      return response.data.data || response.data;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }

  // Streaming message support - Updated for new API structure
  async sendMessageStream(
    conversationId: number,
    request: SendMessageRequest
  ): Promise<ReadableStream> {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${api.defaults.baseURL}/chat/conversations/${conversationId}/stream`,
        {
          method: "POST",
          headers: {
            ...this.getAuthHeaders(),
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(request),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to send streaming message: ${response.statusText}`
        );
      }

      if (!response.body) {
        throw new Error("No response body for streaming");
      }

      return response.body;
    } catch (error) {
      console.error("Error sending streaming message:", error);
      throw error;
    }
  }

  // Agent Management - Updated to use new API structure - ALL CODE IN ENGLISH
  async getAgents(): Promise<Agent[]> {
    try {
      const response = await api.get("/agents");

      // Handle new response format
      const agents = response.data.data || response.data || [];
      return Array.isArray(agents) ? agents : [];
    } catch (error) {
      console.error("Error getting agents:", error);
      return [];
    }
  }

  // Analytics - Updated to use new API structure - ALL CODE IN ENGLISH
  async getConversationAnalytics(
    conversationId: number
  ): Promise<ChatAnalytics> {
    try {
      const response = await api.get(
        `/chat/conversations/${conversationId}/analytics`
      );
      return response.data.data || response.data;
    } catch (error) {
      console.error("Error getting analytics:", error);
      throw error;
    }
  }

  async getDashboardAnalytics(): Promise<{
    total_conversations: number;
    total_messages: number;
    total_tokens: number;
    active_agents: number;
    avg_response_time: number;
  }> {
    try {
      const response = await api.get("/chat/analytics/dashboard");
      return response.data.data || response.data;
    } catch (error) {
      console.error("Error getting dashboard analytics:", error);
      throw error;
    }
  }

  // AI Learning - Using new API structure - ALL CODE IN ENGLISH
  async triggerLearning(
    conversationId: number,
    learningType: string = "user_preference"
  ): Promise<void> {
    try {
      await api.post(`/chat/conversations/${conversationId}/ai-response`, {
        learning_type: learningType,
        analyze_only: true,
      });
    } catch (error) {
      console.error("Error triggering learning:", error);
      throw error;
    }
  }

  async getAgentMemory(agentId: number): Promise<{
    user_preferences: Record<string, any>;
    conversation_context: Record<string, any>;
    learning_insights: string[];
  }> {
    try {
      const response = await api.get(`/agents/${agentId}/memory`);
      return (
        response.data.data ||
        response.data || {
          user_preferences: {},
          conversation_context: {},
          learning_insights: [],
        }
      );
    } catch (error) {
      console.error("Error getting agent memory:", error);
      return {
        user_preferences: {},
        conversation_context: {},
        learning_insights: [],
      };
    }
  }

  // Quick Chat - Updated for new API structure - ALL CODE IN ENGLISH
  async createQuickChat(
    message: string,
    agentId?: number,
    temporary: boolean = false
  ): Promise<{
    conversation: Conversation;
    initial_response: Message;
  }> {
    try {
      const response = await api.post("/chat/quick", {
        message,
        agent_id: agentId,
        temporary,
      });

      return response.data.data || response.data;
    } catch (error) {
      console.error("Error creating quick chat:", error);
      throw error;
    }
  }

  // Export conversation - Updated for new API structure - ALL CODE IN ENGLISH
  async exportConversation(
    conversationId: number,
    format: "json" | "txt" | "pdf" = "json"
  ): Promise<Blob> {
    try {
      const response = await api.get(
        `/chat/conversations/${conversationId}/export?format=${format}`,
        { responseType: "blob" }
      );

      return response.data;
    } catch (error) {
      console.error("Error exporting conversation:", error);
      throw error;
    }
  }
}

// Create and export singleton instance
const chatService = new ChatService();
export default chatService;
