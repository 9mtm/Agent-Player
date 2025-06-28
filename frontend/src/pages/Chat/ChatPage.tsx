/**
 * Enhanced Chat Page - OpenAI Style Interface
 * Professional chat interface with all requested features
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Import CSS for OpenAI-style design
import './components/ChatInterface.css';
import './components/OpenAIChatStyle.css';

import chatService from '../../services/chat';
import agentsService from '../../services/agents';

// Import enhanced components
import {
  ChatSidebar,
  ChatToolbar,
  ChatWelcome,
  ChatMessages,
  ChatInput
} from './components';

// Working types that match our backend
interface BackendConversation {
  id: string | number;
  title: string;
  agent_id?: number;
  message_count: number;
  created_at: string;
  updated_at?: string;
  last_message_at?: string;
  is_active?: boolean;
}

interface SimpleConversation {
  id: string | number;
  title: string;
  agent_id?: number;
  message_count: number;
  created_at: string;
  updated_at?: string;
  last_message_at?: string;
  is_active?: boolean;
}

interface WorkingMessage {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  tokens_used?: number;
  sender_type?: string;
  user_id?: number;
}

interface SimpleAgent {
  id: number;
  name: string;
  description?: string;
  model_name: string;
  model_provider?: string;
  is_active?: boolean;
}

export const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();
  
  // State management
  const [conversations, setConversations] = useState<SimpleConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<SimpleConversation | null>(null);
  const [messages, setMessages] = useState<WorkingMessage[]>([]);
  const [availableAgents, setAvailableAgents] = useState<SimpleAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<SimpleAgent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  
  // ✅ NEW: Enhanced typing indicator state
  const [isTyping, setIsTyping] = useState(false);
  
  // Error handling
  const [messageError, setMessageError] = useState<string | null>(null);

  // ✅ Pagination states for infinite scroll  
  const [hasMoreConversations, setHasMoreConversations] = useState(true);

  // Load initial data
  useEffect(() => {
    loadInitialConversations();
    loadAgents();
  }, []);

  // Load specific conversation if ID provided
  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      // Use the full conversation ID string - compare with string version of conversation ID
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        selectConversation(conversation);
      } else {
        console.log(`🔍 Conversation ${conversationId} not found in loaded conversations:`, conversations.map(c => c.id));
      }
    }
  }, [conversationId, conversations]);

  // ✅ Load conversations on component mount
  useEffect(() => {
    console.log('🚀 ChatPage mounted - loading first 10 conversations...');
    loadInitialConversations();
  }, []);

  // ✅ Load initial conversations (first 10)
  const loadInitialConversations = async () => {
    try {
      console.log('🔄 Loading initial conversations...');
      
      const data = await chatService.getConversations({ 
        limit: 10,  // ✅ Start with only 10 conversations
        skip: 0 
      });
      
      console.log(`📦 Loaded ${data.conversations.length} conversations of ${data.total} total`);
      
      const simpleConversations: SimpleConversation[] = data.conversations.map(conv => ({
        id: conv.id,
        title: conv.title || 'Untitled',
        agent_id: conv.agent_id,
        message_count: conv.total_messages || 0,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        is_active: conv.is_active !== false
      }));
      
      setConversations(simpleConversations);
      setHasMoreConversations(data.has_next);
      
      console.log(`✅ Initial load complete: ${simpleConversations.length}/10, Total: ${data.total}`);
      
      // ✅ CRITICAL: Set loading to false after successful load
      setIsLoading(false);
      
    } catch (error) {
      console.error('❌ Error loading initial conversations:', error);
      setMessageError(`Failed to load conversations: ${error}`);
      setConversations([]);
      // ✅ CRITICAL: Set loading to false even on error
      setIsLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const data = await agentsService.getAgents();
      
      // Convert to simple format
      const simpleAgents: SimpleAgent[] = Array.isArray(data)
        ? data.map((agent: unknown) => {
            const a = agent as Record<string, unknown>;
            return {
              id: a.id as number,
              name: a.name as string,
              description: a.description as string,
              model_name: (a.model_name || a.model_provider || 'Unknown') as string,
              model_provider: a.model_provider as string,
              is_active: a.is_active !== false
            };
          })
        : [];
      
      setAvailableAgents(simpleAgents.filter(agent => agent.is_active));
      
      // Set default agent if none selected
      if (!selectedAgent && simpleAgents.length > 0) {
        setSelectedAgent(simpleAgents[0]);
      }
      
      console.log(`✅ Loaded ${simpleAgents.length} agents`);
    } catch (error) {
      console.error('❌ Error loading agents:', error);
    }
  };

  const selectConversation = async (conversation: SimpleConversation) => {
    setSelectedConversation(conversation);
    setIsLoadingMessages(true);
    setMessageError(null);
    
    // Update URL
    navigate(`/dashboard/chat/${String(conversation.id)}`);
    
    try {
      console.log('📂 Loading messages for conversation:', conversation.id);
      const data = await chatService.getMessages(String(conversation.id));
      
      console.log('🔍 Raw data from getMessages:', data);
      
      // ✅ FIX: data is MessageListResponse object, not array
      // Get messages from the response object
      const messagesArray = data.messages || [];
      console.log('🔍 Messages array extracted:', messagesArray.length, 'messages');
      
      // Convert to working format
      const workingMessages: WorkingMessage[] = messagesArray.map(msg => ({
        id: msg.id,
        conversation_id: typeof msg.conversation_id === 'string' 
          ? parseInt(msg.conversation_id) || 0 
          : msg.conversation_id || 0,
        role: (msg.role || msg.sender_type) as 'user' | 'assistant' | 'system',
        content: msg.content,
        created_at: msg.created_at,
        tokens_used: msg.tokens_used,
        sender_type: msg.sender_type,
        user_id: msg.user_id
      }));
      
      setMessages(workingMessages);
      console.log(`✅ Loaded ${workingMessages.length} messages`);
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      setMessageError('Failed to load messages');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const createNewConversation = async (agentId?: number, initialMessage?: string) => {
    setIsCreatingChat(true);
    setMessageError(null);
    
    try {
      console.log('🆕 Creating new conversation with agent:', agentId);
      
      const newConv = await chatService.createConversation({
        title: initialMessage ? initialMessage.substring(0, 50) + '...' : `New Chat ${new Date().toLocaleTimeString()}`,
        agent_id: agentId || selectedAgent?.id
      });
      
      console.log('✅ Created conversation:', newConv);
      
      // Update conversations list
      await loadInitialConversations();
      
      // Select the new conversation FIRST
      if (newConv && newConv.id) {
        const newConversation: SimpleConversation = {
          id: newConv.id,
          title: newConv.title,
          agent_id: newConv.agent_id,
          message_count: 0,
          created_at: newConv.created_at,
          updated_at: newConv.updated_at,
          is_active: true
        };
        
        // Set the conversation BEFORE navigating or sending message
        setSelectedConversation(newConversation);
        navigate(`/dashboard/chat/${String(newConv.id)}`);
        
        // Send initial message if provided (now with conversation selected)
        if (initialMessage) {
          await sendMessageToConversation(newConversation, initialMessage);
        }
      }
      
    } catch (error) {
      console.error('❌ Error creating conversation:', error);
      setMessageError('Failed to create new chat');
    } finally {
      setIsCreatingChat(false);
    }
  };

  // New helper function to send message to specific conversation
  const sendMessageToConversation = async (conversation: BackendConversation, messageContent: string) => {
    if (!messageContent.trim() || isSendingMessage) {
      return;
    }

    setIsSendingMessage(true);
    setIsTyping(true);  // ✅ Start typing indicator
    setMessageError(null);
    const messageText = messageContent.trim();
    
    // Use the conversationId from URL if available, otherwise use conversation.id
    const actualConversationId = conversationId || conversation.id;
    
    // Add user message to UI immediately  
    const tempUserMessage: WorkingMessage = {
      id: Date.now(), // Temporary ID
      conversation_id: typeof conversation.id === 'string' ? parseInt(conversation.id) || 0 : parseInt(actualConversationId) || 0,
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString(),
      sender_type: 'user',
      user_id: 1
    };

    try {
      console.log('📤 Sending message to conversation:', actualConversationId);
      
      setMessages(prev => [...prev, tempUserMessage]);
      
      // Send to backend with the actual conversation ID from URL
      const response = await chatService.sendMessage(String(actualConversationId), {
        content: messageText,
        conversation_id: String(actualConversationId),
        sender_type: 'user' as const
      });
      
      // Handle response
      if (response) {
        const userMsg = response.user_message;
        const agentMsg = response.ai_response;
        
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== tempUserMessage.id);
          const newMessages: WorkingMessage[] = [];
          
          if (userMsg) {
            newMessages.push({
              id: userMsg.id,
              conversation_id: typeof userMsg.conversation_id === 'string' 
                ? parseInt(userMsg.conversation_id) 
                : parseInt(userMsg.conversation_id) || 0,
              role: userMsg.role as 'user' | 'assistant' | 'system',
              content: userMsg.content,
              created_at: userMsg.created_at,
              tokens_used: userMsg.tokens_used,
              sender_type: userMsg.sender_type,
              user_id: userMsg.user_id
            });
          }
          
          if (agentMsg) {
            newMessages.push({
              id: agentMsg.id,
              conversation_id: typeof agentMsg.conversation_id === 'string' 
                ? parseInt(agentMsg.conversation_id) 
                : parseInt(agentMsg.conversation_id) || 0,
              role: agentMsg.role as 'user' | 'assistant' | 'system',
              content: agentMsg.content,
              created_at: agentMsg.created_at,
              tokens_used: agentMsg.tokens_used,
              sender_type: agentMsg.sender_type,
              user_id: agentMsg.user_id
            });
          }
          
          return [...filtered, ...newMessages];
        });
        
        // ✅ Refresh conversations list after sending message
        console.log('🔄 Refreshing conversations list after message...');
        await loadInitialConversations();
        
        console.log('✅ Message sent successfully');
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      setMessageError('Failed to send message');
      // Remove temporary message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
    } finally {
      setIsSendingMessage(false);
      setIsTyping(false);  // ✅ Stop typing indicator
    }
  };

  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || isSendingMessage) {
      return;
    }

    // Create new conversation if none selected
    if (!selectedConversation) {
      await createNewConversation(selectedAgent?.id, messageContent);
      return;
    }

    // Use existing conversation
    await sendMessageToConversation(selectedConversation, messageContent);
  };

  const deleteConversation = async (conversationId: string | number) => {
    const id = String(conversationId);
    if (!window.confirm('Are you sure you want to delete this chat?')) return;
    
    try {
      await chatService.deleteConversation(id);
      
      // Remove from local state
      setConversations(prev => prev.filter(c => c.id !== id));
      
      if (selectedConversation?.id === id) {
        setSelectedConversation(null);
        setMessages([]);
        navigate('/dashboard/chat');
      }
      
      console.log('✅ Conversation deleted');
    } catch (error) {
      console.error('❌ Error deleting conversation:', error);
      setMessageError('Failed to delete conversation');
    }
  };

  const handleModelSelect = (agent: SimpleAgent) => {
    setSelectedAgent(agent);
    console.log('🤖 Selected agent:', agent);
  };

  // ✅ Development cleanup function
  const handleCleanupConversations = async () => {
    const confirmMessage = `🧹 تنظيف شامل للشات
    
هذا سيحذف كل المحادثات والرسائل نهائياً!
لا يمكن التراجع عن هذا العمل.

هل أنت متأكد؟`;
    
    if (!window.confirm(confirmMessage)) {
      console.log('❌ Cleanup cancelled by user');
      return;
    }
    
    try {
      console.log('🧹 Starting development cleanup...');
      setMessageError(null);
      
      const result = await chatService.deleteAllConversations();
      
      if (result.success) {
        console.log(`✅ Cleanup successful: ${result.deleted_count} items deleted`);
        
        // Clear local state
        setConversations([]);
        setSelectedConversation(null);
        setMessages([]);
        navigate('/dashboard/chat');
        
        alert(`✅ تم التنظيف بنجاح!\nتم حذف ${result.deleted_count} عنصر (محادثات + رسائل).`);
      } else {
        console.error('❌ Cleanup failed');
        setMessageError('Cleanup failed - check console for details');
      }
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      setMessageError('Cleanup error - check console for details');
    }
  };

  // Conversation starters
  const conversationStarters = [
    {
      title: "Explain a complex topic",
      description: "Break down difficult concepts into simple terms",
      icon: "🧠",
      prompt: "Can you explain quantum computing in simple terms?"
    },
    {
      title: "Write creative content",
      description: "Generate stories, poems, or creative writing",
      icon: "✍️",
      prompt: "Write a short story about a robot learning to paint"
    },
    {
      title: "Plan a project",
      description: "Help organize and structure your ideas",
      icon: "📋",
      prompt: "Help me plan a mobile app development project"
    },
    {
      title: "Code assistance",
      description: "Get help with programming and debugging",
      icon: "💻",
      prompt: "Help me write a Python function to sort a list of dictionaries"
    },
    {
      title: "Analyze data",
      description: "Examine trends and patterns in information",
      icon: "📊",
      prompt: "Help me analyze customer feedback data and find insights"
    },
    {
      title: "Language help",
      description: "Translation, grammar, and language learning",
      icon: "🌐",
      prompt: "Help me improve my English writing skills"
    }
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="openai-loading">
        <div className="loading-spinner"></div>
        <p>Loading DPRO Chat...</p>
      </div>
    );
  }

  return (
    <div className="openai-chat-layout">
      {/* Sidebar - Chat History */}
      <ChatSidebar
        isOpen={isSidebarOpen}
        conversations={conversations}
        selectedConversation={selectedConversation}
        onSelectConversation={selectConversation}
        onNewConversation={() => createNewConversation()}
        onDeleteConversation={deleteConversation}
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        totalConversations={conversations.length}
        isLoadingMore={false}
        hasMoreConversations={hasMoreConversations}
        onLoadMore={loadInitialConversations}
        onCleanup={handleCleanupConversations}
      />
      
      {/* Main Chat Area */}
      <div className="openai-main-content">
        {/* Toolbar */}
        <ChatToolbar
          selectedAgent={selectedAgent}
          availableAgents={availableAgents}
          onModelSelect={handleModelSelect}
          onSettingsOpen={() => console.log('Settings clicked')}
          conversationTitle={selectedConversation?.title}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
        />
        
        {/* Chat Content */}
        <div className="openai-chat-content">
          {selectedConversation && messages.length > 0 ? (
            /* Messages Area */
            <ChatMessages
              messages={messages}
              isLoading={isLoadingMessages}
              error={messageError}
              selectedAgent={selectedAgent}
              isTyping={isTyping}
            />
          ) : (
            /* Welcome Screen with Suggestions */
            <ChatWelcome
              conversationStarters={conversationStarters}
              selectedAgent={selectedAgent}
              onStartConversation={(prompt: string) => sendMessage(prompt)}
              isCreating={isCreatingChat}
            />
          )}
        </div>
        
        {/* Enhanced Input Area */}
        <ChatInput
          onSendMessage={sendMessage}
          isLoading={isSendingMessage}
          disabled={false}
          placeholder={
            selectedConversation 
              ? "Message DPRO AI..." 
              : "Send a message to start a new chat..."
          }
        />
      </div>
    </div>
  );
};

export default ChatPage; 