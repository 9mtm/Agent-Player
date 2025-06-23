import React, { useState, useRef, useEffect } from 'react';
import { NODE_TYPES } from './nodeTypes';
import type { NodeTypeDef } from './nodeTypes';
import { getNodeShape } from './nodeShapes';
import { 
  type NodeState, 
  getNodeStateConfig, 
  getNodeStateClass,
  NODE_ANIMATIONS_CSS 
} from './nodeStates';

export interface BoardNodeData {
  id: string;
  x: number;
  y: number;
  label: string;
  type: string;
  inputs?: { id: string; label?: string }[];
  outputs?: { id: string; label?: string }[];
  width?: number;
  height?: number;
  triggerType?: string;
  // New state properties
  state?: NodeState;
  progress?: number; // 0-100 for processing state
  executionTime?: number; // milliseconds
  lastExecuted?: Date;
}

interface BoardNodeProps {
  node: BoardNodeData;
  zoom?: number;
  draggedId: string | null;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onPortMouseDown?: (e: React.MouseEvent, nodeId: string, portId: string, portType: 'output' | 'input') => void;
  onPortMouseUp?: (e: React.MouseEvent, nodeId: string, portId: string, portType: 'output' | 'input') => void;
  isSelected?: boolean;
  isPortActive?: boolean;
  onLabelDoubleClick?: () => void;
  labelInput?: string;
  onLabelInputChange?: (v: string) => void;
  onLabelInputBlur?: () => void;
  isEditingLabel?: boolean;
  onResize?: (id: string, w: number, h: number) => void;
  // New props for workflow execution
  isWorkflowActive?: boolean;
  onStateChange?: (nodeId: string, action: string) => void;
}

const PORT_SIZE = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--port-size')) || 16;

// Add animations CSS to the document
const addAnimationStyles = () => {
  if (!document.getElementById('node-animations')) {
    const style = document.createElement('style');
    style.id = 'node-animations';
    style.textContent = NODE_ANIMATIONS_CSS;
    document.head.appendChild(style);
  }
};

// Progress Ring Component for processing nodes
const ProgressRing: React.FC<{ progress: number; size: number }> = ({ progress, size }) => {
  const radius = (size - 4) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      style={{
        position: 'absolute',
        top: -2,
        left: -2,
        transform: 'rotate(-90deg)',
        zIndex: 10
      }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="2"
        fill="transparent"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#ffffff"
        strokeWidth="3"
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{
          transition: 'stroke-dashoffset 0.3s ease',
          filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.8))'
        }}
      />
    </svg>
  );
};

// State Indicator Component
const StateIndicator: React.FC<{ state: NodeState; size: number }> = ({ state, size }) => {
  const getStateIcon = (state: NodeState): string => {
    const icons = {
      idle: 'fas fa-circle',
      pending: 'fas fa-clock',
      processing: 'fas fa-cog fa-spin',
      completed: 'fas fa-check-circle',
      error: 'fas fa-exclamation-triangle',
      warning: 'fas fa-exclamation-circle',
      paused: 'fas fa-pause-circle',
      skipped: 'fas fa-step-forward'
    };
    return icons[state];
  };

  const getStateColor = (state: NodeState): string => {
    const colors = {
      idle: '#9e9e9e',
      pending: '#2196f3',
      processing: '#ff9800',
      completed: '#4caf50',
      error: '#f44336',
      warning: '#ff9800',
      paused: '#9e9e9e',
      skipped: '#bdbdbd'
    };
    return colors[state];
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: -8,
        right: -8,
        width: size,
        height: size,
        borderRadius: '50%',
        background: getStateColor(state),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        zIndex: 15,
        border: '2px solid white'
      }}
    >
      <i 
        className={getStateIcon(state)}
        style={{
          color: 'white',
          fontSize: size * 0.4,
          textShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }}
      />
    </div>
  );
};

