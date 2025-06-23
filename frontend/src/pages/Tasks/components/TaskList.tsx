import React from 'react';
import { TaskStatus } from '../../../services';
import type { Task } from '../../../services';
import { TaskItem } from './TaskItem';
import { EmptyState } from './EmptyState';
import { taskListStyle } from '../utils/styles';

interface TaskListProps {
  tasks: Task[];
  loading?: boolean;
  filter: 'all' | TaskStatus;
  searchTerm: string;
  onToggleStatus: (taskId: number, currentStatus: TaskStatus) => Promise<void>;
  onDelete: (taskId: number) => Promise<void>;
  onUpdateProgress?: (taskId: number, progress: number) => Promise<void>;
  showRelativeDates?: boolean;
  compact?: boolean;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  loading = false,
  filter,
  searchTerm,
  onToggleStatus,
  onDelete,
  onUpdateProgress,
  showRelativeDates = false,
  compact = false
}) => {
  // Show loading state
  if (loading && tasks.length === 0) {
    return (
      <div style={taskListStyle}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#888'
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '16px' }}>⏳</div>
          <div>Loading tasks...</div>
        </div>
      </div>
    );
  }

  // Show empty state
  if (tasks.length === 0) {
    return (
      <EmptyState 
        filter={filter}
        searchTerm={searchTerm}
      />
    );
  }

  return (
    <div style={taskListStyle}>
      {tasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
          onUpdateProgress={onUpdateProgress}
          showRelativeDates={showRelativeDates}
          compact={compact}
        />
      ))}
      
      {/* Loading indicator while tasks exist */}
      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '16px',
          color: '#888',
          fontSize: '14px'
        }}>
          <div>🔄 Refreshing tasks...</div>
        </div>
      )}
    </div>
  );
}; 