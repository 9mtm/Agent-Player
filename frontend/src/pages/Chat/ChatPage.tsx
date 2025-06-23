/**
 * Main Chat Page
 * Shows list of conversations and allows creating new chats
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  Plus,
  Search,
  Clock,
  Bot
} from 'lucide-react';

import chatService from '../../services/chatService';

interface Conversation {
  id: number;
  title: string;
  agent_id?: number;
  message_count: number;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
}

export const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableAgents, setAvailableAgents] = useState<{id: number, name: string, model_name: string}[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load conversations and agents in parallel
      const [conversationsData, agentsData] = await Promise.all([
        chatService.getConversations(),
        chatService.getAgents()
      ]);
      
      // Handle conversations data
      let conversationsArray: Conversation[] = [];
      if (Array.isArray(conversationsData)) {
        conversationsArray = conversationsData;
      } else if (conversationsData && (conversationsData as any).data && Array.isArray((conversationsData as any).data)) {
        conversationsArray = (conversationsData as any).data;
      }
          
      // Handle agents data
      let agentsArray: {id: number, name: string, model_name: string}[] = [];
      if (Array.isArray(agentsData)) {
        agentsArray = agentsData;
      } else if (agentsData && (agentsData as any).data && Array.isArray((agentsData as any).data)) {
        agentsArray = (agentsData as any).data;
      }
      
      setConversations(conversationsArray);
      setAvailableAgents(agentsArray);
    } catch (error) {
      console.error('Error loading chat data:', error);
      setError('Failed to load chat data');
      // Set empty arrays as fallback
      setConversations([]);
      setAvailableAgents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChat = async (agentId?: number) => {
    try {
      const newConversation = await chatService.createConversation({
        title: `New Chat ${new Date().toLocaleTimeString()}`,
        agent_id: agentId
      });
      
      navigate(`/dashboard/chat/${newConversation.id}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      setError('Failed to create new chat');
    }
  };

  const openChat = (conversationId: number) => {
    navigate(`/dashboard/chat/${conversationId}`);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div className="animate-spin">🔄</div>
        <div>Loading Chats...</div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '600',
            color: '#2c3e50',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <MessageCircle size={32} />
            Chat Center
          </h1>
          <p style={{ color: '#6c757d', margin: '0.5rem 0 0 0' }}>
            Manage your AI conversations
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Quick create buttons */}
          <button
            onClick={() => createNewChat()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            <Plus size={16} />
            Quick Chat
          </button>

          {availableAgents.length > 0 && (
            <select
              onChange={(e) => {
                const agentId = parseInt(e.target.value);
                if (agentId) createNewChat(agentId);
              }}
              style={{
                padding: '0.75rem',
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
              defaultValue=""
            >
              <option value="" disabled>New Chat with Agent</option>
              {availableAgents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.model_name})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Search */}
      <div style={{
        position: 'relative',
        marginBottom: '2rem'
      }}>
        <Search 
          size={20} 
          style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#6c757d'
          }} 
        />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '1rem 1rem 1rem 3rem',
            border: '1px solid #e9ecef',
            borderRadius: '12px',
            fontSize: '1rem',
            backgroundColor: 'white'
          }}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '2rem',
          border: '1px solid #f5c6cb'
        }}>
          {error}
          <button
            onClick={loadData}
            style={{
              marginLeft: '1rem',
              padding: '0.25rem 0.5rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Conversations Grid */}
      {filteredConversations.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e9ecef'
        }}>
          <MessageCircle size={64} style={{ color: '#dee2e6', marginBottom: '1rem' }} />
          <h3 style={{ color: '#6c757d', marginBottom: '1rem' }}>
            {searchQuery ? 'No conversations found' : 'No conversations yet'}
          </h3>
          <p style={{ color: '#6c757d', marginBottom: '2rem' }}>
            {searchQuery 
              ? 'Try adjusting your search terms'
              : 'Start your first conversation with an AI agent'
            }
          </p>
          {!searchQuery && (
            <button
              onClick={() => createNewChat()}
              style={{
                padding: '1rem 2rem',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                margin: '0 auto'
              }}
            >
              <Plus size={20} />
              Start First Chat
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '1.5rem'
        }}>
          {filteredConversations.map((conversation) => {
            const agent = availableAgents.find(a => a.id === conversation.agent_id);
            const lastActivity = conversation.last_message_at || conversation.updated_at;
            const timeAgo = new Date(lastActivity).toLocaleString();

            return (
              <div
                key={conversation.id}
                onClick={() => openChat(conversation.id)}
                style={{
                  backgroundColor: 'white',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid #e9ecef',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: '1rem'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#2c3e50',
                    lineHeight: '1.3',
                    flex: 1
                  }}>
                    {conversation.title}
                  </h3>
                  <div style={{
                    backgroundColor: agent ? '#e3f2fd' : '#f5f5f5',
                    color: agent ? '#1976d2' : '#666',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <Bot size={12} />
                    {agent ? agent.name : 'No Agent'}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  fontSize: '0.875rem',
                  color: '#6c757d',
                  marginBottom: '1rem'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MessageCircle size={14} />
                    {conversation.message_count} messages
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={14} />
                    {timeAgo}
                  </span>
                </div>

                {agent && (
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    color: '#495057'
                  }}>
                    <strong>Model:</strong> {agent.model_name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      <div style={{
        marginTop: '3rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid #e9ecef',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', color: '#667eea', marginBottom: '0.5rem' }}>
            {conversations.length}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
            Total Conversations
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid #e9ecef',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', color: '#28a745', marginBottom: '0.5rem' }}>
            {availableAgents.length}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
            Available Agents
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid #e9ecef',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', color: '#ffc107', marginBottom: '0.5rem' }}>
            {conversations.reduce((total, conv) => total + conv.message_count, 0)}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>
            Total Messages
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage; 