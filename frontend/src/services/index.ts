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
export { usersService } from "./users";
export { settingsService } from "./settings";
export { countriesService } from "./countries";

// Export enums as values (not types)
export { TaskStatus, TaskPriority } from "./tasks";
export { SpecializedRoles, TaskTypes } from "./childAgents";
export { NodeTypes, TriggerTypes } from "./workflows";
export { WS_EVENTS } from "./websocket";

// Export types for easy access
export type { User } from "./auth";

// Countries types
export type {
  Country,
  Region,
  CountrySearchResult,
  Currency,
  Language,
  Timezone,
} from "./countries";
