import React, { useEffect, useState } from 'react';
import { realBrandServices } from './RealBrandIcons';

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

interface SimpleParticle {
  id: string;
  connectionId: string;
  progress: number;
  serviceType: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  originalColor: string;
  isActive: boolean;
  queuePosition: number;
  status: 'normal' | 'processing' | 'success' | 'warning' | 'error' | 'completed';
  isAtTarget: boolean;
  isFading: boolean;
}

interface QueueData {
  queueItems: Array<{
    id: string;
    serviceType: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    color: string;
    status: 'pending' | 'current' | 'success' | 'error' | 'warning' | 'completed';
    isDisappearing?: boolean;
  }>;
  currentProcessingIndex: number;
  isSequentialMode: boolean;
}

interface SmartSequentialParticleSystemProps {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  animatedConnections: Set<string>;
  isSequentialMode?: boolean;
  connectionType?: 'curved' | 'straight' | 'stepped';
  onQueueUpdate?: (queueData: QueueData) => void;
}

export const SmartSequentialParticleSystem: React.FC<SmartSequentialParticleSystemProps> = ({
  nodes,
  connections,
  animatedConnections,
  isSequentialMode = true,
  connectionType = 'curved',
  onQueueUpdate
}) => {
  const [particleQueue, setParticleQueue] = useState<SimpleParticle[]>([]);
  const [currentParticleIndex, setCurrentParticleIndex] = useState(0);
  const [completedParticles, setCompletedParticles] = useState<Set<string>>(new Set());

  // Create particle queue for animated connections
  useEffect(() => {
    const newQueue: SimpleParticle[] = [];
    const connectionArray = Array.from(animatedConnections);
    
    connectionArray.forEach((connectionId, index) => {
      // Use only Slack icon for testing
      const slackIcon = realBrandServices.find(service => service.type === 'slack') || realBrandServices[0];
      
      const particle: SimpleParticle = {
        id: `particle-${connectionId}-${index}`,
        connectionId,
        progress: 0,
        serviceType: slackIcon.type,
        icon: slackIcon.icon,
        color: slackIcon.color,
        originalColor: slackIcon.color,
        isActive: false,
        queuePosition: index,
        status: 'normal',
        isAtTarget: false,
        isFading: false
      };
      
      newQueue.push(particle);
    });
    
    setParticleQueue(newQueue);
    setCurrentParticleIndex(0);
    setCompletedParticles(new Set());
  }, [animatedConnections]);

  // Animation logic that follows connection path
  useEffect(() => {
    if (particleQueue.length === 0) return;

    const interval = setInterval(() => {
      setParticleQueue(prevQueue => {
        const updatedQueue = [...prevQueue];
        
        if (isSequentialMode) {
          // Sequential mode - one particle at a time
          const currentParticle = updatedQueue[currentParticleIndex];
          
          if (currentParticle && !currentParticle.isActive && !currentParticle.isFading) {
            // Start particle
            currentParticle.isActive = true;
            currentParticle.progress = 0;
            currentParticle.status = 'normal';
            currentParticle.color = currentParticle.originalColor;
            currentParticle.isAtTarget = false;
          }
          
          if (currentParticle && currentParticle.isActive && !currentParticle.isFading) {
            // Fixed constant speed - always increment by 2 for steady movement
            const newProgress = currentParticle.progress + 2;
            
            if (newProgress >= 95 && !currentParticle.isAtTarget) {
              // Reached end of connection line - start moving to center for processing
              currentParticle.isAtTarget = true;
              currentParticle.progress = Math.min(newProgress, 100);
              
              // Keep original color while moving to center
              currentParticle.color = currentParticle.originalColor;
            } else if (newProgress >= 100 && currentParticle.isAtTarget) {
              // Reached target center - change color based on status and start processing
              currentParticle.progress = 100;
              
              // Random status for demonstration
              const rand = Math.random();
              if (rand < 0.7) {
                currentParticle.status = 'success';
                currentParticle.color = '#4CAF50';
              } else if (rand < 0.9) {
                currentParticle.status = 'warning';
                currentParticle.color = '#FF9800';
              } else {
                currentParticle.status = 'error';
                currentParticle.color = '#F44336';
              }
              
              // Start processing phase at center with animation
              setTimeout(() => {
                if (currentParticle) {
                  currentParticle.status = 'processing';
                }
              }, 300); // Same timing as HTML
              
              // Complete processing and start fade
              setTimeout(() => {
                if (currentParticle) {
                  currentParticle.status = 'completed';
                  currentParticle.isFading = true;
                  setCompletedParticles(prev => new Set([...prev, currentParticle.id]));
                }
              }, 2200); // Extended to show more beautiful spinning
              
              // Move to next particle
              setTimeout(() => {
                setCurrentParticleIndex(prevIndex => {
                  const nextIndex = prevIndex + 1;
                  if (nextIndex >= particleQueue.length) {
                    // Reset cycle
                    setTimeout(() => {
                      setCurrentParticleIndex(0);
                      setCompletedParticles(new Set());
                      setParticleQueue(prev => prev.map(p => ({
                        ...p,
                        isActive: false,
                        isFading: false,
                        progress: 0,
                        status: 'normal',
                        color: p.originalColor,
                        isAtTarget: false
                      })));
                    }, 2000);
                    return prevIndex;
                  }
                  return nextIndex;
                });
              }, 4700); // Adjusted for longer processing time
            } else if (newProgress < 100) {
              currentParticle.progress = newProgress;
              // Keep original color during movement on the line
              currentParticle.color = currentParticle.originalColor;
            }
          }
        } else {
          // Parallel mode - all particles move together with constant speed
          updatedQueue.forEach(particle => {
            if (!particle.isFading) {
              if (!particle.isActive) {
                particle.isActive = true;
                particle.progress = 0;
                particle.status = 'normal';
                particle.color = particle.originalColor;
                particle.isAtTarget = false;
              }
              
              // Fixed constant speed for parallel mode too
              const newProgress = particle.progress + 2;
              
              if (newProgress >= 95 && !particle.isAtTarget) {
                // Reached end of connection line - start moving to center
                particle.isAtTarget = true;
                particle.progress = Math.min(newProgress, 100);
                // Keep original color while moving to center
                particle.color = particle.originalColor;
              } else if (newProgress >= 100 && particle.isAtTarget) {
                // Reached center - assign final status and color
                particle.progress = 100;
                
                const rand = Math.random();
                if (rand < 0.7) {
                  particle.status = 'success';
                  particle.color = '#4CAF50';
                } else if (rand < 0.9) {
                  particle.status = 'warning';
                  particle.color = '#FF9800';
                } else {
                  particle.status = 'error';
                  particle.color = '#F44336';
                }
                
                // Schedule processing animation after result animation
                setTimeout(() => {
                  if (particle && !particle.isFading) {
                    particle.status = 'processing';
                  }
                }, 300); // Same timing as HTML
                
                // Schedule fading after processing
                setTimeout(() => {
                  if (particle && !particle.isFading) {
                    particle.status = 'completed';
                    particle.isFading = true;
                  }
                }, 2200); // Extended to show more beautiful spinning
              } else if (newProgress < 100) {
                particle.progress = newProgress;
                // Keep original color during movement on the line
                particle.color = particle.originalColor;
              }
            }
          });
        }
        
        return updatedQueue;
      });
    }, 50); // Keep same interval for smooth animation

    return () => clearInterval(interval);
  }, [particleQueue.length, connections, currentParticleIndex, isSequentialMode]);

  // Calculate particle position following connection path exactly
  const getParticlePosition = (particle: SimpleParticle, connectionType: 'curved' | 'straight' | 'stepped' = 'curved') => {
    const connection = connections.find(c => c.id === particle.connectionId);
    if (!connection) return { x: 0, y: 0 };

    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    if (!sourceNode || !targetNode) return { x: 0, y: 0 };

    const sourceX = sourceNode.x + 120; // Right edge of source
    const sourceY = sourceNode.y + 30;  // Middle of source
    
    // Line endpoint (same as WorkflowBoard connection)
    const lineEndX = targetNode.x;      // Left edge of target (matches connection line)
    const lineEndY = targetNode.y + 30; // Middle of target
    
    // Node center for processing
    const nodeCenterX = targetNode.x + 60; // Center of target node
    const nodeCenterY = targetNode.y + 30; // Middle of target
    
    const progress = particle.progress / 100;

    // Follow the connection line path exactly (95% of journey)
    if (progress <= 0.95) {
      const lineProgress = progress / 0.95; // Scale to 0-1 for line journey
      
      switch (connectionType) {
        case 'straight': {
          // Direct straight line - exactly matching WorkflowBoard
          const x = sourceX + (lineEndX - sourceX) * lineProgress;
          const y = sourceY + (lineEndY - sourceY) * lineProgress;
          return { x, y };
        }
        
        case 'stepped': {
          // Step/orthogonal path - exactly matching WorkflowBoard
          const midX = sourceX + (lineEndX - sourceX) / 2;
          if (lineProgress < 0.5) {
            // First half: horizontal movement
            const localProgress = lineProgress * 2;
            return {
              x: sourceX + (midX - sourceX) * localProgress,
              y: sourceY
            };
          } else {
            // Second half: vertical then horizontal
            const localProgress = (lineProgress - 0.5) * 2;
            if (localProgress < 0.5) {
              // Vertical segment
              const verticalProgress = localProgress * 2;
              return {
                x: midX,
                y: sourceY + (lineEndY - sourceY) * verticalProgress
              };
            } else {
              // Final horizontal segment
              const horizontalProgress = (localProgress - 0.5) * 2;
              return {
                x: midX + (lineEndX - midX) * horizontalProgress,
                y: lineEndY
              };
            }
          }
        }
        
        case 'curved':
        default: {
          // Smooth curved Bézier path - exactly matching WorkflowBoard
          const dx = lineEndX - sourceX;
          const controlPoint1X = sourceX + Math.max(50, Math.abs(dx) * 0.3);
          const controlPoint2X = lineEndX - Math.max(50, Math.abs(dx) * 0.3);
          
          // Cubic Bézier curve calculation
          const t = lineProgress;
          const oneMinusT = 1 - t;
          
          const x = Math.pow(oneMinusT, 3) * sourceX +
                    3 * Math.pow(oneMinusT, 2) * t * controlPoint1X +
                    3 * oneMinusT * Math.pow(t, 2) * controlPoint2X +
                    Math.pow(t, 3) * lineEndX;
                    
          const y = Math.pow(oneMinusT, 3) * sourceY +
                    3 * Math.pow(oneMinusT, 2) * t * sourceY +
                    3 * oneMinusT * Math.pow(t, 2) * lineEndY +
                    Math.pow(t, 3) * lineEndY;
                    
          return { x, y };
        }
      }
    } else {
      // Final 5% - move from line end to node center for processing
      const finalProgress = (progress - 0.95) / 0.05; // Scale to 0-1 for final movement
      const x = lineEndX + (nodeCenterX - lineEndX) * finalProgress;
      const y = lineEndY + (nodeCenterY - lineEndY) * finalProgress;
      return { x, y };
    }
  };

  // Update parent component with queue data
  useEffect(() => {
    if (onQueueUpdate) {
      onQueueUpdate({
        queueItems: particleQueue.map(particle => ({
          id: particle.id,
          serviceType: particle.serviceType,
          icon: particle.icon,
          color: particle.color,
          status: particle.isActive ? 'current' :
                  completedParticles.has(particle.id) ? 
                    (particle.status === 'error' ? 'error' :
                     particle.status === 'warning' ? 'warning' : 'success') :
                  'pending',
          isDisappearing: particle.isFading
        })),
        currentProcessingIndex: currentParticleIndex,
        isSequentialMode
      });
    }
  }, [particleQueue, currentParticleIndex, completedParticles, isSequentialMode, onQueueUpdate]);

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
      {/* Enhanced CSS Animations matching HTML showcase exactly */}
      <style>
        {`
          /* Advanced Particle Spawn Animation - matching HTML */
          @keyframes particle-spawn-in {
            0% {
              opacity: 0;
              transform: scale(0) rotate(180deg);
              filter: blur(10px);
            }
            50% {
              opacity: 0.7;
              transform: scale(1.3) rotate(90deg);
              filter: blur(2px);
            }
            100% {
              opacity: 1;
              transform: scale(1) rotate(0deg);
              filter: blur(0px);
            }
          }

          /* Processing Animation with Rotation - exact copy from HTML */
          @keyframes particle-process-spin {
            0%, 100% {
              transform: rotate(0deg) scale(1);
              box-shadow: 0 0 20px rgba(33, 150, 243, 0.6);
            }
            25% {
              transform: rotate(90deg) scale(1.2);
              box-shadow: 0 0 30px rgba(33, 150, 243, 0.8);
            }
            50% {
              transform: rotate(180deg) scale(0.8);
              box-shadow: 0 0 40px rgba(33, 150, 243, 1);
            }
            75% {
              transform: rotate(270deg) scale(1.1);
              box-shadow: 0 0 35px rgba(33, 150, 243, 0.9);
            }
          }

          /* Advanced Fade Animation - exact copy from HTML */
          @keyframes particle-advanced-fade {
            0% {
              opacity: 1;
              transform: scale(1);
              filter: blur(0px);
              box-shadow: 0 0 20px rgba(255,255,255,0.3);
            }
            20% {
              opacity: 0.9;
              transform: scale(1.1);
              filter: blur(1px);
              box-shadow: 0 0 35px rgba(255,255,255,0.6);
            }
            30% {
              opacity: 0.8;
              transform: scale(1.2);
              filter: blur(2px);
              box-shadow: 0 0 45px rgba(255,255,255,0.7);
            }
            50% {
              opacity: 0.6;
              transform: scale(1.4);
              filter: blur(5px);
              box-shadow: 0 0 60px rgba(255,255,255,0.8);
            }
            60% {
              opacity: 0.4;
              transform: scale(1.5);
              filter: blur(8px);
              box-shadow: 0 0 70px rgba(255,255,255,0.6);
            }
            80% {
              opacity: 0.2;
              transform: scale(1.8);
              filter: blur(12px);
              box-shadow: 0 0 80px rgba(255,255,255,0.4);
            }
            100% {
              opacity: 0;
              transform: scale(2);
              filter: blur(15px);
              box-shadow: 0 0 90px rgba(255,255,255,0.2);
            }
          }

          /* Success Celebration - exact copy from HTML */
          @keyframes particle-success-celebrate {
            0% {
              transform: scale(1);
              box-shadow: 0 0 20px rgba(76, 175, 80, 0.6);
            }
            25% {
              transform: scale(1.3) translateY(-10px);
              box-shadow: 0 0 35px rgba(76, 175, 80, 0.9);
            }
            50% {
              transform: scale(1.1) translateY(5px);
              box-shadow: 0 0 40px rgba(76, 175, 80, 1);
            }
            75% {
              transform: scale(1.2) translateY(-5px);
              box-shadow: 0 0 35px rgba(76, 175, 80, 0.9);
            }
            100% {
              transform: scale(1) translateY(0px);
              box-shadow: 0 0 25px rgba(76, 175, 80, 0.7);
            }
          }

          /* Error Shake - exact copy from HTML */
          @keyframes particle-error-shake {
            0%, 100% { 
              transform: translateX(0px);
              box-shadow: 0 0 20px rgba(244, 67, 54, 0.6);
            }
            10% { 
              transform: translateX(-10px);
              box-shadow: 0 0 35px rgba(244, 67, 54, 0.9);
            }
            20% { 
              transform: translateX(10px);
              box-shadow: 0 0 35px rgba(244, 67, 54, 0.9);
            }
            30% { 
              transform: translateX(-10px);
              box-shadow: 0 0 35px rgba(244, 67, 54, 0.9);
            }
            40% { 
              transform: translateX(10px);
              box-shadow: 0 0 35px rgba(244, 67, 54, 0.9);
            }
            50% { 
              transform: translateX(-5px);
              box-shadow: 0 0 30px rgba(244, 67, 54, 0.8);
            }
            60% { 
              transform: translateX(5px);
              box-shadow: 0 0 30px rgba(244, 67, 54, 0.8);
            }
          }

          /* Warning Blink - exact copy from HTML */
          @keyframes particle-warning-blink {
            0%, 100% { 
              opacity: 1;
              box-shadow: 0 0 25px rgba(255, 152, 0, 0.7);
            }
            25% { 
              opacity: 0.5;
              box-shadow: 0 0 35px rgba(255, 152, 0, 0.9);
            }
            50% { 
              opacity: 1;
              box-shadow: 0 0 35px rgba(255, 152, 0, 0.9);
            }
            75% { 
              opacity: 0.7;
              box-shadow: 0 0 30px rgba(255, 152, 0, 0.8);
            }
          }

          .particle-element {
            position: absolute;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            z-index: 1000;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            border: 2px solid rgba(255,255,255,0.2);
            animation: particle-spawn-in 0.8s ease-out;
          }

          .particle-processing {
            animation: particle-process-spin 2s ease-in-out infinite;
          }

          .particle-success {
            animation: particle-success-celebrate 1s ease-out;
          }

          .particle-error {
            animation: particle-error-shake 0.8s ease-out;
          }

          .particle-warning {
            animation: particle-warning-blink 1s ease-out;
          }

          .particle-fading {
            animation: particle-advanced-fade 2.5s ease-out forwards;
          }

          /* Pulse animation for processing indicator */
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.1);
              opacity: 0.8;
            }
          }
        `}
      </style>

      {/* Render Particles */}
      {particleQueue.map((particle) => {
        if (!particle.isActive && !particle.isFading) return null;

        const position = getParticlePosition(particle, connectionType);
        
        // Determine animation class based on particle state
        let animationClass = '';
        if (particle.isFading) {
          animationClass = 'particle-fading';
        } else if (particle.status === 'processing') {
          animationClass = 'particle-processing';
        } else if (particle.status === 'success' && particle.isAtTarget) {
          animationClass = 'particle-success';
        } else if (particle.status === 'error' && particle.isAtTarget) {
          animationClass = 'particle-error';
        } else if (particle.status === 'warning' && particle.isAtTarget) {
          animationClass = 'particle-warning';
        }

        return (
          <div
            key={particle.id}
            className={`particle-element ${animationClass}`}
            style={{
              left: position.x - 14,
              top: position.y - 14,
              background: `linear-gradient(135deg, ${particle.color}, ${particle.color}dd)`,
              border: `2px solid ${particle.color}`,
              color: 'white',
              boxShadow: particle.isAtTarget 
                ? `0 0 30px ${particle.color}90, 0 0 50px ${particle.color}60`
                : `0 4px 15px rgba(0,0,0,0.3)`,
              zIndex: particle.isAtTarget || particle.status === 'processing' ? 1000 : 500,
            }}
          >
            <particle.icon style={{ width: '16px', height: '16px' }} />
          </div>
        );
      })}
    </div>
  );
};

export default SmartSequentialParticleSystem;