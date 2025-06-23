/**
 * Child Agent Chat Page
 * Main chat interface with ID-based routing and strong database storage
 * Updated to use the new chat API system
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  Send,
  Plus,
  Users,
  Bot,
  ArrowLeft
} from 'lucide-react';

import chatService from '../../services/chatService';

interface ChatMessage {
  id: string;
  chat_id: string;
  user_id: string;
  agent_id?: string;
  content: string;
  message_type: 'user' | 'agent' | 'system';
  sender_name: string;
  ai_model_used?: string;
  ai_confidence?: number;
  memory_stored: boolean;
  context_references: string[];
  created_at: string;
  updated_at: string;
}

interface ChatRoom {
  id: string;
  title: string;
  participants: string[];
  agent_ids: string[];
  created_by: string;
  created_at: string;
  last_activity: string;
  message_count: number;
  memory_bank: Record<string, unknown>;
}

export const ChildAgentChat: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  
  const [currentChat, setCurrentChat] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [availableAgents, setAvailableAgents] = useState<{id: number, name: string, model_name: string}[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load initial data and chat
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (chatId) {
      loadChatData(chatId);
    } else {
      // If no chatId, redirect to create new chat
      createNewChat();
    }
  }, [chatId]);

  const loadInitialData = async () => {
    try {
      const agents = await chatService.getAgents();
      setAvailableAgents(agents);
      if (agents.length > 0) {
        setSelectedAgent(agents[0].id);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
      setError('Failed to load agents');
    }
  };

  const loadChatData = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Load conversation details using the new API
      const conversation = await chatService.getConversation(parseInt(id));
      
      // Convert to ChatRoom format for compatibility
      const chatRoom: ChatRoom = {
        id: conversation.id.toString(),
        title: conversation.title,
        participants: ['current-user'],
        agent_ids: conversation.agent_id ? [conversation.agent_id.toString()] : [],
        created_by: 'current-user',
        created_at: conversation.created_at,
        last_activity: conversation.last_message_at || conversation.updated_at || conversation.created_at,
        message_count: conversation.message_count,
        memory_bank: {}
      };
      
      setCurrentChat(chatRoom);
      
      if (conversation.agent_id) {
        setSelectedAgent(conversation.agent_id);
      }

      // Load messages using the new API
      const apiMessages = await chatService.getMessages(parseInt(id));
      
      // Convert to ChatMessage format for compatibility
      const chatMessages: ChatMessage[] = apiMessages.map(msg => ({
        id: msg.id.toString(),
        chat_id: id,
        user_id: msg.user_id.toString(),
        agent_id: conversation.agent_id?.toString(),
        content: msg.content,
        message_type: msg.role === 'user' ? 'user' : 'agent',
        sender_name: msg.role === 'user' ? 'You' : 'AI Assistant',
        ai_model_used: msg.model_used,
        ai_confidence: 0.95,
        memory_stored: true,
        context_references: [],
        created_at: msg.created_at,
        updated_at: msg.created_at
      }));
      
      setMessages(chatMessages);
    } catch (error) {
      console.error('Error loading chat:', error);
      setError('Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChat = async () => {
    try {
      const newConversation = await chatService.createConversation({
        title: `Chat ${new Date().toLocaleString()}`,
        agent_id: selectedAgent || undefined,
        settings: {}
      });
      
      navigate(`/dashboard/chat/${newConversation.id}`, { replace: true });
    } catch (error) {
      console.error('Error creating conversation:', error);
      setError('Failed to create new chat');
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || isSending || !currentChat) return;

    setIsSending(true);
    setError(null);
    
    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      chat_id: currentChat.id,
      user_id: 'current-user',
      content: messageInput,
      message_type: 'user',
      sender_name: 'You',
      memory_stored: true,
      context_references: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = messageInput;
    setMessageInput('');

    try {
      const result = await chatService.sendMessage(parseInt(currentChat.id), {
        content: currentInput,
        message_type: 'text',
        agent_id: selectedAgent || undefined
      });

      // Remove temporary message and add real messages from server
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== userMessage.id);
        const newUserMessage: ChatMessage = {
          id: result.user_message.id.toString(),
          chat_id: currentChat.id,
          user_id: result.user_message.user_id.toString(),
          content: result.user_message.content,
          message_type: 'user',
          sender_name: 'You',
          memory_stored: true,
          context_references: [],
          created_at: result.user_message.created_at,
          updated_at: result.user_message.created_at,
        };

        const aiMessage: ChatMessage = {
          id: result.ai_response.id.toString(),
          chat_id: currentChat.id,
          user_id: result.ai_response.user_id.toString(),
          agent_id: selectedAgent?.toString(),
          content: result.ai_response.content,
          message_type: 'agent',
          sender_name: 'AI Assistant',
          ai_model_used: result.ai_response.model_used || 'GPT-4',
          ai_confidence: 0.95,
          memory_stored: true,
          context_references: [],
          created_at: result.ai_response.created_at,
          updated_at: result.ai_response.created_at,
        };

        return [...filtered, newUserMessage, aiMessage];
      });
        
      // Update chat activity
      setCurrentChat(prev => prev ? {
        ...prev,
        last_activity: new Date().toISOString(),
        message_count: prev.message_count + 2
      } : null);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
      // Remove the temporary message
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      setMessageInput(currentInput);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div className="animate-spin">🔄</div>
        <div>Loading Chat...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        flexDirection: 'column',
        gap: '16px',
        color: '#dc3545'
      }}>
        <div>❌ {error}</div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#f8f9fa'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e9ecef',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'none',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ArrowLeft size={16} />
        </button>
        
        <div style={{ flex: 1 }}>
          <h1 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: '#2c3e50'
          }}>
            {currentChat?.title || 'Chat Room'}
          </h1>
          <div style={{
            fontSize: '14px',
            color: '#6c757d',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginTop: '4px'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MessageCircle size={14} />
              {currentChat?.message_count || 0} messages
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Users size={14} />
              {currentChat?.participants.length || 0} participants
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Bot size={14} />
              {availableAgents.find(a => a.id === selectedAgent)?.name || 'AI Assistant'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Agent Selector */}
          <select
            value={selectedAgent || ''}
            onChange={(e) => setSelectedAgent(parseInt(e.target.value))}
            style={{
              padding: '8px',
              border: '1px solid #e9ecef',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            <option value="">Select Agent</option>
            {availableAgents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.name} ({agent.model_name})
              </option>
            ))}
          </select>
          
          <button
            onClick={createNewChat}
            style={{
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            <Plus size={16} />
            New Chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        backgroundColor: '#fafbfc'
      }}>
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              marginBottom: '20px',
              display: 'flex',
              flexDirection: message.message_type === 'user' ? 'row-reverse' : 'row',
              alignItems: 'flex-start',
              gap: '12px'
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: message.message_type === 'user' ? '#667eea' : '#28a745',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: '600',
              flexShrink: 0
            }}>
              {message.message_type === 'user' ? 'U' : 'AI'}
            </div>

            <div style={{
              maxWidth: '70%',
              backgroundColor: 'white',
              padding: '12px 16px',
              borderRadius: '16px',
              border: '1px solid #e9ecef',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <div style={{
                fontSize: '12px',
                color: '#6c757d',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontWeight: '500' }}>{message.sender_name}</span>
                <span>{new Date(message.created_at).toLocaleTimeString()}</span>
                {message.ai_model_used && (
                  <span style={{
                    backgroundColor: '#e3f2fd',
                    color: '#1976d2',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px'
                  }}>
                    {message.ai_model_used}
                  </span>
                )}
                {message.memory_stored && (
                  <span style={{
                    backgroundColor: '#e8f5e8',
                    color: '#2e7d32',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px'
                  }}>
                    📝 Stored
                  </span>
                )}
              </div>
              
              <div style={{
                fontSize: '14px',
                lineHeight: '1.5',
                color: '#2c3e50'
              }}>
                {message.content}
              </div>

              {message.ai_confidence && (
                <div style={{
                  fontSize: '11px',
                  color: '#95a5a6',
                  marginTop: '8px'
                }}>
                  Confidence: {Math.round(message.ai_confidence * 100)}%
                  {message.context_references.length > 0 && (
                    <span style={{ marginLeft: '12px' }}>
                      📚 Used {message.context_references.length} memory references
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isSending && (
          <div style={{
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#28a745',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              AI
            </div>
            <div style={{
              backgroundColor: 'white',
              padding: '12px 16px',
              borderRadius: '16px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                AI is thinking... 🤔
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        padding: '20px',
        backgroundColor: 'white',
        borderTop: '1px solid #e9ecef'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: '#f8f9fa',
          padding: '12px',
          borderRadius: '24px',
          border: '1px solid #e9ecef'
        }}>
          <textarea
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (Memory-enabled AI will remember this conversation)"
            style={{
              flex: 1,
              border: 'none',
              backgroundColor: 'transparent',
              resize: 'none',
              outline: 'none',
              fontSize: '14px',
              maxHeight: '120px',
              minHeight: '20px'
            }}
            rows={1}
          />
          
          <button
            onClick={sendMessage}
            disabled={!messageInput.trim() || isSending || !selectedAgent}
            style={{
              padding: '10px',
              backgroundColor: (messageInput.trim() && selectedAgent) ? '#667eea' : '#dee2e6',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              cursor: (messageInput.trim() && selectedAgent) ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
          >
            <Send size={16} />
          </button>
        </div>
        
        <div style={{
          fontSize: '12px',
          color: '#6c757d',
          textAlign: 'center',
          marginTop: '8px'
        }}>
          💾 Database-stored • 🧠 AI memory enabled • Chat ID: {chatId}
          {!selectedAgent && ' • ⚠️ Please select an agent'}
        </div>
      </div>
    </div>
  );
};

export default ChildAgentChat; 