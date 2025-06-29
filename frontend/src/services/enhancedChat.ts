/**
 * Enhanced Chat Service for Dpro AI Agent
 * Supports advanced chat features, AI learning, analytics, and real-time communication
 */

import api from "./api";

// ========================================
// ENHANCED TYPES
// ========================================

export interface EnhancedConversation {
  id: string;
  title: string;
  description?: string;
  conversation_type: "permanent" | "temporary" | "draft" | "shared";
  conversation_scope: "private" | "shared" | "public";
  primary_agent_id?: number;
  participating_agents: number[];
  user_id: string;
  is_pinned: boolean;
  is_favorite: boolean;
  is_archived: boolean;
  auto_save: boolean;
  tags: string[];
  key_topics: string[];
  context_summary?: string;
  ai_insights?: string;
  message_count: number;
  total_tokens: number;
  avg_response_time: number;
  user_satisfaction?: number;
  ai_learning_enabled: boolean;
  performance_metrics: {
    engagement_score: number;
    completion_rate: number;
    success_rate: number;
  };
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  expires_at?: string;
}

export interface EnhancedMessage {
  id: string;
  conversation_id: string;
  content: string;
  original_content?: string;
  processed_content?: string;
  message_type: "text" | "image" | "file" | "audio" | "video" | "system";
  sender_type: "user" | "agent" | "system";
  sender_id: string;
  sender_name?: string;
  parent_message_id?: string;
  agent_id?: number;
  ai_model_used?: string;
  ai_confidence?: number;
  reasoning_chain?: Array<{
    step: string;
    description: string;
    confidence: number;
  }>;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  response_time_ms?: number;
  sentiment_score?: number;
  intent_classification?: {
    intent: string;
    confidence: number;
  };
  entities_extracted?: string[];
  keywords?: string[];
  attachments: string[];
  metadata: Record<string, any>;
  is_training_data: boolean;
  is_edited: boolean;
  edit_count: number;
  is_deleted: boolean;
  feedback_score?: number;
  user_reactions: Array<{
    type: string;
    emoji?: string;
    user_id: string;
  }>;
  context_references: string[];
  memory_triggers: string[];
  follow_up_suggestions: string[];
  privacy_level: "normal" | "sensitive" | "confidential";
  created_at: string;
  updated_at: string;
}

export interface AILearningSession {
  id: string;
  conversation_id: string;
  agent_id?: number;
  learning_type:
    | "conversation_analysis"
    | "user_preference"
    | "skill_improvement";
  learning_source:
    | "conversation_analysis"
    | "user_feedback"
    | "performance_data";
  knowledge_category: "communication" | "problem_solving" | "domain_specific";
  status: "processing" | "completed" | "validated" | "rejected";
  patterns_identified: string[];
  skills_improved: string[];
  knowledge_data: Record<string, any>;
  confidence_score: number;
  impact_score: number;
  validation_status: "pending" | "validated" | "rejected";
  learned_at: string;
  applied_count: number;
  success_rate: number;
}

export interface AgentMemory {
  id: string;
  agent_id: number;
  user_id: string;
  memory_type: "user_preference" | "conversation_context" | "learned_fact";
  memory_key: string;
  memory_value: Record<string, any>;
  memory_summary: string;
  confidence_level: number;
  importance_score: number;
  source_conversations: string[];
  access_count: number;
  last_accessed_at: string;
  created_at: string;
  expires_at?: string;
}

export interface ChatAnalytics {
  conversation_id?: string;
  agent_id?: number;
  period_days: number;
  total_conversations: number;
  total_messages: number;
  average_response_time: number;
  user_satisfaction: {
    average_rating: number;
    total_ratings: number;
    rating_distribution: Record<string, number>;
  };
  ai_performance: {
    accuracy_score: number;
    helpfulness_score: number;
    learning_progress: number;
  };
  usage_patterns: Array<{
    date: string;
    conversations: number;
    messages: number;
    users: number;
  }>;
  popular_topics: Array<{
    topic: string;
    count: number;
    success_rate: number;
  }>;
}

// ========================================
// REQUEST/RESPONSE INTERFACES
// ========================================

export interface QuickChatRequest {
  agent_id?: number;
  message?: string;
  temporary?: boolean;
}

