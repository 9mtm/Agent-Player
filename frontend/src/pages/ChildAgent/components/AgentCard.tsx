import React from 'react';
import type { ChildAgent } from '../types';

interface AgentCardProps {
  agent: ChildAgent;
  onRemove: (id: number) => void;
  onUpdate: (id: number, updates: Partial<ChildAgent>) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onRemove }) => {
  return (
    <div 
      style={{
        background: 'white',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid #e0e0e0'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: '#333', fontSize: '18px' }}>{agent.name}</h3>
        <span 
          style={{
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            background: agent.status === 'active' ? '#d4edda' : '#f8f9fa',
            color: agent.status === 'active' ? '#155724' : '#6c757d',
            border: `1px solid ${agent.status === 'active' ? '#c3e6cb' : '#dee2e6'}`
          }}
        >
          {agent.status.toUpperCase()}
        </span>
      </div>
      <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.4', margin: '0 0 15px 0' }}>
        {agent.description}
      </p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          style={{
            background: '#28a745',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            flex: 1
          }}
        >
          Configure
        </button>
        <button 
          style={{
            background: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            flex: 1
          }}
          onClick={() => onRemove(agent.id)}
        >
          Remove
        </button>
      </div>
    </div>
  );
}; 