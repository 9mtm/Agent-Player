import type { Agent, CreateAgentRequest } from "../types";

// Default agent data for new agents
export const DEFAULT_AGENT_DATA: CreateAgentRequest = {
  name: "New Agent",
  description: "A new AI agent",
  model_provider: "openai",
  model_name: "gpt-3.5-turbo",
  system_prompt: "You are a helpful AI assistant.",
  tools_enabled: true,
};

// Model providers and their default models
export const MODEL_PROVIDERS = {
  openai: {
    name: "OpenAI",
    models: ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"],
  },
  anthropic: {
    name: "Anthropic",
    models: ["claude-3-haiku", "claude-3-sonnet", "claude-3-opus"],
  },
  google: {
    name: "Google",
    models: ["gemini-pro", "gemini-pro-vision"],
  },
  local: {
    name: "Local Model",
    models: ["llama2", "codellama", "mistral"],
  },
} as const;

// Agent status configurations
export const AGENT_STATUS_CONFIG = {
  active: {
    label: "Active",
    color: "var(--success-color)",
    bgColor: "var(--success-bg)",
  },
  inactive: {
    label: "Inactive",
    color: "var(--warning-color)",
    bgColor: "var(--warning-bg)",
  },
  error: {
    label: "Error",
    color: "var(--error-color)",
    bgColor: "var(--error-bg)",
  },
  testing: {
    label: "Testing",
    color: "var(--info-color)",
    bgColor: "var(--info-bg)",
  },
} as const;

// Sidebar configuration
export const SIDEBAR_CONFIG = {
  width: 300,
  minWidth: 250,
  maxWidth: 400,
};

// Animation durations
export const ANIMATIONS = {
  sidebarToggle: 200,
  agentSelect: 150,
  statusChange: 200,
};

// Utility functions
export const createNewAgentData = (
  existingCount: number
): CreateAgentRequest => ({
  ...DEFAULT_AGENT_DATA,
  name: `${DEFAULT_AGENT_DATA.name} ${existingCount + 1}`,
});

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  );

  if (diffInHours < 1) return "just now";
  if (diffInHours < 24) return `${diffInHours} hours ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "1 day ago";
  if (diffInDays < 7) return `${diffInDays} days ago`;

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks === 1) return "1 week ago";
  if (diffInWeeks < 4) return `${diffInWeeks} weeks ago`;

  return date.toLocaleDateString();
};

export const getProviderDisplayName = (provider: string): string => {
  return (
    MODEL_PROVIDERS[provider as keyof typeof MODEL_PROVIDERS]?.name || provider
  );
};

export const isValidProvider = (provider: string): boolean => {
  return provider in MODEL_PROVIDERS;
};

export const getProviderModels = (provider: string): string[] => {
  return (
    MODEL_PROVIDERS[provider as keyof typeof MODEL_PROVIDERS]?.models || []
  );
};

export const formatUsageCount = (count: number): string => {
  if (count === 0) return "Never used";
  if (count === 1) return "Used once";
  if (count < 100) return `Used ${count} times`;
  if (count < 1000) return `Used ${Math.floor(count / 10) * 10}+ times`;
  return `Used ${Math.floor(count / 100) * 100}+ times`;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};

export const getAgentInitials = (name: string): string => {
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
};

export const validateAgentName = (name: string): string | null => {
  if (!name.trim()) return "Agent name is required";
  if (name.length < 2) return "Agent name must be at least 2 characters";
  if (name.length > 50) return "Agent name must be less than 50 characters";
  return null;
};

export const parseApiError = (error: unknown): string => {
  if (error && typeof error === "object" && "response" in error) {
    const apiError = error as { response?: { data?: { detail?: string } } };
    return apiError.response?.data?.detail || "An unexpected error occurred";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
};
