/**
 * Chat Components Index
 * Exports all chat-related components
 */

// Components with ONLY named exports
export { ConversationsSidebar } from "./ConversationsSidebar";
export { SimpleChatInterface } from "./SimpleChatInterface";
export { EnhancedMessageInput } from "./EnhancedMessageInput";
export { ConversationsList } from "./ConversationsList";
export { ChatAnalyticsPanel } from "./ChatAnalyticsPanel";
export { EnhancedMessageComponent } from "./EnhancedMessage";
export { EnhancedConversationItem } from "./EnhancedConversationItem";
export { MessageInput } from "./MessageInput";
export { SessionsManager } from "./SessionsManager";
export { MessageList } from "./MessageList";
export { ChatInterface } from "./ChatInterface";
export { ChatHeader } from "./ChatHeader";

// Components with both named and default exports (prefer default)
export { default as ChatToolbar } from "./ChatToolbar";
export { default as ModelSelector } from "./ModelSelector";
export { default as SimpleChatSettings } from "./SimpleChatSettings";
export { default as ChatWelcome } from "./ChatWelcome";
export { default as ChatSidebar } from "./ChatSidebar";
export { default as ChatSettings } from "./ChatSettings";
export { default as ChatMessages } from "./ChatMessages";
export { default as ChatInput } from "./ChatInput";

// Re-exports for easier access to new OpenAI-style components
export { ChatSidebar as OpenAISidebar } from "./ChatSidebar";
export { ChatToolbar as OpenAIToolbar } from "./ChatToolbar";
export { ChatWelcome as OpenAIWelcome } from "./ChatWelcome";
export { ChatMessages as OpenAIMessages } from "./ChatMessages";
export { ChatInput as OpenAIInput } from "./ChatInput";
