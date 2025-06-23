import React from 'react';
import { WorkflowBoard } from '../../Board/components';
import { QuickActions } from './QuickActions';
import {
  mainAreaStyle,
  emptyStateStyle,
  emptyStateIconStyle,
  emptyStateTitleStyle,
  emptyStateDescriptionStyle,
  emptyStateActionsStyle
} from '../utils/styles';
import type { AgentMainAreaProps } from '../types';

const EmptyAgentState: React.FC<{
  onCreateAgent: () => void;
  onOpenSidebar: () => void;
}> = ({ onCreateAgent, onOpenSidebar }) => {
  return (
    <div style={emptyStateStyle}>
      <div style={emptyStateIconStyle}>🤖</div>
      <h2 style={emptyStateTitleStyle}>AI Agent Builder</h2>
      <p style={emptyStateDescriptionStyle}>
        Create intelligent agents by connecting different components in a visual workflow. 
        Select an agent from the sidebar or create a new one to get started.
      </p>
      <div style={emptyStateActionsStyle}>
        <button onClick={onCreateAgent}>
          Create New Agent
        </button>
        <button 
          className="secondary"
          onClick={onOpenSidebar}
        >
          Browse Templates
        </button>
      </div>
    </div>
  );
};

export const AgentMainArea: React.FC<AgentMainAreaProps> = ({
  selectedAgent,
  agents,
  sidebarOpen,
  onCreateAgent,
  onOpenSidebar,
  boardRef
}) => {
  return (
    <div style={mainAreaStyle}>
      {selectedAgent ? (
        <>
          {/* Workflow Board */}
          <WorkflowBoard
            ref={boardRef}
            sidebarOpen={true} // Enable Board's sidebar to show components
            onCloseSidebar={() => {}}
          />
          
          {/* Quick Actions Toolbar */}
          <QuickActions 
            selectedAgent={selectedAgent}
            boardRef={boardRef}
          />
        </>
      ) : (
        /* Empty State */
        <EmptyAgentState 
          onCreateAgent={onCreateAgent}
          onOpenSidebar={onOpenSidebar}
        />
      )}
    </div>
  );
}; 