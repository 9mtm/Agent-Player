/**
 * Enhanced Message Input Component
 * Advanced message input with agent selection, attachments, and quick actions
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Mic,
  Image,
  Smile,
  Bot,
  Zap,
  Clock,
  Settings,
  X
} from 'lucide-react';

interface Agent {
  id: number;
  name: string;
  type: string;
  avatar?: string;
}

interface EnhancedMessageInputProps {
  onSendMessage: (content: string, agentId?: number) => void;
  onSendQuickMessage: (content: string, agentId?: number) => void;
  isLoading: boolean;
  placeholder?: string;
  agents?: Agent[];
  selectedAgent?: Agent | null;
  onAgentSelect?: (agent: Agent | null) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
}

export const EnhancedMessageInput: React.FC<EnhancedMessageInputProps> = ({
  onSendMessage,
  onSendQuickMessage,
  isLoading,
  placeholder = "Type your message...",
  agents = [],
  selectedAgent,
  onAgentSelect,
  onTyping,
  disabled = false,
}) => {
  const [message, setMessage] = useState('');
  const [showAgentSelect, setShowAgentSelect] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, []);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (onTyping) {
      onTyping(true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1000);
    }
  }, [onTyping]);

  // Handle message change
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
    handleTyping();
  };

  // Handle send message
  const handleSend = (isQuick: boolean = false) => {
    if (!message.trim() || isLoading || disabled) return;
    
    const sendFunction = isQuick ? onSendQuickMessage : onSendMessage;
    sendFunction(message.trim(), selectedAgent?.id);
    
    setMessage('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    // Clear typing indicator
    if (onTyping) {
      onTyping(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle file attachment
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Quick actions
  const quickActions = [
    {
      id: 'help',
      label: 'Ask for help',
      action: () => setMessage('Can you help me with ')
    },
    {
      id: 'explain',
      label: 'Explain something',
      action: () => setMessage('Please explain ')
    },
    {
      id: 'create',
      label: 'Create content',
      action: () => setMessage('Please create ')
    },
    {
      id: 'analyze',
      label: 'Analyze data',
      action: () => setMessage('Please analyze ')
    }
  ];

  useEffect(() => {
    adjustTextareaHeight();
  }, [adjustTextareaHeight]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="border-t bg-white">
      {/* Quick Actions Bar */}
      {showQuickActions && (
        <div className="p-3 border-b bg-gray-50">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Quick Actions</span>
            <button
              onClick={() => setShowQuickActions(false)}
              className="ml-auto p-1 hover:bg-gray-200 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={action.action}
                className="text-left text-sm p-2 border border-gray-200 rounded-lg hover:bg-white hover:border-blue-200 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Agent Selection */}
      {showAgentSelect && agents.length > 0 && (
        <div className="p-3 border-b bg-blue-50">
          <div className="flex items-center space-x-2 mb-2">
            <Bot className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Select Agent</span>
            <button
              onClick={() => setShowAgentSelect(false)}
              className="ml-auto p-1 hover:bg-blue-100 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            <button
              onClick={() => {
                onAgentSelect?.(null);
                setShowAgentSelect(false);
              }}
              className={`w-full text-left p-2 rounded-lg transition-colors ${
                !selectedAgent ? 'bg-blue-100 border-blue-300' : 'bg-white hover:bg-blue-50'
              } border`}
            >
              <span className="text-sm">No specific agent</span>
            </button>
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => {
                  onAgentSelect?.(agent);
                  setShowAgentSelect(false);
                }}
                className={`w-full text-left p-2 rounded-lg transition-colors ${
                  selectedAgent?.id === agent.id ? 'bg-blue-100 border-blue-300' : 'bg-white hover:bg-blue-50'
                } border flex items-center space-x-2`}
              >
                <Bot className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="text-sm font-medium">{agent.name}</div>
                  <div className="text-xs text-gray-500">{agent.type}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="p-3 border-b bg-gray-50">
          <div className="flex items-center space-x-2 mb-2">
            <Paperclip className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Attachments</span>
          </div>
          <div className="space-y-2">
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                <div className="flex items-center space-x-2">
                  <Paperclip className="w-3 h-3 text-gray-400" />
                  <span className="text-sm text-gray-700 truncate">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  onClick={() => removeAttachment(index)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Input Area */}
      <div className="p-4">
        {/* Selected Agent Indicator */}
        {selectedAgent && (
          <div className="flex items-center space-x-2 mb-2 p-2 bg-blue-50 rounded-lg">
            <Bot className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700">
              Chatting with {selectedAgent.name}
            </span>
            <button
              onClick={() => onAgentSelect?.(null)}
              className="ml-auto p-1 hover:bg-blue-100 rounded"
            >
              <X className="w-3 h-3 text-blue-600" />
            </button>
          </div>
        )}

        <div className="flex items-end space-x-3">
          {/* Action Buttons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Attach file"
              disabled={disabled}
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className={`p-2 transition-colors rounded-lg ${
                showQuickActions 
                  ? 'text-blue-600 bg-blue-100' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title="Quick actions"
              disabled={disabled}
            >
              <Zap className="w-5 h-5" />
            </button>

            {agents.length > 0 && (
              <button
                onClick={() => setShowAgentSelect(!showAgentSelect)}
                className={`p-2 transition-colors rounded-lg ${
                  showAgentSelect || selectedAgent
                    ? 'text-blue-600 bg-blue-100' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Select agent"
                disabled={disabled}
              >
                <Bot className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleMessageChange}
              onKeyPress={handleKeyPress}
              placeholder={disabled ? "Chat is disabled" : placeholder}
              disabled={disabled || isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              rows={1}
              style={{ minHeight: '48px' }}
            />
          </div>

          {/* Send Buttons */}
          <div className="flex items-center space-x-2">
            {message.trim() && (
              <button
                onClick={() => handleSend(true)}
                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                title="Send as quick message"
                disabled={disabled || isLoading}
              >
                <Clock className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={() => handleSend(false)}
              className={`p-2 rounded-lg transition-colors ${
                message.trim() && !disabled && !isLoading
                  ? 'text-white bg-blue-600 hover:bg-blue-700'
                  : 'text-gray-400 bg-gray-200 cursor-not-allowed'
              }`}
              disabled={!message.trim() || disabled || isLoading}
              title="Send message"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Status Text */}
        <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
          <span>
            {isLoading ? 'AI is thinking...' : 'Press Enter to send, Shift+Enter for new line'}
          </span>
          
          {message.length > 0 && (
            <span className={message.length > 1000 ? 'text-red-500' : ''}>
              {message.length}/2000
            </span>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.txt"
      />
    </div>
  );
}; 