import React, { useState } from 'react';
import type { BaseNodeData } from './nodeTypes';
import { MIN_ZOOM, MAX_ZOOM } from './utils/constants';

// Local validation function
const validateWorkflowLocally = (nodes: BaseNodeData[], edges: unknown[]) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic validation
  if (nodes.length === 0) {
    errors.push('Workflow must have at least one node');
  }

  if (edges.length === 0 && nodes.length > 1) {
    warnings.push('Nodes are not connected');
  }

  // Check for required node properties
  nodes.forEach((node) => {
    if (!node.id) {
      errors.push('All nodes must have an ID');
    }
    if (!node.type) {
      errors.push(`Node ${node.id} must have a type`);
    }
  });

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
    node_count: nodes.length,
    edge_count: Array.isArray(edges) ? edges.length : 0,
  };
};

interface BoardToolbarProps {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  onToggleSidebar: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomIn: () => void;
  onToggleTheme: () => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenHelp: () => void;
  onExecute?: () => void;
  onSave?: () => void;
  onResetTrigger?: () => void;
  onAddNode?: (nodeType: string) => void;
  onLoad?: () => void;
  onClear?: () => void;
  onZoomFit?: () => void;
  saveStatus?: string;
  nodeCount?: number;
  edgeCount?: number;
  isWorkflowRunning?: boolean;
  currentBoard?: {
    id: string;
    nodes: BaseNodeData[];
    edges: unknown[];
  };
  agentId?: number;
  onExecuteWorkflow?: () => void;
  onStopWorkflow?: () => void;
  onValidateWorkflow?: () => void;
  onSimulateWorkflow?: () => void;
}

