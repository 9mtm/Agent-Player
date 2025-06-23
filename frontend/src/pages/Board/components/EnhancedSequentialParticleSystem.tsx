import React, { useEffect, useState } from 'react';
import { realBrandServices } from './RealBrandIcons';
import { statusIcons } from '../../../components/icons/IconRegistry';

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

interface EnhancedSequentialParticle {
  id: string;
  connectionId: string;
  progress: number; // 0-100
  serviceType: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  isProcessing: boolean;
  currentNodeId?: string;
  isActive: boolean;
  queuePosition: number;
  // New enhanced states
  status: 'normal' | 'warning' | 'error' | 'success' | 'completed';
  isDisappearing: boolean;
  originalColor: string; // Store original color for reset
}

interface EnhancedSequentialParticleSystemProps {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  animatedConnections: Set<string>;
  connectionType: 'curved' | 'straight' | 'stepped';
  isSequentialMode?: boolean;
}

export const EnhancedSequentialParticleSystem: React.FC<EnhancedSequentialParticleSystemProps> = ({
  nodes,
  connections,
  animatedConnections,
  connectionType,
  isSequentialMode = true
}) => {
  const [particleQueue, setParticleQueue] = useState<EnhancedSequentialParticle[]>([]);
  const [currentParticleIndex, setCurrentParticleIndex] = useState(0);
  const [completedParticles, setCompletedParticles] = useState<Set<string>>(new Set());

  // Create sequential particle queue (limited to 5 for better viewing)
  useEffect(() => {
    const newQueue: EnhancedSequentialParticle[] = [];
    const maxParticles = Math.min(5, animatedConnections.size); // Max 5 particles
    const connectionArray = Array.from(animatedConnections);
    
    for (let index = 0; index < maxParticles; index++) {
      const connectionId = connectionArray[index % connectionArray.length];
      const serviceType = realBrandServices[Math.floor(Math.random() * realBrandServices.length)];
      
      const particle: EnhancedSequentialParticle = {
        id: `enhanced-particle-${connectionId}-${Date.now()}-${index}`,
        connectionId,
        progress: 0,
        serviceType: serviceType.type,
        icon: serviceType.icon,
        color: serviceType.color,
        originalColor: serviceType.color,
        isProcessing: false,
        isActive: false,
        queuePosition: index,
        status: 'normal',
        isDisappearing: false
      };
      
      newQueue.push(particle);
    }
    
    setParticleQueue(newQueue);
    setCurrentParticleIndex(0);
    setCompletedParticles(new Set());
  }, [animatedConnections]);

  // Sequential animation logic with enhanced states
  useEffect(() => {
    if (particleQueue.length === 0) return;

    const interval = setInterval(() => {
      setParticleQueue(prevQueue => {
        const updatedQueue = [...prevQueue];
        
        if (isSequentialMode) {
          const currentParticle = updatedQueue[currentParticleIndex];
          
          if (currentParticle && !currentParticle.isActive) {
            // Activate current particle with original color
            currentParticle.isActive = true;
            currentParticle.progress = 0;
            currentParticle.status = 'normal';
            currentParticle.color = currentParticle.originalColor;
          }
          
          if (currentParticle && currentParticle.isActive) {
            const newProgress = currentParticle.progress + 2;
            
            // Simulate random errors during processing
            if (newProgress >= 30 && newProgress <= 40 && currentParticle.status === 'normal') {
              const errorChance = Math.random();
              if (errorChance < 0.1) { // 10% chance of critical error
                currentParticle.status = 'error';
                currentParticle.color = '#F44336'; // Red
                // Stop processing on critical error
                return updatedQueue;
              } else if (errorChance < 0.3) { // 20% chance of warning
                currentParticle.status = 'warning';
                currentParticle.color = '#FF9800'; // Yellow
              }
            }
            
            // Check if particle reached a node for processing
            const connection = connections.find(c => c.id === currentParticle.connectionId);
            if (connection && newProgress >= 50 && newProgress <= 60 && !currentParticle.isProcessing) {
              currentParticle.progress = newProgress;
              currentParticle.isProcessing = true;
              currentParticle.currentNodeId = connection.target;
              
              // Show success when entering processing
              if (currentParticle.status !== 'error') {
                currentParticle.status = 'success';
                currentParticle.color = '#4CAF50'; // Green
              }
            } else if (currentParticle.isProcessing && newProgress >= 70) {
              currentParticle.progress = newProgress;
              currentParticle.isProcessing = false;
              currentParticle.currentNodeId = undefined;
              
              // Reset to original color after processing
              if (currentParticle.status !== 'error') {
                currentParticle.color = currentParticle.originalColor;
                currentParticle.status = 'normal';
              }
            } else if (newProgress >= 100) {
              // Particle completed journey
              currentParticle.isActive = false;
              currentParticle.progress = 100;
              currentParticle.status = 'completed';
              
              // Add to completed set and start disappearing animation
              setCompletedParticles(prev => new Set([...prev, currentParticle.id]));
              currentParticle.isDisappearing = true;
              
              // Move to next particle after a brief delay
              setTimeout(() => {
                setCurrentParticleIndex(prevIndex => {
                  const nextIndex = prevIndex + 1;
                  if (nextIndex >= particleQueue.length) {
                    // All particles completed
                    setTimeout(() => {
                      setCurrentParticleIndex(0);
                      setCompletedParticles(new Set());
                    }, 5000); // 5 second delay before restart for better viewing
                    return prevIndex;
                  }
                  return nextIndex;
                });
              }, 800); // Longer delay to see the fade effect
            } else {
              currentParticle.progress = newProgress;
            }
          }
        } else {
          // Parallel mode logic (simplified)
          updatedQueue.forEach(particle => {
            if (!particle.isActive) particle.isActive = true;
            
            const newProgress = particle.progress + 2;
            const connection = connections.find(c => c.id === particle.connectionId);
            
            if (connection && newProgress >= 50 && newProgress <= 60 && !particle.isProcessing) {
              particle.progress = newProgress;
              particle.isProcessing = true;
              particle.currentNodeId = connection.target;
            } else if (particle.isProcessing && newProgress >= 70) {
              particle.progress = newProgress;
              particle.isProcessing = false;
              particle.currentNodeId = undefined;
            } else if (newProgress >= 100) {
              particle.progress = 0;
              particle.isProcessing = false;
              particle.currentNodeId = undefined;
            } else {
              particle.progress = newProgress;
            }
          });
        }
        
        return updatedQueue;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [particleQueue.length, connections, currentParticleIndex, isSequentialMode]);

  // Calculate particle position
  const getParticlePosition = (particle: EnhancedSequentialParticle) => {
    const connection = connections.find(c => c.id === particle.connectionId);
    if (!connection) return { x: 0, y: 0 };

    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    if (!sourceNode || !targetNode) return { x: 0, y: 0 };

    const sourceX = sourceNode.x + 120;
    const sourceY = sourceNode.y + 30;
    const targetX = targetNode.x;
    const targetY = targetNode.y + 30;
    const progress = particle.progress / 100;

    const paths = {
      'straight': () => ({
        x: sourceX + (targetX - sourceX) * progress,
        y: sourceY + (targetY - sourceY) * progress
      }),
      'stepped': () => {
        const midX = sourceX + (targetX - sourceX) / 2;
        if (progress < 0.33) {
          return { x: sourceX + (midX - sourceX) * (progress / 0.33), y: sourceY };
        } else if (progress < 0.67) {
          return { x: midX, y: sourceY + (targetY - sourceY) * ((progress - 0.33) / 0.34) };
        } else {
          return { x: midX + (targetX - midX) * ((progress - 0.67) / 0.33), y: targetY };
        }
      },
      'curved': () => {
        const dx = targetX - sourceX;
        const controlPoint1X = sourceX + Math.max(50, Math.abs(dx) * 0.3);
        const controlPoint2X = targetX - Math.max(50, Math.abs(dx) * 0.3);
        const t = progress;
        const x = Math.pow(1-t, 3) * sourceX + 3 * Math.pow(1-t, 2) * t * controlPoint1X + 3 * (1-t) * Math.pow(t, 2) * controlPoint2X + Math.pow(t, 3) * targetX;
        const y = Math.pow(1-t, 3) * sourceY + 3 * Math.pow(1-t, 2) * t * sourceY + 3 * (1-t) * Math.pow(t, 2) * targetY + Math.pow(t, 3) * targetY;
        return { x, y };
      }
    };

    return paths[connectionType]() || paths['curved']();
  };

  // Enhanced processing indicator
  const renderProcessingIndicator = (particle: EnhancedSequentialParticle) => {
    if (!particle.isProcessing || !particle.currentNodeId) return null;
    
    const node = nodes.find(n => n.id === particle.currentNodeId);
    if (!node) return null;

    const ProcessingIcon = statusIcons.processing.component;

    return (
      <div
        key={`processing-${particle.id}`}
        style={{
          position: 'absolute',
          left: node.x + 60 - 20,
          top: node.y + 30 - 20,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.95)',
          border: `4px solid ${particle.color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'processingPulse 1s ease-in-out infinite',
          zIndex: 1100,
          boxShadow: `0 0 20px ${particle.color}80`
        }}
      >
        <ProcessingIcon 
          style={{ 
            color: particle.color, 
            fontSize: '16px' 
          }}
          className="fa-spin"
        />
      </div>
    );
  };

  // Enhanced queue indicator with fade effects
  const renderEnhancedQueueIndicator = () => {
    if (!isSequentialMode || particleQueue.length <= 1) return null;

    return (
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        padding: '16px 20px',
        borderRadius: '16px',
        fontSize: '12px',
        zIndex: 1200,
        backdropFilter: 'blur(15px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <span style={{ fontSize: '16px', fontWeight: '700' }}>🔄 Sequential Processing</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span>Queue: {Math.min(currentParticleIndex + 1, particleQueue.length)}/{particleQueue.length}</span>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxWidth: '280px' }}>
          {particleQueue.map((particle, index) => {
            const IconComponent = particle.icon;
            const isActive = index === currentParticleIndex;
            const isCompleted = completedParticles.has(particle.id);
            const isUpcoming = index > currentParticleIndex;
            
            return (
              <div
                key={particle.id}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: isActive 
                    ? particle.color 
                    : 'rgba(255, 255, 255, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: isActive 
                    ? `2px solid ${particle.color}` 
                    : '1px solid rgba(255, 255, 255, 0.4)',
                  opacity: isCompleted && particle.isDisappearing 
                    ? 0 
                    : isUpcoming 
                      ? 0.7 
                      : 1,
                  transform: isActive 
                    ? 'scale(1.1)' 
                    : isCompleted 
                      ? 'scale(0.85)' 
                      : isUpcoming 
                        ? 'scale(0.9)'
                        : 'scale(1)',
                  transition: particle.isDisappearing 
                    ? 'all 2s ease-out' 
                    : isUpcoming
                      ? 'all 0.5s ease-in-out'
                      : 'all 0.3s ease',
                  filter: particle.isDisappearing 
                    ? 'blur(4px)' 
                    : 'blur(0px)',
                  animation: isCompleted && !particle.isDisappearing
                    ? 'gentleFadeOut 2.5s ease-out forwards'
                    : isUpcoming
                      ? 'subtlePulse 3s ease-in-out infinite'
                      : undefined
                }}
              >
                <IconComponent 
                  style={{ 
                    color: 'white', 
                    fontSize: '10px',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                  }}
                />
              </div>
            );
          })}
        </div>
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
      {/* Enhanced CSS Animations */}
      <style>
        {`
          @keyframes processingPulse {
            0%, 100% { 
              transform: scale(1); 
              opacity: 1; 
            }
            50% { 
              transform: scale(1.15); 
              opacity: 0.9; 
            }
          }
          
          @keyframes successPulse {
            0%, 100% { 
              transform: scale(1); 
              box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
            }
            50% { 
              transform: scale(1.05); 
              box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
            }
          }
          
          @keyframes gentleFadeOut {
            0% { 
              opacity: 1; 
              transform: scale(0.85); 
              filter: blur(0px);
            }
            30% { 
              opacity: 0.8; 
              transform: scale(0.9); 
              filter: blur(0.5px);
            }
            70% { 
              opacity: 0.4; 
              transform: scale(0.7); 
              filter: blur(2px);
            }
            100% { 
              opacity: 0; 
              transform: scale(0.5); 
              filter: blur(6px);
            }
          }
          
          @keyframes subtlePulse {
            0%, 100% { 
              opacity: 0.7; 
              transform: scale(0.9);
            }
            50% { 
              opacity: 0.85; 
              transform: scale(0.95);
            }
          }
          
          @keyframes particleFloat {
            0%, 100% { 
              transform: translateY(0px); 
            }
            50% { 
              transform: translateY(-3px); 
            }
          }
          
          @keyframes particleGlow {
            0%, 100% { 
              box-shadow: 0 0 15px rgba(255, 255, 255, 0.4); 
            }
            50% { 
              box-shadow: 0 0 25px rgba(255, 255, 255, 0.7); 
            }
          }
          
          .fa-spin {
            animation: fa-spin 2s infinite linear;
          }
          
          @keyframes fa-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Enhanced queue indicator */}
      {renderEnhancedQueueIndicator()}

      {/* Render moving particles with status colors */}
      {particleQueue.map(particle => {
        if (particle.isProcessing || (!particle.isActive && isSequentialMode)) return null;
        
        const position = getParticlePosition(particle);
        const serviceInfo = realBrandServices.find(s => s.type === particle.serviceType);
        const IconComponent = particle.icon;
        
        return (
          <div
            key={particle.id}
            style={{
              position: 'absolute',
              left: position.x - 25,
              top: position.y - 25,
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${particle.color}, ${particle.color}dd)`,
              border: particle.status === 'error' 
                ? '4px solid #F44336' 
                : particle.status === 'warning'
                  ? '4px solid #FF9800'
                  : particle.status === 'success'
                    ? '4px solid #4CAF50'
                    : '4px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: `particleFloat 2s ease-in-out infinite, particleGlow 2s ease-in-out infinite${
                particle.status === 'error' ? ', errorShake 0.5s ease-in-out 2' : ''
              }`,
              boxShadow: `0 6px 20px ${particle.color}50`,
              zIndex: 1000,
              filter: particle.status === 'error' ? 'drop-shadow(0 0 10px #F44336)' : 'none'
            }}
            title={`${serviceInfo?.name || 'Data Flow'} - Status: ${particle.status}`}
          >
            <IconComponent 
              style={{ 
                color: 'white', 
                fontSize: '20px',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
              }}
            />
          </div>
        );
      })}

      {/* Render processing indicators */}
      {particleQueue.map(particle => renderProcessingIndicator(particle))}
    </div>
  );
}; 