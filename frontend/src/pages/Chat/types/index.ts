/**
 * Chat System Types
 */

export interface Agent {
  id: number;
  name: string;
  description?: string;
  model_provider: string;
  model_name: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  agent_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: number;

  // Optional extended properties for UI
  conversation_type?: "chat" | "support" | "training" | "analysis";
  status?: "active" | "paused" | "completed" | "archived";
  agent_name?: string;
  is_pinned?: boolean;
  is_archived?: boolean;
  message_count?: number;
  last_message_at?: string;
}

export interface Message {
  id: string;
  content: string;
  sender_type: "user" | "agent" | "system";
  sender_name: string;
  message_type?: "text" | "image" | "file" | "code";
  status?: "sending" | "sent" | "delivered" | "read" | "error";
  tokens_used?: number;
  processing_time?: number;
  created_at: string;
  updated_at?: string;
}

export interface CreateConversationRequest {
  title: string;
  agent_id?: string;
  conversation_type: "chat" | "support" | "training" | "analysis";
}

export interface SendMessageRequest {
  content: string;
  message_type?: "text" | "image" | "file" | "code";
  parent_message_id?: string;
}

export interface ChatSettings {
  selectedModel: string;
  temperature: number;
  maxTokens: number;
  autoSave: boolean;
  showTimestamps: boolean;
  enableTypingIndicator: boolean;
}

export interface ConversationFilters {
  search?: string;
  status?: string;
  agent_id?: string;
  conversation_type?: string;
  is_pinned?: boolean;
  is_archived?: boolean;
}

// Add missing Chat types for services
export interface EnhancedConversation {
  id: number;
  title: string;
  agent_id?: number;
  agent_name?: string;
  message_count: number;
  created_at: string;
  updated_at?: string;
  last_message_at?: string;
  is_active?: boolean;
  is_pinned?: boolean;
}

export interface EnhancedMessage {
  id: number;
  conversation_id: number;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  tokens_used?: number;
  sender_type?: string;
  user_id?: number;
}

export interface ConversationListResponse {
  conversations: EnhancedConversation[];
  total: number;
  page: number;
  pages: number;
  has_next: boolean;
}

export interface MessageListResponse {
  messages: EnhancedMessage[];
  total: number;
  has_more: boolean;
}

export interface ChatAnalytics {
  total_conversations: number;
  total_messages: number;
  active_conversations: number;
  average_response_time: number;
}

export interface DashboardAnalytics {
  conversations: number;
  messages: number;
  agents: number;
  uptime: string;
}

export interface AILearningSession {
  id: string;
  conversation_id: number;
  started_at: string;
  ended_at?: string;
  learning_data: Record<string, unknown>;
}

export interface AgentMemory {
  id: string;
  agent_id: number;
  conversation_id: number;
  memory_type: string;
  content: string;
  created_at: string;
}
