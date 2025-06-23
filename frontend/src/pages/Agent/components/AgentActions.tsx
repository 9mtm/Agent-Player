import React from 'react';
import { agentActionsStyle, actionRowStyle, actionButtonStyle } from '../utils/styles';
import type { AgentActionsProps } from '../types';

export const AgentActions: React.FC<AgentActionsProps> = ({
  selectedAgent,
  agents,
  onToggleStatus,
  onDuplicate,
  onDelete
}) => {
  const agent = agents.find(a => a.id.toString() === selectedAgent);
  
  if (!agent) return null;

  const handleToggleStatus = () => {
    onToggleStatus(agent.id, !agent.is_active);
  };

  const handleDuplicate = () => {
    onDuplicate(agent.id);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this agent?')) {
      onDelete(agent.id);
    }
  };

  return (
    <div style={agentActionsStyle}>
      {/* Primary Actions */}
      <div style={actionRowStyle}>
        <button 
          style={actionButtonStyle('secondary')}
          onClick={handleToggleStatus}
        >
          {agent.is_active ? 'Deactivate' : 'Activate'}
        </button>
        <button 
          style={actionButtonStyle('primary')}
        >
          Test
        </button>
      </div>
      
      {/* Secondary Actions */}
      <div style={actionRowStyle}>
        <button 
          style={actionButtonStyle('secondary')}
          onClick={handleDuplicate}
        >
          Duplicate
        </button>
        <button 
          style={actionButtonStyle('danger')}
          onClick={handleDelete}
        >
          Delete
        </button>
      </div>
    </div>
  );
}; 