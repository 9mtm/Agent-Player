import React, { useEffect, useState } from 'react';
import { DataFlow } from './nodeStates';

interface DataFlowAnimationProps {
  flows: DataFlow[];
  nodes: { [id: string]: { x: number; y: number; width: number; height: number } };
  zoom?: number;
  onFlowComplete?: (flowId: string) => void;
}

interface FlowPath {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  distance: number;
  angle: number;
}

const DataFlowAnimation: React.FC<DataFlowAnimationProps> = ({
  flows,
  nodes,
  zoom = 1,
  onFlowComplete
}) => {
  const [activeFlows, setActiveFlows] = useState<{ [flowId: string]: number }>({});

  // Calculate the path between two nodes
  const calculatePath = (fromNodeId: string, toNodeId: string): FlowPath => {
    const fromNode = nodes[fromNodeId];
    const toNode = nodes[toNodeId];
    
    if (!fromNode || !toNode) {
      return { x1: 0, y1: 0, x2: 0, y2: 0, distance: 0, angle: 0 };
    }

    // Calculate center points of nodes
    const x1 = (fromNode.x + fromNode.width / 2) * zoom;
    const y1 = (fromNode.y + fromNode.height / 2) * zoom;
    const x2 = (toNode.x + toNode.width / 2) * zoom;
    const y2 = (toNode.y + toNode.height / 2) * zoom;

    // Calculate distance and angle
    const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

    return { x1, y1, x2, y2, distance, angle };
  };

  // Update flow progress
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFlows(prev => {
        const updated = { ...prev };
        
        flows.forEach(flow => {
          if (flow.status === 'flowing') {
            const elapsed = Date.now() - flow.startTime;
            const progress = Math.min(elapsed / flow.duration, 1) * 100;
            
            updated[flow.id] = progress;
            
            // Complete flow if reached 100%
            if (progress >= 100 && onFlowComplete) {
              onFlowComplete(flow.id);
            }
          }
        });
        
        return updated;
      });
    }, 16); // 60fps

    return () => clearInterval(interval);
  }, [flows, onFlowComplete]);

  // Render flow particles
  const renderFlowParticle = (flow: DataFlow, progress: number) => {
    const path = calculatePath(flow.fromNodeId, flow.toNodeId);
    
    if (path.distance === 0) return null;

    // Calculate current position along the path
    const currentX = path.x1 + (path.x2 - path.x1) * (progress / 100);
    const currentY = path.y1 + (path.y2 - path.y1) * (progress / 100);

    // Different particle styles based on flow status
    const getParticleStyle = () => {
      const baseStyle = {
        position: 'absolute' as const,
        left: currentX - 6,
        top: currentY - 6,
        width: 12,
        height: 12,
        borderRadius: '50%',
        zIndex: 100,
        transition: 'none',
        pointerEvents: 'none' as const,
      };

      switch (flow.status) {
        case 'flowing':
          return {
            ...baseStyle,
            background: 'linear-gradient(45deg, #2196f3, #4caf50)',
            boxShadow: '0 0 12px rgba(33, 150, 243, 0.6)',
            animation: 'pulse 0.8s ease-in-out infinite',
          };
        case 'error':
          return {
            ...baseStyle,
            background: 'linear-gradient(45deg, #f44336, #ff7043)',
            boxShadow: '0 0 12px rgba(244, 67, 54, 0.6)',
          };
        case 'completed':
          return {
            ...baseStyle,
            background: 'linear-gradient(45deg, #4caf50, #66bb6a)',
            boxShadow: '0 0 12px rgba(76, 175, 80, 0.6)',
          };
        default:
          return baseStyle;
      }
    };

    return (
      <div
        key={flow.id}
        style={getParticleStyle()}
        title={`Data flowing from ${flow.fromNodeId} to ${flow.toNodeId}`}
      >
        {/* Inner particle */}
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'white',
            margin: '3px',
            boxShadow: '0 0 4px rgba(255,255,255,0.8)',
          }}
        />
      </div>
    );
  };

  // Render connection lines
  const renderConnectionLine = (flow: DataFlow, progress: number) => {
    const path = calculatePath(flow.fromNodeId, flow.toNodeId);
    
    if (path.distance === 0) return null;

    // Progressive line that follows the particle
    const progressDistance = path.distance * (progress / 100);

    return (
      <svg
        key={`line-${flow.id}`}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        <defs>
          <linearGradient id={`gradient-${flow.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="70%" stopColor={flow.status === 'error' ? '#f44336' : '#2196f3'} stopOpacity={0.6} />
            <stop offset="100%" stopColor={flow.status === 'error' ? '#f44336' : '#2196f3'} stopOpacity={0.9} />
          </linearGradient>
        </defs>
        
        <line
          x1={path.x1}
          y1={path.y1}
          x2={path.x1 + (path.x2 - path.x1) * (progress / 100)}
          y2={path.y1 + (path.y2 - path.y1) * (progress / 100)}
          stroke={`url(#gradient-${flow.id})`}
          strokeWidth={3}
          strokeLinecap="round"
          style={{
            filter: 'drop-shadow(0 0 4px rgba(33, 150, 243, 0.4))',
          }}
        />
        
        {/* Arrow head at the end */}
        {progress > 90 && (
          <polygon
            points={`${currentX},${currentY - 4} ${currentX + 8},${currentY} ${currentX},${currentY + 4}`}
            fill={flow.status === 'error' ? '#f44336' : '#2196f3'}
            style={{
              filter: 'drop-shadow(0 0 3px rgba(33, 150, 243, 0.6))',
            }}
          />
        )}
      </svg>
    );
  };

  const currentX = 0; // Will be calculated properly in the actual rendering
  const currentY = 0; // Will be calculated properly in the actual rendering

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      {/* CSS for animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
        
        @keyframes trail {
          0% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.8); }
        }
      `}</style>

      {/* Render connection lines */}
      {flows.map(flow => {
        const progress = activeFlows[flow.id] || 0;
        return renderConnectionLine(flow, progress);
      })}

      {/* Render flow particles */}
      {flows.map(flow => {
        const progress = activeFlows[flow.id] || 0;
        if (progress > 0 && progress < 100) {
          return renderFlowParticle(flow, progress);
        }
        return null;
      })}

      {/* Data info tooltips */}
      {flows.map(flow => {
        const progress = activeFlows[flow.id] || 0;
        if (progress > 20 && progress < 80 && flow.data) {
          const path = calculatePath(flow.fromNodeId, flow.toNodeId);
          const tooltipX = path.x1 + (path.x2 - path.x1) * 0.5;
          const tooltipY = path.y1 + (path.y2 - path.y1) * 0.5;

          return (
            <div
              key={`tooltip-${flow.id}`}
              style={{
                position: 'absolute',
                left: tooltipX,
                top: tooltipY - 30,
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 12,
                whiteSpace: 'nowrap',
                zIndex: 150,
                pointerEvents: 'none',
                transform: 'translateX(-50%)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              {typeof flow.data === 'string' ? flow.data : JSON.stringify(flow.data).substring(0, 50)}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};

export default DataFlowAnimation; 