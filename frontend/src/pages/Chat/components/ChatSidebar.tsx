/**
 * Chat Sidebar Component - OpenAI Style
 * Sidebar with conversation history and search functionality
 */

import React, { useEffect, useRef } from 'react';
import { Plus, Search, MessageCircle } from 'lucide-react';

interface ChatSidebarProps {
  isOpen: boolean;
  conversations: Array<{
    id: string | number;
    title: string;
    agent_id?: number;
    message_count: number;
    created_at: string;
    updated_at?: string;
    is_active?: boolean;
  }>;
  selectedConversation: {
    id: string | number;
    title: string;
    agent_id?: number;
    message_count: number;
    created_at: string;
    updated_at?: string;
    is_active?: boolean;
  } | null;
  onSelectConversation: (conversation: {
    id: string | number;
    title: string;
    agent_id?: number;
    message_count: number;
    created_at: string;
    updated_at?: string;
    is_active?: boolean;
  }) => void;
  onDeleteConversation: (conversationId: string | number) => void;
  onNewConversation: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  
  // ✅ New props for infinite scroll
  isLoadingMore: boolean;
  hasMoreConversations: boolean;
  totalConversations: number;
  onLoadMore: () => void;

  onCleanup: () => void; // ✅ Development cleanup function
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  conversations,
  selectedConversation,
  onSelectConversation,
  onDeleteConversation,
  onNewConversation,
  searchTerm,
  onSearchChange,
  isLoadingMore,
  hasMoreConversations,
  onLoadMore,
  onCleanup
}) => {
  // ✅ Scroll detection for infinite scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      
      // ✅ Load more when user scrolls to bottom (with 100px buffer)
      if (scrollHeight - scrollTop <= clientHeight + 100) {
        if (!isLoadingMore && hasMoreConversations) {
          console.log('📜 User scrolled to bottom, loading more conversations...');
          onLoadMore();
        }
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [isLoadingMore, hasMoreConversations, onLoadMore]);

  const filteredConversations = conversations.filter(conv => {
    // ✅ Always show conversations with valid titles
    if (!conv.title) return false;
    
    // ✅ If no search term, show all conversations
    if (!searchTerm || searchTerm.trim() === '') return true;
    
    // ✅ If there's a search term, filter by it
    return conv.title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className={`openai-sidebar ${!isOpen ? 'closed' : ''}`}>
      {/* Header with New Chat Button */}
      <div className="openai-sidebar-header">
        <button
          onClick={onNewConversation}
          className="openai-new-chat-btn"
        >
          <Plus size={16} />
          New chat
        </button>
      </div>

      {/* Search */}
      <div className="openai-search">
        <Search size={16} className="openai-search-icon" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Conversations List */}
      <div className="openai-conversations">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MessageCircle size={32} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {searchTerm ? 'No conversations found' : 'No conversations yet'}
            </p>
            {!searchTerm && (
              <p className="text-xs mt-1">Start your first chat with an AI agent</p>
            )}
          </div>
        ) : (
          <div 
            ref={scrollContainerRef}
            className="openai-conversations-list"
          >
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`openai-conversation-item ${
                  selectedConversation?.id === conversation.id ? 'active' : ''
                }`}
                onClick={() => onSelectConversation(conversation)}
              >
                <div className="openai-conversation-title">
                  {conversation.title}
                </div>
                <div className="conversation-meta">
                  <span className="message-count">{conversation.message_count} messages</span>
                  <div className="conversation-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this conversation?')) {
                          onDeleteConversation(conversation.id);
                        }
                      }}
                      className="action-btn delete-btn"
                      title="Delete conversation"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* ✅ Loading indicator for infinite scroll */}
            {isLoadingMore && (
              <div className="loading-more-indicator">
                <div className="loading-spinner"></div>
                <span>Loading more conversations...</span>
              </div>
            )}
            
            {/* ✅ End indicator */}
            {!hasMoreConversations && conversations.length > 0 && (
              <div className="end-indicator">
                <span>All conversations loaded ({conversations.length} total)</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* ✅ Conversation Management Panel */}
      <div className="chat-management-panel">
        <div className="management-title">💬 Chat Management</div>
        
        <div className="management-stats">
          <div className="stat-item">
            <div className="stat-number">{conversations.length}</div>
            <div className="stat-label">Active Chats</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">
              {conversations.reduce((total, conv) => total + (conv.message_count || 0), 0)}
            </div>
            <div className="stat-label">Total Messages</div>
          </div>
        </div>
        
        <div className="management-actions">
          <button 
            className="management-btn"
            onClick={() => {
              console.log('Export all conversations');
              // ✅ Future: Implement bulk export
            }}
            title="Export all conversations"
          >
            📤 Export All
          </button>
          
          <button 
            className="management-btn"
            onClick={() => {
              if (window.confirm('Archive all conversations older than 30 days?')) {
                console.log('Archive old conversations');
                // ✅ Future: Implement bulk archive
              }
            }}
            title="Archive old conversations"
          >
            📦 Archive Old
          </button>
          
          <button 
            className="management-btn"
            onClick={() => {
              if (window.confirm('This will delete all inactive conversations. Continue?')) {
                console.log('Cleanup conversations');
                onCleanup();
              }
            }}
            title="Cleanup inactive conversations"
          >
            🧹 Cleanup
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar; 