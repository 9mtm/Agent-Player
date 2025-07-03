/**
 * Chat Interface - Main chat UI component
 * Features: Message display, input, typing indicators, real-time updates
 * UPDATED: Support for both backend agents and direct Ollama integration
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Paperclip, Mic, Square, Bot, User } from 'lucide-react';

// Types
interface Message {
  id: number;
  conversation_id: string;
  sender: "user" | "agent";
  content: string;
  created_at: string;
  status?: 'sending' | 'sent' | 'error';
  attachments?: FileAttachment[];
  tokens_used?: number;
  processing_time?: number;
}

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  preview?: string;
}

interface ChatAgent {
  id: number;
  name: string;
  description?: string;
  agent_type?: 'main' | 'child';
  model_provider?: string;
  model_name?: string;
  is_active?: boolean;
  endpoint?: string; // For direct Ollama integration
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  selectedAgent: ChatAgent | null;
  isTyping?: boolean;
  disabled?: boolean;
}

// Ollama Integration Helper
const ollamaService = {
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      return response.ok;
    } catch {
      return false;
    }
  },

  async getModels(): Promise<string[]> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (response.ok) {
        const data = await response.json();
        return data.models?.map((m: any) => m.name) || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async generateResponse(model: string, prompt: string): Promise<string> {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.response || 'No response from Ollama';
      }
      throw new Error('Ollama request failed');
    } catch (error) {
      console.error('Ollama error:', error);
      throw error;
    }
  }
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  selectedAgent,
  isTyping = false,
  disabled = false
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [isOllamaAvailable, setIsOllamaAvailable] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [selectedOllamaModel, setSelectedOllamaModel] = useState<string>('');
  const [useOllama, setUseOllama] = useState(false);
  const [ollamaMessages, setOllamaMessages] = useState<Message[]>([]);
  const [isOllamaTyping, setIsOllamaTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check Ollama availability on mount
  useEffect(() => {
    const checkOllama = async () => {
      const available = await ollamaService.isAvailable();
      setIsOllamaAvailable(available);
      
      if (available) {
        const models = await ollamaService.getModels();
        setOllamaModels(models);
        if (models.length > 0) {
          setSelectedOllamaModel(models[0]);
        }
        console.log('🟢 Ollama detected with models:', models);
      } else {
        console.log('🔴 Ollama not available');
      }
    };

    checkOllama();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [messageInput]);

  // Get current messages (either from parent or Ollama)
  const currentMessages = useOllama ? ollamaMessages : messages;
  const currentIsTyping = useOllama ? isOllamaTyping : isTyping;

  // Enhanced send message with Ollama support
  const handleSendMessage = async () => {
    if (!messageInput.trim() || disabled) return;

    const message = messageInput.trim();
    setMessageInput('');

    try {
      if (useOllama && isOllamaAvailable && selectedOllamaModel) {
        // Send message via direct Ollama integration
        await sendViaOllama(message);
      } else {
        // Send message via backend
        await onSendMessage(message);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Direct Ollama message sending - IMPROVED
  const sendViaOllama = async (message: string) => {
    // Create user message first
    const userMessage: Message = {
      id: Date.now(),
      conversation_id: 'ollama-direct',
      sender: 'user',
      content: message,
      created_at: new Date().toISOString(),
      status: 'sent'
    };

    // Add user message to Ollama messages immediately
    setOllamaMessages(prev => [...prev, userMessage]);
    setIsOllamaTyping(true);

    try {
      console.log(`🤖 Generating response with Ollama model: ${selectedOllamaModel}`);
      const startTime = Date.now();
      
      // Generate AI response via Ollama
      const response = await ollamaService.generateResponse(selectedOllamaModel, message);
      const processingTime = (Date.now() - startTime) / 1000;
      
      const aiMessage: Message = {
        id: Date.now() + 1,
        conversation_id: 'ollama-direct',
        sender: 'agent',
        content: response,
        created_at: new Date().toISOString(),
        processing_time: processingTime
      };

      console.log('🤖 AI response from Ollama:', aiMessage);
      
      // Add AI response to Ollama messages
      setOllamaMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      console.error('❌ Ollama conversation error:', error);
      
      const errorMessage: Message = {
        id: Date.now() + 1,
        conversation_id: 'ollama-direct',
        sender: 'agent',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response from Ollama'}`,
        created_at: new Date().toISOString(),
        status: 'error'
      };
      
      // Add error message to Ollama messages
      setOllamaMessages(prev => [...prev, errorMessage]);
      
    } finally {
      setIsOllamaTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageSenderName = (message: Message) => {
    if (message.sender === 'user') return 'You';
    if (useOllama && selectedOllamaModel) return `Ollama (${selectedOllamaModel})`;
    return selectedAgent?.name || 'AI Assistant';
  };

  return (
    <div className="chat-interface flex flex-col h-full bg-white">
      {/* Ollama Integration Header */}
      {isOllamaAvailable && (
        <div className="ollama-controls p-3 bg-gray-50 border-b">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={useOllama}
                onChange={(e) => setUseOllama(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">Use Ollama Direct</span>
            </label>
            
            {useOllama && ollamaModels.length > 0 && (
              <select
                value={selectedOllamaModel}
                onChange={(e) => setSelectedOllamaModel(e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                {ollamaModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            )}
            
            <span className="text-xs text-green-600">
              🟢 Ollama Available ({ollamaModels.length} model{ollamaModels.length !== 1 ? 's' : ''})
            </span>
            
            {useOllama && (
              <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Active: {selectedOllamaModel}
              </div>
            )}
            
            {useOllama && ollamaMessages.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-blue-600">
                  {ollamaMessages.length} message{ollamaMessages.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => setOllamaMessages([])}
                  className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                  title="Clear Ollama chat history"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
          
          {useOllama && (
            <div className="mt-2 text-xs text-gray-600">
              💡 You're connected directly to Ollama. Messages won't be saved to conversations.
            </div>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div className="messages-container flex-1 overflow-y-auto p-4 space-y-4">
        {currentMessages.length === 0 ? (
          <div className="empty-state text-center py-12">
            <Bot size={48} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {useOllama ? 'Ready to chat with Ollama' : 'Start a conversation'}
            </h3>
            <p className="text-gray-500">
              {useOllama 
                ? `Connected to Ollama model: ${selectedOllamaModel}`
                : selectedAgent 
                  ? `Chat with ${selectedAgent.name}`
                  : 'Select an agent to begin'
              }
            </p>
          </div>
        ) : (
          <>
            {currentMessages.map((message) => (
              <div
                key={message.id}
                className={`message-bubble flex ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    message.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="message-header flex items-center space-x-2 mb-1">
                    {message.sender === 'user' ? (
                      <User size={14} />
                    ) : (
                      <Bot size={14} />
                    )}
                    <span className="text-xs font-medium">
                      {getMessageSenderName(message)}
                    </span>
                    <span className="text-xs opacity-70">
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                  
                  <div className="message-content">
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {/* Message metadata */}
                  {(message.tokens_used || message.processing_time) && (
                    <div className="message-meta mt-2 pt-2 border-t border-opacity-20">
                      <div className="flex space-x-4 text-xs opacity-70">
                        {message.tokens_used && (
                          <span>Tokens: {message.tokens_used}</span>
                        )}
                        {message.processing_time && (
                          <span>Time: {message.processing_time.toFixed(2)}s</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Message status */}
                  {message.status && message.status !== 'sent' && (
                    <div className="message-status mt-1">
                      <span className={`text-xs ${
                        message.status === 'sending' ? 'text-yellow-300' :
                        message.status === 'error' ? 'text-red-300' : ''
                      }`}>
                        {message.status === 'sending' && '⏳ Sending...'}
                        {message.status === 'error' && '❌ Failed to send'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {currentIsTyping && (
              <div className="typing-indicator flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2 max-w-[70%]">
                  <div className="flex items-center space-x-2">
                    <Bot size={14} />
                    <span className="text-sm text-gray-600">
                      {useOllama ? selectedOllamaModel : selectedAgent?.name || 'AI'} is typing...
                    </span>
                    <div className="typing-dots flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="input-area border-t bg-white p-4">
        {/* Warning if no agent selected and not using Ollama */}
        {!selectedAgent && !useOllama && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-700 text-sm">
              ⚠️ Please select an agent or enable Ollama to start chatting
            </p>
          </div>
        )}

        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                useOllama 
                  ? `Message ${selectedOllamaModel}...`
                  : selectedAgent 
                    ? `Message ${selectedAgent.name}...`
                    : 'Select an agent first...'
              }
              disabled={disabled || (!selectedAgent && !useOllama)}
              className="w-full resize-none border border-gray-300 rounded-lg px-3 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed min-h-[44px] max-h-32"
              rows={1}
            />
            
            {/* Attachment button */}
            <button
              type="button"
              disabled={disabled || (!selectedAgent && !useOllama)}
              className="absolute right-2 top-2 p-2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
            >
              <Paperclip size={16} />
            </button>
          </div>

          {/* Voice button */}
          <button
            type="button"
            disabled={disabled || (!selectedAgent && !useOllama)}
            className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-lg disabled:cursor-not-allowed"
          >
            <Mic size={16} />
          </button>

          {/* Send button */}
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={disabled || !messageInput.trim() || (!selectedAgent && !useOllama)}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>

        {/* Connection status */}
        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${
              useOllama && isOllamaAvailable ? 'bg-green-500' : 
              selectedAgent ? 'bg-blue-500' : 'bg-gray-400'
            }`}></div>
            <span>
              {useOllama && isOllamaAvailable ? 'Connected to Ollama' :
               selectedAgent ? 'Connected to Backend' : 'Not connected'}
            </span>
          </div>
          
          {messageInput.length > 0 && (
            <span>{messageInput.length} characters</span>
          )}
        </div>
      </div>
    </div>
  );
}; 