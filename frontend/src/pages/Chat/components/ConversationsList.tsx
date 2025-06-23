/**
 * Conversations List Component
 * Displays a list of conversations with search, filters, and quick actions
 */

import React, { useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  SortDesc,
  MessageCircle,
  Clock,
  Star,
  Archive,
  Users,
  Bot
} from 'lucide-react';
import { EnhancedConversation, ConversationFilters } from '../types';
import { EnhancedConversationItem } from './EnhancedConversationItem';

interface ConversationsListProps {
  conversations: EnhancedConversation[];
  selectedConversation: EnhancedConversation | null;
  isLoading: boolean;
  onSelectConversation: (conversation: EnhancedConversation) => void;
  onCreateConversation: () => void;
  onCreateQuickChat: () => void;
  onDeleteConversation: (id: string) => void;
  onFiltersChange: (filters: ConversationFilters) => void;
  onSearch: (query: string) => void;
}

export const ConversationsList: React.FC<ConversationsListProps> = ({
  conversations,
  selectedConversation,
  isLoading,
  onSelectConversation,
  onCreateConversation,
  onCreateQuickChat,
  onDeleteConversation,
  onFiltersChange,
  onSearch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'messages'>('recent');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    
    const filters: ConversationFilters = {};
    
    switch (filter) {
      case 'favorites':
        // This would need to be handled by adding a is_favorite filter
        break;
      case 'pinned':
        // This would need to be handled by adding a is_pinned filter
        break;
      case 'archived':
        filters.include_archived = true;
        break;
      case 'temporary':
        filters.conversation_type = 'temporary';
        break;
      case 'permanent':
        filters.conversation_type = 'permanent';
        break;
      case 'with_agents':
        // This could filter conversations that have agents
        break;
      default:
        // 'all' filter - no special filters
        break;
    }
    
    onFiltersChange(filters);
  };

  const sortedConversations = [...conversations].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.title.localeCompare(b.title);
      case 'messages':
        return b.message_count - a.message_count;
      case 'recent':
      default:
        return new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime();
    }
  });

  const getFilterCount = (filter: string) => {
    switch (filter) {
      case 'favorites':
        return conversations.filter(c => c.is_favorite).length;
      case 'pinned':
        return conversations.filter(c => c.is_pinned).length;
      case 'archived':
        return conversations.filter(c => c.is_archived).length;
      case 'temporary':
        return conversations.filter(c => c.conversation_type === 'temporary').length;
      case 'permanent':
        return conversations.filter(c => c.conversation_type === 'permanent').length;
      case 'with_agents':
        return conversations.filter(c => c.primary_agent_id || c.participating_agents.length > 0).length;
      default:
        return conversations.length;
    }
  };

  const filters = [
    { key: 'all', label: 'All', icon: MessageCircle },
    { key: 'favorites', label: 'Favorites', icon: Star },
    { key: 'pinned', label: 'Pinned', icon: MessageCircle },
    { key: 'with_agents', label: 'With Agents', icon: Bot },
    { key: 'temporary', label: 'Temporary', icon: Clock },
    { key: 'permanent', label: 'Permanent', icon: MessageCircle },
    { key: 'archived', label: 'Archived', icon: Archive },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={onCreateQuickChat}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Quick Chat"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            
            <button
              onClick={onCreateConversation}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="New Conversation"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-colors ${
              showFilters ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm">Filters</span>
          </button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'name' | 'messages')}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500"
          >
            <option value="recent">Recent</option>
            <option value="name">Name</option>
            <option value="messages">Messages</option>
          </select>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-4 bg-white border-b">
          <div className="grid grid-cols-2 gap-2">
            {filters.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => handleFilterChange(key)}
                className={`flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${
                  activeFilter === key
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-100 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </div>
                <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {getFilterCount(key)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : sortedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <MessageCircle className="w-8 h-8 mb-2" />
            <p className="text-sm">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={onCreateQuickChat}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Start your first chat
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {sortedConversations.map((conversation) => (
              <EnhancedConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedConversation?.id === conversation.id}
                onClick={onSelectConversation}
                onDelete={onDeleteConversation}
                // Add other action handlers as needed
                onPin={(id) => {
                  // Handle pin action
                  console.log('Pin conversation:', id);
                }}
                onFavorite={(id) => {
                  // Handle favorite action
                  console.log('Favorite conversation:', id);
                }}
                onArchive={(id) => {
                  // Handle archive action
                  console.log('Archive conversation:', id);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{conversations.length} conversations</span>
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <Users className="w-3 h-3" />
              <span>{conversations.filter(c => c.participating_agents.length > 0).length}</span>
            </span>
            <span className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{conversations.filter(c => c.conversation_type === 'temporary').length}</span>
            </span>
            <span className="flex items-center space-x-1">
              <Star className="w-3 h-3" />
              <span>{conversations.filter(c => c.is_favorite).length}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}; 