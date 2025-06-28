import apiClient from "./api";

// Types for chat
export interface Conversation {
  id: string;
  title: string;
  agent_id?: number;
  user_id: number;
  is_active: boolean;
  total_messages: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: string;
  content: string;
  message_metadata?: Record<string, unknown>;
  tokens_used?: number;
  processing_time?: number;
  created_at: string;
  // Optional fields for compatibility
  role?: "user" | "assistant" | "system";
  user_id?: number;
  sender_type?: string;
  timestamp?: string;
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
  agent_id?: number;
  conversation_id: string;
  extra_data?: Record<string, unknown>;
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

// Add this at the top of the file, after imports
export type SendMessageResult = {
  user_message: Message;
  ai_response: Message;
};

// Chat Service - Updated to use new API structure - ALL CODE IN ENGLISH
class ChatService {
  // Conversation management - ALL CODE IN ENGLISH
  async getConversations(
    params: ConversationListParams = {}
  ): Promise<ConversationListResponse> {
    try {
      console.log(
        "🔄 Calling backend /chat/conversations with params:",
        params
      );
      const response = await apiClient.get("/chat/conversations", { params });
      console.log("📦 Backend response:", response.data);

      // ✅ Fixed: Handle the correct response format from backend
      // Backend sends: { success: true, data: { conversations: [...], total: X } }
      const responseData = response.data.data || response.data;
      const conversations = responseData.conversations || [];

      console.log(`✅ Processed ${conversations.length} conversations`);

      return {
        conversations: conversations,
        total: responseData.total || 0,
        page: responseData.page || 1,
        limit: responseData.limit || 20,
        has_next: responseData.has_next || false,
        has_prev: responseData.has_prev || false,
      };
    } catch (error) {
      console.error("Error getting conversations:", error);
      return {
        conversations: [],
        total: 0,
        page: 1,
        limit: 20,
        has_next: false,
        has_prev: false,
      };
    }
  }

