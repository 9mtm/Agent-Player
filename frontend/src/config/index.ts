/**
 * Frontend Configuration
 *
 * Centralized configuration management for the Dpro AI Agent frontend.
 * Environment-based configuration with type safety.
 */

// Environment Types
export type Environment = "development" | "production" | "testing";

// API Configuration
export interface APIConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

// WebSocket Configuration
export interface WebSocketConfig {
  url: string;
  reconnectAttempts: number;
  reconnectInterval: number;
  heartbeatInterval: number;
}

// Application Configuration
export interface AppConfig {
  name: string;
  version: string;
  description: string;
  environment: Environment;
  debug: boolean;
}

// Feature Flags
export interface FeatureFlags {
  realTimeCollaboration: boolean;
  aiSuggestions: boolean;
  workflowEditor: boolean;
  childAgents: boolean;
  mcpIntegration: boolean;
  darkMode: boolean;
  analytics: boolean;
  notifications: boolean;
}

// UI Configuration
export interface UIConfig {
  theme: "light" | "dark" | "auto";
  language: "en" | "ar";
  rtl: boolean;
  compactMode: boolean;
  animationsEnabled: boolean;
  soundEnabled: boolean;
}

// Board Configuration
export interface BoardConfig {
  maxColumns: number;
  maxCardsPerColumn: number;
  autoSave: boolean;
  autoSaveInterval: number;
  enableKeyboardShortcuts: boolean;
  enableDragAndDrop: boolean;
}

// Base Configuration
class BaseConfiguration {
  // Application Info
  public readonly app: AppConfig = {
    name: "Dpro AI Agent",
    version: "2.0.0",
    description: "Advanced AI Agent Management Platform",
    environment:
      (import.meta.env.VITE_ENVIRONMENT as Environment) || "development",
    debug: import.meta.env.DEV || false,
  };

  // API Configuration
  public readonly api: APIConfig = {
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
    retryAttempts: parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(import.meta.env.VITE_API_RETRY_DELAY) || 1000,
  };

  // WebSocket Configuration
  public readonly websocket: WebSocketConfig = {
    url: import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws",
    reconnectAttempts:
      parseInt(import.meta.env.VITE_WS_RECONNECT_ATTEMPTS) || 5,
    reconnectInterval:
      parseInt(import.meta.env.VITE_WS_RECONNECT_INTERVAL) || 5000,
    heartbeatInterval:
      parseInt(import.meta.env.VITE_WS_HEARTBEAT_INTERVAL) || 30000,
  };

  // Feature Flags
  public readonly features: FeatureFlags = {
    realTimeCollaboration: this.getBooleanEnv("VITE_FEATURE_REAL_TIME", true),
    aiSuggestions: this.getBooleanEnv("VITE_FEATURE_AI_SUGGESTIONS", true),
    workflowEditor: this.getBooleanEnv("VITE_FEATURE_WORKFLOW_EDITOR", true),
    childAgents: this.getBooleanEnv("VITE_FEATURE_CHILD_AGENTS", true),
    mcpIntegration: this.getBooleanEnv("VITE_FEATURE_MCP", true),
    darkMode: this.getBooleanEnv("VITE_FEATURE_DARK_MODE", true),
    analytics: this.getBooleanEnv("VITE_FEATURE_ANALYTICS", true),
    notifications: this.getBooleanEnv("VITE_FEATURE_NOTIFICATIONS", true),
  };

  // UI Configuration
  public readonly ui: UIConfig = {
    theme:
      (import.meta.env.VITE_UI_THEME as "light" | "dark" | "auto") || "auto",
    language: (import.meta.env.VITE_UI_LANGUAGE as "en" | "ar") || "en",
    rtl: this.getBooleanEnv("VITE_UI_RTL", false),
    compactMode: this.getBooleanEnv("VITE_UI_COMPACT", false),
    animationsEnabled: this.getBooleanEnv("VITE_UI_ANIMATIONS", true),
    soundEnabled: this.getBooleanEnv("VITE_UI_SOUND", true),
  };

