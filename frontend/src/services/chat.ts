import api from "./api";

// Types for chat
export interface Conversation {
  id: string;
  title: string;
  agent_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: number;
}

export interface Message {
  id: number;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  message_metadata?: Record<string, unknown>;
  tokens_used?: number;
  processing_time?: number;
  created_at: string;
  user_id: number;
}

export interface FileAttachment {
  id: number;
  message_id: number;
  filename: string;
  file_path: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

export interface CreateConversationRequest {
  title: string;
  agent_id?: number;
}

export interface UpdateConversationRequest {
  title?: string;
  agent_id?: number;
  is_active?: boolean;
}

export interface SendMessageRequest {
  content: string;
  sender_type?: "user" | "assistant" | "system";
  message_metadata?: Record<string, any>;
}

export interface ConversationListParams {
  skip?: number;
  limit?: number;
  is_active?: boolean;
  is_archived?: boolean;
  is_pinned?: boolean;
  agent_id?: number;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface MessageListResponse {
  messages: Message[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}

// Chat Service - Updated to use new API structure - ALL CODE IN ENGLISH
class ChatService {
  // Conversation management - ALL CODE IN ENGLISH
  async getConversations(
    params: ConversationListParams = {}
  ): Promise<ConversationListResponse> {
    try {
      const response = await api.get("/chat/conversations", { params });

      // Handle new response format
      const conversations = Array.isArray(response.data.data)
        ? response.data.data
        : response.data.conversations || [];

      return {
        conversations,
        total: conversations.length,
        page: 1,
        limit: params.limit || 100,
        has_next: false,
        has_prev: false,
      };
    } catch (error) {
      console.error("Error getting conversations:", error);
      return {
        conversations: [],
        total: 0,
        page: 1,
        limit: params.limit || 100,
        has_next: false,
        has_prev: false,
      };
    }
  }

  async getConversation(id: string): Promise<Conversation | null> {
    try {
      const response = await api.get(`/chat/conversations/${id}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error("Error getting conversation:", error);
      return null;
    }
  }

  async createConversation(
    conversationData: CreateConversationRequest
  ): Promise<Conversation> {
    const response = await api.post("/chat/conversations", conversationData);
    return response.data.data || response.data;
  }

  async updateConversation(
    id: string,
    conversationData: UpdateConversationRequest
  ): Promise<Conversation> {
    const response = await api.put(
      `/chat/conversations/${id}`,
      conversationData
    );
    return response.data.data || response.data;
  }

  async deleteConversation(id: string): Promise<void> {
    await api.delete(`/chat/conversations/${id}`);
  }

  // Message management - ALL CODE IN ENGLISH
  async getMessages(
    conversationId: string,
    skip: number = 0,
    limit: number = 50
  ): Promise<MessageListResponse> {
    try {
      const response = await api.get(
        `/chat/conversations/${conversationId}/messages`,
        {
          params: { skip, limit },
        }
      );

      // Handle new response format
      const messages = Array.isArray(response.data.data)
        ? response.data.data
        : response.data.messages || [];

      return {
        messages,
        total: messages.length,
        page: 1,
        limit,
        has_next: false,
        has_prev: false,
      };
    } catch (error) {
      console.error("Error getting messages:", error);
      return {
        messages: [],
        total: 0,
        page: 1,
        limit,
        has_next: false,
        has_prev: false,
      };
    }
  }

  async sendMessage(
    conversationId: string,
    messageData: SendMessageRequest
  ): Promise<Message> {
    const response = await api.post(
      `/chat/conversations/${conversationId}/messages`,
      messageData
    );
    return response.data.data || response.data;
  }

  async deleteMessage(messageId: number): Promise<void> {
    await api.delete(`/chat/messages/${messageId}`);
  }

  async updateMessage(messageId: number, content: string): Promise<Message> {
    const response = await api.put(`/chat/messages/${messageId}`, {
      content,
    });
    return response.data.data || response.data;
  }

  // Send message with file attachment - ALL CODE IN ENGLISH
  async sendMessageWithFile(
    conversationId: string,
    message: string,
    file: File
  ): Promise<Message> {
    const formData = new FormData();
    formData.append("content", message);
    formData.append("file", file);

    const response = await api.post(
      `/chat/conversations/${conversationId}/messages/with-file`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data.data || response.data;
  }

  // Get message attachments - ALL CODE IN ENGLISH
  async getMessageAttachments(messageId: number): Promise<FileAttachment[]> {
    const response = await api.get(`/chat/messages/${messageId}/attachments`);
    return response.data.data || response.data || [];
  }

  // Download attachment - ALL CODE IN ENGLISH
  async downloadAttachment(attachmentId: number): Promise<Blob> {
    const response = await api.get(
      `/chat/attachments/${attachmentId}/download`,
      {
        responseType: "blob",
      }
    );
    return response.data;
  }

  // Search conversations - ALL CODE IN ENGLISH
  async searchConversations(query: string): Promise<Conversation[]> {
    try {
      const response = await api.get("/chat/search", {
        params: { query, type: "conversations" },
      });
      return response.data.data || [];
    } catch (error) {
      console.error("Search conversations error:", error);
      return [];
    }
  }

  // Search messages - ALL CODE IN ENGLISH
  async searchMessages(
    query: string,
    conversationId?: string
  ): Promise<Message[]> {
    try {
      const params: any = { query };
      if (conversationId) {
        params.conversation_id = conversationId;
      }

      const response = await api.get("/chat/search", { params });
      return response.data.data || [];
    } catch (error) {
      console.error("Message search error:", error);
      return [];
    }
  }

  // Chat statistics - ALL CODE IN ENGLISH
  async getChatStats(): Promise<any> {
    try {
      const response = await api.get("/chat/analytics/dashboard");
      return (
        response.data.data || { total_conversations: 0, total_messages: 0 }
      );
    } catch (error) {
      console.error("Error getting chat stats:", error);
      return { total_conversations: 0, total_messages: 0 };
    }
  }

  // Get global analytics (admin only) - ALL CODE IN ENGLISH
  async getGlobalAnalytics(): Promise<any> {
    try {
      const response = await api.get("/chat/analytics/global");
      return response.data.data || {};
    } catch (error) {
      console.error("Error getting global analytics:", error);
      return {};
    }
  }

  // Export conversation - ALL CODE IN ENGLISH
  async exportConversation(
    conversationId: string,
    format: "json" | "txt" = "json"
  ): Promise<any> {
    try {
      const response = await api.get(
        `/chat/conversations/${conversationId}/export`,
        { params: { format } }
      );
      return response.data.data || {};
    } catch (error) {
      console.error("Export error:", error);
      return {};
    }
  }

  // Share conversation (create share link) - ALL CODE IN ENGLISH
  async shareConversation(
    conversationId: string
  ): Promise<{ share_url: string }> {
    try {
      const response = await api.post(
        `/chat/conversations/${conversationId}/share`
      );
      return response.data.data || { share_url: "" };
    } catch (error) {
      console.error("Share error:", error);
      return { share_url: "" };
    }
  }

  // Archive conversation - ALL CODE IN ENGLISH
  async archiveConversation(conversationId: string): Promise<Conversation> {
    try {
      const response = await api.post(
        `/chat/conversations/${conversationId}/archive`
      );
      return response.data.data || response.data;
    } catch (error) {
      console.error("Archive functionality not implemented");
      throw new Error("Archive functionality not implemented");
    }
  }

  // Restore conversation from archive - ALL CODE IN ENGLISH
  async restoreConversation(conversationId: string): Promise<Conversation> {
    try {
      const response = await api.post(
        `/chat/conversations/${conversationId}/restore`
      );
      return response.data.data || response.data;
    } catch (error) {
      console.error("Restore functionality not implemented");
      throw new Error("Restore functionality not implemented");
    }
  }

  // Execute chat with specific agent - ALL CODE IN ENGLISH
  async chatWithAgent(
    agentId: number,
    message: string,
    conversationId?: string
  ): Promise<Message> {
    const response = await api.post(`/agents/${agentId}/chat`, {
      message,
      conversation_id: conversationId,
    });
    return response.data.data || response.data;
  }

  // Interactive chat (streaming) - ALL CODE IN ENGLISH
  async startStreamingChat(
    conversationId: string,
    message: string
  ): Promise<EventSource> {
    const token = localStorage.getItem("access_token");
    const url = `${api.defaults.baseURL}/chat/conversations/${conversationId}/stream/?token=${token}&message=${encodeURIComponent(
      message
    )}`;
    return new EventSource(url);
  }

  // Generate AI response - ALL CODE IN ENGLISH
  async generateAIResponse(
    conversationId: string,
    message: string,
    agentId?: number
  ): Promise<any> {
    try {
      const response = await api.post(
        `/chat/conversations/${conversationId}/ai-response`,
        {
          message,
          agent_id: agentId,
          include_context: true,
        }
      );
      return response.data.data || response.data;
    } catch (error) {
      console.error("Error generating AI response:", error);
      throw error;
    }
  }
}

export default new ChatService();
