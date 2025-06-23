/**
 * Enhanced Chat Types for Dpro AI Agent
 * All type definitions for the enhanced chat system
 */

// ========================================
// ENHANCED CONVERSATION TYPES
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

export interface ConversationListResponse {
  conversations: EnhancedConversation[];
  total_count: number;
  has_more: boolean;
}

// ========================================
// ENHANCED MESSAGE TYPES
// ========================================

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

export interface MessageListResponse {
  messages: EnhancedMessage[];
  total_count: number;
  has_more: boolean;
  conversation_id: string;
}

// ========================================
// AI LEARNING TYPES
// ========================================

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

// ========================================
// ANALYTICS TYPES
// ========================================

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

export interface DashboardAnalytics {
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
}

// ========================================
// REQUEST/RESPONSE TYPES
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

export interface MessageFilters {
  skip?: number;
  limit?: number;
  message_type?: string;
  sender_type?: string;
  agent_id?: number;
  include_deleted?: boolean;
  search?: string;
}

// ========================================
// WEBSOCKET TYPES
// ========================================

export interface WebSocketMessage {
  type:
    | "new_message"
    | "user_typing"
    | "message_read"
    | "user_presence"
    | "ai_chunk"
    | "complete"
    | "error";
  data?: any;
  message?: EnhancedMessage;
  user_id?: string;
  is_typing?: boolean;
  message_id?: string;
  status?: "online" | "away" | "busy";
  content?: string;
  chunk_index?: number;
  is_final?: boolean;
  agent_id?: number;
  timestamp?: string;
  total_tokens?: number;
  response_time_ms?: number;
}

// ========================================
// UI STATE TYPES
// ========================================

export interface ChatUIState {
  selectedConversation: EnhancedConversation | null;
  conversations: EnhancedConversation[];
  messages: EnhancedMessage[];
  isLoading: boolean;
  isLoadingMessages: boolean;
  isLoadingConversations: boolean;
  isSendingMessage: boolean;
  isTyping: Record<string, boolean>; // user_id -> is_typing
  onlineUsers: Record<string, string>; // user_id -> status
  error: string | null;
  searchQuery: string;
  searchResults: any[];
  isSearching: boolean;
  showAnalytics: boolean;
  showLearning: boolean;
  sidebarCollapsed: boolean;
}

export interface ConversationItemProps {
  conversation: EnhancedConversation;
  isSelected: boolean;
  onClick: (conversation: EnhancedConversation) => void;
  onDelete?: (id: string) => void;
  onPin?: (id: string) => void;
  onFavorite?: (id: string) => void;
  onArchive?: (id: string) => void;
}

export interface MessageItemProps {
  message: EnhancedMessage;
  onReact?: (messageId: string, reaction: string) => void;
  onFeedback?: (messageId: string, feedback: MessageFeedbackRequest) => void;
  onReply?: (messageId: string) => void;
  showActions?: boolean;
}

// ========================================
// STREAMING TYPES
// ========================================

export interface StreamingResponse {
  type: "user_message" | "ai_chunk" | "complete" | "error";
  content?: string;
  chunk_index?: number;
  is_final?: boolean;
  agent_id?: number;
  timestamp?: string;
  message_id?: string;
  total_tokens?: number;
  response_time_ms?: number;
  error?: string;
}

// ========================================
// EXPORT/SHARE TYPES
// ========================================

export interface ExportOptions {
  format: "json" | "txt" | "csv";
  include_metadata: boolean;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface ShareOptions {
  share_type: "link" | "user" | "public";
  permission_level: "read" | "comment" | "edit";
  expires_hours?: number;
}

export interface ShareResponse {
  conversation_id: string;
  share_token: string;
  share_type: string;
  permission_level: string;
  share_url: string;
  created_at: string;
  expires_at?: string;
  view_count: number;
}
