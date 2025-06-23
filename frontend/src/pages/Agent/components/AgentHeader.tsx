import React from 'react';
import { pageHeaderStyle, pageActionsStyle, errorMessageStyle } from '../utils/styles';
import type { AgentHeaderProps } from '../types';

export const AgentHeader: React.FC<AgentHeaderProps> = ({
  error,
  sidebarOpen,
  onToggleSidebar,
  onCreate,
  onRefresh
}) => {
  return (
    <div className="page-header" style={pageHeaderStyle}>
      <div>
        <h1 className="page-title">AI Agent Builder</h1>
        <p className="page-subtitle">Create and manage intelligent agents with visual workflows</p>
        {error && (
          <div style={errorMessageStyle}>
            {error}
          </div>
        )}
      </div>
      <div className="page-actions" style={pageActionsStyle}>
        <button 
          className="secondary"
          onClick={onToggleSidebar}
        >
          {sidebarOpen ? 'Hide' : 'Show'} Sidebar
        </button>
        <button onClick={onCreate}>
          Create New Agent
        </button>
        <button 
          className="secondary"
          onClick={onRefresh}
        >
          Refresh
        </button>
      </div>
    </div>
  );
}; 