  async getConversation(id: string): Promise<Conversation | null> {
    try {
      const response = await apiClient.get(`/chat/conversations/${id}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error("Error getting conversation:", error);
      return null;
    }
  }

  async createConversation(
    conversationData: CreateConversationRequest
  ): Promise<Conversation> {
    // Remove agent_id if not set
    const payload: Record<string, unknown> = { title: conversationData.title };
    if (conversationData.agent_id) {
      payload.agent_id = conversationData.agent_id;
    }
    const response = await apiClient.post("/chat/conversations", payload);
    return response.data.data || response.data;
  }

  async updateConversation(
    id: string,
    conversationData: UpdateConversationRequest
  ): Promise<Conversation> {
    const response = await apiClient.put(
      `/chat/conversations/${id}`,
      conversationData
    );
    return response.data.data || response.data;
  }

  async deleteConversation(id: string): Promise<void> {
    await apiClient.delete(`/chat/conversations/${id}`);
  }

  // Message management - ALL CODE IN ENGLISH
  async getMessages(
    conversationId: string,
    skip: number = 0,
    limit: number = 50
  ): Promise<MessageListResponse> {
    try {
      const response = await apiClient.get(
        `/chat/conversations/${conversationId}/messages`,
        {
          params: { skip, limit },
        }
      );

      // Map backend fields to frontend fields
      const messages = (
        Array.isArray(response.data.data?.messages)
          ? response.data.data.messages
          : response.data.messages || []
      ).map((msg: Message) => ({
        ...msg,
        role: (msg as any).sender_type || msg.role,
        timestamp: (msg as any).created_at || msg.timestamp,
      }));

      return {
        messages,
        total: messages.length,
        page: 1,
        limit,
        has_next: false,
        has_prev: false,
      };
    } catch (err) {
      console.error("Error getting messages:", err);
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

  // Custom return type for sendMessage
  async sendMessage(
    conversationId: string,
    messageData: SendMessageRequest
  ): Promise<SendMessageResult> {
    // Ensure conversation_id is always sent
    const payload = { ...messageData, conversation_id: conversationId };

    // 🔧 FIX: Increase timeout for chat messages (Ollama can take 20+ seconds)
    const response = await apiClient.post(
      `/chat/conversations/${conversationId}/messages`,
      payload,
      {
        timeout: 45000, // 45 seconds for Ollama responses
      }
    );

    // Map backend fields to frontend fields for both user and ai messages
    const data = response.data.data || response.data;
    return {
      user_message: {
        ...(data.user_message as Message),
        role: data.user_message?.sender_type || data.user_message?.role,
        timestamp:
          data.user_message?.created_at || data.user_message?.timestamp,
      },
      ai_response: {
        ...(data.ai_response as Message),
        role: data.ai_response?.sender_type || data.ai_response?.role,
        timestamp: data.ai_response?.created_at || data.ai_response?.timestamp,
      },
    };
  }

  async deleteMessage(messageId: number): Promise<void> {
    await apiClient.delete(`/chat/messages/${messageId}`);
  }

  async updateMessage(messageId: number, content: string): Promise<Message> {
    const response = await apiClient.put(`/chat/messages/${messageId}`, {
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

    const response = await apiClient.post(
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
    const response = await apiClient.get(
      `/chat/messages/${messageId}/attachments`
    );
    return response.data.data || response.data || [];
  }

  // Download attachment - ALL CODE IN ENGLISH
  async downloadAttachment(attachmentId: number): Promise<Blob> {
    const response = await apiClient.get(
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
      const response = await apiClient.get("/chat/search", {
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
  ): Promise<Record<string, unknown>> {
    try {
      const params: Record<string, unknown> = { query };
      if (conversationId) {
        params.conversation_id = conversationId;
      }

      const response = await apiClient.get("/chat/search", { params });
      return response.data.data || {};
    } catch {
      console.error("Error searching messages");
      return {};
    }
  }

  // Chat statistics - ALL CODE IN ENGLISH
  async getChatStats(): Promise<any> {
    try {
      const response = await apiClient.get("/chat/analytics/dashboard");
      return (
        response.data.data || { total_conversations: 0, total_messages: 0 }
      );
    } catch (error) {
      console.error("Error getting chat stats:", error);
      return { total_conversations: 0, total_messages: 0 };
    }
  }

  // Get global analytics (admin only) - ALL CODE IN ENGLISH
  async getGlobalAnalytics(): Promise<Record<string, unknown>> {
    try {
      const response = await apiClient.get("/chat/analytics/global");
      return response.data.data || {};
    } catch {
      console.error("Error getting global analytics");
      return {};
    }
  }

  // Export conversation - ALL CODE IN ENGLISH
  async exportConversation(
    conversationId: string,
    format: "json" | "txt" = "json"
  ): Promise<Record<string, unknown>> {
    try {
      const response = await apiClient.get(
        `/chat/conversations/${conversationId}/export`,
        { params: { format } }
      );
      return response.data.data || {};
    } catch {
      console.error("Error exporting conversation");
      return {};
    }
  }

  // Share conversation (create share link) - ALL CODE IN ENGLISH
  async shareConversation(
    conversationId: string
  ): Promise<{ share_url: string }> {
    try {
      const response = await apiClient.post(
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
      const response = await apiClient.post(
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
      const response = await apiClient.post(
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
    const response = await apiClient.post(`/agents/${agentId}/chat`, {
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
    const url = `${apiClient.defaults.baseURL}/chat/conversations/${conversationId}/stream/?token=${token}&message=${encodeURIComponent(
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
      const response = await apiClient.post(
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

  // Delete all conversations (for development cleanup) - ALL CODE IN ENGLISH
  async deleteAllConversations(): Promise<{
    success: boolean;
    deleted_count: number;
  }> {
    try {
      console.log("🧹 Calling backend cleanup API...");

      const response = await apiClient.post("/chat/cleanup-all");

      if (response.data?.success) {
        const result = response.data.data;
        const totalDeleted =
          result.total_deleted ||
          result.conversations_deleted + result.messages_deleted;

        console.log(
          `✅ Cleanup API success: ${result.conversations_deleted} conversations + ${result.messages_deleted} messages = ${totalDeleted} total deleted`
        );

        return {
          success: true,
          deleted_count: totalDeleted,
        };
      } else {
        console.error("❌ Cleanup API returned success=false");
        return { success: false, deleted_count: 0 };
      }
    } catch (error) {
      console.error("❌ Error calling cleanup API:", error);
      return { success: false, deleted_count: 0 };
    }
  }
}

export default new ChatService();
