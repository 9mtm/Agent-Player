import React, { useState, useEffect } from 'react';
import type { NetworkConnection, AgentData, ActivityItem } from '../types';
import { agentsService } from '../../../services/agents';
import type { Agent } from '../../../types';

// Helper component for detail rows
const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: '#f8fafc',
    borderRadius: '6px',
    fontSize: '13px',
  }}>
    <span style={{ color: '#64748b', fontWeight: '500' }}>{label}</span>
    <span style={{ color: '#2c3e50', fontWeight: '600' }}>{value}</span>
  </div>
);

const NetworkViewTab: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedAgentData, setSelectedAgentData] = useState<AgentData | null>(null);
  const [mainAgents, setMainAgents] = useState<AgentData[]>([]);
  const [childAgents, setChildAgents] = useState<AgentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default colors for agents
  const defaultColors = {
    main: '#667eea',
    child: '#4facfe',
    inactive: '#cbd5e1'
  };

  // Handle agent selection
  const handleAgentClick = (agent: AgentData, type: 'main' | 'child') => {
    if (selectedAgent === `${type}-${agent.name}`) {
      setSelectedAgent(null);
      setSelectedAgentData(null);
    } else {
      setSelectedAgent(`${type}-${agent.name}`);
      setSelectedAgentData(agent);
    }
  };

  // Load agents data
  useEffect(() => {
    const loadAgents = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load both main and child agents
        const [mainAgentsResponse, childAgentsResponse] = await Promise.all([
          agentsService.getMainAgents(),
          agentsService.getChildAgents()
        ]);

        // Convert API agents to AgentData format
        const mainAgentsData = mainAgentsResponse.map((agent: Agent): AgentData => ({
          name: agent.name,
          color: defaultColors.main,
          status: agent.is_active ? 'active' : 'idle',
          tasks: Math.floor(Math.random() * 50),
          description: agent.description,
          uptime: '99.8%',
          responseTime: '23ms',
          connectedChilds: 0,
          version: agent.version || `v${agent.id}`,
          lastUpdate: agent.updated_at ? new Date(agent.updated_at).toLocaleString() : 'Unknown',
          cpuUsage: 68,
          memoryUsage: 72,
          apiCalls: 12847,
          successRate: 98.7,
          totalOperations: 156789,
          errors24h: 12,
          warnings24h: 5,
          dataProcessed: '2.3TB',
          avgResponseTime: '18ms',
          peakResponseTime: '45ms',
          activeConnections: 8,
          queueSize: 23,
          throughput: '1.2K ops/min',
          securityLevel: 'High',
          lastMaintenance: '3 days ago',
          nextMaintenance: 'In 4 days',
          permissions: ['Admin', 'Execute', 'Monitor'],
          protocols: ['HTTPS', 'WebSocket', 'gRPC'],
          dependencies: ['Database', 'Cache', 'Message Queue']
        }));

        const childAgentsData = childAgentsResponse.map((agent: Agent): AgentData => ({
          name: agent.name,
          color: defaultColors.child,
          type: 'executor',
          status: agent.is_active ? 'active' : 'idle',
          connectedTo: agent.parent_agent_id ? [agent.parent_agent_id] : [],
          description: agent.description,
          performance: '95%',
          currentTask: 'Processing requests'
        }));

        // Update connectedChilds count for main agents
        mainAgentsData.forEach(mainAgent => {
          if (mainAgent.version) {
            mainAgent.connectedChilds = childAgentsData.filter(
              child => child.connectedTo?.includes(parseInt(mainAgent.version!.substring(1)))
            ).length;
          }
        });

        setMainAgents(mainAgentsData);
        setChildAgents(childAgentsData);
      } catch (err) {
        console.error('Error loading agents:', err);
        setError('Failed to load agents data');
      } finally {
        setIsLoading(false);
      }
    };

    loadAgents();
    // Refresh data every 30 seconds
    const interval = setInterval(loadAgents, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate positions for agents
  const mainAgentPositions = mainAgents.map((_, index) => ({
    x: 150 + (index * 250),
    y: 60
  }));

  const childAgentPositions = childAgents.map((_, index) => ({
    x: 80 + (index * 140),
    y: 320
  }));

  // Generate connections based on actual relationships
  const connections: NetworkConnection[] = [];
  if (mainAgents.length > 0 && childAgents.length > 0) {
    childAgents.forEach((child, childIndex) => {
      if (child.connectedTo && child.connectedTo.length > 0 && childIndex < childAgentPositions.length) {
        child.connectedTo.forEach((mainAgentId: number) => {
          const mainAgent = mainAgents.find(agent => {
            if (!agent.version) return false;
            const mainAgentNumericId = parseInt(agent.version.substring(1));
            return !isNaN(mainAgentNumericId) && mainAgentNumericId === mainAgentId;
          });
          
          if (mainAgent) {
            const mainIndex = mainAgents.indexOf(mainAgent);
            if (mainIndex !== -1 && mainIndex < mainAgentPositions.length) {
              const mainPos = mainAgentPositions[mainIndex];
              const childPos = childAgentPositions[childIndex];
              
              connections.push({
                from: { x: mainPos.x + 50, y: mainPos.y + 100 },
                to: { x: childPos.x + 40, y: childPos.y },
                color: mainAgent.status === 'active' ? (mainAgent.color || defaultColors.main) : defaultColors.inactive,
                active: child.status === 'active' && mainAgent.status === 'active',
                name: `${mainAgent.name} → ${child.name}`,
                strength: 'direct'
              });
            }
          }
        });
      }
    });
  }

  // Generate activities based on actual connections
  const activities: ActivityItem[] = connections.map((conn, index) => ({
    time: `${index * 2}s`,
    action: `🔗 ${conn.name}: ${conn.active ? 'Active communication' : 'Idle'}`,
    type: conn.active ? 'message' : 'idle',
    color: conn.color || defaultColors.inactive
  }));

  const networkMetrics = [
    { label: 'Active Connections', value: connections.filter(c => c.active).length.toString(), color: '#4caf50' },
    { label: 'Total Agents', value: (mainAgents.length + childAgents.length).toString(), color: '#667eea' },
    { label: 'Multi-Connected', value: childAgents.filter(c => c.connectedTo && c.connectedTo.length > 1).length.toString(), color: '#ff9800' },
    { label: 'Success Rate', value: '100%', color: '#4caf50' },
  ];

  // Calculate Bezier curve path for connections
  const getBezierPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const midY = (from.y + to.y) / 2;
    return `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
  };

  const connectionTypes = [
    { 
      type: 'Direct Control', 
      color: '#667eea', 
      description: 'Master AI directly controls and manages child agents',
      icon: '🎮',
      pattern: 'solid'
    },
    { 
      type: 'Data Flow', 
      color: '#4facfe', 
      description: 'Analytics AI processes and distributes data to child agents',
      icon: '📊',
      pattern: 'solid'
    },
    { 
      type: 'Security Monitor', 
      color: '#fa709a', 
      description: 'Security AI monitors and protects child agent operations',
      icon: '🛡️',
      pattern: 'dashed'
    },
    { 
      type: 'Multi-Connection', 
      color: '#ff9800', 
      description: 'Child agents connected to multiple main agents for redundancy',
      icon: '🔗',
      pattern: 'dotted'
    },
  ];

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        fontSize: '16px',
        color: defaultColors.main
      }}>
        <div style={{ 
          width: '24px', 
          height: '24px', 
          border: `3px solid ${defaultColors.main}`,
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginRight: '12px'
        }} />
        Loading network view...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%',
        color: '#ef4444',
        fontSize: '16px'
      }}>
        ❌ {error}
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'relative',
      height: '100%',
      display: 'flex',
      overflow: 'hidden'
    }}>
      {/* Main Network View */}
      <div style={{ 
        flex: 1,
        position: 'relative',
        height: '100%',
        overflow: 'hidden',
        padding: '20px',
        background: 'linear-gradient(145deg, #f3f4f6, #ffffff)'
      }}>
        {/* Network Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: '700', 
            color: '#2c3e50', 
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}>
            <span>🔗</span>
            AI Agent Network View
          </h2>
          <p style={{ fontSize: '16px', color: '#6c757d', marginBottom: '20px' }}>
            Interactive network showing direct connections between Main Agents and Child Agents
          </p>
          
          {/* Network Status */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'rgba(76, 175, 80, 0.1)',
            borderRadius: '25px',
            boxShadow: '0 2px 8px rgba(76, 175, 80, 0.15)'
          }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%',
              background: '#4caf50',
              animation: 'networkPulse 2s infinite'
            }} />
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#4caf50' }}>
              Network Active - {connections.filter(c => c.active).length} Direct Connections
            </span>
          </div>
        </div>

        {/* Main Network Visualization */}
        <div style={{
          position: 'relative',
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          padding: '40px',
          height: '450px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          marginBottom: '30px',
        }}>
          {/* SVG Container for connections */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          >
            {/* Connection Paths */}
            {connections.map((connection, index) => (
              <g key={`connection-${index}`}>
                {/* Glow effect for active connections */}
                {connection.active && (
                  <path
                    d={getBezierPath(connection.from, connection.to)}
                    fill="none"
                    stroke="url(#activeGradient)"
                    strokeWidth="6"
                    opacity="0.2"
                    filter="url(#glow)"
                  />
                )}
                
                {/* Main connection path */}
                <path
                  d={getBezierPath(connection.from, connection.to)}
                  fill="none"
                  stroke={connection.active ? "url(#activeGradient)" : "#cbd5e1"}
                  strokeWidth={connection.active ? "2" : "1.5"}
                  strokeDasharray={connection.active ? "none" : "4,4"}
                  markerEnd={connection.active ? "url(#arrowhead-active)" : "url(#arrowhead-inactive)"}
                  style={{
                    transition: 'all 0.3s ease',
                  }}
                />

                {/* Animated dots for active connections */}
                {connection.active && (
                  <>
                    <circle r="4" fill="#4facfe">
                      <animateMotion
                        dur="3s"
                        repeatCount="indefinite"
                        path={getBezierPath(connection.from, connection.to)}
                      />
                    </circle>
                    <circle r="4" fill="#00f2fe">
                      <animateMotion
                        dur="3s"
                        repeatCount="indefinite"
                        begin="1.5s"
                        path={getBezierPath(connection.from, connection.to)}
                      />
                    </circle>
                  </>
                )}
              </g>
            ))}

            {/* Gradient and filter definitions */}
            <defs>
              <linearGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: '#4facfe', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#00f2fe', stopOpacity: 1 }} />
              </linearGradient>
              
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>

              <marker
                id="arrowhead-active"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="url(#activeGradient)"
                />
              </marker>
              <marker
                id="arrowhead-inactive"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#cbd5e1"
                />
              </marker>
            </defs>
          </svg>

          {/* Main Agents Row */}
          <div style={{
            position: 'absolute',
            top: '60px',
            left: '0',
            right: '0',
            display: 'flex',
            justifyContent: 'space-around',
            paddingLeft: '150px',
            paddingRight: '150px',
            zIndex: 10,
          }}>
            {mainAgents.map((agent, index) => (
              <div
                key={index}
                style={{
                  position: 'relative',
                  width: '100px',
                  height: '100px',
                  background: agent.status === 'active' 
                    ? `linear-gradient(135deg, ${agent.color || defaultColors.main}, ${agent.color || defaultColors.main}dd)`
                    : 'linear-gradient(135deg, #e9ecef, #dee2e6)',
                  borderRadius: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: agent.status === 'active' ? 'white' : '#6c757d',
                  boxShadow: agent.status === 'active' 
                    ? `0 8px 24px ${agent.color || defaultColors.main}30`
                    : '0 4px 12px rgba(0, 0, 0, 0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  animation: agent.status === 'active' ? 'agentPulse 3s infinite' : 
                            agent.status === 'busy' ? 'agentBusy 1.5s infinite' : 'none',
                  transform: selectedAgent === `main-${agent.name}` ? 'scale(1.05)' : 'scale(1)',
                }}
                onClick={() => handleAgentClick(agent, 'main')}
              >
                <div style={{ fontSize: '28px', marginBottom: '6px' }}>🤖</div>
                <div style={{ fontSize: '11px', fontWeight: '600', textAlign: 'center' }}>
                  {agent.name}
                </div>
                <div style={{ fontSize: '9px', opacity: 0.8 }}>
                  {agent.tasks} tasks
                </div>
                
                {/* Status Indicator */}
                <div style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: agent.status === 'active' ? '#4caf50' : 
                             agent.status === 'busy' ? '#ff9800' : '#9e9e9e',
                  border: '2px solid white',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  animation: agent.status === 'active' ? 'statusPulse 2s infinite' : 'none',
                }} />
              </div>
            ))}
          </div>

          {/* Child Agents Row */}
          <div style={{
            position: 'absolute',
            bottom: '60px',
            left: '0',
            right: '0',
            display: 'flex',
            justifyContent: 'space-around',
            paddingLeft: '80px',
            paddingRight: '80px',
            zIndex: 10,
          }}>
            {childAgents.map((child, index) => (
              <div
                key={index}
                style={{
                  position: 'relative',
                  width: '80px',
                  height: '80px',
                  background: child.status === 'active' 
                    ? `linear-gradient(135deg, ${child.color || defaultColors.child}, ${child.color || defaultColors.child}dd)`
                    : 'linear-gradient(135deg, #e9ecef, #dee2e6)',
                  borderRadius: '15px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: child.status === 'active' ? 'white' : '#6c757d',
                  boxShadow: child.status === 'active' 
                    ? `0 6px 16px ${child.color || defaultColors.child}25`
                    : '0 4px 12px rgba(0, 0, 0, 0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: selectedAgent === `child-${child.name}` ? 'scale(1.1)' : 'scale(1)',
                }}
                onClick={() => handleAgentClick(child, 'child')}
              >
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>
                  {child.type === 'trainer' ? '🎓' :
                   child.type === 'executor' ? '⚡' :
                   child.type === 'specialist' ? '🎯' :
                   child.type === 'monitor' ? '👁️' : '🤖'}
                </div>
                <div style={{ fontSize: '9px', fontWeight: '600', textAlign: 'center', lineHeight: '1.1' }}>
                  {child.name}
                </div>
                
                {/* Multi-Connection Indicator */}
                {child.connectedTo && child.connectedTo.length > 1 && (
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    left: '-8px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#ff9800',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid white',
                    boxShadow: '0 2px 8px rgba(255, 152, 0, 0.3)',
                  }}>
                    {child.connectedTo.length}
                  </div>
                )}
                
                {/* Status Indicator */}
                {child.status === 'active' && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-5px',
                    right: '-5px',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: '#4caf50',
                    border: '2px solid white',
                    boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
                    animation: 'workingPulse 1.5s infinite',
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Analytics Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginTop: '20px',
          marginRight: selectedAgentData ? '420px' : '0',
          transition: 'margin-right 0.3s ease',
        }}>
          {/* Live Activity */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '15px',
            padding: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#2c3e50', 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span>📡</span>
              Live Activity
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflow: 'auto' }}>
              {activities.map((activity, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px',
                  borderRadius: '8px',
                  background: activity.type === 'message' ? 'rgba(102, 126, 234, 0.1)' :
                             activity.type === 'alert' ? 'rgba(250, 112, 154, 0.1)' :
                             activity.type === 'success' ? 'rgba(76, 175, 80, 0.1)' :
                             'rgba(79, 172, 254, 0.1)',
                  fontSize: '13px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                }}>
                  <div style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%',
                    background: activity.color,
                    animation: index < 2 ? 'activityPulse 2s infinite' : 'none',
                  }} />
                  <div style={{ flex: 1, color: '#2c3e50' }}>{activity.action}</div>
                  <div style={{ fontSize: '11px', color: '#6c757d', flexShrink: 0 }}>{activity.time}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Connection Analytics */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '15px',
            padding: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#2c3e50', 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span>📊</span>
              Network Analytics
            </h3>
            
            {/* Metrics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px',
              marginBottom: '20px',
            }}>
              {networkMetrics.map((metric, index) => (
                <div key={index} style={{
                  padding: '15px',
                  background: `${metric.color}10`,
                  borderRadius: '10px',
                  textAlign: 'center',
                  border: `1px solid ${metric.color}30`,
                }}>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: metric.color }}>
                    {metric.value}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px' }}>
                    {metric.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Enhanced Connection Types with Tooltips */}
            <div style={{ 
              paddingTop: '15px', 
              borderTop: '1px solid #e9ecef',
            }}>
              <h4 style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#2c3e50', 
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                Connection Types 
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#e3f2fd',
                  color: '#1976d2',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  cursor: 'help',
                  position: 'relative',
                }}
                title="Click on agents to see detailed information about their connections"
                >
                  ?
                </div>
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {connectionTypes.map((item, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '12px',
                    padding: '8px',
                    borderRadius: '8px',
                    background: `${item.color}08`,
                    border: `1px solid ${item.color}20`,
                  }}
                  title={item.description}
                  >
                    <div style={{ 
                      fontSize: '16px',
                      width: '20px',
                      textAlign: 'center',
                    }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#2c3e50', fontSize: '11px' }}>
                        {item.type}
                      </div>
                      <div style={{ fontSize: '9px', color: '#6c757d' }}>
                        {item.description}
                      </div>
                    </div>
                    <div style={{
                      width: '20px',
                      height: '2px',
                      background: item.color,
                      borderRadius: '1px',
                      ...(item.pattern === 'dashed' && { 
                        background: `repeating-linear-gradient(90deg, ${item.color}, ${item.color} 4px, transparent 4px, transparent 8px)` 
                      }),
                      ...(item.pattern === 'dotted' && { 
                        background: `repeating-linear-gradient(90deg, ${item.color}, ${item.color} 2px, transparent 2px, transparent 4px)` 
                      }),
                    }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CSS Animations */}
        <style>{`
          @keyframes networkPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.2); }
          }
          @keyframes agentPulse {
            0%, 100% { box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3); }
            50% { box-shadow: 0 12px 32px rgba(102, 126, 234, 0.6); }
          }
          @keyframes agentBusy {
            0%, 100% { transform: scale(1); }
            25% { transform: scale(1.02); }
            75% { transform: scale(0.98); }
          }
          @keyframes statusPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
          @keyframes workingPulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.7; }
          }
          @keyframes activityPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.4); }
          }
        `}</style>
      </div>

      {/* Agent Details Sidebar */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '400px',
        height: '100%',
        background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
        borderLeft: '1px solid #e2e8f0',
        transform: selectedAgentData ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease',
        overflowY: 'auto',
        boxShadow: '-4px 0 15px rgba(0, 0, 0, 0.1)',
        zIndex: 20,
      }}>
        {selectedAgentData && (
          <>
            {/* Header */}
            <div style={{
              background: `linear-gradient(135deg, ${selectedAgentData.color || defaultColors.main}, ${selectedAgentData.color || defaultColors.main}dd)`,
              padding: '20px',
              color: 'white',
              position: 'sticky',
              top: 0,
              zIndex: 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {selectedAgentData.type === 'trainer' ? '🎓' :
                   selectedAgentData.type === 'executor' ? '⚡' :
                   selectedAgentData.type === 'specialist' ? '🎯' :
                   selectedAgentData.type === 'monitor' ? '👁️' : '🤖'} {selectedAgentData.name}
                </h3>
                <button
                  onClick={() => {
                    setSelectedAgent(null);
                    setSelectedAgentData(null);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white',
                    fontSize: '18px',
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
              <p style={{ fontSize: '14px', margin: '0', opacity: '0.9', lineHeight: '1.4' }}>
                {selectedAgentData.description}
              </p>
            </div>

            {/* Content */}
            <div style={{ padding: '20px' }}>
              {/* Status Overview */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '12px', 
                marginBottom: '20px' 
              }}>
                <div style={{
                  textAlign: 'center',
                  padding: '15px',
                  background: `${selectedAgentData.color || defaultColors.main}10`,
                  borderRadius: '12px',
                  border: `1px solid ${selectedAgentData.color || defaultColors.main}20`,
                }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: selectedAgentData.color || defaultColors.main }}>
                    {selectedAgentData.performance || '100%'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600' }}>
                    PERFORMANCE
                  </div>
                </div>
                <div style={{
                  textAlign: 'center',
                  padding: '15px',
                  background: selectedAgentData.status === 'active' ? '#4caf5010' : '#ff980010',
                  borderRadius: '12px',
                  border: `1px solid ${selectedAgentData.status === 'active' ? '#4caf50' : '#ff9800'}20`,
                }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: selectedAgentData.status === 'active' ? '#4caf50' : '#ff9800' }}>
                    {selectedAgentData.status.toUpperCase()}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600' }}>
                    STATUS
                  </div>
                </div>
              </div>

              {/* Agent Details */}
              {selectedAgentData.version && (
                <div className="details-section" style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '14px', color: '#2c3e50', marginBottom: '12px' }}>🔍 Agent Details</h4>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <DetailRow label="Version" value={selectedAgentData.version} />
                    <DetailRow label="Last Update" value={selectedAgentData.lastUpdate || 'N/A'} />
                    <DetailRow label="Connected Childs" value={selectedAgentData.connectedChilds?.toString() || '0'} />
                    <DetailRow label="Tasks" value={selectedAgentData.tasks?.toString() || '0'} />
                    <DetailRow label="Uptime" value={selectedAgentData.uptime || 'N/A'} />
                    <DetailRow label="Response Time" value={selectedAgentData.responseTime || 'N/A'} />
                  </div>
                </div>
              )}

              {/* Performance Metrics */}
              {selectedAgentData.version && (
                <div className="details-section" style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '14px', color: '#2c3e50', marginBottom: '12px' }}>📊 Performance Metrics</h4>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <DetailRow label="CPU Usage" value={`${selectedAgentData.cpuUsage || 0}%`} />
                    <DetailRow label="Memory Usage" value={`${selectedAgentData.memoryUsage || 0}%`} />
                    <DetailRow label="API Calls" value={selectedAgentData.apiCalls?.toString() || '0'} />
                    <DetailRow label="Success Rate" value={`${selectedAgentData.successRate || 0}%`} />
                    <DetailRow label="Total Operations" value={selectedAgentData.totalOperations?.toString() || '0'} />
                  </div>
                </div>
              )}

              {/* Current Task for Child Agents */}
              {selectedAgentData.currentTask && (
                <div className="details-section" style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '14px', color: '#2c3e50', marginBottom: '12px' }}>⚡ Current Task</h4>
                  <div style={{
                    background: '#f8fafc',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef',
                    fontSize: '13px',
                    color: '#2c3e50',
                  }}>
                    {selectedAgentData.currentTask}
                  </div>
                </div>
              )}

              {/* Connection Details for Child Agents */}
              {selectedAgentData.connectedTo && (
                <div className="details-section" style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '14px', color: '#2c3e50', marginBottom: '12px' }}>🔗 Connected Main Agents</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedAgentData.connectedTo.map((mainAgentId, i) => {
                      const mainAgent = mainAgents.find(agent => 
                        agent.version && parseInt(agent.version.substring(1)) === mainAgentId
                      );
                      if (!mainAgent) return null;

                      return (
                        <div key={i} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px',
                          background: `${mainAgent.color || defaultColors.main}10`,
                          borderRadius: '8px',
                          border: `1px solid ${mainAgent.color || defaultColors.main}20`,
                        }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: mainAgent.color || defaultColors.main,
                          }} />
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#2c3e50',
                            flex: 1,
                          }}>
                            {mainAgent.name}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            background: mainAgent.color || defaultColors.main,
                            color: 'white',
                            borderRadius: '6px',
                            fontWeight: '600',
                          }}>
                            {mainAgent.status.toUpperCase()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NetworkViewTab; 