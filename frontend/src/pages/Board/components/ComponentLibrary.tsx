import React, { useState } from 'react';

interface ComponentLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onComponentDrop?: (componentData: any) => void;
}

export const ComponentLibrary: React.FC<ComponentLibraryProps> = ({ 
  isOpen, 
  onClose, 
  onComponentDrop 
}) => {
  // Collapsible sections state - Core expanded by default, others collapsed
  const [collapsedSections, setCollapsedSections] = useState<{[key: string]: boolean}>({
    'core': false,          // Core & Triggers expanded by default
    'ai': true,             // AI collapsed by default
    'flow': true,           // Flow Control collapsed by default
    'communication': true,  // Communication collapsed by default
    'data': true,           // Data Processing collapsed by default
    'social': true,         // Social Media collapsed by default
    'logic': true           // Logic & General collapsed by default
  });

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  if (!isOpen) return null;

  const renderSectionHeader = (
    sectionKey: string, 
    title: string, 
    icon: string, 
    iconColor: string,
    itemCount: number
  ) => (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        padding: '8px',
        borderRadius: '8px',
        transition: 'all 0.2s ease',
        background: collapsedSections[sectionKey] ? 'rgba(102, 126, 234, 0.05)' : 'rgba(102, 126, 234, 0.1)',
        border: `1px solid ${collapsedSections[sectionKey] ? 'rgba(102, 126, 234, 0.1)' : 'rgba(102, 126, 234, 0.2)'}`,
        marginBottom: '8px'
      }}
      onClick={() => toggleSection(sectionKey)}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(102, 126, 234, 0.15)';
        e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = collapsedSections[sectionKey] ? 'rgba(102, 126, 234, 0.05)' : 'rgba(102, 126, 234, 0.1)';
        e.currentTarget.style.borderColor = collapsedSections[sectionKey] ? 'rgba(102, 126, 234, 0.1)' : 'rgba(102, 126, 234, 0.2)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <i className={icon} style={{ color: iconColor, fontSize: '14px' }}></i>
        <h4 style={{
          margin: 0,
          fontSize: '13px',
          fontWeight: '600',
          color: '#495057',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {title}
        </h4>
        <span style={{
          background: iconColor + '20',
          color: iconColor,
          borderRadius: '12px',
          padding: '2px 6px',
          fontSize: '10px',
          fontWeight: '600'
        }}>
          {itemCount}
        </span>
      </div>
      <i 
        className={collapsedSections[sectionKey] ? "fas fa-chevron-right" : "fas fa-chevron-down"} 
        style={{ 
          color: '#667eea', 
          fontSize: '12px',
          transition: 'transform 0.2s ease'
        }}
      ></i>
    </div>
  );

  const renderComponent = (component: any) => (
    <div
      key={component.type}
      draggable
      style={{
        padding: '8px',
        background: 'white',
        border: `2px solid ${component.color}20`,
        borderRadius: '6px',
        cursor: 'grab',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = `0 4px 12px ${component.color}30`;
        e.currentTarget.style.borderColor = component.color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = `${component.color}20`;
      }}
      onDragStart={(e) => {
        e.currentTarget.style.cursor = 'grabbing';
        e.dataTransfer.setData('text/plain', JSON.stringify({
          type: component.type,
          label: component.label,
          color: component.color,
          icon: component.icon
        }));
        console.log('🎯 Starting drag:', component.label);
      }}
      onDragEnd={(e) => {
        e.currentTarget.style.cursor = 'grab';
      }}
    >
      <i className={component.icon} style={{ fontSize: '14px', color: component.color, width: '16px' }}></i>
      <div style={{
        fontSize: '12px',
        fontWeight: '500',
        color: '#2c3e50'
      }}>
        {component.label}
      </div>
    </div>
  );

  // Component Data
  const coreComponents = [
    { type: 'webhook', label: 'Webhook', color: '#8e44ad', icon: 'fas fa-play' },
    { type: 'http', label: 'HTTP Request', color: '#0077cc', icon: 'fas fa-bolt' },
    { type: 'wait', label: 'Wait', color: '#ab47bc', icon: 'fas fa-clock' },
    { type: 'execution-data', label: 'Execution Data', color: '#00bcd4', icon: 'fas fa-database' },
    { type: 'ftp', label: 'FTP', color: '#7986cb', icon: 'fas fa-upload' },
    { type: 'no-operation', label: 'No Operation', color: '#bdbdbd', icon: 'fas fa-ban' },
    { type: 'Dpro-form', label: 'Dpro Form', color: '#26a69a', icon: 'fas fa-wpforms' },
    { type: 'respond-to-webhook', label: 'Respond to Webhook', color: '#8e44ad', icon: 'fas fa-reply' },
    { type: 'execute-sub-workflow', label: 'Execute Sub-workflow', color: '#ff7043', icon: 'fas fa-project-diagram' },
    { type: 'flow', label: 'Flow Control', color: '#42a5f5', icon: 'fas fa-stream' }
  ];

  const aiComponents = [
    { type: 'ai', label: 'AI Prompt', color: '#ff5e57', icon: 'fas fa-robot' },
    { type: 'AI-agent', label: 'AI Agent', color: '#6c47ff', icon: 'fas fa-robot' },
    { type: 'OpenAI-Agent', label: 'OpenAI Agent', color: '#6c47ff', icon: 'fas fa-brain' },
    { type: 'ai-transform', label: 'AI Transform', color: '#a259f7', icon: 'fas fa-magic' },
    { type: 'code-transform', label: 'Code Transform', color: '#f39c12', icon: 'fas fa-code' }
  ];

  const flowComponents = [
    { type: 'if', label: 'If Condition', color: '#43a047', icon: 'fas fa-question-circle' },
    { type: 'switch', label: 'Switch', color: '#42a5f5', icon: 'fas fa-random' },
    { type: 'loop-batch', label: 'Loop Over Items', color: '#26c6da', icon: 'fas fa-redo' },
    { type: 'merge', label: 'Merge', color: '#00bcd4', icon: 'fas fa-code-branch' },
    { type: 'filter', label: 'Filter', color: '#00bfae', icon: 'fas fa-filter' },
    { type: 'stop-error', label: 'Stop and Error', color: '#e53935', icon: 'fas fa-exclamation-triangle' },
    { type: 'compare-datasets', label: 'Compare Datasets', color: '#43e047', icon: 'fas fa-not-equal' },
    { type: 'wait-flow', label: 'Wait Flow', color: '#ab47bc', icon: 'fas fa-pause' }
  ];

  const communicationComponents = [
    { type: 'send-email', label: 'Send Email', color: '#43A047', icon: 'fas fa-envelope' },
    { type: 'gmail', label: 'Gmail', color: '#EA4335', icon: 'fab fa-google' },
    { type: 'microsoft-outlook', label: 'Microsoft Outlook', color: '#0072C6', icon: 'fab fa-microsoft' },
    { type: 'slack', label: 'Slack', color: '#4A154B', icon: 'fab fa-slack' },
    { type: 'microsoft-teams', label: 'Microsoft Teams', color: '#6264A7', icon: 'fab fa-microsoft' },
    { type: 'discord', label: 'Discord', color: '#5865F2', icon: 'fab fa-discord' },
    { type: 'telegram', label: 'Telegram', color: '#0088cc', icon: 'fab fa-telegram' },
    { type: 'whatsapp-business-cloud', label: 'WhatsApp Business', color: '#25D366', icon: 'fab fa-whatsapp' },
    { type: 'google-chat', label: 'Google Chat', color: '#34A853', icon: 'fab fa-google' }
  ];

  const dataComponents = [
    { type: 'edit-fields', label: 'Edit Fields', color: '#6c47ff', icon: 'fas fa-edit' },
    { type: 'filter-transform', label: 'Filter Transform', color: '#00bfae', icon: 'fas fa-filter' },
    { type: 'sort', label: 'Sort', color: '#42a5f5', icon: 'fas fa-sort' },
    { type: 'aggregate', label: 'Aggregate', color: '#e67e22', icon: 'fas fa-plus-circle' },
    { type: 'summarize', label: 'Summarize', color: '#f4d03f', icon: 'fas fa-chart-bar' },
    { type: 'remove-duplicates', label: 'Remove Duplicates', color: '#e74c3c', icon: 'fas fa-copy' },
    { type: 'split-out', label: 'Split Out', color: '#9b59b6', icon: 'fas fa-cut' },
    { type: 'date-time', label: 'Date & Time', color: '#27ae60', icon: 'fas fa-calendar' },
    { type: 'limit', label: 'Limit', color: '#009688', icon: 'fas fa-stop' },
    { type: 'compression', label: 'Compression', color: '#27ae60', icon: 'fas fa-file-archive' },
    { type: 'convert-to-file', label: 'Convert to File', color: '#8e44ad', icon: 'fas fa-file-export' },
    { type: 'extract-from-file', label: 'Extract from File', color: '#5dade2', icon: 'fas fa-file-import' },
    { type: 'crypto', label: 'Crypto', color: '#16a085', icon: 'fas fa-key' },
    { type: 'edit-image', label: 'Edit Image', color: '#9b59b6', icon: 'fas fa-image' },
    { type: 'html', label: 'HTML', color: '#e67e22', icon: 'fab fa-html5' },
    { type: 'markdown', label: 'Markdown', color: '#95a5a6', icon: 'fab fa-markdown' },
    { type: 'xml', label: 'XML', color: '#6c47ff', icon: 'fas fa-code' },
    { type: 'rename-keys', label: 'Rename Keys', color: '#e57373', icon: 'fas fa-i-cursor' },
    { type: 'merge-data-transformation', label: 'Merge Data', color: '#00bcd4', icon: 'fas fa-compress-arrows-alt' }
  ];

  const socialComponents = [
    { type: 'facebook', label: 'Facebook', color: '#1877f3', icon: 'fab fa-facebook' },
    { type: 'twitter', label: 'Twitter', color: '#1da1f2', icon: 'fab fa-twitter' },
    { type: 'linkedin', label: 'LinkedIn', color: '#0077b5', icon: 'fab fa-linkedin' },
    { type: 'instagram', label: 'Instagram', color: '#E4405F', icon: 'fab fa-instagram' }
  ];

  const logicComponents = [
    { type: 'task', label: 'Task', color: '#f39c12', icon: 'fas fa-tasks' },
    { type: 'condition', label: 'Condition', color: '#e74c3c', icon: 'fas fa-question' },
    { type: 'action', label: 'Action', color: '#2ecc71', icon: 'fas fa-play' },
    { type: 'sticky-note', label: 'Sticky Note', color: '#f1c40f', icon: 'fas fa-sticky-note' }
  ];

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderRight: '1px solid rgba(102, 126, 234, 0.2)',
      boxShadow: '4px 0 20px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        flexShrink: 0
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px'
        }}>
          <h3 style={{
            margin: 0,
            color: 'white',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            <i className="fas fa-cubes" style={{ marginRight: '8px' }}></i>
            Component Library
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              padding: '4px 6px',
              fontSize: '12px'
            }}
          >
            ✕
          </button>
        </div>
        <p style={{
          margin: 0,
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '12px'
        }}>
          Drag components to build your workflow • 59 components
        </p>
      </div>

      {/* Categories - Scrollable */}
      <div style={{
        flex: 1,
        padding: '16px',
        overflow: 'auto',
        scrollbarWidth: 'thin',
        scrollbarColor: '#667eea rgba(0,0,0,0.1)'
      }}>

        {/* Core & Triggers Category */}
        <div style={{ marginBottom: '16px' }}>
          {renderSectionHeader('core', 'Core & Triggers', 'fas fa-rocket', '#667eea', 10)}
          {!collapsedSections['core'] && (
            <div style={{ display: 'grid', gap: '6px', animation: 'slideDown 0.3s ease' }}>
              {coreComponents.map(renderComponent)}
            </div>
          )}
        </div>

        {/* AI & Intelligence Category */}
        <div style={{ marginBottom: '16px' }}>
          {renderSectionHeader('ai', 'AI & Intelligence', 'fas fa-robot', '#ff5e57', 5)}
          {!collapsedSections['ai'] && (
            <div style={{ display: 'grid', gap: '6px', animation: 'slideDown 0.3s ease' }}>
              {aiComponents.map(renderComponent)}
            </div>
          )}
        </div>

        {/* Flow Control Category */}
        <div style={{ marginBottom: '16px' }}>
          {renderSectionHeader('flow', 'Flow Control', 'fas fa-random', '#42a5f5', 8)}
          {!collapsedSections['flow'] && (
            <div style={{ display: 'grid', gap: '6px', animation: 'slideDown 0.3s ease' }}>
              {flowComponents.map(renderComponent)}
            </div>
          )}
        </div>

        {/* Communication Category */}
        <div style={{ marginBottom: '16px' }}>
          {renderSectionHeader('communication', 'Communication', 'fas fa-comments', '#43A047', 9)}
          {!collapsedSections['communication'] && (
            <div style={{ display: 'grid', gap: '6px', animation: 'slideDown 0.3s ease' }}>
              {communicationComponents.map(renderComponent)}
            </div>
          )}
        </div>

        {/* Data Processing Category */}
        <div style={{ marginBottom: '16px' }}>
          {renderSectionHeader('data', 'Data Processing', 'fas fa-database', '#6c47ff', 19)}
          {!collapsedSections['data'] && (
            <div style={{ display: 'grid', gap: '6px', animation: 'slideDown 0.3s ease' }}>
              {dataComponents.map(renderComponent)}
            </div>
          )}
        </div>

        {/* Social Media Category */}
        <div style={{ marginBottom: '16px' }}>
          {renderSectionHeader('social', 'Social Media', 'fab fa-facebook', '#1877f3', 4)}
          {!collapsedSections['social'] && (
            <div style={{ display: 'grid', gap: '6px', animation: 'slideDown 0.3s ease' }}>
              {socialComponents.map(renderComponent)}
            </div>
          )}
        </div>

        {/* Logic & General Category */}
        <div style={{ marginBottom: '16px' }}>
          {renderSectionHeader('logic', 'Logic & General', 'fas fa-cogs', '#f39c12', 4)}
          {!collapsedSections['logic'] && (
            <div style={{ display: 'grid', gap: '6px', animation: 'slideDown 0.3s ease' }}>
              {logicComponents.map(renderComponent)}
            </div>
          )}
        </div>

      </div>

      {/* Collapse All / Expand All Controls */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(102, 126, 234, 0.1)',
        background: 'rgba(255, 255, 255, 0.8)',
        flexShrink: 0,
        display: 'flex',
        gap: '8px'
      }}>
        <button
          onClick={() => setCollapsedSections({
            'core': false, 'ai': false, 'flow': false, 'communication': false, 
            'data': false, 'social': false, 'logic': false
          })}
          style={{
            flex: 1,
            background: 'rgba(102, 126, 234, 0.1)',
            border: '1px solid rgba(102, 126, 234, 0.3)',
            borderRadius: '6px',
            padding: '6px 8px',
            cursor: 'pointer',
            fontSize: '11px',
            color: '#667eea',
            fontWeight: '500'
          }}
        >
          <i className="fas fa-expand-alt"></i> Expand All
        </button>
        <button
          onClick={() => setCollapsedSections({
            'core': true, 'ai': true, 'flow': true, 'communication': true, 
            'data': true, 'social': true, 'logic': true
          })}
          style={{
            flex: 1,
            background: 'rgba(102, 126, 234, 0.1)',
            border: '1px solid rgba(102, 126, 234, 0.3)',
            borderRadius: '6px',
            padding: '6px 8px',
            cursor: 'pointer',
            fontSize: '11px',
            color: '#667eea',
            fontWeight: '500'
          }}
        >
          <i className="fas fa-compress-alt"></i> Collapse All
        </button>
      </div>

      {/* CSS Animation */}
      <style>
        {`
          @keyframes slideDown {
            from {
              opacity: 0;
              max-height: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              max-height: 1000px;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
}; 