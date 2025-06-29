import React from 'react';
import { TaskStatus } from '../../../services';
import {
  emptyStateStyle,
  emptyStateIconStyle,
  emptyStateTitleStyle,
  emptyStateDescriptionStyle
} from '../utils/styles';

interface EmptyStateProps {
  filter: 'all' | TaskStatus;
  searchTerm: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ filter, searchTerm }) => {
  const getEmptyStateContent = () => {
    if (searchTerm) {
      return {
        icon: '🔍',
        title: 'No tasks found',
        description: `No tasks match your search "${searchTerm}". Try different keywords or clear the search.`
      };
    }

    switch (filter) {
      case TaskStatus.TODO:
        return {
          icon: '⏳',
          title: 'No pending tasks',
          description: 'All your tasks are either completed or in progress. Great job!'
        };
      
      case TaskStatus.IN_PROGRESS:
        return {
          icon: '▶️',
          title: 'No running tasks',
          description: 'No tasks are currently in progress. Start working on a pending task!'
        };
      
      case TaskStatus.COMPLETED:
        return {
          icon: '✅',
          title: 'No completed tasks',
          description: 'Complete some tasks to see them here. Keep up the good work!'
        };
      
      case TaskStatus.ON_HOLD:
        return {
          icon: '❌',
          title: 'No on-hold tasks',
          description: 'Great! No tasks have been put on hold. Everything is running smoothly.'
        };
      
      case TaskStatus.CANCELLED:
        return {
          icon: '⏹️',
          title: 'No cancelled tasks',
          description: 'No tasks have been cancelled. Keep moving forward!'
        };
      
      default: // 'all'
        return {
          icon: '📝',
          title: 'No tasks yet',
          description: 'Create your first task to get started!'
        };
    }
  };

  const { icon, title, description } = getEmptyStateContent();

  return (
    <div style={emptyStateStyle}>
      <div style={emptyStateIconStyle}>{icon}</div>
      <h3 style={emptyStateTitleStyle}>{title}</h3>
      <p style={emptyStateDescriptionStyle}>{description}</p>
      
      {filter === 'all' && !searchTerm && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          backgroundColor: '#e3f2fd',
          border: '1px solid #bbdefb',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#1976d2'
        }}>
          💡 <strong>Tip:</strong> Use the form above to add your first task!
        </div>
      )}
      
      {searchTerm && (
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            borderRadius: '6px',
            background: '#1976d2',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Clear search and show all tasks
        </button>
      )}
    </div>
  );
}; 