import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { chatService, agentsService } from '../../services';
import './ChatPage.css';
// Avatar system removed - keeping only audio waves for voice chat

// Simple interface icons without external dependencies
const Icons = {
  Send: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Plus: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Settings: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  Menu: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
      <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Bot: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 7V11" stroke="currentColor" strokeWidth="2"/>
      <path d="M8 16H8.01" stroke="currentColor" strokeWidth="2"/>
      <path d="M16 16H16.01" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  MessageSquare: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  Trash2: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z" stroke="currentColor" strokeWidth="2"/>
      <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Pin: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 9L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 15L15 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Upload: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 15V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2"/>
      <polyline points="7,10 12,5 17,10" stroke="currentColor" strokeWidth="2"/>
      <line x1="12" y1="5" x2="12" y2="15" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  Globe: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <path d="M2 12H22" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  Paperclip: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21.44 11.05L12.25 20.24a4.5 4.5 0 0 1-6.36-6.36L14.7 5.07a3 3 0 0 1 4.24 4.24L10.12 18.13a1.5 1.5 0 0 1-2.12-2.12L16.81 7.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  X: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Copy: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  Clock: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  Image: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
      <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
      <polyline points="21,15 16,10 5,21" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  Mic: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" stroke="currentColor" strokeWidth="2"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2"/>
      <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2"/>
      <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2"/>
    </svg>
  )
};

// Simple types to avoid conflicts
interface SimpleConversation {
  id: string;
  title: string;
  updated_at: string;
  is_pinned?: boolean;
}

interface SimpleMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  tokens_used?: number;
  processing_time?: number;
}

interface SimpleAgent {
  id: number;
  name: string;
  model_provider: string;
  model_name: string;
}

// Mock data for when backend is unavailable
const mockConversations: SimpleConversation[] = [
  {
    id: '1',
    title: 'General Chat',
    updated_at: new Date().toISOString(),
    is_pinned: false
  },
  {
    id: '2', 
    title: 'Customer Support Help',
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    is_pinned: true
  }
];

const mockAgents: SimpleAgent[] = [
  {
    id: 1,
    name: 'General Assistant',
    model_provider: 'openai',
    model_name: 'gpt-4'
  },
  {
    id: 2,
    name: 'Customer Service Agent',
    model_provider: 'anthropic', 
    model_name: 'claude-3'
  }
];