export interface CreateConversationRequest {
  title: string;
  description?: string;
  conversation_type?: "permanent" | "temporary" | "draft";
  agent_id?: number;
  participating_agents?: number[];
  auto_save?: boolean;
  tags?: string[];
}

export interface SendMessageRequest {
  content: string;
  message_type?: "text" | "image" | "file" | "audio" | "video";
  agent_id?: number;
  parent_message_id?: string;
  attachments?: string[];
  metadata?: Record<string, any>;
}

export interface MessageFeedbackRequest {
  feedback: "positive" | "negative" | "neutral";
  reason?: string;
  quality_score?: number;
}

export interface ConversationFilters {
  conversation_type?: string;
  agent_id?: number;
  include_archived?: boolean;
  search?: string;
  tags?: string[];
  skip?: number;
  limit?: number;
}

// ========================================
// ENHANCED CHAT SERVICE
// ========================================

class EnhancedChatService {
  private baseUrl = "";
  private wsConnections: Map<string, WebSocket> = new Map();

  // ========================================
  // QUICK ACCESS METHODS
  // ========================================

  async createQuickChat(
    request: QuickChatRequest
  ): Promise<EnhancedConversation> {
    const response = await api.post(`${this.baseUrl}/chat/quick-chat`, request);
    return response.data;
  }

  async sendQuickMessage(
    message: string,
    agent_id?: number,
    conversation_id?: string
  ): Promise<{
    conversation_id: string;
    user_message: EnhancedMessage;
    ai_response?: EnhancedMessage;
  }> {
    const response = await api.post(`${this.baseUrl}/chat/send-quick-message`, {
      message,
      agent_id,
      conversation_id,
    });
    return response.data;
  }

  async getLocationChats(location: string): Promise<{
    location: string;
    conversations: EnhancedConversation[];
  }> {
    const response = await api.get(`${this.baseUrl}/chat/global/${location}`);
    return response.data;
  }

  // ========================================
  // CONVERSATION MANAGEMENT
  // ========================================

  async createConversation(
    request: CreateConversationRequest
  ): Promise<EnhancedConversation> {
    const response = await api.post(`${this.baseUrl}/conversations`, request);
    return response.data;
  }

  async createTemporaryConversation(
    title: string = "Temporary Chat",
    agent_id?: number,
    expire_hours: number = 24
  ): Promise<EnhancedConversation> {
    const response = await api.post(`${this.baseUrl}/conversations/temporary`, {
      title,
      agent_id,
      expire_hours,
    });
    return response.data;
  }

  async getConversations(filters: ConversationFilters = {}): Promise<{
    conversations: EnhancedConversation[];
    total_count: number;
    has_more: boolean;
  }> {
    const response = await api.get(`${this.baseUrl}/conversations`, {
      params: filters,
    });
    return response.data;
  }

  async getConversation(id: string): Promise<EnhancedConversation> {
    const response = await api.get(`${this.baseUrl}/conversations/${id}`);
    return response.data;
  }

  async updateConversation(
    id: string,
    updates: Partial<EnhancedConversation>
  ): Promise<{
    message: string;
    conversation_id: string;
    updates: Record<string, any>;
  }> {
    const response = await api.put(
      `${this.baseUrl}/conversations/${id}`,
      updates
    );
    return response.data;
  }

  async deleteConversation(
    id: string,
    permanent: boolean = false
  ): Promise<{
    message: string;
    conversation_id: string;
    permanent: boolean;
    deleted_at: string;
  }> {
    const response = await api.delete(`${this.baseUrl}/conversations/${id}`, {
      params: { permanent },
    });
    return response.data;
  }

  // ========================================
  // MESSAGE MANAGEMENT
  // ========================================

  async sendMessage(
    conversation_id: string,
    request: SendMessageRequest
  ): Promise<{
    user_message: EnhancedMessage;
    ai_response?: EnhancedMessage;
    conversation_id: string;
  }> {
    const response = await api.post(
      `${this.baseUrl}/messages/conversations/${conversation_id}/send`,
      request
    );
    return response.data;
  }

  async sendStreamingMessage(
    conversation_id: string,
    content: string,
    agent_id?: number
  ): Promise<EventSource> {
    const token = localStorage.getItem("access_token");
    const baseUrl = api.defaults.baseURL || "http://localhost:8000";
    const url = `${baseUrl}${this.baseUrl}/messages/conversations/${conversation_id}/send-stream`;

    const params = new URLSearchParams({
      content,
      ...(agent_id && { agent_id: agent_id.toString() }),
      ...(token && { token }),
    });

    return new EventSource(`${url}?${params}`);
  }

