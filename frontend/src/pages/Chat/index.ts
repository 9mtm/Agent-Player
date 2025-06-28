/**
 * Chat Pages Index
 * Main chat interface exports - Beautiful Design
 */

// Import CSS to ensure styles are loaded
import "./ChatPage.css";

// Main chat page export - using beautiful organized ChatPage
export { default as ChatPage } from "./ChatPage";

// Export components (excluding conflicting names)
export {
  ChatInterface,
  ConversationsSidebar,
  ModelSelector,
  SessionsManager,
  MessageInput,
  MessageList,
  ChatHeader,
} from "./components";

// Export ChatSettings component with alias to avoid conflict
export { ChatSettings as ChatSettingsModal } from "./components";

// Export types (including ChatSettings interface)
export * from "./types";

// Export hooks
export * from "./hooks";
