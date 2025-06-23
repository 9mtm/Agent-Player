import React, { useState, useRef, useEffect } from 'react';
import { NodeData } from '../../../types';
import { getNodeStyle } from './nodeShapes';
import './BoardNode.css';

interface BoardNodeProps {
  data: NodeData;
  isSelected: boolean;
  isRunning?: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPortConnect?: (portId: string, portType: 'input' | 'output') => void;
  style?: React.CSSProperties;
}

const BoardNode: React.FC<BoardNodeProps> = ({
  data,
  isSelected,
  isRunning = false,
  onSelect,
  onEdit,
  onDelete,
  onPortConnect,
  style
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  // Get node styling based on type and state
  const getNodeState = () => {
    if (isRunning) return 'running';
    if (isSelected) return 'selected';
    if (isHovered) return 'hover';
    return 'base';
  };

  const nodeStyle = getNodeStyle(data.type, getNodeState());

  // Handle drag functionality
  const handleDragStart = (e: React.MouseEvent) => {
    // Only allow dragging from the drag handle
    if (!(e.target as HTMLElement).closest('.drag-handle')) {
      e.preventDefault();
      return;
    }
    
    setIsDragging(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const initialRect = nodeRef.current?.getBoundingClientRect();
    
    if (!initialRect) return;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!nodeRef.current) return;
      
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      nodeRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Render icon based on the icon class from nodeShapes
  const renderIcon = () => {
    const iconClass = nodeStyle.icon;
    
    return (
      <i 
        className={iconClass}
        style={{
          fontSize: '1.4rem',
          color: nodeStyle.textColor,
          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          pointerEvents: 'none'
        }}
      />
    );
  };

  // Render node shape based on shape type
  const renderShape = () => {
    const shapeStyle: React.CSSProperties = {
      background: nodeStyle.backgroundColor,
      borderColor: nodeStyle.borderColor,
      boxShadow: nodeStyle.boxShadow,
      color: nodeStyle.textColor,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      width: '80px',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '2px solid',
      cursor: isDragging ? 'grabbing' : 'default'
    };

    // Apply shape-specific styles
    switch (nodeStyle.shape) {
      case 'circle':
        shapeStyle.borderRadius = '50%';
        break;
      case 'diamond':
        shapeStyle.transform = 'rotate(45deg)';
        shapeStyle.clipPath = 'none';
        break;
      case 'triangle':
        shapeStyle.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
        shapeStyle.borderRadius = '0';
        break;
      case 'super-rounded':
        shapeStyle.borderRadius = '25px';
        break;
      case 'envelope':
        shapeStyle.borderRadius = '8px 8px 20px 8px';
        break;
      case 'cylinder':
        shapeStyle.borderRadius = '50px 50px 15px 15px';
        shapeStyle.borderTop = '3px solid rgba(121, 85, 72, 0.8)';
        break;
      case 'circle-border':
        shapeStyle.borderRadius = '50%';
        shapeStyle.border = '3px solid';
        break;
      case 'rounded-rectangle':
      default:
        shapeStyle.borderRadius = '12px';
        break;
    }

    return (
      <div style={shapeStyle}>
        {nodeStyle.shape === 'diamond' ? (
          <div style={{ transform: 'rotate(-45deg)' }}>
            {renderIcon()}
          </div>
        ) : (
          renderIcon()
        )}
      </div>
    );
  };

  return (
    <div
      ref={nodeRef}
      className={`board-node ${isSelected ? 'selected' : ''} ${isRunning ? 'running' : ''}`}
      style={{
        position: 'absolute',
        zIndex: isSelected ? 1000 : isHovered ? 999 : 998,
        ...style
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
    >
      {/* Input Ports */}
      {data.inputs?.map((input, index) => (
        <div
          key={`input-${index}`}
          className="port input-port"
          style={{
            position: 'absolute',
            left: '-8px',
            top: `${20 + index * 20}px`,
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: '#4CAF50',
            border: '2px solid white',
            cursor: 'pointer',
            zIndex: 1001
          }}
          onClick={(e) => {
            e.stopPropagation();
            onPortConnect?.(input.id, 'input');
          }}
          title={input.name}
        />
      ))}

      {/* Drag Handle */}
      <div
        className="drag-handle"
        onMouseDown={handleDragStart}
        style={{
          position: 'absolute',
          top: '-5px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '20px',
          height: '10px',
          background: 'rgba(255,255,255,0.3)',
          borderRadius: '5px 5px 0 0',
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div style={{
          width: '12px',
          height: '2px',
          background: 'rgba(255,255,255,0.7)',
          borderRadius: '1px',
          boxShadow: '0 2px 0 rgba(255,255,255,0.7), 0 4px 0 rgba(255,255,255,0.7)'
        }} />
      </div>

      {/* Node Shape and Icon */}
      <div className="node-shape-container">
        {renderShape()}
      </div>

      {/* Node Label */}
      <div
        className="node-label"
        style={{
          position: 'absolute',
          bottom: '-25px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '0.75rem',
          fontWeight: '600',
          color: '#333',
          background: 'white',
          padding: '2px 8px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          whiteSpace: 'nowrap',
          zIndex: 1000,
          pointerEvents: 'none'
        }}
      >
        {data.name}
      </div>

      {/* Output Ports */}
      {data.outputs?.map((output, index) => (
        <div
          key={`output-${index}`}
          className="port output-port"
          style={{
            position: 'absolute',
            right: '-8px',
            top: `${20 + index * 20}px`,
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: '#2196F3',
            border: '2px solid white',
            cursor: 'pointer',
            zIndex: 1001
          }}
          onClick={(e) => {
            e.stopPropagation();
            onPortConnect?.(output.id, 'output');
          }}
          title={output.name}
        />
      ))}

      {/* Node Menu (appears on hover/selection) */}
      {(isHovered || isSelected) && (
        <div
          className="node-menu"
          style={{
            position: 'absolute',
            top: '-35px',
            right: '-5px',
            display: 'flex',
            gap: '4px',
            zIndex: 1002
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: 'none',
              background: '#2196F3',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
            title="Edit Node"
          >
            <i className="fas fa-edit" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: 'none',
              background: '#F44336',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
            title="Delete Node"
          >
            <i className="fas fa-trash" />
          </button>
        </div>
      )}

      {/* Running indicator */}
      {isRunning && (
        <div
          className="running-indicator"
          style={{
            position: 'absolute',
            top: '-10px',
            left: '-10px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: 'linear-gradient(45deg, #FFC107, #FF9800)',
            animation: 'pulse 1.5s ease-in-out infinite',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <i className="fas fa-play" style={{ fontSize: '0.6rem', color: 'white' }} />
        </div>
      )}
    </div>
  );
};

export default BoardNode; 