  async getMessages(
    conversation_id: string,
    options: {
      skip?: number;
      limit?: number;
      message_type?: string;
      sender_type?: string;
      agent_id?: number;
      include_deleted?: boolean;
      search?: string;
    } = {}
  ): Promise<{
    messages: EnhancedMessage[];
    total_count: number;
    has_more: boolean;
    conversation_id: string;
  }> {
    const response = await api.get(
      `${this.baseUrl}/messages/conversations/${conversation_id}`,
      { params: options }
    );
    return response.data;
  }

  async provideMessageFeedback(
    message_id: string,
    feedback: MessageFeedbackRequest
  ): Promise<{
    message: string;
    feedback_data: any;
    learning_triggered: boolean;
  }> {
    const response = await api.post(
      `${this.baseUrl}/messages/${message_id}/feedback`,
      feedback
    );
    return response.data;
  }

  async searchMessages(
    query: string,
    options: {
      conversation_id?: string;
      skip?: number;
      limit?: number;
    } = {}
  ): Promise<{
    query: string;
    results: Array<{
      message_id: string;
      conversation_id: string;
      content: string;
      snippet: string;
      sender_type: string;
      created_at: string;
      relevance_score: number;
      highlights: string[];
    }>;
    total_count: number;
    search_time_ms: number;
  }> {
    const response = await api.get(`${this.baseUrl}/messages/search`, {
      params: { query, ...options },
    });
    return response.data;
  }

  // ========================================
  // AI LEARNING & MEMORY
  // ========================================

  async triggerLearningSession(
    conversation_id: string,
    learning_type:
      | "conversation_analysis"
      | "user_preference"
      | "skill_improvement" = "conversation_analysis",
    agent_id?: number
  ): Promise<AILearningSession> {
    const response = await api.post(
      `${this.baseUrl}/learning/conversations/${conversation_id}/analyze`,
      { learning_type, agent_id }
    );
    return response.data;
  }

  async getAgentMemory(
    agent_id: number,
    options: {
      memory_type?: string;
      skip?: number;
      limit?: number;
    } = {}
  ): Promise<{
    agent_id: number;
    memories: AgentMemory[];
    total_count: number;
  }> {
    const response = await api.get(
      `${this.baseUrl}/learning/agents/${agent_id}/memory`,
      { params: options }
    );
    return response.data;
  }

  async getLearningAnalytics(days: number = 30): Promise<{
    period_days: number;
    total_learning_sessions: number;
    successful_sessions: number;
    success_rate: number;
    total_knowledge_gained: number;
    average_confidence: number;
    learning_categories: Record<string, number>;
  }> {
    const response = await api.get(`${this.baseUrl}/learning/analytics`, {
      params: { days },
    });
    return response.data;
  }

  // ========================================
  // ANALYTICS & INSIGHTS
  // ========================================

  async getConversationAnalytics(
    conversation_id: string
  ): Promise<ChatAnalytics> {
    const response = await api.get(
      `${this.baseUrl}/analytics/conversations/${conversation_id}`
    );
    return response.data;
  }

  async getAgentAnalytics(
    agent_id: number,
    days: number = 30,
    include_performance: boolean = true
  ): Promise<ChatAnalytics> {
    const response = await api.get(
      `${this.baseUrl}/analytics/agents/${agent_id}`,
      { params: { days, include_performance } }
    );
    return response.data;
  }

  async getDashboardAnalytics(
    days: number = 7,
    agent_id?: number
  ): Promise<{
    period_days: number;
    total_conversations: number;
    active_conversations: number;
    total_messages: number;
    total_users: number;
    active_users: number;
    conversation_metrics: {
      average_duration_minutes: number;
      average_messages_per_conversation: number;
      completion_rate: number;
    };
    user_engagement: {
      daily_active_users: Array<{
        date: string;
        users: number;
      }>;
      engagement_score: number;
      return_user_rate: number;
    };
    ai_performance: {
      average_response_time: number;
      user_satisfaction: number;
      success_rate: number;
      learning_sessions: number;
      knowledge_applications: number;
    };
    popular_topics: Array<{
      topic: string;
      count: number;
    }>;
    alerts: Array<{
      type: string;
      message: string;
      timestamp: string;
    }>;
  }> {
    const response = await api.get(`${this.baseUrl}/analytics/dashboard`, {
      params: { days, agent_id },
    });
    return response.data;
  }

