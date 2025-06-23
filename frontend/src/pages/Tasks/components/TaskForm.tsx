import React, { useState } from 'react';
import { TaskPriority } from '../../../services';
import { 
  formStyle, 
  inputStyle, 
  addButtonStyle,
  errorMessageStyle
} from '../utils/styles';
import { TASK_PRIORITY_CONFIG } from '../utils/constants';

interface TaskFormProps {
  onSubmit: (title: string, description?: string, priority?: TaskPriority) => Promise<void>;
  loading?: boolean;
}

export const TaskForm: React.FC<TaskFormProps> = ({ onSubmit, loading = false }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    try {
      setError(null);
      setSubmitting(true);
      
      await onSubmit(
        title.trim(), 
        description.trim() || undefined, 
        priority
      );
      
      // Reset form on success
      setTitle('');
      setDescription('');
      setPriority(TaskPriority.MEDIUM);
      setExpanded(false);
    } catch (err) {
      // Error handling is done in the hook, but we can show local feedback
      setError('Failed to create task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
    if (expanded) {
      // Reset optional fields when collapsing
      setDescription('');
      setPriority(TaskPriority.MEDIUM);
    }
  };

  const isDisabled = loading || submitting;

  return (
    <div style={{ marginBottom: '24px' }}>
      <form onSubmit={handleSubmit} style={formStyle}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add new task..."
          style={{
            ...inputStyle,
            flex: expanded ? 'none' : 1,
            marginRight: '8px'
          }}
          disabled={isDisabled}
          autoFocus
        />
        
        {!expanded && (
          <>
            <button 
              type="button"
              onClick={toggleExpanded}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                background: '#f5f5f5',
                color: '#666',
                border: '1px solid #ddd',
                fontWeight: '500',
                fontSize: '14px',
                cursor: 'pointer',
                marginRight: '8px'
              }}
              disabled={isDisabled}
              title="Add description and set priority"
            >
              ⚙️ More
            </button>
            
            <button 
              type="submit" 
              style={{
                ...addButtonStyle,
                opacity: isDisabled ? 0.6 : 1,
                cursor: isDisabled ? 'not-allowed' : 'pointer'
              }}
              disabled={isDisabled}
            >
              {submitting ? '...' : 'Add'}
            </button>
          </>
        )}
      </form>

      {/* Expanded form */}
      {expanded && (
        <div style={{
          backgroundColor: '#f9f9f9',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          marginTop: '8px'
        }}>
          {/* Description */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '4px',
              color: '#333'
            }}>
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add task description..."
              style={{
                ...inputStyle,
                minHeight: '60px',
                resize: 'vertical' as const,
                fontFamily: 'inherit'
              }}
              disabled={isDisabled}
            />
          </div>

          {/* Priority */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '4px',
              color: '#333'
            }}>
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              style={{
                ...inputStyle,
                maxWidth: '200px'
              }}
              disabled={isDisabled}
            >
              {Object.values(TaskPriority).map(p => (
                <option key={p} value={p}>
                  {TASK_PRIORITY_CONFIG[p].icon} {TASK_PRIORITY_CONFIG[p].label}
                </option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={toggleExpanded}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                background: '#f5f5f5',
                color: '#666',
                border: '1px solid #ddd',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              disabled={isDisabled}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              onClick={handleSubmit}
              style={{
                ...addButtonStyle,
                fontSize: '14px',
                opacity: isDisabled ? 0.6 : 1,
                cursor: isDisabled ? 'not-allowed' : 'pointer'
              }}
              disabled={isDisabled}
            >
              {submitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div style={{
          ...errorMessageStyle,
          marginTop: '8px'
        }}>
          {error}
          <button 
            onClick={() => setError(null)}
            style={{
              marginLeft: '8px',
              padding: '2px 6px',
              fontSize: '12px',
              background: 'transparent',
              border: '1px solid #ff5722',
              borderRadius: '4px',
              color: '#ff5722',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}; 