  // Board Configuration
  public readonly board: BoardConfig = {
    maxColumns: parseInt(import.meta.env.VITE_BOARD_MAX_COLUMNS) || 20,
    maxCardsPerColumn:
      parseInt(import.meta.env.VITE_BOARD_MAX_CARDS_PER_COLUMN) || 100,
    autoSave: this.getBooleanEnv("VITE_BOARD_AUTO_SAVE", true),
    autoSaveInterval:
      parseInt(import.meta.env.VITE_BOARD_AUTO_SAVE_INTERVAL) || 30000,
    enableKeyboardShortcuts: this.getBooleanEnv(
      "VITE_BOARD_KEYBOARD_SHORTCUTS",
      true
    ),
    enableDragAndDrop: this.getBooleanEnv("VITE_BOARD_DRAG_DROP", true),
  };

  // Storage Keys
  public readonly storage = {
    token: "access_token",
    refreshToken: "refresh_token",
    user: "user",
    preferences: "user_preferences",
    theme: "theme",
    language: "language",
    boardState: "board_state",
    recentBoards: "recent_boards",
  };

  // API Endpoints
  public readonly endpoints = {
    auth: {
      login: "/auth/login",
      register: "/auth/register",
      refresh: "/auth/refresh",
      logout: "/auth/logout",
      profile: "/auth/me",
      systemStatus: "/auth/system/status",
      registerAdmin: "/auth/register/admin",
      users: "/auth/users",
    },
    agents: {
      list: "/agents",
      main: "/agents/main",
      child: "/agents/child",
      create: "/agents",
      createChild: "/agents/child",
      get: (id: number) => `/agents/${id}`,
      update: (id: number) => `/agents/${id}`,
      delete: (id: number) => `/agents/${id}`,
      test: (id: number) => `/agents/${id}/test`,
      children: (id: number) => `/agents/${id}/children`,
      statistics: "/agents/statistics/overview",
    },
    chat: {
      conversations: "/chat/conversations",
      createConversation: "/chat/conversations",
      getConversation: (id: string) => `/chat/conversations/${id}`,
      updateConversation: (id: string) => `/chat/conversations/${id}`,
      deleteConversation: (id: string) => `/chat/conversations/${id}`,
      messages: (conversationId: string) =>
        `/chat/conversations/${conversationId}/messages`,
      sendMessage: (conversationId: string) =>
        `/chat/conversations/${conversationId}/messages`,
      deleteMessage: (messageId: number) => `/chat/messages/${messageId}`,
      updateMessage: (messageId: number) => `/chat/messages/${messageId}`,
      search: "/chat/search",
      analytics: "/chat/analytics/dashboard",
      globalAnalytics: "/chat/analytics/global",
      export: (conversationId: string) =>
        `/chat/conversations/${conversationId}/export`,
      share: (conversationId: string) =>
        `/chat/conversations/${conversationId}/share`,
      stream: (conversationId: string) =>
        `/chat/conversations/${conversationId}/stream`,
      aiResponse: (conversationId: string) =>
        `/chat/conversations/${conversationId}/ai-response`,
      quick: "/chat/quick",
    },
    users: {
      profile: "/users/profile",
      updateProfile: "/users/profile",
      changePassword: "/users/password",
      settings: "/users/settings",
      preferences: "/users/preferences",
      list: "/users",
      get: (id: number) => `/users/${id}`,
      update: (id: number) => `/users/${id}`,
      delete: (id: number) => `/users/${id}`,
      statistics: "/users/statistics",
      activate: (id: number) => `/users/${id}/activate`,
      deactivate: (id: number) => `/users/${id}/deactivate`,
    },
    // Deprecated endpoints (kept for backward compatibility)
    childAgents: {
      list: "/agents/child",
      create: "/agents/child",
      get: (id: number) => `/agents/${id}`,
      update: (id: number) => `/agents/${id}`,
      delete: (id: number) => `/agents/${id}`,
      tasks: "/agents/child/tasks",
      analytics: (id: number) => `/agents/${id}/analytics`,
    },
    boards: {
      list: "/boards",
      create: "/boards",
      get: (id: number) => `/boards/${id}`,
      update: (id: number) => `/boards/${id}`,
      delete: (id: number) => `/boards/${id}`,
      columns: (boardId: number) => `/boards/${boardId}/columns`,
      cards: (boardId: number) => `/boards/${boardId}/cards`,
      analytics: (boardId: number) => `/boards/${boardId}/analytics`,
    },
    workflows: {
      list: "/workflows",
      create: "/workflows",
      get: (id: number) => `/workflows/${id}`,
      execute: (id: number) => `/workflows/${id}/execute`,
      nodes: (workflowId: number) => `/workflows/${workflowId}/nodes`,
      connections: (workflowId: number) =>
        `/workflows/${workflowId}/connections`,
    },
    mcp: {
      execute: "/mcp/execute",
      servers: "/mcp/servers",
      tools: "/mcp/tools",
      sessions: "/mcp/sessions",
    },
  };