const ModernChatPage: React.FC = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State
  const [conversations, setConversations] = useState<SimpleConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<SimpleConversation | null>(null);
  const [messages, setMessages] = useState<SimpleMessage[]>([]);
  const [agents, setAgents] = useState<SimpleAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<SimpleAgent | null>(null);
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [backendError, setBackendError] = useState(false);
  
  // Voice Chat States
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  
  // Simple audio waves for voice feedback only
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Load data
  useEffect(() => {
    loadConversations();
    loadAgents();
  }, []);
  
  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id);
    }
  }, [currentConversation]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [messageInput]);
  
  // Load conversations with fallback
  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await chatService.getConversations();
      if (response.conversations) {
        const convs = response.conversations.map((c: any) => ({
          id: c.id,
          title: c.title,
          updated_at: c.updated_at,
          is_pinned: c.is_pinned || false
        }));
        setConversations(convs);
        setBackendError(false);
      }
    } catch (error) {
      console.warn('Backend not available, using mock data');
      setConversations(mockConversations);
      setBackendError(true);
      
      // Select first conversation
      if (mockConversations.length > 0) {
        setCurrentConversation(mockConversations[0]);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Load agents with fallback
  const loadAgents = async () => {
    try {
      const response = await agentsService.getAgents();
      if (response.agents) {
        const agentsList = response.agents.map((a: any) => ({
          id: a.id,
          name: a.name,
          model_provider: a.model_provider,
          model_name: a.model_name
        }));
        setAgents(agentsList);
        if (agentsList.length > 0) {
          setSelectedAgent(agentsList[0]);
        }
      }
    } catch (error) {
      console.warn('Backend not available, using mock agents');
      setAgents(mockAgents);
      if (mockAgents.length > 0) {
        setSelectedAgent(mockAgents[0]);
      }
    }
  };
  
  // Load messages with fallback
  const loadMessages = async (conversationId: string) => {
    try {
      if (!backendError) {
        const response = await chatService.getMessages(conversationId);
        if (response.messages) {
          setMessages(response.messages);
          return;
        }
      }
    } catch (error) {
      console.warn('Cannot load messages from backend');
    }
    
    // Use mock messages
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Hello! How can I help you today?',
        created_at: new Date().toISOString()
      }
    ]);
  };
  
  // Create conversation
  const createConversation = async () => {
    const newConv: SimpleConversation = {
      id: Date.now().toString(),
      title: 'New Chat',
      updated_at: new Date().toISOString(),
      is_pinned: false
    };
    
    setConversations(prev => [newConv, ...prev]);
    setCurrentConversation(newConv);
    setMessages([{
      id: '1',
      role: 'assistant',
      content: 'Hello! How can I help you today?',
      created_at: new Date().toISOString()
    }]);
  };
  
  // Send message
  const sendMessage = async () => {
    if (!messageInput.trim() || !currentConversation) return;
    
    const userMessage: SimpleMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageInput.trim(),
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setMessageInput('');
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse: SimpleMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Thank you for your message: "${userMessage.content}". This is a simulated response since the backend is not available. The UI is working perfectly!`,
        created_at: new Date().toISOString(),
        tokens_used: 42,
        processing_time: 0.8
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };
  
  // Delete conversation
  const deleteConversation = async (convId: string) => {
    setConversations(prev => prev.filter(c => c.id !== convId));
    if (currentConversation?.id === convId) {
      const remaining = conversations.filter(c => c.id !== convId);
      setCurrentConversation(remaining.length > 0 ? remaining[0] : null);
    }
  };
  
  // Toggle pin
  const togglePin = (convId: string) => {
    setConversations(prev => prev.map(c => 
      c.id === convId ? { ...c, is_pinned: !c.is_pinned } : c
    ));
  };
  
  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Handle keyboard shortcuts
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Voice Chat Functions
  const startListening = () => {
    setIsListening(true);
    setShowVoicePanel(true);
    
    // Simulate audio level animation
    const audioInterval = setInterval(() => {
      setAudioLevel(Math.random() * 100);
    }, 100);
    
    // Stop after 5 seconds (demo)
    setTimeout(() => {
      setIsListening(false);
      clearInterval(audioInterval);
      setAudioLevel(0);
      
      // Simulate voice message processing
      setTimeout(() => {
        setMessageInput("Hello! This is a voice message that was converted to text.");
      }, 500);
    }, 5000);
  };

  const stopListening = () => {
    setIsListening(false);
    setAudioLevel(0);
  };

  const toggleVoicePanel = () => {
    setShowVoicePanel(!showVoicePanel);
  };

  // Avatar system removed - using simple audio waves only
  
  // Filter conversations by search
  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Sort conversations (pinned first)
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  return (
    <div className="chat-container">
      {/* Backend Status */}
      {backendError && (
        <div className="backend-warning">
          ⚠️ Backend not available - Running in demo mode
        </div>
      )}
      
      {/* Sidebar */}
      <div className={`chat-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-title">
            <Icons.MessageSquare />
            {!sidebarCollapsed && <span>Conversations</span>}
          </div>
          
          <div className="sidebar-actions">
            <button
              onClick={createConversation}
              className="action-button primary"
              title="New Conversation"
            >
              <Icons.Plus />
            </button>
            
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="action-button"
              title={sidebarCollapsed ? 'Expand' : 'Collapse'}
            >
              <Icons.Menu />
            </button>
          </div>
        </div>
        
        {/* Search */}
        {!sidebarCollapsed && (
          <div className="search-container">
            <Icons.Search />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        )}
        
        {/* Conversations List */}
        <div className="conversations-list">
          {sortedConversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setCurrentConversation(conv)}
              className={`conversation-item ${currentConversation?.id === conv.id ? 'active' : ''}`}
            >
              <div className="conversation-content">
                <div className="conversation-title">
                  {conv.is_pinned && <Icons.Pin />}
                  {!sidebarCollapsed && conv.title}
                </div>
                {!sidebarCollapsed && (
                  <div className="conversation-meta">
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </div>
                )}
              </div>
              
              {!sidebarCollapsed && (
                <div className="conversation-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin(conv.id);
                    }}
                    className="action-button small"
                    title={conv.is_pinned ? 'Unpin' : 'Pin'}
                  >
                    <Icons.Pin />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="action-button small danger"
                    title="Delete"
                  >
                    <Icons.Trash2 />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className="chat-main">
        {/* Chat Header */}
        <div className="chat-header">
          <div className="chat-info">
            <Icons.Bot />
            <div>
              <h1 className="chat-title">
                {currentConversation?.title || 'Select a Conversation'}
              </h1>
              <p className="chat-subtitle">
                {selectedAgent?.name || 'No agent selected'} • {selectedAgent?.model_name}
              </p>
            </div>
          </div>
          
          <div className="chat-actions">
            {/* Agent Selector */}
            <select
              value={selectedAgent?.id || ''}
              onChange={(e) => {
                const agent = agents.find(a => a.id === parseInt(e.target.value));
                setSelectedAgent(agent || null);
              }}
              className="agent-selector"
            >
              <option value="">Select Agent</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowSettings(true)}
              className="action-button"
              title="Settings"
            >
              <Icons.Settings />
            </button>
          </div>
        </div>
        
        {/* Messages Area */}
        <div className="messages-container">
          {!currentConversation ? (
            <div className="welcome-screen">
              <Icons.Bot />
              <h3>Welcome to AI Chat</h3>
              <p>Select a conversation or start a new one to begin chatting</p>
              
              <div className="welcome-features">
                <div className="feature-item">
                  <Icons.Upload />
                  <span>File Upload Support</span>
                </div>
                <div className="feature-item">
                  <Icons.Globe />
                  <span>Multiple AI Models</span>
                </div>
                <div className="feature-item">
                  <Icons.Settings />
                  <span>Customizable Settings</span>
                </div>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-conversation">
              <Icons.Bot />
              <p>Start a conversation</p>
              <span>Send a message to begin chatting with your AI assistant</span>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((message) => (
                <div key={message.id} className={`message-wrapper ${message.role}`}>
                  <div className="message-content">
                    {/* Message Header */}
                    <div className="message-header">
                      {message.role !== 'user' && (
                        <div className="message-sender">
                          <Icons.Bot />
                          <span>AI Assistant</span>
                        </div>
                      )}
                      <span className="message-time">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Message Bubble */}
                    <div className="message-bubble">
                      <div className="message-text">
                        {message.content}
                      </div>

                      {/* Performance Metrics */}
                      {message.role !== 'user' && (message.tokens_used || message.processing_time) && (
                        <div className="message-metrics">
                          {message.processing_time && (
                            <span>
                              <Icons.Clock />
                              {(message.processing_time * 1000).toFixed(0)}ms
                            </span>
                          )}
                          {message.tokens_used && (
                            <span>{message.tokens_used} tokens</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Message Actions */}
                    <div className="message-actions">
                      <button
                        onClick={() => navigator.clipboard.writeText(message.content)}
                        className="action-button small"
                        title="Copy"
                      >
                        <Icons.Copy />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Message Input */}
        <div className="message-input-container">
          <div className="input-wrapper">
            <div className="input-actions">
              <button className="action-button" title="Upload File">
                <Icons.Paperclip />
              </button>
              
              <button 
                onClick={isListening ? stopListening : startListening}
                className={`action-button voice-button ${isListening ? 'listening' : ''}`} 
                title={isListening ? 'Stop Recording' : 'Voice Message'}
              >
                <Icons.Mic />
                {isListening && <div className="recording-pulse" />}
              </button>
            </div>
            
            <textarea
              ref={textareaRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              className="message-input"
              rows={1}
            />
            
            <button
              onClick={sendMessage}
              disabled={!messageInput.trim() || !currentConversation}
              className="send-button"
              title="Send Message"
            >
              <Icons.Send />
            </button>
          </div>
        </div>
      </div>
      
      {/* Voice Chat Panel */}
      {showVoicePanel && (
        <div className="voice-panel-overlay">
          <div className="voice-panel">
            <div className="voice-header">
              <h3>🎤 Voice Chat</h3>
              <button 
                onClick={toggleVoicePanel}
                className="action-button"
              >
                <Icons.X />
              </button>
            </div>
            
            {/* Avatar Display */}
            <div className="avatar-container">
              <div className={`avatar-circle ${isAISpeaking ? 'speaking' : ''}`}>
                <div className="audio-visualization">
                  <div className="audio-circle">
                    <Icons.Mic />
                  </div>
                </div>
                
                {/* Audio Waves */}
                {(isListening || isAISpeaking) && (
                  <div className="audio-waves">
                    {[...Array(8)].map((_, i) => (
                      <div 
                        key={i}
                        className="wave"
                        style={{
                          height: `${audioLevel * (0.5 + Math.sin(Date.now() * 0.01 + i) * 0.5)}%`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

            </div>
            
            {/* Voice Status */}
            <div className="voice-status">
              <div className="simple-status-text">
                {isListening ? (
                  "Recording..."
                ) : isAISpeaking ? (
                  "AI is speaking..."
                ) : (
                  "Voice Device Ready"
                )}
              </div>
            </div>
            
            {/* Voice Controls */}
            <div className="voice-controls">
              <button
                onClick={() => setIsAISpeaking(!isAISpeaking)}
                className="voice-control-button mute-only"
              >
                {isAISpeaking ? '🔇' : '🔊'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar system removed - using simple audio waves only */}

      {/* Advanced Settings Modal */}
      {showSettings && <AdvancedSettingsModal onClose={() => setShowSettings(false)} agents={agents} />}
    </div>
  );
};

// Advanced Settings Component
interface AdvancedSettingsModalProps {
  onClose: () => void;
  agents: SimpleAgent[];
}

const AdvancedSettingsModal: React.FC<AdvancedSettingsModalProps> = ({ onClose, agents }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);
  const [settings, setSettings] = useState({
    general: {
      auto_save: true,
      ai_learning_enabled: true,
      conversation_backup: true,
      notification_enabled: true,
      theme: 'light',
      language: 'en',
      message_sound: true
    },
    model: {
      selected_model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      maintain_history: true
    },
    agents: {
      primary_agent: 1,
      child_agents_enabled: true,
      auto_delegate: true,
      agent_switching: true,
      collaborative_mode: false
    },
    advanced: {
      api_endpoint: '/chat/conversations',
      websocket_endpoint: 'ws://localhost:8000/ws/chat',
      timeout: 30000,
      retry_attempts: 3,
      encryption_enabled: true,
      audit_logging: true
    },
    knowledge: {
      auto_analyze: true,
      smart_search: true,
      context_memory: true,
      file_types: ['pdf', 'txt', 'csv', 'docx', 'xlsx'],
      max_file_size: 50, // MB
      retention_days: 90,
      uploaded_files: [],
      watch_folder_enabled: false,
      watch_paths: [], // Array of {id, name, path, enabled, type}
      auto_sync_folder: true,
      sync_interval: 300, // seconds
      include_subdirectories: true,
      file_filters: ['*'], // File patterns like *.pdf, *.txt
      exclude_patterns: ['node_modules', '.git', 'temp']
    },
    privacy: {
      data_retention: 30,
      share_analytics: false,
      encrypt_messages: true,
      anonymize_data: false,
      third_party_sharing: false
    }
  });

  const tabs = [
    { id: 'general', label: 'General', icon: Icons.Settings },
    { id: 'model', label: 'AI Model', icon: Icons.Bot },
    { id: 'agents', label: 'Agents', icon: Icons.Users },
    { id: 'knowledge', label: 'Knowledge Base', icon: Icons.Upload },
    { id: 'advanced', label: 'Advanced', icon: Icons.Globe },
    { id: 'privacy', label: 'Privacy', icon: Icons.Shield }
  ];

  const handleSettingChange = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  // إدارة رفع الملفات للـ Knowledge Base
  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = `${Date.now()}_${i}`;
      
      // التحقق من نوع الملف
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!settings.knowledge.file_types.includes(fileExtension || '')) {
        alert(`File type ${fileExtension} not supported. Supported types: ${settings.knowledge.file_types.join(', ')}`);
        continue;
      }

      // التحقق من حجم الملف
      if (file.size > settings.knowledge.max_file_size * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size: ${settings.knowledge.max_file_size}MB`);
        continue;
      }

      // محاكاة رفع الملف مع progress
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
      
      // محاكاة تقدم الرفع
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
      }

      // إضافة الملف للقائمة
      const uploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: fileExtension,
        uploadedAt: new Date().toISOString(),
        analyzed: false,
        chunks: Math.ceil(file.size / 1024), // عدد الأجزاء للتحليل
        status: 'processing' // processing, analyzed, error
      };

      newFiles.push(uploadedFile);
    }

    // إضافة الملفات للإعدادات
    setSettings(prev => ({
      ...prev,
      knowledge: {
        ...prev.knowledge,
        uploaded_files: [...prev.knowledge.uploaded_files, ...newFiles]
      }
    }));

    // محاكاة تحليل الملفات
    setTimeout(() => {
      setSettings(prev => ({
        ...prev,
        knowledge: {
          ...prev.knowledge,
          uploaded_files: prev.knowledge.uploaded_files.map(file => 
            newFiles.find(nf => nf.id === file.id) 
              ? { ...file, analyzed: true, status: 'analyzed' }
              : file
          )
        }
      }));
    }, 3000);

    setIsUploading(false);
    setUploadProgress({});
  };

  const handleFileDelete = (fileId: string) => {
    setSettings(prev => ({
      ...prev,
      knowledge: {
        ...prev.knowledge,
        uploaded_files: prev.knowledge.uploaded_files.filter(file => file.id !== fileId)
      }
    }));
  };

  const handleClearAllFiles = () => {
    if (confirm('Are you sure you want to delete all files from knowledge base?')) {
      setSettings(prev => ({
        ...prev,
        knowledge: {
          ...prev.knowledge,
          uploaded_files: []
        }
      }));
    }
  };

  // Add new watch path
  const addWatchPath = () => {
    const pathId = Date.now().toString();
    const newPath = {
      id: pathId,
      name: 'New Watch Path',
      path: '',
      enabled: true,
      type: 'folder' as const,
      includeSubdirs: true,
      fileFilters: ['*']
    };
    
    setSettings(prev => ({
      ...prev,
      knowledge: {
        ...prev.knowledge,
        watch_paths: [...prev.knowledge.watch_paths, newPath]
      }
    }));
  };

  // Remove watch path
  const removeWatchPath = (pathId: string) => {
    setSettings(prev => ({
      ...prev,
      knowledge: {
        ...prev.knowledge,
        watch_paths: prev.knowledge.watch_paths.filter(p => p.id !== pathId)
      }
    }));
  };

  // Update watch path
  const updateWatchPath = (pathId: string, updates: any) => {
    setSettings(prev => ({
      ...prev,
      knowledge: {
        ...prev.knowledge,
        watch_paths: prev.knowledge.watch_paths.map(p => 
          p.id === pathId ? { ...p, ...updates } : p
        )
      }
    }));
  };

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <div className={`toggle-switch ${checked ? 'active' : ''}`} onClick={onChange}>
      <div className={`toggle-handle ${checked ? 'active' : ''}`} />
    </div>
  );

  const renderGeneralTab = () => (
    <div className="settings-tab-content">
      <div className="settings-section">
        <h3><Icons.Settings size={16} /> General Settings</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <label>Auto Save</label>
            <span className="setting-description">Automatically save conversation changes</span>
          </div>
          <ToggleSwitch 
            checked={settings.general.auto_save}
            onChange={() => handleSettingChange('general', 'auto_save', !settings.general.auto_save)}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>AI Learning</label>
            <span className="setting-description">Allow AI to learn from conversations</span>
          </div>
          <ToggleSwitch 
            checked={settings.general.ai_learning_enabled}
            onChange={() => handleSettingChange('general', 'ai_learning_enabled', !settings.general.ai_learning_enabled)}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Message Sound</label>
            <span className="setting-description">Play sound on new messages</span>
          </div>
          <ToggleSwitch 
            checked={settings.general.message_sound}
            onChange={() => handleSettingChange('general', 'message_sound', !settings.general.message_sound)}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Theme</label>
            <span className="setting-description">Choose your preferred theme</span>
          </div>
          <select 
            className="setting-select"
            value={settings.general.theme}
            onChange={(e) => handleSettingChange('general', 'theme', e.target.value)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderModelTab = () => (
    <div className="settings-tab-content">
      <div className="settings-section">
        <h3><Icons.Bot size={16} /> AI Model Configuration</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <label>Temperature</label>
            <span className="setting-description">Controls randomness (0.0 - 2.0)</span>
          </div>
          <input
            type="number"
            min="0"
            max="2"
            step="0.1"
            className="setting-input-number"
            value={settings.model.temperature}
            onChange={(e) => handleSettingChange('model', 'temperature', parseFloat(e.target.value))}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Max Tokens</label>
            <span className="setting-description">Maximum response length</span>
          </div>
          <input
            type="number"
            min="1"
            max="8192"
            className="setting-input-number"
            value={settings.model.max_tokens}
            onChange={(e) => handleSettingChange('model', 'max_tokens', parseInt(e.target.value))}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Top P</label>
            <span className="setting-description">Nucleus sampling parameter</span>
          </div>
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            className="setting-input-number"
            value={settings.model.top_p}
            onChange={(e) => handleSettingChange('model', 'top_p', parseFloat(e.target.value))}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Maintain History</label>
            <span className="setting-description">Keep conversation history when switching models</span>
          </div>
          <ToggleSwitch 
            checked={settings.model.maintain_history}
            onChange={() => handleSettingChange('model', 'maintain_history', !settings.model.maintain_history)}
          />
        </div>
      </div>
    </div>
  );

  const renderAgentsTab = () => (
    <div className="settings-tab-content">
      <div className="settings-section">
        <h3><Icons.Users size={16} /> Agent Management</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <label>Primary Agent</label>
            <span className="setting-description">Default agent for conversations</span>
          </div>
          <select 
            className="setting-select"
            value={settings.agents.primary_agent}
            onChange={(e) => handleSettingChange('agents', 'primary_agent', parseInt(e.target.value))}
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} ({agent.model_name})
              </option>
            ))}
          </select>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Agent Switching</label>
            <span className="setting-description">Allow switching agents mid-conversation</span>
          </div>
          <ToggleSwitch 
            checked={settings.agents.agent_switching}
            onChange={() => handleSettingChange('agents', 'agent_switching', !settings.agents.agent_switching)}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Auto Delegate</label>
            <span className="setting-description">Automatically delegate tasks to specialized agents</span>
          </div>
          <ToggleSwitch 
            checked={settings.agents.auto_delegate}
            onChange={() => handleSettingChange('agents', 'auto_delegate', !settings.agents.auto_delegate)}
          />
        </div>
      </div>
    </div>
  );

  const renderAdvancedTab = () => (
    <div className="settings-tab-content">
      <div className="settings-section">
        <h3><Icons.Globe size={16} /> API Configuration</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <label>API Endpoint</label>
            <span className="setting-description">Base API endpoint for chat requests</span>
          </div>
          <input
            type="text"
            className="setting-input-text"
            value={settings.advanced.api_endpoint}
            onChange={(e) => handleSettingChange('advanced', 'api_endpoint', e.target.value)}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Request Timeout</label>
            <span className="setting-description">Timeout for API requests (ms)</span>
          </div>
          <input
            type="number"
            min="5000"
            max="60000"
            step="1000"
            className="setting-input-number"
            value={settings.advanced.timeout}
            onChange={(e) => handleSettingChange('advanced', 'timeout', parseInt(e.target.value))}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Retry Attempts</label>
            <span className="setting-description">Number of retry attempts on failure</span>
          </div>
          <input
            type="number"
            min="0"
            max="10"
            className="setting-input-number"
            value={settings.advanced.retry_attempts}
            onChange={(e) => handleSettingChange('advanced', 'retry_attempts', parseInt(e.target.value))}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Encryption</label>
            <span className="setting-description">Enable end-to-end encryption</span>
          </div>
          <ToggleSwitch 
            checked={settings.advanced.encryption_enabled}
            onChange={() => handleSettingChange('advanced', 'encryption_enabled', !settings.advanced.encryption_enabled)}
          />
        </div>
      </div>
    </div>
  );

  const renderKnowledgeTab = () => (
    <div className="settings-tab-content">
      <div className="settings-section">
        <h3><Icons.Upload size={16} /> Knowledge Base Management</h3>
        
        <div className="knowledge-info-box">
          <Icons.Info size={16} />
          <div>
            <strong>Smart Knowledge Base:</strong> Upload files (customer records, product catalogs, etc.) for AI to remember and use in conversations. Also supports folder watching.
          </div>
        </div>

        {/* Folder Watcher Settings */}
        <div className="setting-item">
          <div className="setting-info">
            <label>Watch Local Folder</label>
            <span className="setting-description">Automatically sync files from a local folder</span>
          </div>
          <ToggleSwitch 
            checked={settings.knowledge.watch_folder_enabled}
            onChange={() => handleSettingChange('knowledge', 'watch_folder_enabled', !settings.knowledge.watch_folder_enabled)}
          />
        </div>
        
        {settings.knowledge.watch_folder_enabled && (
          <>
            <div className="setting-item">
              <label>Folder Path</label>
              <div className="folder-path-input">
                <input
                  type="text"
                  className="setting-input"
                  value={settings.knowledge.watch_folder_path}
                  onChange={(e) => handleSettingChange('knowledge', 'watch_folder_path', e.target.value)}
                  placeholder="C:\\Users\\Documents\\AI_Knowledge"
                />
                <button 
                  className="browse-button"
                  onClick={() => {
                    // Browser file picker for folder
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.webkitdirectory = true;
                    input.onchange = (e: any) => {
                      if (e.target.files.length > 0) {
                        const folderPath = e.target.files[0].webkitRelativePath.split('/')[0];
                        handleSettingChange('knowledge', 'watch_folder_path', folderPath);
                      }
                    };
                    input.click();
                  }}
                >
                  Browse
                </button>
              </div>
            </div>
            
            <div className="setting-item">
              <div className="setting-info">
                <label>Auto Sync</label>
                <span className="setting-description">Automatically sync new files</span>
              </div>
              <ToggleSwitch 
                checked={settings.knowledge.auto_sync_folder}
                onChange={() => handleSettingChange('knowledge', 'auto_sync_folder', !settings.knowledge.auto_sync_folder)}
              />
            </div>
            
            <div className="setting-item">
              <label>Sync Interval (seconds)</label>
              <input
                type="number"
                className="setting-input"
                value={settings.knowledge.sync_interval}
                onChange={(e) => handleSettingChange('knowledge', 'sync_interval', parseInt(e.target.value))}
                min={60}
                max={3600}
              />
            </div>
          </>
        )}

        <div className="setting-item">
          <div className="setting-info">
            <label>Auto Analyze Files</label>
            <span className="setting-description">Automatically analyze uploaded files</span>
          </div>
          <ToggleSwitch 
            checked={settings.knowledge.auto_analyze}
            onChange={() => handleSettingChange('knowledge', 'auto_analyze', !settings.knowledge.auto_analyze)}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Smart Search</label>
            <span className="setting-description">Intelligent search within file content</span>
          </div>
          <ToggleSwitch 
            checked={settings.knowledge.smart_search}
            onChange={() => handleSettingChange('knowledge', 'smart_search', !settings.knowledge.smart_search)}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Context Memory</label>
            <span className="setting-description">Store information in conversation memory</span>
          </div>
          <ToggleSwitch 
            checked={settings.knowledge.context_memory}
            onChange={() => handleSettingChange('knowledge', 'context_memory', !settings.knowledge.context_memory)}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Max File Size (MB)</label>
            <span className="setting-description">Maximum file size limit</span>
          </div>
          <input
            type="number"
            min="1"
            max="100"
            className="setting-input-number"
            value={settings.knowledge.max_file_size}
            onChange={(e) => handleSettingChange('knowledge', 'max_file_size', parseInt(e.target.value))}
          />
        </div>
      </div>

      <div className="settings-section">
        <h3><Icons.Plus size={16} /> Upload Files</h3>
        
        <div className="file-upload-area">
          <input
            type="file"
            id="knowledge-file-upload"
            multiple
            accept=".pdf,.txt,.csv,.docx,.xlsx,.json"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            style={{ display: 'none' }}
          />
          
          <label htmlFor="knowledge-file-upload" className="file-upload-button">
            <Icons.Upload size={20} />
            <div>
              <div className="upload-title">Upload Files to Knowledge Base</div>
              <div className="upload-subtitle">PDF, TXT, CSV, DOCX, XLSX - up to {settings.knowledge.max_file_size}MB</div>
            </div>
          </label>

          {isUploading && (
            <div className="upload-progress">
              <div className="progress-text">Uploading files...</div>
              {Object.entries(uploadProgress).map(([fileId, progress]) => (
                <div key={fileId} className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                  <span className="progress-percent">{progress}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="supported-types">
          <strong>Supported Types:</strong>
          {settings.knowledge.file_types.map((type) => (
            <span key={type} className="file-type-badge">{type.toUpperCase()}</span>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <h3><Icons.Globe size={16} /> Uploaded Files ({settings.knowledge.uploaded_files.length})</h3>
        
        {settings.knowledge.uploaded_files.length === 0 ? (
          <div className="empty-files-state">
            <Icons.Upload size={48} />
            <p>No files uploaded yet</p>
            <p className="empty-subtitle">Upload your files for AI to remember</p>
          </div>
        ) : (
          <>
            <div className="files-actions">
              <button 
                onClick={handleClearAllFiles}
                className="action-button danger"
                disabled={isUploading}
              >
                <Icons.X size={16} />
                Clear All Files
              </button>
            </div>
            
            <div className="uploaded-files-list">
              {settings.knowledge.uploaded_files.map((file) => (
                <div key={file.id} className="file-item">
                  <div className="file-icon">
                    {file.type === 'pdf' && '📄'}
                    {file.type === 'txt' && '📝'}
                    {file.type === 'csv' && '📊'}
                    {file.type === 'docx' && '📝'}
                    {file.type === 'xlsx' && '📈'}
                  </div>
                  
                  <div className="file-info">
                    <div className="file-name">{file.name}</div>
                    <div className="file-details">
                      {(file.size / 1024 / 1024).toFixed(2)}MB • 
                      {file.chunks} chunks • 
                      {new Date(file.uploadedAt).toLocaleDateString('ar')}
                    </div>
                  </div>
                  
                  <div className="file-status">
                    {file.status === 'processing' && (
                      <span className="status-badge processing">⏳ Processing</span>
                    )}
                    {file.status === 'analyzed' && (
                      <span className="status-badge analyzed">✅ Analyzed</span>
                    )}
                    {file.status === 'error' && (
                      <span className="status-badge error">❌ Error</span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleFileDelete(file.id)}
                    className="file-delete-button"
                    disabled={isUploading}
                  >
                    <Icons.X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="settings-section">
        <h3><Icons.Info size={16} /> Usage Examples</h3>
        <div className="usage-examples">
          <div className="example-item">
            <strong>💼 Customer Records:</strong> Upload Excel file with customer info, ask "What is John Smith's phone number?"
          </div>
          <div className="example-item">
            <strong>🛍️ Product Catalog:</strong> Upload PDF with products, ask "What is the price of Product X?"
          </div>
          <div className="example-item">
            <strong>📋 Company Policies:</strong> Upload company documents, ask "What is the vacation policy?"
          </div>
          <div className="example-item">
            <strong>📊 Financial Reports:</strong> Upload reports, ask "What were the profits in Q1?"
          </div>
        </div>
      </div>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="settings-tab-content">
      <div className="settings-section">
        <h3><Icons.Shield size={16} /> Privacy & Security</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <label>Data Retention</label>
            <span className="setting-description">How long to keep conversation data</span>
          </div>
          <select 
            className="setting-select"
            value={settings.privacy.data_retention}
            onChange={(e) => handleSettingChange('privacy', 'data_retention', parseInt(e.target.value))}
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={365}>1 year</option>
            <option value={-1}>Forever</option>
          </select>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Encrypt Messages</label>
            <span className="setting-description">Encrypt all messages in storage</span>
          </div>
          <ToggleSwitch 
            checked={settings.privacy.encrypt_messages}
            onChange={() => handleSettingChange('privacy', 'encrypt_messages', !settings.privacy.encrypt_messages)}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Share Analytics</label>
            <span className="setting-description">Share anonymized analytics for improvement</span>
          </div>
          <ToggleSwitch 
            checked={settings.privacy.share_analytics}
            onChange={() => handleSettingChange('privacy', 'share_analytics', !settings.privacy.share_analytics)}
          />
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Anonymize Data</label>
            <span className="setting-description">Remove personal identifiers from data</span>
          </div>
          <ToggleSwitch 
            checked={settings.privacy.anonymize_data}
            onChange={() => handleSettingChange('privacy', 'anonymize_data', !settings.privacy.anonymize_data)}
          />
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general': return renderGeneralTab();
      case 'model': return renderModelTab();
      case 'agents': return renderAgentsTab();
      case 'knowledge': return renderKnowledgeTab();
      case 'advanced': return renderAdvancedTab();
      case 'privacy': return renderPrivacyTab();
      default: return renderGeneralTab();
    }
  };

  // إضافة الأيقونات المفقودة
  Icons.Users = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
  
  Icons.Shield = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
  
  Icons.Info = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 16v-4" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 8h.01" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
  
  Icons.Plus = Icons.Plus || (() => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 5v14" stroke="currentColor" strokeWidth="2"/>
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ));
  
  Icons.Trash = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 6h18" stroke="currentColor" strokeWidth="2"/>
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" stroke="currentColor" strokeWidth="2"/>
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );

  return (
    <div className="settings-overlay">
      <div className="advanced-settings-modal">
        <div className="settings-header">
          <h2><Icons.Settings size={20} /> Advanced Chat Settings</h2>
          <button onClick={onClose} className="action-button">
            <Icons.X />
          </button>
        </div>
        
        <div className="settings-body">
          <div className="settings-sidebar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="settings-content-area">
            {renderTabContent()}
          </div>
        </div>
        
        <div className="settings-footer">
          <button onClick={onClose} className="action-button">
            Cancel
          </button>
          <button onClick={onClose} className="action-button primary">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModernChatPage; 