// NodeToolbar component with state controls
const NodeToolbar: React.FC<{
  onDelete: () => void;
  onDuplicate: () => void;
  onStateChange?: (action: string) => void;
  currentState: NodeState;
  style?: React.CSSProperties;
}> = ({ onDelete, onDuplicate, onStateChange, currentState, style }) => {
  const btnRefs = [useRef<HTMLButtonElement>(null), useRef<HTMLButtonElement>(null), useRef<HTMLButtonElement>(null)];
  
  const getStateActions = (state: NodeState): { action: string; icon: string; title: string }[] => {
    const actions = {
      idle: [{ action: 'start', icon: 'fas fa-play', title: 'Start' }],
      pending: [
        { action: 'process', icon: 'fas fa-cog', title: 'Process' },
        { action: 'pause', icon: 'fas fa-pause', title: 'Pause' }
      ],
      processing: [
        { action: 'complete', icon: 'fas fa-check', title: 'Complete' },
        { action: 'error', icon: 'fas fa-times', title: 'Error' }
      ],
      completed: [{ action: 'reset', icon: 'fas fa-redo', title: 'Reset' }],
      error: [
        { action: 'retry', icon: 'fas fa-redo', title: 'Retry' },
        { action: 'reset', icon: 'fas fa-stop', title: 'Reset' }
      ],
      warning: [{ action: 'continue', icon: 'fas fa-play', title: 'Continue' }],
      paused: [{ action: 'resume', icon: 'fas fa-play', title: 'Resume' }],
      skipped: [{ action: 'activate', icon: 'fas fa-play', title: 'Activate' }]
    };
    return actions[state] || [];
  };

  const stateActions = getStateActions(currentState);

  return (
    <div
      role="toolbar"
      aria-label="Node actions"
      style={{
        position: 'absolute',
        left: '50%',
        top: -45,
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 4,
        background: 'rgba(255,255,255,0.95)',
        border: '1.5px solid #ddd',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        padding: '6px 8px',
        zIndex: 25,
        backdropFilter: 'blur(10px)',
        ...style,
      }}
      tabIndex={-1}
    >
      {/* State action buttons */}
      {stateActions.map((stateAction) => (
        <button
          key={stateAction.action}
          onClick={() => onStateChange?.(stateAction.action)}
          title={stateAction.title}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 4,
            padding: '4px 6px',
            color: '#2196f3',
            fontSize: '12px',
            transition: 'all 0.2s ease'
          }}
        >
          <i className={stateAction.icon} />
        </button>
      ))}
      
      {/* Separator */}
      {stateActions.length > 0 && (
        <div style={{ width: '1px', background: '#ddd', margin: '2px 4px' }} />
      )}

      {/* Standard buttons */}
      <button
        ref={btnRefs[0]}
        onClick={onDuplicate}
        title="Duplicate node"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          borderRadius: 4,
          padding: '4px 6px',
          color: '#2196f3',
          fontSize: '12px'
        }}
      >
        <i className="fas fa-copy" />
      </button>
      <button
        ref={btnRefs[1]}
        onClick={onDelete}
        title="Delete node"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          borderRadius: 4,
          padding: '4px 6px',
          color: '#f44336',
          fontSize: '12px'
        }}
      >
        <i className="fas fa-trash" />
      </button>
    </div>
  );
};

