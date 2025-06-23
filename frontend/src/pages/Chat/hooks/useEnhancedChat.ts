/**
 * Enhanced Chat Hook
 * Main hook for managing enhanced chat functionality
 */

import { useState, useEffect, useCallback, useRef } from "react";
import enhancedChatService from "../../../services/enhancedChat";
import {
  EnhancedConversation,
  EnhancedMessage,
  ChatUIState,
  ConversationFilters,
  MessageFilters,
  SendMessageRequest,
  MessageFeedbackRequest,
  WebSocketMessage,
} from "../types";

interface UseEnhancedChatResult {
  // State
  state: ChatUIState;

  // Conversation methods
  createQuickChat: (
    agentId?: number,
    message?: string,
    temporary?: boolean
  ) => Promise<void>;
  loadConversations: (filters?: ConversationFilters) => Promise<void>;
  selectConversation: (conversation: EnhancedConversation) => void;
  createConversation: (title: string, agentId?: number) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;

  // Message methods
  sendMessage: (content: string, agentId?: number) => Promise<void>;
  sendQuickMessage: (content: string, agentId?: number) => Promise<void>;
  provideFeedback: (
    messageId: string,
    feedback: MessageFeedbackRequest
  ) => Promise<void>;

  // Real-time methods
  connectToConversation: (conversationId: string) => void;
  sendTypingIndicator: (isTyping: boolean) => void;

  // Search methods
  searchMessages: (query: string) => Promise<void>;
  clearSearch: () => void;

  // UI methods
  toggleSidebar: () => void;
  clearError: () => void;
}

