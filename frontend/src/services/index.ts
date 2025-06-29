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
export { default as workflowsService } from "./workflows";
export { default as websocketService } from "./websocket";
export { licenseService } from "./license";
export { trainingLabService } from "./trainingLab";
export { marketplaceService } from "./marketplace";
// export { usersService } from "./users"; // TODO: Create users service file

// Export enums as values (not types)
export { TaskStatus, TaskPriority } from "./tasks";
export { SpecializedRoles, TaskTypes } from "./childAgents";
export { NodeTypes, TriggerTypes } from "./workflows";
export { WS_EVENTS } from "./websocket";

// Export types for easy access
export type { User, LoginRequest, RegisterRequest, AuthResponse } from "./auth";
export type {
  Agent,
  CreateAgentRequest,
  UpdateAgentRequest,
  AgentListResponse,
} from "./agents";
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
  MCPServer,
  MCPTool,
  MCPSession,
  AICommandRequest,
  AICommandResponse,
} from "./mcp";

// Workflow types
export type {
  Workflow,
  WorkflowNode,
  WorkflowConnection,
  WorkflowExecution,
  WorkflowTemplate,
  CreateWorkflowRequest,
  CreateNodeRequest,
  CreateConnectionRequest,
  WorkflowAnalytics,
  NodeType,
  TriggerType,
} from "./workflows";

// WebSocket types
export type {
  WebSocketMessage,
  UserPresence,
  BoardCollaboration,
  LiveUpdate,
  CursorUpdate,
  TypingIndicator,
  WSEventType,
} from "./websocket";

// Training Lab types
export type {
  TrainingWorkspace,
  TrainingSession,
  TrainingAnalytics,
  TrainingTemplate,
  WorkspaceTestResult,
  LLMConfig,
  TrainingWorkflow,
} from "../types/trainingLab";

// Marketplace types
export type {
  MarketplaceItem,
  MarketplaceCategory,
  MarketplaceReview,
  MarketplacePurchase,
  MarketplaceSearch,
  MarketplaceStats,
  SellerAnalytics,
} from "../types/marketplace";

// License types (from existing license types)
export type {
  License,
  LicenseInfo,
  LicenseActivation,
  OnlineLicenseRequest,
  OnlineLicenseResponse,
  LicenseValidation,
  LicenseStats,
  LicenseStatus,
} from "../types/license";

// Avatar system removed - keeping only audio waves for voice chat
