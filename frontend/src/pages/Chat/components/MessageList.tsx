/**
 * Message List Component
 * Displays chat messages with proper formatting and actions
 */

import React, { useRef, useEffect } from 'react';
import { Bot, Copy, ThumbsUp, ThumbsDown, Clock } from 'lucide-react';

interface Message {
  id: number;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'error';
  attachments?: FileAttachment[];
  metadata?: {
    tokens?: number;
    response_time?: number;
    confidence?: number;
    model_used?: string;
    cost?: number;
  };
}

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  preview?: string;
}

interface MessageListProps {
  messages: Message[];
  isTyping?: boolean;
  className?: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isTyping = false,
  className = ''
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Copy message content
  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };
  
  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };
  
  // Get file icon based on type
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('document') || fileType.includes('word')) return '📝';
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊';
    return '📁';
  };
  
  return (
    <div className={`messages-container ${className}`}>
      <div className="messages-list">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.role}`}>
            {/* Message Avatar */}
            <div className="message-avatar">
              {message.role === 'user' ? (
                <div className="user-avatar">
                  <span>U</span>
                </div>
              ) : (
                <div className="ai-avatar">
                  <Bot size={20} />
                </div>
              )}
            </div>
            
            {/* Message Content */}
            <div className="message-content">
              {/* Message Header */}
              <div className="message-header">
                <span className="message-role">
                  {message.role === 'user' ? 'You' : 'AI Assistant'}
                </span>
                <span className="message-time">
                  {formatTime(message.timestamp)}
                </span>
                {message.status && (
                  <span className={`message-status ${message.status}`}>
                    {message.status}
                  </span>
                )}
              </div>
              
              {/* Message Text */}
              <div className="message-text">
                {message.content}
              </div>
              
              {/* File Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="message-attachments">
                  {message.attachments.map(attachment => (
                    <div key={attachment.id} className="attachment-item">
                      <span className="attachment-icon">
                        {getFileIcon(attachment.type)}
                      </span>
                      <span className="attachment-name">{attachment.name}</span>
                      <span className="attachment-size">
                        ({Math.round(attachment.size / 1024)} KB)
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Message Metadata */}
              {message.metadata && message.role === 'assistant' && (
                <div className="message-metadata">
                  {message.metadata.response_time && (
                    <span className="metadata-item">
                      <Clock size={12} />
                      {message.metadata.response_time.toFixed(2)}s
                    </span>
                  )}
                  {message.metadata.tokens && (
                    <span className="metadata-item">
                      {message.metadata.tokens} tokens
                    </span>
                  )}
                  {message.metadata.model_used && (
                    <span className="metadata-item">
                      {message.metadata.model_used}
                    </span>
                  )}
                </div>
              )}
              
              {/* Message Actions */}
              <div className="message-actions">
                <button
                  onClick={() => copyMessage(message.content)}
                  className="action-btn"
                  title="Copy message"
                >
                  <Copy size={14} />
                </button>
                
                {message.role === 'assistant' && (
                  <>
                    <button
                      className="action-btn"
                      title="Good response"
                    >
                      <ThumbsUp size={14} />
                    </button>
                    <button
                      className="action-btn"
                      title="Poor response"
                    >
                      <ThumbsDown size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="message assistant">
            <div className="message-avatar">
              <div className="ai-avatar">
                <Bot size={20} />
              </div>
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}; 