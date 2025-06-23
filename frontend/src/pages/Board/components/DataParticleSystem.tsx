import React, { useEffect, useState } from 'react';
import { realBrandServices } from './RealBrandIcons';
import { FaCog } from 'react-icons/fa';

interface WorkflowNode {
  id: string;
  x: number;
  y: number;
  label: string;
  type: string;
  color: string;
  icon: string;
}

interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
}

interface DataParticle {
  id: string;
  connectionId: string;
  progress: number; // 0-100
  serviceType: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  isProcessing: boolean;
  currentNodeId?: string;
}

interface DataParticleSystemProps {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  animatedConnections: Set<string>;
  connectionType: 'curved' | 'straight' | 'stepped';
}

export const DataParticleSystem: React.FC<DataParticleSystemProps> = ({
  nodes,
  connections,
  animatedConnections,
  connectionType
}) => {
  const [particles, setParticles] = useState<DataParticle[]>([]);

  // Use the enhanced service types from RealBrandIcons
  const serviceTypes = realBrandServices;

  // Create particles for animated connections
  useEffect(() => {
    const newParticles: DataParticle[] = [];
    
    animatedConnections.forEach(connectionId => {
      // Get random service type for this particle
      const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
      
      const particle: DataParticle = {
        id: `particle-${connectionId}-${Date.now()}`,
        connectionId,
        progress: 0,
        serviceType: serviceType.type,
        icon: serviceType.icon,
        color: serviceType.color,
        isProcessing: false
      };
      
      newParticles.push(particle);
    });
    
    setParticles(newParticles);
  }, [animatedConnections]);

  // Animate particles
  useEffect(() => {
    if (particles.length === 0) return;

    const interval = setInterval(() => {
      setParticles(prevParticles => 
        prevParticles.map(particle => {
          const newProgress = particle.progress + 2; // Speed of movement
          
          // Check if particle reached a node for processing
          const connection = connections.find(c => c.id === particle.connectionId);
          if (connection && newProgress >= 50 && newProgress <= 60 && !particle.isProcessing) {
            // Particle is entering target node - show processing
            return {
              ...particle,
              progress: newProgress,
              isProcessing: true,
              currentNodeId: connection.target
            };
          } else if (particle.isProcessing && newProgress >= 70) {
            // Processing complete, continue journey
            return {
              ...particle,
              progress: newProgress,
              isProcessing: false,
              currentNodeId: undefined
            };
          } else if (newProgress >= 100) {
            // Particle completed journey, restart from beginning
            return {
              ...particle,
              progress: 0,
              isProcessing: false,
              currentNodeId: undefined
            };
          }
          
          return {
            ...particle,
            progress: newProgress
          };
        })
      );
    }, 50); // 50ms interval for smooth animation

    return () => clearInterval(interval);
  }, [particles.length, connections]);

  // Calculate particle position along connection path
  const getParticlePosition = (particle: DataParticle) => {
    const connection = connections.find(c => c.id === particle.connectionId);
    if (!connection) return { x: 0, y: 0 };

    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    if (!sourceNode || !targetNode) return { x: 0, y: 0 };

    const sourceX = sourceNode.x + 120; // Right edge of source
    const sourceY = sourceNode.y + 30; // Middle of source
    const targetX = targetNode.x; // Left edge of target
    const targetY = targetNode.y + 30; // Middle of target

    const progress = particle.progress / 100;

    const paths = {
      'straight': () => ({
        x: sourceX + (targetX - sourceX) * progress,
        y: sourceY + (targetY - sourceY) * progress
      }),
      
      'stepped': () => {
        const midX = sourceX + (targetX - sourceX) / 2;
        if (progress < 0.33) {
          // First segment: horizontal
          return {
            x: sourceX + (midX - sourceX) * (progress / 0.33),
            y: sourceY
          };
        } else if (progress < 0.67) {
          // Second segment: vertical
          return {
            x: midX,
            y: sourceY + (targetY - sourceY) * ((progress - 0.33) / 0.34)
          };
        } else {
          // Third segment: horizontal
          return {
            x: midX + (targetX - midX) * ((progress - 0.67) / 0.33),
            y: targetY
          };
        }
      },
      
      'curved': () => {
        // Bézier curve calculation
        const dx = targetX - sourceX;
        const controlPoint1X = sourceX + Math.max(50, Math.abs(dx) * 0.3);
        const controlPoint2X = targetX - Math.max(50, Math.abs(dx) * 0.3);
        
        // Cubic Bézier formula: B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
        const t = progress;
        const x = Math.pow(1-t, 3) * sourceX + 
                  3 * Math.pow(1-t, 2) * t * controlPoint1X + 
                  3 * (1-t) * Math.pow(t, 2) * controlPoint2X + 
                  Math.pow(t, 3) * targetX;
        const y = Math.pow(1-t, 3) * sourceY + 
                  3 * Math.pow(1-t, 2) * t * sourceY + 
                  3 * (1-t) * Math.pow(t, 2) * targetY + 
                  Math.pow(t, 3) * targetY;
        
        return { x, y };
      }
    };

    return paths[connectionType]() || paths['curved']();
  };

  // Render processing indicator on node
  const renderProcessingIndicator = (particle: DataParticle) => {
    if (!particle.isProcessing || !particle.currentNodeId) return null;
    
    const node = nodes.find(n => n.id === particle.currentNodeId);
    if (!node) return null;

    return (
      <div
        key={`processing-${particle.id}`}
        style={{
          position: 'absolute',
          left: node.x + 60 - 15, // Center of node
          top: node.y + 30 - 15,
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.9)',
          border: `3px solid ${particle.color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'processingPulse 1s ease-in-out infinite',
          zIndex: 1000,
          boxShadow: `0 0 15px ${particle.color}60`
        }}
      >
        <FaCog 
          style={{ 
            color: particle.color, 
            fontSize: '12px' 
          }}
          className="fa-spin"
        />
      </div>
    );
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 500
    }}>
      {/* CSS Animations */}
      <style>
        {`
          @keyframes processingPulse {
            0%, 100% { 
              transform: scale(1); 
              opacity: 1; 
            }
            50% { 
              transform: scale(1.2); 
              opacity: 0.8; 
            }
          }
          
          @keyframes particleFloat {
            0%, 100% { 
              transform: translateY(0px); 
            }
            50% { 
              transform: translateY(-2px); 
            }
          }
          
          @keyframes particleGlow {
            0%, 100% { 
              box-shadow: 0 0 10px rgba(255, 255, 255, 0.3); 
            }
            50% { 
              box-shadow: 0 0 20px rgba(255, 255, 255, 0.6); 
            }
          }
          
          .fa-spin {
            animation: fa-spin 2s infinite linear;
          }
          
          @keyframes fa-spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}
      </style>

      {/* Render moving particles */}
      {particles.map(particle => {
        if (particle.isProcessing) return null; // Don't show particle when processing
        
        const position = getParticlePosition(particle);
        const serviceInfo = serviceTypes.find(s => s.type === particle.serviceType);
        const IconComponent = particle.icon;
        
        return (
          <div
            key={particle.id}
            style={{
              position: 'absolute',
              left: position.x - 20,
              top: position.y - 20,
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${particle.color}, ${particle.color}dd)`,
              border: '3px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'particleFloat 2s ease-in-out infinite, particleGlow 2s ease-in-out infinite',
              boxShadow: `0 4px 15px ${particle.color}40`,
              zIndex: 1000
            }}
            title={serviceInfo?.name || 'Data Flow'}
          >
            <IconComponent 
              style={{ 
                color: 'white', 
                fontSize: '16px'
              }}
            />
          </div>
        );
      })}

      {/* Render processing indicators */}
      {particles.map(particle => renderProcessingIndicator(particle))}
    </div>
  );
}; 