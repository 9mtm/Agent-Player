import React from 'react';

// ✅ Conversation Information Component
interface ConversationInfoProps {
  conversation: {
    id: string | number;
    title: string;
    message_count: number;
    created_at: string;
    updated_at?: string;
    agent_id?: number;
  } | null;
  onClose: () => void;
  onExport: (conversationId: string | number) => void;
  onArchive: (conversationId: string | number) => void;
  onDelete: (conversationId: string | number) => void;
}

export const ConversationInfo: React.FC<ConversationInfoProps> = ({
  conversation,
  onClose,
  onExport,
  onArchive,
  onDelete
}) => {
  if (!conversation) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysAgo = (dateString: string) => {
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    return days === 0 ? 'Today' : days === 1 ? '1 day ago' : `${days} days ago`;
  };

  return (
    <div className="conversation-info-panel">
      <div className="info-header">
        <h3>💬 Conversation Details</h3>
        <button onClick={onClose} className="close-btn">✕</button>
      </div>
      
      <div className="info-content">
        <div className="info-section">
          <div className="info-label">Title</div>
          <div className="info-value">{conversation.title}</div>
        </div>
        
        <div className="info-section">
          <div className="info-label">Messages</div>
          <div className="info-value">{conversation.message_count} messages</div>
        </div>
        
        <div className="info-section">
          <div className="info-label">Created</div>
          <div className="info-value">
            {formatDate(conversation.created_at)}
            <span className="info-subtext">{getDaysAgo(conversation.created_at)}</span>
          </div>
        </div>
        
        {conversation.updated_at && (
          <div className="info-section">
            <div className="info-label">Last Activity</div>
            <div className="info-value">
              {formatDate(conversation.updated_at)}
              <span className="info-subtext">{getDaysAgo(conversation.updated_at)}</span>
            </div>
          </div>
        )}
        
        {conversation.agent_id && (
          <div className="info-section">
            <div className="info-label">Agent ID</div>
            <div className="info-value">#{conversation.agent_id}</div>
          </div>
        )}
      </div>
      
      <div className="info-actions">
        <button 
          className="info-btn export-btn"
          onClick={() => onExport(conversation.id)}
          title="Export this conversation"
        >
          📤 Export
        </button>
        
        <button 
          className="info-btn archive-btn"
          onClick={() => onArchive(conversation.id)}
          title="Archive this conversation"
        >
          📦 Archive
        </button>
        
        <button 
          className="info-btn delete-btn"
          onClick={() => {
            if (window.confirm('Are you sure you want to delete this conversation?')) {
              onDelete(conversation.id);
            }
          }}
          title="Delete this conversation"
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  );
};

export default ConversationInfo; 