  // Utility Methods
  private getBooleanEnv(key: string, defaultValue: boolean = false): boolean {
    const value = import.meta.env[key];
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === "true";
  }

  // Environment Checks
  public get isDevelopment(): boolean {
    return this.app.environment === "development";
  }

  public get isProduction(): boolean {
    return this.app.environment === "production";
  }

  public get isTesting(): boolean {
    return this.app.environment === "testing";
  }
}

// Development Configuration
class DevelopmentConfiguration extends BaseConfiguration {
  constructor() {
    super();

    // Override for development
    this.api.baseURL = "http://localhost:8000";
    this.websocket.url = "ws://localhost:8000/ws";

    // Enable all features in development
    Object.keys(this.features).forEach((key) => {
      (this.features as any)[key] = true;
    });
  }
}

// Production Configuration
class ProductionConfiguration extends BaseConfiguration {
  constructor() {
    super();

    // Production overrides
    this.api.baseURL =
      import.meta.env.VITE_API_BASE_URL || "https://api.dpro-agent.com";
    this.websocket.url =
      import.meta.env.VITE_WS_URL || "wss://api.dpro-agent.com/ws";

    // Disable debug features in production
    (this.app as any).debug = false;
  }
}

// Testing Configuration
class TestingConfiguration extends BaseConfiguration {
  constructor() {
    super();

    // Testing overrides
    this.api.baseURL = "http://localhost:8000";
    this.api.timeout = 5000;
    this.websocket.reconnectAttempts = 1;
  }
}

// Factory Function
function createConfiguration(): BaseConfiguration {
  const environment =
    (import.meta.env.VITE_ENVIRONMENT as Environment) || "development";

  switch (environment) {
    case "production":
      return new ProductionConfiguration();
    case "testing":
      return new TestingConfiguration();
    default:
      return new DevelopmentConfiguration();
  }
}

// Configuration Instance
export const config = createConfiguration();

// Default Export
export default config;

// Type Exports
export type {
  Environment,
  APIConfig,
  WebSocketConfig,
  AppConfig,
  FeatureFlags,
  UIConfig,
  BoardConfig,
};

// Validation Function
export function validateConfig(): string[] {
  const errors: string[] = [];

  // Validate API URL
  if (!config.api.baseURL) {
    errors.push("API base URL is required");
  }

  // Validate WebSocket URL in production
  if (config.isProduction && !config.websocket.url) {
    errors.push("WebSocket URL is required in production");
  }

  // Validate timeouts
  if (config.api.timeout < 1000) {
    errors.push("API timeout should be at least 1000ms");
  }

  return errors;
}

// Configuration Utilities
export const configUtils = {
  // Get full API URL
  getApiUrl: (endpoint: string): string => {
    return `${config.api.baseURL}${endpoint}`;
  },

  // Get WebSocket URL with token
  getWebSocketUrl: (token?: string): string => {
    const url = new URL(config.websocket.url);
    if (token) {
      url.searchParams.set("token", token);
    }
    return url.toString();
  },

  // Check if feature is enabled
  isFeatureEnabled: (feature: keyof FeatureFlags): boolean => {
    return config.features[feature];
  },

  // Get storage key
  getStorageKey: (key: keyof typeof config.storage): string => {
    return config.storage[key];
  },

  // Environment info
  getEnvironmentInfo: () => ({
    environment: config.app.environment,
    version: config.app.version,
    debug: config.app.debug,
    features: config.features,
  }),
};
