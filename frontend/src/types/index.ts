// Main types index - Export all type definitions

// License types
export * from "./license";

// Common API types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// User types (basic - extend as needed)
export interface User {
  id: number;
  email: string;
  username?: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  theme?: string;
  language?: string;
}

// Agent types
export interface Agent {
  id: number;
  name: string;
  description?: string;
  provider: AIProvider;
  providerConfig: ProviderConfig;
  model_provider: string;
  model_name: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  config?: Record<string, any>;
}

// Chat types
export interface Conversation {
  id: number;
  title: string;
  agent_id?: number;
  user_id: number;
  created_at: string;
  updated_at?: string;
  message_count?: number;
  is_active: boolean;
}

export interface Message {
  id: number;
  conversation_id: number;
  content: string;
  is_user: boolean;
  created_at: string;
  metadata?: Record<string, any>;
}

// Task types
export interface Task {
  id: number;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  progress: number;
  assigned_to?: string;
  due_date?: string;
  created_at: string;
  updated_at?: string;
  tags?: string[];
}

// Board/Workflow types
export interface BoardNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface BoardEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

// Settings types
export interface UserSettings {
  theme: "light" | "dark" | "auto";
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    browser: boolean;
  };
  privacy: {
    profile_visibility: "public" | "private";
    data_sharing: boolean;
  };
}

// Generic utility types
export type LoadingState = "idle" | "loading" | "success" | "error";

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Without<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type XOR<T, U> = T | U extends object
  ? (Without<T, keyof U> & U) | (Without<U, keyof T> & T)
  : T | U;

export type AIProvider = "openai" | "gemini";

export interface GeminiConfig {
  authType: "google" | "apiKey";
  apiKey?: string;
  model?: string;
}

export interface ProviderConfig {
  openai?: {
    apiKey: string;
    model: string;
  };
  gemini?: GeminiConfig;
}
