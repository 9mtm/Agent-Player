import React from 'react';

interface TaskNodeProps {
  id: number;
  title: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  onStatusChange: (id: number, status: 'todo' | 'in-progress' | 'done') => void;
  onDelete: (id: number) => void;
}

const TaskNode: React.FC<TaskNodeProps> = ({
  id,
  title,
  status,
  priority,
  onStatusChange,
  onDelete
}) => {
  const getStatusColor = (status: 'todo' | 'in-progress' | 'done') => {
    switch (status) {
      case 'todo': return '#ff6b6b';
      case 'in-progress': return '#4ecdc4';
      case 'done': return '#45b7d1';
      default: return '#ddd';
    }
  };

  const getPriorityColor = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high': return '#ff4757';
      case 'medium': return '#ffa502';
      case 'low': return '#2ed573';
      default: return '#ddd';
    }
  };

  return (
    <div
      style={{
        background: '#f8f9fa',
        border: '1px solid #e9ecef',
        borderRadius: '5px',
        padding: '12px',
        cursor: 'grab',
        marginBottom: '10px'
      }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '8px'
      }}>
        <h4 style={{ 
          margin: 0, 
          fontSize: '14px',
          color: '#2c3e50',
          flex: 1
        }}>
          {title}
        </h4>
        <button
          onClick={() => onDelete(id)}
          style={{
            background: 'none',
            border: 'none',
            color: '#dc3545',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0 5px'
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center'
      }}>
        <select
          value={status}
          onChange={(e) => onStatusChange(id, e.target.value as 'todo' | 'in-progress' | 'done')}
          style={{
            padding: '4px 8px',
            border: '1px solid #ddd',
            borderRadius: '3px',
            fontSize: '12px',
            background: 'white'
          }}
        >
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        
        <span
          style={{
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '3px',
            background: getPriorityColor(priority),
            color: 'white',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}
        >
          {priority}
        </span>
      </div>
    </div>
  );
};

export default TaskNode; 