const BoardNode: React.FC<BoardNodeProps & {
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}> = ({ 
  node, 
  zoom = 1, 
  draggedId, 
  onMouseDown, 
  onPortMouseDown, 
  onPortMouseUp, 
  isSelected, 
  isPortActive, 
  onLabelDoubleClick, 
  labelInput, 
  onLabelInputChange, 
  onLabelInputBlur, 
  isEditingLabel, 
  onResize, 
  onDelete, 
  onDuplicate,
  isWorkflowActive = false,
  onStateChange
}) => {
  const nodeType: NodeTypeDef | undefined = NODE_TYPES.find(n => n.type === node.type);
  const inputs = node.inputs || [{ id: 'input', label: '' }];
  const outputs = node.outputs || [{ id: 'output', label: '' }];
  const isSticky = node.type === 'note';
  
  // Node state management
  const currentState = node.state || 'idle';
  const stateConfig = getNodeStateConfig(currentState);
  const stateClass = getNodeStateClass(currentState);
  
  // Add animation styles on mount
  useEffect(() => {
    addAnimationStyles();
  }, []);

  // Get dynamic shape and styling
  const nodeShape = getNodeShape(node.type);
  
  const getNodeDimension = (dimension: number | string, defaultValue: number): number => {
    if (typeof dimension === 'number') return dimension;
    const numericValue = parseInt(String(dimension));
    return isNaN(numericValue) ? defaultValue : numericValue;
  };
  
  const width = isSticky 
    ? (node.width || 160) 
    : getNodeDimension(nodeShape.base.width, 120) * zoom;
  const height = isSticky 
    ? (node.height || 80) 
    : getNodeDimension(nodeShape.base.height, 60) * zoom;

  // Handle resize for sticky note
  const resizing = React.useRef(false);
  const start = React.useRef<{x: number, y: number, w: number, h: number} | null>(null);
  
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    resizing.current = true;
    start.current = { x: e.clientX, y: e.clientY, w: width, h: height };
    window.addEventListener('mousemove', handleResizeMouseMove);
    window.addEventListener('mouseup', handleResizeMouseUp);
  };
  
  const handleResizeMouseMove = (e: MouseEvent) => {
    if (!resizing.current || !start.current || !onResize) return;
    const dw = e.clientX - start.current.x;
    const dh = e.clientY - start.current.y;
    const newW = Math.max(80, start.current.w + dw);
    const newH = Math.max(40, start.current.h + dh);
    onResize(node.id, newW, newH);
  };
  
  const handleResizeMouseUp = () => {
    resizing.current = false;
    window.removeEventListener('mousemove', handleResizeMouseMove);
    window.removeEventListener('mouseup', handleResizeMouseUp);
  };

  const handleDragMouseDown = (e: React.MouseEvent) => {
    if (
      e.target === e.currentTarget ||
      (e.target as HTMLElement).closest('.drag-handle') ||
      (e.target as HTMLElement).closest('.node-icon') ||
      (e.target as HTMLElement).closest('.node-label')
    ) {
      onMouseDown(e, node.id);
    }
  };

  const handleStateAction = (action: string) => {
    onStateChange?.(node.id, action);
  };

  const [hovered, setHovered] = useState(false);
  
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`${stateClass} ${isWorkflowActive ? 'workflow-active' : ''}`}
      style={{
        position: 'absolute',
        left: node.x * zoom,
        top: node.y * zoom,
        width,
        height,
        display: 'flex',
        // Apply state-based styling
        background: isSticky ? '#fffbe6' : stateConfig.backgroundColor,
        color: isSticky ? '#222' : stateConfig.color,
        borderRadius: isSticky ? 14 : nodeShape.base.borderRadius,
        // Border and shadow from state config
        border: isSelected 
          ? `3px solid ${stateConfig.pulseColor || stateConfig.borderColor}` 
          : `2px solid ${stateConfig.borderColor}`,
        boxShadow: isSelected 
          ? `${stateConfig.boxShadow}, 0 0 12px ${stateConfig.pulseColor || stateConfig.borderColor}66` 
          : stateConfig.boxShadow,
        // Common styles
        justifyContent: 'flex-start',
        fontWeight: 600,
        fontSize: 16 * zoom,
        cursor: 'default',
        userSelect: 'none',
        zIndex: draggedId === node.id ? 2 : 1,
        gap: 12 * zoom,
        boxSizing: 'border-box',
        padding: isSticky ? '12px 16px' : '8px 12px',
        alignItems: isSticky ? 'flex-start' : 'center',
        overflow: isSticky ? 'auto' : 'visible',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      title={`${node.label} (${node.type}) - ${currentState}`}
      aria-label={`${node.label} node (${node.type}) - ${currentState}`}
      tabIndex={0}
    >
      {/* State Indicator */}
      <StateIndicator state={currentState} size={20} />

      {/* Progress Ring for processing nodes */}
      {currentState === 'processing' && node.progress !== undefined && (
        <ProgressRing progress={node.progress} size={Math.max(width, height) + 4} />
      )}

      {/* Drag Handle */}
      <div
        className="drag-handle"
        onMouseDown={handleDragMouseDown}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: isSticky ? '100%' : '70%',
          cursor: 'grab',
          zIndex: 1,
          background: !isSticky && hovered ? 'rgba(0,0,0,0.05)' : 'transparent',
          borderRadius: 'inherit',
        }}
        title="Drag to move node"
      />

      {/* NodeToolbar */}
      {(hovered || isSelected) && (onDelete || onDuplicate) && (
        <NodeToolbar
          onDelete={() => onDelete && onDelete(node.id)}
          onDuplicate={() => onDuplicate && onDuplicate(node.id)}
          onStateChange={handleStateAction}
          currentState={currentState}
        />
      )}

      {/* Input ports */}
      {!isSticky && (
        <div
          style={{
            position: 'absolute',
            left: -PORT_SIZE * zoom / 2,
            top: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 8 * zoom,
            zIndex: 10,
          }}>
          {inputs.map((port) => (
            <div
              key={port.id}
              style={{
                width: PORT_SIZE * zoom,
                height: PORT_SIZE * zoom,
                borderRadius: '50%',
                background: '#fff',
                border: `2px solid ${stateConfig.pulseColor || '#4a90e2'}`,
                margin: '4px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: isPortActive ? `0 0 8px ${stateConfig.pulseColor || '#1976d2'}aa` : 'none',
                transition: 'all 0.3s ease',
                zIndex: 15,
              }}
              onMouseUp={e => {
                e.stopPropagation();
                onPortMouseUp && onPortMouseUp(e, node.id, port.id, 'input');
              }}
              title={(port.label || 'Input') + ' port'}
              aria-label={(port.label || 'Input') + ' port'}
              tabIndex={0}
            >
              {port.label && <span style={{fontSize: 10 * zoom, color: stateConfig.pulseColor || '#1976d2', marginLeft: 22 * zoom, whiteSpace: 'nowrap'}}>{port.label}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Node icon */}
      <div 
        className="node-icon"
        style={{
          fontSize: isSticky ? 22 * zoom : 28 * zoom, 
          marginRight: isSticky ? 10 : 10 * zoom,
          zIndex: 5,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isSticky ? (
          <i className="fas fa-sticky-note" style={{ color: '#f39c12' }} />
        ) : (
          <i 
            className={nodeType?.icon || 'fas fa-cog'} 
            style={{ 
              color: 'inherit',
              fontSize: 'inherit',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }} 
          />
        )}
      </div>

      {/* Node label */}
      <div 
        className="node-label"
        style={{
          flex: 1, 
          minWidth: 0, 
          minHeight: 0, 
          display: 'flex', 
          alignItems: isSticky ? 'flex-start' : 'center',
          zIndex: 5,
          position: 'relative',
        }}
      >
        {isEditingLabel ? (
          isSticky ? (
            <textarea
              value={labelInput}
              autoFocus
              onChange={e => onLabelInputChange && onLabelInputChange(e.target.value)}
              onBlur={onLabelInputBlur}
              onMouseDown={e => e.stopPropagation()}
              style={{
                fontSize: 15 * zoom,
                border: '1.5px solid #ffe066',
                borderRadius: 8,
                padding: '6px 10px',
                background: '#fffde7',
                color: '#222',
                fontWeight: 500,
                outline: 'none',
                minWidth: 80,
                minHeight: 40,
                resize: 'both',
              }}
              rows={3}
            />
          ) : (
            <input
              type="text"
              value={labelInput}
              autoFocus
              onChange={e => onLabelInputChange && onLabelInputChange(e.target.value)}
              onBlur={onLabelInputBlur}
              onMouseDown={e => e.stopPropagation()}
              onKeyDown={e => { if (e.key === 'Enter') { onLabelInputBlur?.(); } }}
              style={{
                fontSize: 15 * zoom,
                border: `1.5px solid ${stateConfig.pulseColor || '#1976d2'}`,
                borderRadius: 6,
                padding: '2px 8px',
                background: '#fff',
                color: '#222',
                fontWeight: 500,
                outline: 'none',
                textAlign: 'center',
                minWidth: 60,
                maxWidth: 140,
              }}
            />
          )
        ) : (
          <span
            style={{
              cursor: 'pointer',
              userSelect: isSticky ? 'text' : 'none',
              flex: 1,
              whiteSpace: 'pre-line',
              wordBreak: 'break-word',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'block',
            }}
            onDoubleClick={onLabelDoubleClick}
          >{node.label}</span>
        )}
      </div>

      {/* Output ports */}
      {!isSticky && (
        <div
          style={{
            position: 'absolute',
            right: -PORT_SIZE * zoom / 2,
            top: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 8 * zoom,
            zIndex: 10,
          }}>
          {outputs.map((port) => (
            <div
              key={port.id}
              style={{
                width: PORT_SIZE * zoom,
                height: PORT_SIZE * zoom,
                borderRadius: '50%',
                background: isPortActive ? stateConfig.pulseColor || '#1976d2' : '#fff',
                border: `2px solid ${stateConfig.pulseColor || '#4a90e2'}`,
                boxShadow: isPortActive ? `0 0 8px ${stateConfig.pulseColor || '#1976d2'}aa` : 'none',
                margin: '4px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                zIndex: 15,
              }}
              onMouseDown={e => { 
                e.stopPropagation(); 
                if (onPortMouseDown) onPortMouseDown(e, node.id, port.id, 'output'); 
              }}
              title={(port.label || 'Output') + ' port'}
              aria-label={(port.label || 'Output') + ' port'}
              tabIndex={0}
            >
              {port.label && <span style={{fontSize: 10 * zoom, color: stateConfig.pulseColor || '#1976d2', marginRight: 22 * zoom, whiteSpace: 'nowrap'}}>{port.label}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Execution time display */}
      {(currentState === 'completed' || currentState === 'error') && node.executionTime && (
        <div
          style={{
            position: 'absolute',
            bottom: -20,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 10,
            color: stateConfig.borderColor,
            background: 'rgba(255,255,255,0.9)',
            padding: '2px 6px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            zIndex: 10,
          }}
        >
          {node.executionTime}ms
        </div>
      )}

      {/* Sticky Note resize handle */}
      {isSticky && (
        <div
          onMouseDown={handleResizeMouseDown}
          style={{
            position: 'absolute',
            right: 2,
            bottom: 2,
            width: 18,
            height: 18,
            background: '#ffe066',
            border: '1.5px solid #ffe066',
            borderRadius: 4,
            cursor: 'nwse-resize',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            userSelect: 'none',
          }}
          title="Resize"
        >
          <i className="fas fa-expand-arrows-alt" style={{ fontSize: 10, color: '#f39c12' }} />
        </div>
      )}
    </div>
  );
};

export default BoardNode; 