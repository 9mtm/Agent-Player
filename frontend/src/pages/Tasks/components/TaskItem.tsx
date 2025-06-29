import React, { useState } from 'react';
import { TaskStatus } from '../../../services';
import type { Task } from '../../../services';
import {
  taskItemStyle,
  taskContentStyle,
  checkboxStyle,
  taskDetailsStyle,
  taskTitleRowStyle,
  taskTitleStyle,
  taskDescriptionStyle,
  taskMetaStyle,
  taskActionsStyle,
  progressBarContainerStyle,
  progressBarStyle,
  deleteButtonStyle,
  priorityIndicatorStyle
} from '../utils/styles';
import {
  TASK_STATUS_CONFIG,
  TASK_PRIORITY_CONFIG,
  formatDate,
  formatRelativeDate,
  getTaskStatusBadgeStyle,
  getPriorityIcon
} from '../utils/constants';

interface TaskItemProps {
  task: Task;
  onToggleStatus: (taskId: number, currentStatus: TaskStatus) => Promise<void>;
  onDelete: (taskId: number) => Promise<void>;
  onUpdateProgress?: (taskId: number, progress: number) => Promise<void>;
  showRelativeDates?: boolean;
  compact?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleStatus,
  onDelete,
  onUpdateProgress,
  showRelativeDates = false,
  compact = false
}) => {
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleToggleStatus = async () => {
    if (updating) return;
    
    try {
      setUpdating(true);
      await onToggleStatus(task.id, task.status);
    } catch (error) {
      console.error('Error toggling task status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }
    
    try {
      setDeleting(true);
      await onDelete(task.id);
    } catch (error) {
      console.error('Error deleting task:', error);
      setDeleting(false);
    }
  };

  const handleProgressChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onUpdateProgress) return;
    
    const newProgress = parseInt(e.target.value);
    try {
      await onUpdateProgress(task.id, newProgress);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const formatTaskDate = (dateString: string) => {
    return showRelativeDates ? formatRelativeDate(dateString) : formatDate(dateString);
  };

  const isCompleted = task.status === TaskStatus.COMPLETED;
  const isInProgress = task.status === TaskStatus.IN_PROGRESS;
  const priorityConfig = TASK_PRIORITY_CONFIG[task.priority];

  return (
    <div 
      style={{
        ...taskItemStyle,
        opacity: deleting ? 0.5 : 1,
        transition: 'opacity 0.2s ease'
      }}
    >
      <div style={taskContentStyle}>
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={handleToggleStatus}
          style={checkboxStyle}
          disabled={updating || deleting}
          title={isCompleted ? 'Mark as to do' : 'Mark as completed'}
        />

        {/* Task Details */}
        <div style={taskDetailsStyle}>
          {/* Title Row */}
          <div style={taskTitleRowStyle}>
            {/* Priority Indicator */}
            <div 
              style={priorityIndicatorStyle(priorityConfig.color)}
              title={`Priority: ${priorityConfig.label}`}
            />
            
            {/* Task Title */}
            <span style={taskTitleStyle(isCompleted)}>
              {task.title}
            </span>
            
            {/* Priority Icon */}
            <span title={`Priority: ${priorityConfig.label}`}>
              {getPriorityIcon(task.priority)}
            </span>
            
            {/* Status Badge */}
            <span style={getTaskStatusBadgeStyle(task.status)}>
              {TASK_STATUS_CONFIG[task.status].icon} {task.status}
            </span>
          </div>

          {/* Description */}
          {task.description && !compact && (
            <div style={taskDescriptionStyle}>
              {task.description}
            </div>
          )}

          {/* Meta Information */}
          <div style={taskMetaStyle}>
            <span>Created: {formatTaskDate(task.created_at)}</span>
            {task.updated_at !== task.created_at && (
              <span> • Updated: {formatTaskDate(task.updated_at)}</span>
            )}
            {task.progress > 0 && (
              <span> • Progress: {task.progress}%</span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={taskActionsStyle}>
        {/* Progress Bar for In Progress Tasks */}
        {isInProgress && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={progressBarContainerStyle}>
              <div style={progressBarStyle(task.progress)} />
            </div>
            {onUpdateProgress && (
              <input
                type="range"
                min="0"
                max="100"
                value={task.progress}
                onChange={handleProgressChange}
                style={{
                  width: '60px',
                  height: '4px',
                  marginTop: '4px',
                  cursor: 'pointer'
                }}
                title={`Progress: ${task.progress}%`}
              />
            )}
          </div>
        )}

        {/* Quick Status Change Buttons */}
        {!compact && task.status !== TaskStatus.COMPLETED && (
          <div style={{ display: 'flex', gap: '4px' }}>
            {task.status !== TaskStatus.IN_PROGRESS && (
              <button
                onClick={() => onToggleStatus && onToggleStatus(task.id, task.status)}
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: '#42a5f5',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
                disabled={updating || deleting}
                title="Start task"
              >
                ▶️
              </button>
            )}
            
            {task.status === TaskStatus.IN_PROGRESS && (
              <button
                onClick={() => onToggleStatus && onToggleStatus(task.id, task.status)}
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: '#66bb6a',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
                disabled={updating || deleting}
                title="Complete task"
              >
                ✅
              </button>
            )}
          </div>
        )}

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          style={{
            ...deleteButtonStyle,
            opacity: deleting ? 0.6 : 1,
            cursor: deleting ? 'not-allowed' : 'pointer'
          }}
          disabled={deleting || updating}
          title="Delete task"
        >
          {deleting ? '...' : '🗑️'}
        </button>
      </div>
    </div>
  );
}; 