export const BoardToolbar: React.FC<BoardToolbarProps> = ({
  theme,
  sidebarOpen,
  canUndo,
  canRedo,
  zoom,
  onToggleSidebar,
  onUndo,
  onRedo,
  onZoomOut,
  onZoomReset,
  onZoomIn,
  onToggleTheme,
  onExport,
  onImport,
  onOpenHelp,
  onExecute,
  onSave,
  onResetTrigger,
  onAddNode,
  onLoad,
  onClear,
  onZoomFit,
  saveStatus,
  nodeCount = 0,
  edgeCount = 0,
  isWorkflowRunning = false,
  currentBoard,
  agentId,
  onExecuteWorkflow,
  onStopWorkflow,
  onValidateWorkflow,
  onSimulateWorkflow
}) => {
  const [validationStatus, setValidationStatus] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);

  // Validate workflow locally
  const handleValidateWorkflow = async () => {
    if (!currentBoard) {
      alert('⚠️ No board data available for validation');
      return;
    }

    setIsValidating(true);
    setValidationStatus('Validating...');

    try {
      // Local validation first
      const localValidation = validateWorkflowLocally(
        currentBoard.nodes,
        currentBoard.edges
      );

      if (localValidation.is_valid) {
        setValidationStatus('✅ Valid');
        
        // Show validation results
        const message = `✅ Workflow validation passed!\n\nNodes: ${localValidation.node_count}\nEdges: ${localValidation.edge_count}\n\nWarnings: ${localValidation.warnings.length > 0 ? localValidation.warnings.join('\n') : 'None'}`;
        alert(message);
      } else {
        setValidationStatus('❌ Invalid');
        
        // Show validation errors
        const message = `❌ Workflow validation failed!\n\nErrors:\n${localValidation.errors.join('\n')}\n\nWarnings:\n${localValidation.warnings.join('\n')}`;
        alert(message);
      }

      if (onValidateWorkflow) {
        onValidateWorkflow();
      }
    } catch (error) {
      console.error('❌ Validation error:', error);
      setValidationStatus('❌ Error');
      alert('❌ Validation failed. Please try again.');
    } finally {
      setIsValidating(false);
      // Clear status after 3 seconds
      setTimeout(() => setValidationStatus(''), 3000);
    }
  };

  // Execute workflow
  const handleExecuteWorkflow = async () => {
    if (!currentBoard || !agentId) {
      alert('⚠️ Missing board or agent information for execution');
      return;
    }

    // Validate before execution
    const validation = validateWorkflowLocally(
      currentBoard.nodes,
      currentBoard.edges
    );

    if (!validation.is_valid) {
      const confirmMessage = `❌ Workflow has validation errors:\n\n${validation.errors.join('\n')}\n\nDo you want to continue anyway?`;
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    if (onExecuteWorkflow) {
      onExecuteWorkflow();
    }
  };

  // Simulate workflow (demo mode)
  const handleSimulateWorkflow = () => {
    if (!currentBoard || currentBoard.nodes.length === 0) {
      alert('⚠️ No nodes to simulate. Add some nodes to the board first.');
      return;
    }

    if (onSimulateWorkflow) {
      onSimulateWorkflow();
    }
  };

  // Enhanced styles with modern design
  const toolbarStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    background: theme === 'dark' 
      ? 'linear-gradient(135deg, rgba(45, 45, 45, 0.95), rgba(30, 30, 30, 0.95))'
      : 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(102, 126, 234, 0.1)'}`,
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)',
    zIndex: 90,
    flexWrap: 'wrap' as const,
    gap: '12px',
    minHeight: '60px',
  };

  const buttonStyle = {
    background: theme === 'dark' 
      ? 'rgba(255, 255, 255, 0.1)' 
      : 'rgba(102, 126, 234, 0.08)',
    border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(102, 126, 234, 0.2)'}`,
    borderRadius: '8px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: theme === 'dark' ? '#ffffff' : '#495057',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap' as const,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
  };

  const iconOnlyButtonStyle = {
    ...buttonStyle,
    padding: '10px',
    minWidth: '40px',
    justifyContent: 'center',
  };

  const separatorStyle = {
    width: '1px',
    height: '24px',
    background: theme === 'dark' 
      ? 'rgba(255, 255, 255, 0.2)' 
      : 'rgba(102, 126, 234, 0.2)',
    margin: '0 8px',
  };

  const leftSectionStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flex: 1,
    minWidth: '200px',
  };

  const centerSectionStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
  };

  const rightSectionStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
  };

  const zoomDisplayStyle = {
    padding: '6px 12px',
    background: theme === 'dark' 
      ? 'rgba(255, 255, 255, 0.05)' 
      : 'rgba(102, 126, 234, 0.05)',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: theme === 'dark' ? '#ffffff' : '#667eea',
    border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(102, 126, 234, 0.1)'}`,
    minWidth: '60px',
    textAlign: 'center' as const,
  };

  return (
    <>
      <style>{`
        .toolbar-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2) !important;
          border-color: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.4)' : '#667eea'} !important;
        }
        
        .primary-button:hover {
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4) !important;
          transform: translateY(-1px);
        }
        
        .toolbar-button:active {
          transform: translateY(0);
        }
        
        .file-input-hidden {
          display: none;
        }
        
        @media (max-width: 768px) {
          .toolbar-responsive {
            padding: 8px 16px !important;
            min-height: auto !important;
          }
          
          .toolbar-section {
            gap: 6px !important;
          }
          
          .toolbar-button-text {
            display: none !important;
          }
          
          .zoom-section {
            order: 999;
            width: 100%;
            justify-content: center;
            margin-top: 8px;
          }
        }
        
        @media (max-width: 480px) {
          .toolbar-center-section {
            display: none !important;
          }
        }
      `}</style>

      <div className="toolbar-responsive" style={toolbarStyle}>
        {/* Left Section - Sidebar Toggle & Title */}
        <div className="toolbar-section" style={leftSectionStyle}>
          <button
            onClick={onToggleSidebar}
            className="toolbar-button"
            style={{
              ...primaryButtonStyle,
              opacity: sidebarOpen || onToggleSidebar.toString().includes('{}') ? 0.6 : 1,
              cursor: onToggleSidebar.toString().includes('{}') ? 'not-allowed' : 'pointer'
            }}
            title={
              onToggleSidebar.toString().includes('{}') 
                ? 'Select a start trigger first to access components' 
                : sidebarOpen 
                ? 'Close sidebar' 
                : 'Open component library'
            }
          >
            <span style={{ fontSize: '16px' }}>
              {onToggleSidebar.toString().includes('{}') ? '🔒' : sidebarOpen ? '⏮️' : '📚'}
            </span>
            <span className="toolbar-button-text">
              {onToggleSidebar.toString().includes('{}') ? 'Locked' : sidebarOpen ? 'Close' : 'Components'}
            </span>
          </button>
          
          <div style={separatorStyle} />
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: theme === 'dark' ? '#ffffff' : '#495057',
          }}>
            <span style={{ fontSize: '16px' }}>⚡</span>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '600',
              whiteSpace: 'nowrap',
            }}>
              Workflow Builder
            </span>
          </div>
        </div>

        {/* Center Section - Main Controls */}
        <div className="toolbar-section toolbar-center-section" style={centerSectionStyle}>
          {/* Undo/Redo */}
          <button 
            onClick={onUndo} 
            disabled={!canUndo}
            className="toolbar-button"
            style={{ 
              ...buttonStyle, 
              opacity: canUndo ? 1 : 0.5,
              cursor: canUndo ? 'pointer' : 'not-allowed',
            }}
            title="Undo (Ctrl+Z)"
          >
            <span>↶</span>
            <span className="toolbar-button-text">Undo</span>
          </button>
          
          <button 
            onClick={onRedo} 
            disabled={!canRedo}
            className="toolbar-button"
            style={{ 
              ...buttonStyle, 
              opacity: canRedo ? 1 : 0.5,
              cursor: canRedo ? 'pointer' : 'not-allowed',
            }}
            title="Redo (Ctrl+Y)"
          >
            <span>↷</span>
            <span className="toolbar-button-text">Redo</span>
          </button>
          
          <div style={separatorStyle} />
          
          {/* Execute Button */}
          {onExecute && (
            <>
              <button 
                onClick={handleExecuteWorkflow}
                disabled={nodeCount === 0}
                className="toolbar-button primary-button"
                style={primaryButtonStyle}
                title="Execute workflow with real backend"
              >
                <span>▶️</span>
                <span className="toolbar-button-text">Execute</span>
              </button>
              
              <div style={separatorStyle} />
            </>
          )}
          
          {/* Zoom Controls */}
          <div className="zoom-section" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button 
              onClick={handleSimulateWorkflow}
              disabled={nodeCount === 0}
              className="toolbar-button"
              style={{ 
                ...iconOnlyButtonStyle,
                opacity: nodeCount === 0 ? 0.5 : 1,
                cursor: nodeCount === 0 ? 'not-allowed' : 'pointer',
              }}
              title="Simulate workflow execution (demo mode)"
            >
              <span>🎮</span>
            </button>
            
            <div style={zoomDisplayStyle} title="Current zoom level">
              {Math.round(zoom * 100)}%
            </div>
            
            <button 
              onClick={onZoomReset}
              className="toolbar-button"
              style={iconOnlyButtonStyle}
              title="Reset zoom to 100%"
            >
              🎯
            </button>
            
            <button 
              onClick={onZoomIn}
              disabled={zoom >= MAX_ZOOM}
              className="toolbar-button"
              style={{ 
                ...iconOnlyButtonStyle,
                opacity: zoom >= MAX_ZOOM ? 0.5 : 1,
                cursor: zoom >= MAX_ZOOM ? 'not-allowed' : 'pointer',
              }}
              title="Zoom in"
            >
              🔍+
            </button>
          </div>
        </div>

        {/* Right Section - Actions & Settings */}
        <div className="toolbar-section" style={rightSectionStyle}>
          {/* Theme Toggle */}
          <button 
            onClick={onToggleTheme}
            className="toolbar-button"
            style={iconOnlyButtonStyle}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          
          <div style={separatorStyle} />
          
          {/* Save Button */}
          {onSave && (
            <button 
              onClick={onSave}
              className="toolbar-button primary-button"
              style={primaryButtonStyle}
              title="Save workflow to server"
            >
              <span>💾</span>
              <span className="toolbar-button-text">Save</span>
            </button>
          )}
          
          {/* Export/Import */}
          <button 
            onClick={onExport}
            className="toolbar-button"
            style={buttonStyle}
            title="Export workflow"
          >
            <span>📤</span>
            <span className="toolbar-button-text">Export</span>
          </button>
          
          <label className="toolbar-button" style={{ ...buttonStyle, cursor: 'pointer' }} title="Import workflow">
            <span>📁</span>
            <span className="toolbar-button-text">Import</span>
            <input 
              type="file" 
              accept=".json" 
              className="file-input-hidden"
              onChange={onImport} 
            />
          </label>
          
          <div style={separatorStyle} />
          
          {/* Reset Trigger (for advanced users) */}
          {onResetTrigger && (
            <button 
              onClick={onResetTrigger}
              className="toolbar-button"
              style={buttonStyle}
              title="Reset start trigger selection - This will show the trigger selection modal again"
            >
              <span>🔄</span>
              <span className="toolbar-button-text">Reset</span>
            </button>
          )}
          
          {/* Help */}
          <button 
            onClick={onOpenHelp}
            className="toolbar-button primary-button"
            style={primaryButtonStyle}
            title="Show keyboard shortcuts and help"
          >
            <span>❓</span>
            <span className="toolbar-button-text">Help</span>
          </button>
        </div>
      </div>
    </>
  );
}; 