export const useEnhancedChat = (userId: string): UseEnhancedChatResult => {
  const [state, setState] = useState<ChatUIState>({
    selectedConversation: null,
    conversations: [],
    messages: [],
    isLoading: false,
    isLoadingMessages: false,
    isLoadingConversations: false,
    isSendingMessage: false,
    isTyping: {},
    onlineUsers: {},
    error: null,
    searchQuery: "",
    searchResults: [],
    isSearching: false,
    showAnalytics: false,
    showLearning: false,
    sidebarCollapsed: false,
  });

  const wsRef = useRef<WebSocket | null>(null);

  // Helper function to update state
  const updateState = useCallback((updates: Partial<ChatUIState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Error handler
  const handleError = useCallback(
    (error: unknown) => {
      console.error("Chat error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      updateState({ error: errorMessage, isLoading: false });
    },
    [updateState]
  );

  // ========================================
  // CONVERSATION METHODS
  // ========================================

  const createQuickChat = useCallback(
    async (agentId?: number, message?: string, temporary: boolean = true) => {
      try {
        updateState({ isLoading: true, error: null });

        const conversation = await enhancedChatService.createQuickChat({
          agent_id: agentId,
          message,
          temporary,
        });

        updateState({
          selectedConversation: conversation,
          conversations: [conversation, ...state.conversations],
          isLoading: false,
        });

        if (message) {
          await loadMessages(conversation.id);
        }
      } catch (error) {
        handleError(error);
      }
    },
    [state.conversations, updateState, handleError]
  );

  const loadConversations = useCallback(
    async (filters?: ConversationFilters) => {
      try {
        updateState({ isLoadingConversations: true, error: null });

        const response = await enhancedChatService.getConversations(filters);

        updateState({
          conversations: response.conversations,
          isLoadingConversations: false,
        });
      } catch (error) {
        handleError(error);
        updateState({ isLoadingConversations: false });
      }
    },
    [updateState, handleError]
  );

  const selectConversation = useCallback(
    (conversation: EnhancedConversation) => {
      updateState({ selectedConversation: conversation });
      loadMessages(conversation.id);
      connectToConversation(conversation.id);
    },
    [updateState]
  );

  const createConversation = useCallback(
    async (title: string, agentId?: number) => {
      try {
        updateState({ isLoading: true, error: null });

        const conversation = await enhancedChatService.createConversation({
          title,
          agent_id: agentId,
          conversation_type: "permanent",
        });

        updateState({
          selectedConversation: conversation,
          conversations: [conversation, ...state.conversations],
          isLoading: false,
        });
      } catch (error) {
        handleError(error);
      }
    },
    [state.conversations, updateState, handleError]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await enhancedChatService.deleteConversation(id);

        const filteredConversations = state.conversations.filter(
          (conv) => conv.id !== id
        );

        updateState({
          conversations: filteredConversations,
          selectedConversation:
            state.selectedConversation?.id === id
              ? null
              : state.selectedConversation,
        });
      } catch (error) {
        handleError(error);
      }
    },
    [state.conversations, state.selectedConversation, updateState, handleError]
  );

  // ========================================
  // MESSAGE METHODS
  // ========================================

  const loadMessages = useCallback(
    async (conversationId: string, filters?: MessageFilters) => {
      try {
        updateState({ isLoadingMessages: true, error: null });

        const response = await enhancedChatService.getMessages(
          conversationId,
          filters
        );

        updateState({
          messages: response.messages,
          isLoadingMessages: false,
        });
      } catch (error) {
        handleError(error);
        updateState({ isLoadingMessages: false });
      }
    },
    [updateState, handleError]
  );

  const sendMessage = useCallback(
    async (content: string, agentId?: number) => {
      if (!state.selectedConversation) return;

      try {
        updateState({ isSendingMessage: true, error: null });

        const request: SendMessageRequest = {
          content,
          message_type: "text",
          agent_id: agentId,
        };

        const response = await enhancedChatService.sendMessage(
          state.selectedConversation.id,
          request
        );

        // Add messages to state
        const newMessages = [response.user_message];
        if (response.ai_response) {
          newMessages.push(response.ai_response);
        }

        updateState({
          messages: [...state.messages, ...newMessages],
          isSendingMessage: false,
        });
      } catch (error) {
        handleError(error);
        updateState({ isSendingMessage: false });
      }
    },
    [state.selectedConversation, state.messages, updateState, handleError]
  );

  const sendQuickMessage = useCallback(
    async (content: string, agentId?: number) => {
      try {
        updateState({ isSendingMessage: true, error: null });

        const response = await enhancedChatService.sendQuickMessage(
          content,
          agentId,
          state.selectedConversation?.id
        );

        // If no conversation was selected, this creates a new one
        if (!state.selectedConversation) {
          const conversation = await enhancedChatService.getConversation(
            response.conversation_id
          );
          updateState({ selectedConversation: conversation });
          await loadConversations();
        }

        // Reload messages
        await loadMessages(response.conversation_id);

        updateState({ isSendingMessage: false });
      } catch (error) {
        handleError(error);
        updateState({ isSendingMessage: false });
      }
    },
    [
      state.selectedConversation,
      updateState,
      handleError,
      loadConversations,
      loadMessages,
    ]
  );

  const provideFeedback = useCallback(
    async (messageId: string, feedback: MessageFeedbackRequest) => {
      try {
        await enhancedChatService.provideMessageFeedback(messageId, feedback);

        // Update message in state
        const updatedMessages = state.messages.map((msg) =>
          msg.id === messageId
            ? { ...msg, feedback_score: feedback.quality_score }
            : msg
        );

        updateState({ messages: updatedMessages });
      } catch (error) {
        handleError(error);
      }
    },
    [state.messages, updateState, handleError]
  );

  // ========================================
  // REAL-TIME METHODS
  // ========================================

  const connectToConversation = useCallback(
    (conversationId: string) => {
      // Disconnect existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = enhancedChatService.connectToConversation(
        conversationId,
        userId,
        (data: WebSocketMessage) => {
          switch (data.type) {
            case "new_message":
              if (data.message) {
                updateState({
                  messages: [...state.messages, data.message],
                });
              }
              break;

            case "user_typing":
              if (data.user_id && data.user_id !== userId) {
                updateState({
                  isTyping: {
                    ...state.isTyping,
                    [data.user_id]: data.is_typing || false,
                  },
                });
              }
              break;

            case "user_presence":
              if (data.user_id && data.status) {
                updateState({
                  onlineUsers: {
                    ...state.onlineUsers,
                    [data.user_id]: data.status,
                  },
                });
              }
              break;
          }
        },
        (error) => handleError(error),
        () => console.log("WebSocket connection closed")
      );

      wsRef.current = ws;
    },
    [
      userId,
      state.messages,
      state.isTyping,
      state.onlineUsers,
      updateState,
      handleError,
    ]
  );

  const sendTypingIndicator = useCallback(
    (isTyping: boolean) => {
      if (state.selectedConversation) {
        enhancedChatService.sendTypingIndicator(
          state.selectedConversation.id,
          isTyping
        );
      }
    },
    [state.selectedConversation]
  );

  // ========================================
  // SEARCH METHODS
  // ========================================

  const searchMessages = useCallback(
    async (query: string) => {
      try {
        updateState({ isSearching: true, searchQuery: query, error: null });

        const response = await enhancedChatService.searchMessages(query, {
          conversation_id: state.selectedConversation?.id,
        });

        updateState({
          searchResults: response.results,
          isSearching: false,
        });
      } catch (error) {
        handleError(error);
        updateState({ isSearching: false });
      }
    },
    [state.selectedConversation, updateState, handleError]
  );

  const clearSearch = useCallback(() => {
    updateState({ searchQuery: "", searchResults: [] });
  }, [updateState]);

  // ========================================
  // UI METHODS
  // ========================================

  const toggleSidebar = useCallback(() => {
    updateState({ sidebarCollapsed: !state.sidebarCollapsed });
  }, [state.sidebarCollapsed, updateState]);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // ========================================
  // EFFECTS
  // ========================================

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    state,
    createQuickChat,
    loadConversations,
    selectConversation,
    createConversation,
    deleteConversation,
    sendMessage,
    sendQuickMessage,
    provideFeedback,
    connectToConversation,
    sendTypingIndicator,
    searchMessages,
    clearSearch,
    toggleSidebar,
    clearError,
  };
};
