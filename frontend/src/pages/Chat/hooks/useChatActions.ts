/**
 * Chat Actions Hook
 * Handles chat actions like sending messages, creating conversations
 */

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { chatService } from "../../../services";
import { Conversation, Message } from "../../../services/chat";

interface UseChatActionsProps {
  currentConversation: Conversation | null;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  setError: (error: string | null) => void;
  loadConversations: () => Promise<void>;
  defaultAgent?: number | null;
}

interface UseChatActionsReturn {
  createConversation: () => Promise<void>;
  sendMessage: (messageText: string, files?: File[]) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  togglePin: (conversationId: string) => Promise<void>;
}

export const useChatActions = ({
  currentConversation,
  messages,
  setMessages,
  setConversations,
  setCurrentConversation,
  setError,
  loadConversations,
  defaultAgent,
}: UseChatActionsProps): UseChatActionsReturn => {
  const navigate = useNavigate();

  // Create new conversation
  const createConversation = useCallback(async () => {
    try {
      const response = await chatService.createConversation({
        title: "New Chat",
        agent_id: defaultAgent || undefined,
      });

      if (response) {
        const newConversation = response;
        setConversations((prev) => [newConversation, ...prev]);
        setCurrentConversation(newConversation);
        setMessages([]);
        navigate(`/dashboard/chat/${newConversation.id}`);
        // Always reload conversations from backend to ensure sync
        await loadConversations();
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      setError("Failed to create conversation");
    }
  }, [
    defaultAgent,
    setConversations,
    setCurrentConversation,
    setMessages,
    navigate,
    loadConversations,
    setError,
  ]);

  // Send message
  const sendMessage = useCallback(
    async (messageText: string, files: File[] = []) => {
      if (!messageText.trim() && files.length === 0) return;
      if (!currentConversation) {
        await createConversation();
        return;
      }

      // Create temporary user message for immediate display
      const tempUserMessage: Message = {
        id: Date.now(),
        conversation_id: currentConversation.id,
        role: "user",
        content: messageText,
        timestamp: new Date().toISOString(),
        status: "sending",
        attachments: files.map((file) => ({
          id: Date.now().toString(),
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
        })),
      };

      setMessages((prev) => [...prev, tempUserMessage]);

      try {
        // Send message to backend
        const response = await chatService.sendMessage(currentConversation.id, {
          content: messageText,
          sender_type: "user",
          conversation_id: currentConversation.id,
        });

        console.log("🔍 Send Message Response:", response);

        if (response && response.user_message && response.ai_response) {
          // Remove temporary message and add real messages
          setMessages((prev) => {
            // Remove the temporary message
            const withoutTemp = prev.filter(
              (msg) => msg.id !== tempUserMessage.id
            );

            // Add real user message
            const realUserMessage: Message = {
              id: response.user_message.id,
              conversation_id: currentConversation.id,
              role: "user",
              content: response.user_message.content,
              timestamp:
                response.user_message.timestamp ||
                response.user_message.created_at,
              status: "sent",
              attachments: tempUserMessage.attachments,
            };

            // Add AI response message
            const aiMessage: Message = {
              id: response.ai_response.id,
              conversation_id: currentConversation.id,
              role: "assistant",
              content: response.ai_response.content,
              timestamp:
                response.ai_response.timestamp ||
                response.ai_response.created_at,
              metadata: {
                tokens: response.ai_response.tokens_used,
                response_time: response.ai_response.processing_time,
                model_used: "AI Assistant",
              },
            };

            return [...withoutTemp, realUserMessage, aiMessage];
          });

          // Update conversation title if it's the first message
          if (messages.length === 0) {
            const updatedConversation = {
              ...currentConversation,
              title:
                messageText.slice(0, 50) +
                (messageText.length > 50 ? "..." : ""),
            };
            setCurrentConversation(updatedConversation);
            setConversations((prev) =>
              prev.map((c) =>
                c.id === currentConversation.id ? updatedConversation : c
              )
            );
          }
        } else {
          console.error("Invalid response format:", response);
          // Mark message as error
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempUserMessage.id ? { ...msg, status: "error" } : msg
            )
          );
          setError("Failed to send message - invalid response");
        }
      } catch (error) {
        console.error("Error sending message:", error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempUserMessage.id ? { ...msg, status: "error" } : msg
          )
        );
        setError("Failed to send message");
      }
    },
    [
      currentConversation,
      messages,
      setMessages,
      setConversations,
      setCurrentConversation,
      setError,
      createConversation,
    ]
  );

  // Delete conversation
  const deleteConversation = useCallback(
    async (conversationId: string) => {
      if (!window.confirm("Are you sure you want to delete this conversation?"))
        return;

      try {
        await chatService.deleteConversation(conversationId);
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));

        if (currentConversation?.id === conversationId) {
          setCurrentConversation(null);
          setMessages([]);
          navigate("/dashboard/chat");
        }
        // Always reload conversations from backend to ensure sync
        await loadConversations();
      } catch (error) {
        console.error("Error deleting conversation:", error);
        setError("Failed to delete conversation");
      }
    },
    [
      currentConversation,
      setConversations,
      setCurrentConversation,
      setMessages,
      navigate,
      loadConversations,
      setError,
    ]
  );

  // Toggle conversation pin
  const togglePin = useCallback(
    async (conversationId: string) => {
      try {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, is_pinned: !c.is_pinned } : c
          )
        );
      } catch (error) {
        console.error("Error toggling pin:", error);
      }
    },
    [setConversations]
  );

  return {
    createConversation,
    sendMessage,
    deleteConversation,
    togglePin,
  };
};
