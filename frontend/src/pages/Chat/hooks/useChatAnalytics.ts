/**
 * Chat Analytics Hook
 * Hook for managing chat analytics, AI learning, and insights
 */

import { useState, useCallback, useEffect } from "react";
import enhancedChatService from "../../../services/enhancedChat";
import {
  ChatAnalytics,
  DashboardAnalytics,
  AILearningSession,
  AgentMemory,
} from "../types";

interface AnalyticsState {
  conversationAnalytics: ChatAnalytics | null;
  agentAnalytics: ChatAnalytics | null;
  dashboardAnalytics: DashboardAnalytics | null;
  learningSession: AILearningSession | null;
  agentMemory: AgentMemory[];
  insights: any[];
  isLoadingAnalytics: boolean;
  isLoadingLearning: boolean;
  isLoadingMemory: boolean;
  error: string | null;
}

interface UseChatAnalyticsResult {
  state: AnalyticsState;

  // Analytics methods
  loadConversationAnalytics: (conversationId: string) => Promise<void>;
  loadAgentAnalytics: (agentId: number, days?: number) => Promise<void>;
  loadDashboardAnalytics: (days?: number, agentId?: number) => Promise<void>;

  // AI Learning methods
  triggerLearningSession: (
    conversationId: string,
    learningType?:
      | "conversation_analysis"
      | "user_preference"
      | "skill_improvement",
    agentId?: number
  ) => Promise<void>;

  // Memory methods
  loadAgentMemory: (agentId: number) => Promise<void>;

  // Insights methods
  loadInsights: (days?: number) => Promise<void>;

  // Utility methods
  clearAnalytics: () => void;
  clearError: () => void;
}

export const useChatAnalytics = (): UseChatAnalyticsResult => {
  const [state, setState] = useState<AnalyticsState>({
    conversationAnalytics: null,
    agentAnalytics: null,
    dashboardAnalytics: null,
    learningSession: null,
    agentMemory: [],
    insights: [],
    isLoadingAnalytics: false,
    isLoadingLearning: false,
    isLoadingMemory: false,
    error: null,
  });

  // Helper function to update state
  const updateState = useCallback((updates: Partial<AnalyticsState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Error handler
  const handleError = useCallback(
    (error: unknown) => {
      console.error("Analytics error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      updateState({
        error: errorMessage,
        isLoadingAnalytics: false,
        isLoadingLearning: false,
        isLoadingMemory: false,
      });
    },
    [updateState]
  );

  // ========================================
  // ANALYTICS METHODS
  // ========================================

  const loadConversationAnalytics = useCallback(
    async (conversationId: string) => {
      try {
        updateState({ isLoadingAnalytics: true, error: null });

        const analytics =
          await enhancedChatService.getConversationAnalytics(conversationId);

        updateState({
          conversationAnalytics: analytics,
          isLoadingAnalytics: false,
        });
      } catch (error) {
        handleError(error);
      }
    },
    [updateState, handleError]
  );

  const loadAgentAnalytics = useCallback(
    async (agentId: number, days: number = 30) => {
      try {
        updateState({ isLoadingAnalytics: true, error: null });

        const analytics = await enhancedChatService.getAgentAnalytics(
          agentId,
          days,
          true
        );

        updateState({
          agentAnalytics: analytics,
          isLoadingAnalytics: false,
        });
      } catch (error) {
        handleError(error);
      }
    },
    [updateState, handleError]
  );

  const loadDashboardAnalytics = useCallback(
    async (days: number = 7, agentId?: number) => {
      try {
        updateState({ isLoadingAnalytics: true, error: null });

        const analytics = await enhancedChatService.getDashboardAnalytics(
          days,
          agentId
        );

        updateState({
          dashboardAnalytics: analytics,
          isLoadingAnalytics: false,
        });
      } catch (error) {
        handleError(error);
      }
    },
    [updateState, handleError]
  );

  // ========================================
  // AI LEARNING METHODS
  // ========================================

  const triggerLearningSession = useCallback(
    async (
      conversationId: string,
      learningType:
        | "conversation_analysis"
        | "user_preference"
        | "skill_improvement" = "conversation_analysis",
      agentId?: number
    ) => {
      try {
        updateState({ isLoadingLearning: true, error: null });

        const session = await enhancedChatService.triggerLearningSession(
          conversationId,
          learningType,
          agentId
        );

        updateState({
          learningSession: session,
          isLoadingLearning: false,
        });
      } catch (error) {
        handleError(error);
      }
    },
    [updateState, handleError]
  );

  // ========================================
  // MEMORY METHODS
  // ========================================

  const loadAgentMemory = useCallback(
    async (agentId: number) => {
      try {
        updateState({ isLoadingMemory: true, error: null });

        const memoryResponse =
          await enhancedChatService.getAgentMemory(agentId);

        updateState({
          agentMemory: memoryResponse.memories,
          isLoadingMemory: false,
        });
      } catch (error) {
        handleError(error);
      }
    },
    [updateState, handleError]
  );

  // ========================================
  // INSIGHTS METHODS
  // ========================================

  const loadInsights = useCallback(
    async (days: number = 30) => {
      try {
        updateState({ isLoadingAnalytics: true, error: null });

        const insights = await enhancedChatService.getAIInsights(days);

        updateState({
          insights: insights.key_insights || [],
          isLoadingAnalytics: false,
        });
      } catch (error) {
        handleError(error);
      }
    },
    [updateState, handleError]
  );

  // ========================================
  // UTILITY METHODS
  // ========================================

  const clearAnalytics = useCallback(() => {
    updateState({
      conversationAnalytics: null,
      agentAnalytics: null,
      dashboardAnalytics: null,
      learningSession: null,
      agentMemory: [],
      insights: [],
    });
  }, [updateState]);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // ========================================
  // AUTO-LOAD DASHBOARD ANALYTICS
  // ========================================

  useEffect(() => {
    // Auto-load dashboard analytics on mount
    loadDashboardAnalytics();
  }, [loadDashboardAnalytics]);

  return {
    state,
    loadConversationAnalytics,
    loadAgentAnalytics,
    loadDashboardAnalytics,
    triggerLearningSession,
    loadAgentMemory,
    loadInsights,
    clearAnalytics,
    clearError,
  };
};