  async getAIInsights(days: number = 30): Promise<{
    period_days: number;
    key_insights: Array<{
      insight_type: string;
      title: string;
      description: string;
      confidence: number;
      impact: string;
      trend: string;
    }>;
    recommendations: Array<{
      category: string;
      action: string;
      expected_impact: string;
      priority: string;
      effort: string;
    }>;
    predictive_analytics: {
      expected_growth: {
        conversations: number;
        users: number;
        satisfaction: number;
      };
      capacity_planning: {
        current_utilization: number;
        projected_peak: number;
        scaling_needed: string;
      };
    };
    generated_at: string;
  }> {
    const response = await api.get(`${this.baseUrl}/analytics/insights`, {
      params: { days },
    });
    return response.data;
  }

  // ========================================
  // CONVERSATION SHARING & EXPORT
  // ========================================

  async exportConversation(
    conversation_id: string,
    format: "json" | "txt" | "csv" = "json",
    include_metadata: boolean = true
  ): Promise<{
    conversation_id: string;
    export_format: string;
    exported_at: string;
    message_count: number;
    export_url: string;
    metadata?: any;
  }> {
    const response = await api.get(
      `${this.baseUrl}/conversations/${conversation_id}/export`,
      { params: { format, include_metadata } }
    );
    return response.data;
  }

  async shareConversation(
    conversation_id: string,
    share_type: "link" | "user" | "public" = "link",
    permission_level: "read" | "comment" | "edit" = "read",
    expires_hours?: number
  ): Promise<{
    conversation_id: string;
    share_token: string;
    share_type: string;
    permission_level: string;
    share_url: string;
    created_at: string;
    expires_at?: string;
    view_count: number;
  }> {
    const response = await api.post(
      `${this.baseUrl}/conversations/${conversation_id}/share`,
      { share_type, permission_level, expires_hours }
    );
    return response.data;
  }

  async backupConversation(conversation_id: string): Promise<{
    conversation_id: string;
    backup_id: string;
    created_at: string;
    backup_size: string;
    backup_url: string;
  }> {
    const response = await api.post(
      `${this.baseUrl}/conversations/${conversation_id}/backup`
    );
    return response.data;
  }

  // ========================================
  // REAL-TIME WEBSOCKET METHODS
  // ========================================

  connectToConversation(
    conversation_id: string,
    user_id: string,
    onMessage?: (data: any) => void,
    onError?: (error: Event) => void,
    onClose?: (event: CloseEvent) => void
  ): WebSocket {
    const token = localStorage.getItem("access_token");
    const wsUrl = `ws://localhost:8000${this.baseUrl}/chat/ws/${conversation_id}?user_id=${user_id}${token ? `&token=${token}` : ""}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`Connected to conversation ${conversation_id}`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      onError?.(error);
    };

    ws.onclose = (event) => {
      console.log(`Disconnected from conversation ${conversation_id}`);
      onClose?.(event);
      this.wsConnections.delete(conversation_id);
    };

    this.wsConnections.set(conversation_id, ws);
    return ws;
  }

  sendTypingIndicator(conversation_id: string, is_typing: boolean): void {
    const ws = this.wsConnections.get(conversation_id);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "typing",
          is_typing,
        })
      );
    }
  }

  sendReadReceipt(conversation_id: string, message_id: string): void {
    const ws = this.wsConnections.get(conversation_id);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "read_receipt",
          message_id,
        })
      );
    }
  }

  updatePresence(
    conversation_id: string,
    status: "online" | "away" | "busy"
  ): void {
    const ws = this.wsConnections.get(conversation_id);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "presence",
          status,
        })
      );
    }
  }

  disconnectFromConversation(conversation_id: string): void {
    const ws = this.wsConnections.get(conversation_id);
    if (ws) {
      ws.close();
      this.wsConnections.delete(conversation_id);
    }
  }

  disconnectAll(): void {
    this.wsConnections.forEach((ws, conversation_id) => {
      ws.close();
    });
    this.wsConnections.clear();
  }
}

export default new EnhancedChatService();
