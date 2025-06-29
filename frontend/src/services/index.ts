// Export all services from a central location
export {
  default as api,
  setAuthToken,
  removeAuthToken,
  isAuthenticated,
} from "./api";
export { default as authService } from "./auth";
export { default as agentsService } from "./agents";
export { default as tasksService } from "./tasks";
export { default as chatService } from "./chat";
export { default as enhancedChatService } from "./enhancedChat";
export { default as boardsService } from "./boards";
export { default as childAgentsService } from "./childAgents";
export { default as mcpService } from "./mcp";
export { default as websocketService } from "./websocket";
export { licenseService } from "./license";
export { trainingLabService } from "./trainingLab";
export { marketplaceService } from "./marketplace";
export { usersService } from "./users";

// Export enums as values (not types)
export { TaskStatus, TaskPriority } from "./tasks";
export { SpecializedRoles, TaskTypes } from "./childAgents";
// Workflow types are now integrated into Board system
export { WS_EVENTS } from "./websocket";

// Export types for easy access
export type { User, LoginRequest, RegisterRequest, AuthResponse } from "./auth";
export type {
  Agent,
  AgentConfig,
  AgentStatus,
  AgentType,
  CreateAgentRequest,
  UpdateAgentRequest,
  AgentListResponse,
} from "../types";
export type {
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskListResponse,
} from "./tasks";
export type {
  Conversation,
  Message,
  SendMessageRequest,
  ConversationListResponse,
} from "./chat";

// Enhanced Chat types
export type {
  EnhancedConversation,
  EnhancedMessage,
  CreateConversationRequest,
  SendMessageRequest as EnhancedSendMessageRequest,
  ConversationListResponse as EnhancedConversationListResponse,
  MessageListResponse,
  ChatAnalytics,
  DashboardAnalytics,
  AILearningSession,
  AgentMemory,
} from "../pages/Chat/types";

// Board types
export type {
  Board,
  BoardColumn,
  BoardCard,
  BoardMember,
  BoardActivity,
  CreateBoardRequest,
  CreateColumnRequest,
  CreateCardRequest,
  MoveCardRequest,
  BoardAnalytics,
} from "./boards";

// Child Agent types
export type {
  ChildAgent,
  ChildAgentTask,
  ChildAgentLearning,
  ChildAgentPerformance,
  ChildAgentTemplate,
  CreateChildAgentRequest,
  UpdateChildAgentRequest,
  CreateTaskRequest as CreateAgentTaskRequest,
  ChildAgentAnalytics,
  SpecializedRole,
  TaskType,
} from "./childAgents";

// MCP types
export type {
  MCPRequest,
  MCPResponse,
  MCPStatus,
  MCPSessionConfig,
  AICommandRequest,
  AICommandResponse,
} from "./mcp";

// Training Lab types
export type {
  TrainingWorkspace,
  TrainingSession,
  TrainingTemplate,
  TrainingAnalytics,
} from "../types/trainingLab";

// Marketplace types
export type {
  MarketplaceItem,
  MarketplaceCategory,
  MarketplaceReview,
  MarketplaceStats,
} from "../types/marketplace";

// License types (from existing license types)
export type {
  LicenseInfo,
  LicenseStatus,
  LicenseFeature,
} from "../types/license";

// Avatar system removed - keeping only audio waves for voice chat

// Type exports from websocket
export type {
  WebSocketMessage,
  UserPresence,
  BoardCollaboration,
  LiveUpdate,
  CursorUpdate,
  TypingIndicator,
  WSEventType,
} from "./websocket";

// Type exports from existing types
export type {
  ApiResponse,
  BoardNode,
  BoardEdge,
  UserSettings,
  LoadingState,
  PaginatedResponse,
} from "../types";

// Authentication
export type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User as AuthUser,
} from "./auth";

// Users
export type {
  User,
  UserPreferences,
  UserStats,
  ProfileUpdateData,
  UsersResponse,
} from "./users";

// Agents
export type {
  Agent,
  AgentType,
  CreateAgentData,
  UpdateAgentData,
  AgentResponse,
} from "./agents";

// Chat
export type { CreateConversationData, SendMessageData } from "./chat";

// Tasks
export type {
  Task,
  CreateTaskData,
  UpdateTaskData,
  TaskComment,
  TaskTimeLog,
} from "./tasks";

// Settings
export type {
  UserProfile,
  UserAddress,
  UserLink,
  UserFile,
  SettingsResponse,
} from "./settings";

// Training Lab
export type {
  Workspace,
  TrainingSession,
  CreateWorkspaceData,
} from "./trainingLab";

// License
export type { LicenseInfo, LicenseValidation, HardwareInfo } from "./license";

// Marketplace
export type {
  MarketplaceItem,
  MarketplaceCategory,
  PurchaseData,
} from "./marketplace";

// Child Agents
export type { CreateChildAgentData, ChildAgentResponse } from "./childAgents";

// Boards
export type {
  Board,
  BoardNode,
  BoardConnection,
  CreateBoardData,
} from "./boards";

// WebSocket
export type { WebSocketService } from "./websocketService";

// MCP
export type { MCPTool, MCPConnection, MCPMessage } from "./mcp";

// API Base
export type { apiCall } from "./api";
