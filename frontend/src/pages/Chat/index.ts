/**
 * Chat Pages Index
 * Central export for all chat-related pages and components
 */

// Main Chat Page - Shows list of conversations
export { ChatPage } from "./ChatPage";

// Child Agent Chat Page - The main chat interface with database storage
export { ChildAgentChat } from "./ChildAgentChat";

// Default export - Use the main chat page as default
export { ChatPage as default } from "./ChatPage";

// Types
export * from "./types";

// Hooks
export * from "./hooks";

// Components
export * from "./components";
