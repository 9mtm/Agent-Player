import React, { useState } from 'react';

interface Task {
  id: number;
  title: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
}

const initialTasks: Task[] = [
  { id: 1, title: 'Setup AI Agent Framework', status: 'todo', priority: 'high' },
  { id: 2, title: 'Integrate Local LLM Models', status: 'in-progress', priority: 'high' },
  { id: 3, title: 'Design Agent Board UI', status: 'done', priority: 'medium' },
  { id: 4, title: 'Setup FastAPI Backend', status: 'todo', priority: 'medium' },
  { id: 5, title: 'Implement File Upload Feature', status: 'in-progress', priority: 'low' },
];

const TasksBoard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    const newTask: Task = {
      id: Math.max(...tasks.map(t => t.id)) + 1,
      title: newTaskTitle.trim(),
      status: 'todo',
      priority: 'medium'
    };
    
    setTasks(prev => [...prev, newTask]);
    setNewTaskTitle('');
  };

  const handleStatusChange = (taskId: number, newStatus: Task['status']) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
  };

  const handleDeleteTask = (taskId: number) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'todo': return '#ff6b6b';
      case 'in-progress': return '#4ecdc4';
      case 'done': return '#45b7d1';
      default: return '#ddd';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return '#ff4757';
      case 'medium': return '#ffa502';
      case 'low': return '#2ed573';
      default: return '#ddd';
    }
  };

  const tasksByStatus = {
    todo: tasks.filter(task => task.status === 'todo'),
    'in-progress': tasks.filter(task => task.status === 'in-progress'),
    done: tasks.filter(task => task.status === 'done')
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      padding: '20px',
      background: '#f8f9fa'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Tasks Board</h2>
        <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add new task..."
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              fontSize: '14px'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Add Task
          </button>
        </form>
      </div>

      {/* Kanban Board */}
      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        flex: 1,
        overflowX: 'auto'
      }}>
        {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
          <div
            key={status}
            style={{
              flex: 1,
              minWidth: '300px',
              background: 'white',
              borderRadius: '8px',
              padding: '15px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{ 
              margin: '0 0 15px 0',
              color: getStatusColor(status as Task['status']),
              textTransform: 'capitalize',
              fontSize: '16px',
              borderBottom: `2px solid ${getStatusColor(status as Task['status'])}`,
              paddingBottom: '5px'
            }}>
              {status.replace('-', ' ')} ({statusTasks.length})
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {statusTasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    background: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    borderRadius: '5px',
                    padding: '12px',
                    cursor: 'grab'
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
                      {task.title}
                    </h4>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
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
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as Task['status'])}
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
                        background: getPriorityColor(task.priority),
                        color: 'white',
                        textTransform: 'uppercase',
                        fontWeight: 'bold'
                      }}
                    >
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TasksBoard; 