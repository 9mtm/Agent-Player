import React from 'react';
import { AgentActions } from './AgentActions';
import { formatDate } from '../utils/constants';
import {
  sidebarStyle,
  sidebarHeaderStyle,
  sidebarListStyle,
  sidebarFooterStyle,
  agentItemStyle,
  agentItemHeaderStyle,
  agentNameStyle,
  agentMetaStyle,
  statusBadgeStyle,
  emptyStateStyle,
  emptyStateIconStyle
} from '../utils/styles';
import type { AgentSidebarProps, Agent } from '../types';

const AgentStatusBadge: React.FC<{ agent: Agent }> = ({ agent }) => {
  return (
    <span style={statusBadgeStyle(agent)}>
      {agent.is_active ? 'Active' : 'Inactive'}
    </span>
  );
};

const AgentItem: React.FC<{
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
}> = ({ agent, isSelected, onClick }) => {
  return (
    <div
      onClick={onClick}
      style={agentItemStyle(isSelected)}
    >
      <div style={agentItemHeaderStyle}>
        <h4 style={agentNameStyle(isSelected)}>
          {agent.name}
        </h4>
        <AgentStatusBadge agent={agent} />
      </div>
      <div style={agentMetaStyle(isSelected)}>
        {agent.model_provider} - {agent.model_name}
      </div>
      <div style={agentMetaStyle(isSelected)}>
        Modified {formatDate(agent.updated_at)}
      </div>
      <div style={agentMetaStyle(isSelected)}>
        Used {agent.usage_count} times
      </div>
    </div>
  );
};

const EmptyAgentList: React.FC<{ onCreateAgent: () => void }> = ({ onCreateAgent }) => {
  return (
    <div style={{ ...emptyStateStyle, padding: '2rem 1rem' }}>
      <div style={emptyStateIconStyle}>🤖</div>
      <h3 style={{ fontSize: '1rem', margin: '0.5rem 0' }}>No agents yet</h3>
      <p style={{ fontSize: '0.875rem', margin: '0.5rem 0 1rem 0', color: 'var(--text-muted)' }}>
        Create your first agent to get started.
      </p>
      <button onClick={onCreateAgent} style={{ fontSize: '0.875rem' }}>
        Create Agent
      </button>
    </div>
  );
};

export const AgentSidebar: React.FC<AgentSidebarProps> = ({
  agents,
  selectedAgent,
  loading,
  sidebarOpen,
  onSelectAgent,
  onCreateAgent,
  onToggleStatus,
  onDuplicate,
  onDelete
}) => {
  if (!sidebarOpen) return null;

  return (
    <div style={sidebarStyle(sidebarOpen)}>
      {/* Header */}
      <div style={sidebarHeaderStyle}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600' }}>
          My Agents
        </h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {agents.length} agents created
        </p>
      </div>

      {/* Agent List */}
      <div style={sidebarListStyle}>
        {agents.map((agent) => (
          <AgentItem
            key={agent.id}
            agent={agent}
            isSelected={selectedAgent === agent.id.toString()}
            onClick={() => onSelectAgent(agent.id.toString())}
          />
        ))}

        {/* Empty State */}
        {agents.length === 0 && !loading && (
          <EmptyAgentList onCreateAgent={onCreateAgent} />
        )}
      </div>

      {/* Footer Actions */}
      {selectedAgent && (
        <div style={sidebarFooterStyle}>
          <AgentActions
            selectedAgent={selectedAgent}
            agents={agents}
            onToggleStatus={onToggleStatus}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
  );
}; 