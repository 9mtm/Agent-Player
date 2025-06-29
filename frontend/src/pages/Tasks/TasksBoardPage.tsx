import React from 'react';
import { TasksBoard } from './components';

const TasksBoardPage: React.FC = () => (
  <div style={{display: 'flex', flexDirection: 'column', flex: 1, height: '100vh', width: '100vw', padding: 0, margin: 0, background: '#f8f8f8'}}>
    <div style={{padding: '24px 32px 0 32px', background: 'none', zIndex: 2}}>
      <h2 style={{margin: 0}}>Tasks Board</h2>
      <p style={{color: '#888', margin: '4px 0 16px 0', fontSize: 15}}>Visual kanban/tasks board (drag-and-drop).</p>
    </div>
    <div style={{flex: 1, minHeight: 0, minWidth: 0, display: 'flex'}}>
      <TasksBoard />
    </div>
  </div>
);

export default TasksBoardPage; 