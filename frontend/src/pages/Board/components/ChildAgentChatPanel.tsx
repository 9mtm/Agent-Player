import React, { useState, useRef, useEffect } from 'react';

interface ChildAgent {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'busy';
  avatar?: string;
  capabilities: string[];
  memory_summary?: string;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  type?: 'text' | 'suggestion' | 'command';
  metadata?: any;
}

interface ChildAgentChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAgent?: ChildAgent;
  onAgentSelect: (agent: ChildAgent) => void;
  boardId: string;
  isBottomPanel?: boolean;
}

export const ChildAgentChatPanel: React.FC<ChildAgentChatPanelProps> = ({
  isOpen,
  onClose,
  selectedAgent,
  onAgentSelect,
  boardId,
  isBottomPanel = false
}) => {
  const [height, setHeight] = useState(400);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const chatPanelRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock child agents
  const [availableAgents] = useState<ChildAgent[]>([
    {
      id: 'agent-1',
      name: 'Workflow Assistant',
      type: 'automation',
      status: 'active',
      capabilities: ['workflow_design', 'node_management', 'connections'],
      memory_summary: 'Specialized in board workflow optimization and automation patterns.'
    },
    {
      id: 'agent-2', 
      name: 'API Connector',
      type: 'integration',
      status: 'active',
      capabilities: ['api_integration', 'data_transformation', 'webhooks'],
      memory_summary: 'Expert in connecting external services and managing data flows.'
    },
    {
      id: 'agent-3',
      name: 'Logic Designer',
      type: 'programming',
      status: 'busy',
      capabilities: ['logic_building', 'conditional_flows', 'debugging'],
      memory_summary: 'Focused on building complex logical workflows and troubleshooting.'
    }
  ]);

  // Board-specific suggestions
  const boardSuggestions = [
    {
      icon: 'fas fa-lightbulb',
      text: 'Optimize this workflow',
      command: '/optimize-workflow',
      description: 'Analyze and suggest workflow improvements'
    },
    {
      icon: 'fas fa-plus-circle',
      text: 'Add error handling',
      command: '/add-error-handling',
      description: 'Add error handling nodes to workflow'
    },
    {
      icon: 'fas fa-chart-line',
      text: 'Show analytics',
      command: '/show-analytics',
      description: 'Display workflow performance metrics'
    },
    {
      icon: 'fas fa-code',
      text: 'Generate API code',
      command: '/generate-api',
      description: 'Generate API integration code'
    },
    {
      icon: 'fas fa-save',
      text: 'Save as template',
      command: '/save-template',
      description: 'Save current board as reusable template'
    },
    {
      icon: 'fas fa-share-alt',
      text: 'Share workflow',
      command: '/share-workflow',
      description: 'Generate shareable link for this workflow'
    }
  ];

  // Keyboard shortcuts
  const shortcuts = [
    { key: 'Ctrl + /', action: 'Show commands' },
    { key: 'Ctrl + K', action: 'Clear chat' },
    { key: 'Ctrl + Enter', action: 'Send message' },
    { key: 'Esc', action: 'Close chat' },
    { key: 'Ctrl + M', action: 'Maximize/Minimize' }
  ];

  // Initialize welcome message when agent is selected
  useEffect(() => {
    if (selectedAgent && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        content: `Hello! I'm ${selectedAgent.name}, your ${selectedAgent.type} assistant. I'm here to help you with your workflow board. What would you like to work on?`,
        sender: 'agent',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages([welcomeMessage]);
    }
  }, [selectedAgent]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle resize drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const chatPanel = chatPanelRef.current;
      if (!chatPanel) return;

      const rect = chatPanel.getBoundingClientRect();
      const newHeight = window.innerHeight - e.clientY;
      
      if (newHeight >= 200 && newHeight <= window.innerHeight * 0.8) {
        setHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedAgent) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate agent response
    setTimeout(() => {
      const agentResponse: ChatMessage = {
        id: `msg-${Date.now()}-response`,
        content: generateAgentResponse(inputValue, selectedAgent),
        sender: 'agent',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, agentResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
  };

  const generateAgentResponse = (userInput: string, agent: ChildAgent): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('optimize') || input.includes('improve')) {
      return `I can help optimize your workflow! Based on my analysis of Board ${boardId}, I suggest adding parallel processing nodes and error handling. Would you like me to show you specific improvements?`;
    }
    
    if (input.includes('api') || input.includes('integration')) {
      return `Great! I specialize in API integrations. For this board, I can help you set up webhooks, data transformations, and external service connections. What service would you like to integrate?`;
    }
    
    if (input.includes('error') || input.includes('debug')) {
      return `I can help you add robust error handling to your workflow. I recommend adding try-catch nodes, retry logic, and notification systems. Shall I add these to your board?`;
    }
    
    if (input.includes('help') || input.includes('?')) {
      return `I'm here to help with your ${agent.type} needs! I can assist with: ${agent.capabilities.join(', ')}. Just ask me about any workflow challenges you're facing.`;
    }

    return `I understand you're asking about "${userInput}". As your ${agent.type} assistant, I can help you implement this in your workflow. Could you provide more details about what you'd like to achieve?`;
  };

  const handleSuggestionClick = (suggestion: any) => {
    setInputValue(suggestion.text);
  };

  const handleCommandClick = (command: string) => {
    setInputValue(command);
    handleSendMessage();
  };

  const clearChat = () => {
    setMessages([]);
    if (selectedAgent) {
      const welcomeMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        content: `Chat cleared! I'm ${selectedAgent.name}, ready to help you with your workflow board.`,
        sender: 'agent',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages([welcomeMessage]);
    }
  };

  if (!isOpen) return null;

  // Different styling for bottom panel vs floating modal
  const containerStyle = isBottomPanel ? {
    // Bottom panel mode - embedded in parent layout
    height: '100%',
    width: '100%',
    background: 'white',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    border: 'none',
    borderRadius: '0'
  } : {
    // Original floating modal mode
    position: 'fixed' as const,
    bottom: 0,
    right: '20px',
    width: '420px',
    height: isMinimized ? '50px' : `${height}px`,
    background: 'white',
    borderRadius: '12px 12px 0 0',
    boxShadow: '0 -5px 25px rgba(0, 0, 0, 0.2)',
    border: '1px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column' as const,
    zIndex: 1500,
    transition: 'all 0.3s ease',
    overflow: 'hidden'
  };

  return (
    <div
      ref={chatPanelRef}
      style={containerStyle}
    >
      {/* Resize Handle - only show for floating modal */}
      {!isMinimized && !isBottomPanel && (
        <div
          ref={resizerRef}
          onMouseDown={() => setIsDragging(true)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            cursor: 'ns-resize',
            zIndex: 10
          }}
        />
      )}

      {/* Header */}
      <div style={{
        padding: '6px 12px',
        background: '#f8f9fa',
        borderBottom: '1px solid #dee2e6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="fas fa-comments" style={{ 
            color: '#667eea', 
            fontSize: '12px' 
          }} />
          <div style={{ 
            fontWeight: '600', 
            fontSize: '12px',
            color: '#2c3e50'
          }}>
            {selectedAgent ? selectedAgent.name : 'AI Assistant'}
            {selectedAgent && (
              <span style={{ 
                fontSize: '10px', 
                color: '#6c757d',
                marginLeft: '4px',
                fontWeight: '400'
              }}>
                • {selectedAgent.type}
              </span>
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {!isBottomPanel && (
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              style={{
                background: 'none',
                border: 'none',
                borderRadius: '3px',
                color: '#6c757d',
                cursor: 'pointer',
                padding: '2px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px'
              }}
              title={isMinimized ? 'Maximize' : 'Minimize'}
              onMouseEnter={(e) => e.currentTarget.style.background = '#e9ecef'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              <i className={`fas fa-${isMinimized ? 'window-maximize' : 'window-minimize'}`} />
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              borderRadius: '3px',
              color: '#6c757d',
              cursor: 'pointer',
              padding: '2px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px'
            }}
            title="Close Chat"
            onMouseEnter={(e) => e.currentTarget.style.background = '#e9ecef'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <i className="fas fa-times" />
          </button>
        </div>
      </div>

      {/* Don't show minimized state in bottom panel mode */}
      {(!isMinimized || isBottomPanel) && (
        <>
          {/* Agent Selection */}
          {!selectedAgent && (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>Choose Your Assistant</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {availableAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => onAgentSelect(agent)}
                    style={{
                      padding: '12px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      background: 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#667eea';
                      e.currentTarget.style.background = '#f8f9ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e0e0e0';
                      e.currentTarget.style.background = 'white';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: agent.status === 'active' ? '#4CAF50' : '#FFC107'
                      }} />
                      <span style={{ fontWeight: '600', fontSize: '14px' }}>{agent.name}</span>
                      <span style={{ 
                        background: '#f0f0f0', 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        fontSize: '10px',
                        textTransform: 'uppercase'
                      }}>
                        {agent.type}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
                      {agent.memory_summary}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Area */}
          {selectedAgent && (
            <>
              {/* Messages */}
              <div style={{
                flex: 1,
                padding: '16px',
                overflowY: 'auto',
                background: '#f8f9fa'
              }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                    <i className="fas fa-comments" style={{ fontSize: '24px', marginBottom: '8px' }}></i>
                    <div>Start a conversation with {selectedAgent.name}</div>
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      display: 'flex',
                      flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                      marginBottom: '12px',
                      gap: '8px'
                    }}
                  >
                    <div style={{
                      background: message.sender === 'user' ? '#667eea' : 'white',
                      color: message.sender === 'user' ? 'white' : '#333',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      maxWidth: '80%',
                      fontSize: '14px',
                      lineHeight: '1.4',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      wordWrap: 'break-word'
                    }}>
                      {message.content}
                      <div style={{
                        fontSize: '10px',
                        opacity: 0.7,
                        marginTop: '4px',
                        textAlign: message.sender === 'user' ? 'right' : 'left'
                      }}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <div style={{
                      background: 'white',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <div style={{
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          background: '#667eea',
                          animation: 'bounce 1.4s infinite'
                        }} />
                        <div style={{
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          background: '#667eea',
                          animation: 'bounce 1.4s infinite 0.2s'
                        }} />
                        <div style={{
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          background: '#667eea',
                          animation: 'bounce 1.4s infinite 0.4s'
                        }} />
                      </div>
                      <span style={{ marginLeft: '4px', color: '#666' }}>
                        {selectedAgent.name} is typing...
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions */}
              {messages.length <= 1 && (
                <div style={{
                  padding: '12px 16px',
                  borderTop: '1px solid #e0e0e0',
                  background: 'white'
                }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: '500' }}>
                    💡 Quick Actions:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {boardSuggestions.slice(0, 4).map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        style={{
                          background: '#f0f0f0',
                          border: '1px solid #e0e0e0',
                          borderRadius: '12px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          color: '#333',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#667eea';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#f0f0f0';
                          e.currentTarget.style.color = '#333';
                        }}
                        title={suggestion.description}
                      >
                        <i className={suggestion.icon} style={{ fontSize: '10px' }}></i>
                        {suggestion.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div style={{
                padding: '16px',
                borderTop: '1px solid #e0e0e0',
                background: 'white'
              }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        if (e.ctrlKey) {
                          handleSendMessage();
                        }
                      }
                    }}
                    placeholder={`Ask ${selectedAgent.name} anything...`}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '20px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim()}
                    style={{
                      background: inputValue.trim() ? '#667eea' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <i className="fas fa-paper-plane" style={{ fontSize: '12px' }}></i>
                  </button>
                </div>

                {/* Quick Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={clearChat}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#666',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '4px 8px',
                        borderRadius: '4px'
                      }}
                      title="Clear Chat (Ctrl+K)"
                    >
                      <i className="fas fa-trash" style={{ marginRight: '4px' }}></i>
                      Clear
                    </button>
                    <button
                      onClick={() => onAgentSelect(undefined)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#666',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '4px 8px',
                        borderRadius: '4px'
                      }}
                      title="Switch Agent"
                    >
                      <i className="fas fa-user-friends" style={{ marginRight: '4px' }}></i>
                      Switch
                    </button>
                  </div>
                  
                  <div style={{ fontSize: '10px', color: '#999' }}>
                    Ctrl+Enter to send
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}; 
