/**
 * Chat Types Index
 * Central export for all chat-related types
 */

export * from "./enhanced";

// Legacy types for backward compatibility (if needed)
export interface LegacyConversation {
  id: number;
  title: string;
  agent_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: number;
}

export interface LegacyMessage {
  id: number;
  conversation_id: number;
  role: "user" | "assistant" | "system";
  content: string;
  message_metadata?: Record<string, unknown>;
  tokens_used?: number;
  processing_time?: number;
  created_at: string;
  user_id: number;
}
