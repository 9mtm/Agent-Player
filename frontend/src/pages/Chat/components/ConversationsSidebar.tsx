/**
 * Conversations Sidebar Component
 * Beautiful sidebar with conversations list, search, and quick actions
 */

import React from 'react';
import {
  MessageCircle,
  Plus,
  Search,
  Bot,
  Clock,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

// Types
interface SimpleConversation {
  id: number;
  title: string;
  agent_id?: number;
  message_count: number;
  created_at: string;
  updated_at?: string;
  last_message_at?: string;
  is_active?: boolean;
}

interface SimpleAgent {
  id: number;
  name: string;
  description?: string;
  model_name: string;
  model_provider?: string;
  is_active?: boolean;
}

interface ConversationsSidebarProps {
  conversations: SimpleConversation[];
  selectedConversation: SimpleConversation | null;
  availableAgents: SimpleAgent[];
  searchQuery: string;
  error: string | null;
  isCreatingChat: boolean;
  onSearchChange: (query: string) => void;
  onConversationSelect: (conversation: SimpleConversation) => void;
  onCreateNewConversation: (agentId?: number) => void;
  onRefreshConversations: () => void;
}

export const ConversationsSidebar: React.FC<ConversationsSidebarProps> = ({
  conversations,
  selectedConversation,
  availableAgents,
  searchQuery,
  error,
  isCreatingChat,
  onSearchChange,
  onConversationSelect,
  onCreateNewConversation,
  onRefreshConversations
}) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-blue-600" />
            Chats
          </h2>
          <button
            onClick={() => onCreateNewConversation()}
            disabled={isCreatingChat}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            title="New Chat"
          >
            {isCreatingChat ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            ) : (
              <Plus className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      
      {/* Quick Actions */}
      {availableAgents.length > 0 && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-2">Quick Start</p>
          <div className="grid grid-cols-1 gap-2">
            {availableAgents.slice(0, 3).map(agent => (
              <button
                key={agent.id}
                onClick={() => onCreateNewConversation(agent.id)}
                className="text-left p-2 rounded-lg hover:bg-white border border-gray-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                    <p className="text-xs text-gray-500">{agent.model_name}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
            <button
              onClick={onRefreshConversations}
              className="ml-auto p-1 hover:bg-red-100 rounded"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs text-gray-400 mt-1">Start your first chat with an AI agent</p>
          </div>
        ) : (
          filteredConversations.map(conversation => (
            <button
              key={conversation.id}
              onClick={() => onConversationSelect(conversation)}
              className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                selectedConversation?.id === conversation.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{conversation.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {formatTime(conversation.last_message_at || conversation.updated_at || conversation.created_at)}
                    </span>
                    {conversation.message_count > 0 && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs text-gray-500">
                          {conversation.message_count} messages
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {conversation.agent_id && (
                  <Bot className="w-4 h-4 text-blue-600 flex-shrink-0" />
                )}
              </div>
            </button>
          ))
        )}
      </div>
      
      {/* Stats Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-semibold text-gray-900">{conversations.length}</p>
            <p className="text-xs text-gray-500">Conversations</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{availableAgents.length}</p>
            <p className="text-xs text-gray-500">Agents</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">
              {conversations.reduce((sum, conv) => sum + conv.message_count, 0)}
            </p>
            <p className="text-xs text-gray-500">Messages</p>
          </div>
        </div>
      </div>
    </div>
  );
}; 