// Main types index - Export all type definitions

// License types
export * from "./license";

// Common API types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
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
  description: string;
  agent_type: string;
  model_provider?: string;
  model_name?: string;
  is_active: boolean;
  usage_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface CreateAgentData {
  name: string;
  description: string;
  type: string;
  llmConfig: Record<string, unknown>;
  settings: Record<string, unknown>;
  agent_type: string;
  configuration: Record<string, unknown>;
  is_active: boolean;
}

export interface AgentConfig {
  model_provider: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
}

export type AgentStatus = "active" | "inactive" | "error";
export type AgentType = "main" | "child";

export interface CreateAgentRequest {
  name: string;
  description: string;
  agent_type: string;
  model_provider: string;
  model_name: string;
  temperature?: number;
  max_tokens?: number;
}

export interface UpdateAgentRequest extends Partial<CreateAgentRequest> {
  id: number;
}

export interface AgentListResponse {
  agents: Agent[];
  total: number;
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
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: number;
  created_at: string;
  updated_at: string;
  due_date?: string;
}

export type TaskStatus = "todo" | "in-progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface CreateTaskRequest {
  title: string;
  description: string;
  priority: TaskPriority;
  due_date?: string;
  assigned_to?: number;
}

// Board/Workflow types
export interface BoardNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface BoardEdge {
  id: string;
  source: string;
  target: string;
  type: string;
}

// Settings types
export interface UserSettings {
  theme: string;
  language: string;
  notifications: boolean;
}

// Generic utility types
export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
  has_next: boolean;
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
