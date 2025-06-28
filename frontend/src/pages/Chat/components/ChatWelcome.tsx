/**
 * Chat Welcome Component - OpenAI Style
 * Welcome screen with conversation starters
 */

import React from 'react';
import { Sparkles } from 'lucide-react';

interface SimpleAgent {
  id: number;
  name: string;
  description?: string;
  model_name: string;
  model_provider?: string;
  is_active?: boolean;
}

interface ConversationStarter {
  title: string;
  description: string;
  icon: string;
  prompt: string;
}

interface ChatWelcomeProps {
  conversationStarters: ConversationStarter[];
  selectedAgent: SimpleAgent | null;
  onStartConversation: (prompt: string) => void;
  isCreating: boolean;
}

export const ChatWelcome: React.FC<ChatWelcomeProps> = ({
  conversationStarters,
  selectedAgent,
  onStartConversation,
  isCreating
}) => {
  return (
    <div className="openai-welcome">
      {/* Header */}
      <div className="openai-welcome-header">
        <h1 className="openai-welcome-title">
          <Sparkles className="inline-block mr-3 text-blue-500" size={32} />
          Welcome to DPRO AI
        </h1>
        <p className="openai-welcome-subtitle">
          Start a conversation with our advanced AI agents to get help with any task
        </p>
        
        {/* Current Agent Info */}
        {selectedAgent && (
          <div className="openai-welcome-agent">
            <span className="mr-2">🤖</span>
            <span>
              Currently using: <strong>{selectedAgent.name}</strong>
              {selectedAgent.model_name && (
                <span className="ml-1 text-blue-600">({selectedAgent.model_name})</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Conversation Starters Grid */}
      <div className="openai-starters">
        {conversationStarters.map((starter, index) => (
          <div
            key={index}
            className={`openai-starter-card ${isCreating ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={() => !isCreating && onStartConversation(starter.prompt)}
          >
            <div className="openai-starter-header">
              <span className="openai-starter-icon">{starter.icon}</span>
              <h3 className="openai-starter-title">{starter.title}</h3>
            </div>
            <p className="openai-starter-description">{starter.description}</p>
            
            {/* Preview of the prompt */}
            <div className="mt-3 text-xs text-gray-400 italic">
              "{starter.prompt.substring(0, 60)}..."
            </div>
          </div>
        ))}
      </div>

      {/* Additional Info */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500 mb-2">
          Or type your own message below to start a custom conversation
        </p>
        <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
          <span>✨ Creative Writing</span>
          <span>🔬 Analysis</span>
          <span>💻 Coding Help</span>
          <span>📚 Learning</span>
          <span>🎯 Planning</span>
        </div>
      </div>

      {/* Loading State */}
      {isCreating && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="text-center">
            <div className="loading-spinner w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-600">Starting new conversation...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWelcome; 