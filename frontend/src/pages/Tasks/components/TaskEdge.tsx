import React from 'react';

interface TaskEdgeProps {
  id: string;
  source: string;
  target: string;
}

const TaskEdge: React.FC<TaskEdgeProps> = ({ id, source, target }) => {
  return (
    <div style={{ position: 'absolute' }}>
      {/* Task Edge placeholder */}
    </div>
  );
};

export default TaskEdge; 