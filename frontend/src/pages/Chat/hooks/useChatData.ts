/**
 * Chat Data Management Hook
 * Handles loading conversations, agents, and messages
 */

import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { chatService, agentsService } from "../../../services";
import { Conversation, Message } from "../../../services/chat";

interface Agent {
  id: number;
  name: string;
  description?: string;
  model_provider: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  avatar_url?: string;
}

interface UseChatDataReturn {
  // State
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  agents: Agent[];
  loading: boolean;
  error: string | null;

  // Actions
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  setError: (error: string | null) => void;
}

export const useChatData = (): UseChatDataReturn => {
  const { chatId } = useParams();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await chatService.getConversations();
      setConversations(response.conversations || []);

      // Load specific conversation if chatId provided
      if (chatId && response.conversations) {
        const conversation = response.conversations.find(
          (c: Conversation) => c.id === chatId
        );
        if (conversation) {
          setCurrentConversation(conversation);
          // Immediately load messages for this conversation
          await loadMessages(conversation.id);
        }
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
      setError("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  // Load agents
  const loadAgents = useCallback(async () => {
    try {
      const response = await agentsService.getAgents();
      setAgents(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Error loading agents:", error);
    }
  }, []);

  // Load messages for a conversation
  const loadMessages = async (conversationId: string) => {
    try {
      setLoading(true);
      const response = await chatService.getMessages(conversationId);
      setMessages(response.messages || []);
    } catch (error) {
      console.error("Error loading messages:", error);
      setError("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadConversations();
    loadAgents();
  }, [loadConversations, loadAgents]);

  // Load conversation messages when conversation changes
  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id);
    }
  }, [currentConversation]);

  return {
    // State
    conversations,
    currentConversation,
    messages,
    agents,
    loading,
    error,

    // Actions
    loadConversations,
    loadMessages,
    setCurrentConversation,
    setMessages,
    setConversations,
    setError,
  };
};
