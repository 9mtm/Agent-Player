/**
 * Chat Messages Component - OpenAI Style
 * Display messages with proper formatting and styling
 */

import React, { useEffect, useRef } from 'react';
import { Bot, User, AlertCircle, Clock } from 'lucide-react';
import TypingIndicator from './TypingIndicator';

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

interface ChatMessagesProps {
  messages: WorkingMessage[];
  isLoading: boolean;
  error: string | null;
  selectedAgent: SimpleAgent | null;
  isTyping?: boolean;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isLoading,
  error,
  selectedAgent,
  isTyping = false
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageContent = (content: string) => {
    // Simple formatting for code blocks and links
    return content
      .split('\n')
      .map((line, index) => (
        <React.Fragment key={index}>
          {line}
          {index < content.split('\n').length - 1 && <br />}
        </React.Fragment>
      ));
  };

  const getMessageAvatar = (message: WorkingMessage) => {
    if (message.role === 'user') {
      return <User size={16} />;
    } else if (message.role === 'assistant') {
      return <Bot size={16} />;
    } else {
      return <AlertCircle size={16} />;
    }
  };

  const getMessageLabel = (message: WorkingMessage) => {
    if (message.role === 'user') {
      return 'You';
    } else if (message.role === 'assistant') {
      return selectedAgent?.name || 'AI Assistant';
    } else {
      return 'System';
    }
  };

  if (error) {
    return (
      <div className="openai-messages">
        <div className="flex items-center justify-center py-8">
          <div className="text-center text-red-500">
            <AlertCircle size={32} className="mx-auto mb-3" />
            <p className="font-medium">Failed to load messages</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="openai-messages">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`openai-message ${message.role}`}
        >
          {/* Avatar */}
          <div className="openai-message-avatar">
            {getMessageAvatar(message)}
          </div>

          {/* Message Content */}
          <div className="flex-1">
            {/* Message Header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-sm text-gray-900">
                {getMessageLabel(message)}
              </span>
              <span className="openai-message-time">
                {formatTime(message.created_at)}
              </span>
              {message.tokens_used && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <span>•</span>
                  {message.tokens_used} tokens
                </span>
              )}
            </div>

            {/* Message Text */}
            <div className="openai-message-content">
              {formatMessageContent(message.content)}
            </div>
          </div>
        </div>
      ))}

      {/* Enhanced Typing Indicator */}
      <TypingIndicator 
        isVisible={isTyping} 
        agentName={selectedAgent?.name || 'AI Assistant'} 
      />

      {/* Fallback Loading State (for legacy support) */}
      {isLoading && !isTyping && (
        <div className="openai-message assistant">
          <div className="openai-message-avatar">
            <Bot size={16} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-sm text-gray-900">
                {selectedAgent?.name || 'AI Assistant'}
              </span>
              <span className="openai-message-time">
                <Clock size={12} className="inline mr-1" />
                Thinking...
              </span>
            </div>
            <div className="openai-message-content">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-gray-500 text-sm">AI is thinking...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {messages.length === 0 && !isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center text-gray-500">
            <Bot size={32} className="mx-auto mb-3 opacity-50" />
            <p className="font-medium">No messages yet</p>
            <p className="text-sm mt-1">Start the conversation by typing a message below</p>
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages; 