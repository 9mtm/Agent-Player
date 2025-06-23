/**
 * Enhanced Conversation Item Component
 * Displays a conversation with enhanced features like tags, status, and actions
 */

import React from 'react';
import { 
  MessageCircle, 
  Pin, 
  Heart, 
  Archive, 
  Trash2, 
  Clock, 
  Users,
  Tag,
  MoreVertical,
  Eye,
  Bot
} from 'lucide-react';
import { EnhancedConversation } from '../types';

interface EnhancedConversationItemProps {
  conversation: EnhancedConversation;
  isSelected: boolean;
  onClick: (conversation: EnhancedConversation) => void;
  onPin?: (id: string) => void;
  onFavorite?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const EnhancedConversationItem: React.FC<EnhancedConversationItemProps> = ({
  conversation,
  isSelected,
  onClick,
  onPin,
  onFavorite,
  onArchive,
  onDelete,
}) => {
  const formatLastActivity = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getTypeIcon = () => {
    switch (conversation.conversation_type) {
      case 'temporary':
        return <Clock className="w-3 h-3 text-orange-500" />;
      case 'draft':
        return <Eye className="w-3 h-3 text-gray-500" />;
      case 'shared':
        return <Users className="w-3 h-3 text-blue-500" />;
      default:
        return <MessageCircle className="w-3 h-3 text-green-500" />;
    }
  };

  const getStatusColor = () => {
    if (conversation.is_archived) return 'bg-gray-100 border-gray-300';
    if (isSelected) return 'bg-blue-50 border-blue-300 shadow-sm';
    return 'bg-white border-gray-200 hover:bg-gray-50';
  };

  return (
    <div
      className={`p-4 border-l-4 cursor-pointer transition-all duration-200 ${getStatusColor()}`}
      onClick={() => onClick(conversation)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2 flex-1">
          {getTypeIcon()}
          <h3 className={`font-medium text-sm truncate ${
            conversation.is_archived ? 'text-gray-500' : 'text-gray-900'
          }`}>
            {conversation.title}
          </h3>
          
          {/* Status Indicators */}
          <div className="flex items-center space-x-1">
            {conversation.is_pinned && (
              <Pin className="w-3 h-3 text-yellow-500 fill-current" />
            )}
            {conversation.is_favorite && (
              <Heart className="w-3 h-3 text-red-500 fill-current" />
            )}
            {conversation.primary_agent_id && (
              <Bot className="w-3 h-3 text-blue-500" />
            )}
          </div>
        </div>

        {/* Actions Menu */}
        <div className="relative group">
          <button className="p-1 rounded-full hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
            {onPin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPin(conversation.id);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
              >
                <Pin className="w-4 h-4" />
                <span>{conversation.is_pinned ? 'Unpin' : 'Pin'}</span>
              </button>
            )}
            
            {onFavorite && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFavorite(conversation.id);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
              >
                <Heart className="w-4 h-4" />
                <span>{conversation.is_favorite ? 'Unfavorite' : 'Favorite'}</span>
              </button>
            )}
            
            {onArchive && !conversation.is_archived && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(conversation.id);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
              >
                <Archive className="w-4 h-4" />
                <span>Archive</span>
              </button>
            )}
            
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Are you sure you want to delete this conversation?')) {
                    onDelete(conversation.id);
                  }
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {conversation.description && (
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
          {conversation.description}
        </p>
      )}

      {/* Context Summary or AI Insights */}
      {conversation.context_summary && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-1 italic">
          {conversation.context_summary}
        </p>
      )}

      {/* Tags */}
      {conversation.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {conversation.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800"
            >
              <Tag className="w-2 h-2 mr-1" />
              {tag}
            </span>
          ))}
          {conversation.tags.length > 3 && (
            <span className="text-xs text-gray-500">
              +{conversation.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Metrics */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <MessageCircle className="w-3 h-3" />
            <span>{conversation.message_count}</span>
          </span>
          
          {conversation.participating_agents.length > 0 && (
            <span className="flex items-center space-x-1">
              <Users className="w-3 h-3" />
              <span>{conversation.participating_agents.length + 1}</span>
            </span>
          )}
          
          {conversation.user_satisfaction && (
            <span className="flex items-center space-x-1">
              <span>⭐</span>
              <span>{conversation.user_satisfaction.toFixed(1)}</span>
            </span>
          )}
        </div>

        <span className="text-right">
          {formatLastActivity(conversation.last_activity_at)}
        </span>
      </div>

      {/* Performance Bar */}
      {conversation.performance_metrics && (
        <div className="mt-2 flex space-x-1">
          <div 
            className="h-1 bg-green-200 rounded-full flex-1"
            title={`Engagement: ${(conversation.performance_metrics.engagement_score * 100).toFixed(0)}%`}
          >
            <div 
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${conversation.performance_metrics.engagement_score * 100}%` }}
            />
          </div>
          <div 
            className="h-1 bg-blue-200 rounded-full flex-1"
            title={`Completion: ${(conversation.performance_metrics.completion_rate * 100).toFixed(0)}%`}
          >
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${conversation.performance_metrics.completion_rate * 100}%` }}
            />
          </div>
          <div 
            className="h-1 bg-purple-200 rounded-full flex-1"
            title={`Success: ${(conversation.performance_metrics.success_rate * 100).toFixed(0)}%`}
          >
            <div 
              className="h-full bg-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${conversation.performance_metrics.success_rate * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Expiry Warning for Temporary Conversations */}
      {conversation.conversation_type === 'temporary' && conversation.expires_at && (
        <div className="mt-2 flex items-center space-x-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
          <Clock className="w-3 h-3" />
          <span>
            Expires: {new Date(conversation.expires_at).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
}; 