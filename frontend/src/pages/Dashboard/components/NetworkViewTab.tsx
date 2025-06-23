import React, { useState } from 'react';
import type { NetworkConnection, AgentData, ActivityItem } from '../types';

const NetworkViewTab: React.FC = () => {
  const [hoveredConnection, setHoveredConnection] = useState<number | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const mainAgents: AgentData[] = [
    { 
      name: 'Master AI', 
      color: '#667eea', 
      status: 'active', 
      tasks: 45,
      description: 'Central AI coordinator managing primary workflows and orchestrating all agent operations',
      uptime: '99.8%',
      responseTime: '23ms',
      connectedChilds: 3,
      // Extended data for detailed view
      version: 'v2.1.4',
      lastUpdate: '2 hours ago',
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
    },
    { 
      name: 'Analytics AI', 
      color: '#4facfe', 
      status: 'busy', 
      tasks: 23,
      description: 'Advanced data processing and real-time analytics engine with machine learning capabilities',
      uptime: '97.2%',
      responseTime: '45ms',
      connectedChilds: 4,
      // Extended data for detailed view
      version: 'v3.0.1',
      lastUpdate: '30 minutes ago',
      cpuUsage: 84,
      memoryUsage: 91,
      apiCalls: 45623,
      successRate: 95.3,
      totalOperations: 892456,
      errors24h: 31,
      warnings24h: 18,
      dataProcessed: '8.7TB',
      avgResponseTime: '32ms',
      peakResponseTime: '89ms',
      activeConnections: 15,
      queueSize: 156,
      throughput: '3.8K ops/min',
      securityLevel: 'Medium',
      lastMaintenance: '1 day ago',
      nextMaintenance: 'In 2 days',
      permissions: ['Read', 'Process', 'Analyze'],
      protocols: ['HTTPS', 'Kafka', 'Redis'],
      dependencies: ['Data Lake', 'ML Models', 'Stream Processor']
    },
    { 
      name: 'Security AI', 
      color: '#fa709a', 
      status: 'idle', 
      tasks: 12,
      description: 'Intelligent security monitoring and threat detection with real-time alerts and automated responses',
      uptime: '99.9%',
      responseTime: '18ms',
      connectedChilds: 2,
      // Extended data for detailed view
      version: 'v1.8.7',
      lastUpdate: '1 hour ago',
      cpuUsage: 35,
      memoryUsage: 48,
      apiCalls: 8932,
      successRate: 99.8,
      totalOperations: 234567,
      errors24h: 2,
      warnings24h: 1,
      dataProcessed: '890GB',
      avgResponseTime: '12ms',
      peakResponseTime: '28ms',
      activeConnections: 5,
      queueSize: 7,
      throughput: '450 ops/min',
      securityLevel: 'Maximum',
      lastMaintenance: '5 days ago',
      nextMaintenance: 'In 7 days',
      permissions: ['Monitor', 'Alert', 'Block'],
      protocols: ['HTTPS', 'SIEM', 'SNMP'],
      dependencies: ['Firewall', 'IDS', 'Threat Intel']
    },
  ];

  const childAgents: AgentData[] = [
    { 
      name: 'Chat Bot', 
      color: '#667eea', 
      type: 'trainer', 
      status: 'active', 
      connectedTo: [0],
      description: 'Customer service chat interface',
      performance: '95%',
      currentTask: 'Handling 12 conversations'
    },
    { 
      name: 'Data Processor', 
      color: '#4facfe', 
      type: 'executor', 
      status: 'active', 
      connectedTo: [0, 1],
      description: 'Real-time data processing and transformation',
      performance: '89%',
      currentTask: 'Processing 2.3k records/min'
    },
    { 
      name: 'Report Gen', 
      color: '#4facfe', 
      type: 'specialist', 
      status: 'active', 
      connectedTo: [1],
      description: 'Automated report generation system',
      performance: '92%',
      currentTask: 'Generating weekly reports'
    },
    { 
      name: 'Monitor', 
      color: '#fa709a', 
      type: 'monitor', 
      status: 'active', 
      connectedTo: [1, 2],
      description: 'System monitoring and alert management',
      performance: '98%',
      currentTask: 'Monitoring 47 systems'
    },
    { 
      name: 'Task Runner', 
      color: '#667eea', 
      type: 'executor', 
      status: 'idle', 
      connectedTo: [0, 2],
      description: 'Automated task execution engine',
      performance: '87%',
      currentTask: 'Idle - Awaiting tasks'
    },
  ];

  // Direct connections based on child agent's connectedTo array with precise positioning
  const connections: NetworkConnection[] = [];
  
  // Calculate precise positions
  const mainAgentPositions = [
    { x: 150, y: 60 }, // Master AI
    { x: 400, y: 60 }, // Analytics AI  
    { x: 650, y: 60 }, // Security AI
  ];
  
  const childAgentPositions = [
    { x: 80, y: 320 },   // Chat Bot
    { x: 220, y: 320 },  // Data Processor
    { x: 360, y: 320 },  // Report Gen
    { x: 500, y: 320 },  // Monitor
    { x: 640, y: 320 },  // Task Runner
  ];
  
  childAgents.forEach((child, childIndex) => {
    child.connectedTo?.forEach((mainIndex: number) => {
      const mainPos = mainAgentPositions[mainIndex];
      const childPos = childAgentPositions[childIndex];
      
      connections.push({
        from: { x: mainPos.x + 50, y: mainPos.y + 100 }, // Bottom center of main agent
        to: { x: childPos.x + 40, y: childPos.y }, // Top center of child agent
        color: mainAgents[mainIndex].color,
        active: child.status === 'active' && mainAgents[mainIndex].status !== 'idle',
        name: `${mainAgents[mainIndex].name} → ${child.name}`,
        strength: 'direct'
      });
    });
  });

  const activities: ActivityItem[] = [
    { time: 'now', action: '🔗 Master AI → Chat Bot: Active communication', type: 'message', color: '#667eea' },
    { time: '2s', action: '📊 Data Processor ↔ 2 Main Agents: Multi-connection', type: 'working', color: '#4facfe' },
    { time: '4s', action: '👁️ Monitor → Analytics + Security: Dual monitoring', type: 'alert', color: '#fa709a' },
    { time: '7s', action: '⚡ Task Runner: Connected to 2 Main Agents', type: 'success', color: '#667eea' },
    { time: '10s', action: '🎯 5 Active direct connections established', type: 'success', color: '#4caf50' },
  ];

  const networkMetrics = [
    { label: 'Active Connections', value: connections.filter(c => c.active).length.toString(), color: '#4caf50' },
    { label: 'Total Agents', value: (mainAgents.length + childAgents.length).toString(), color: '#667eea' },
    { label: 'Multi-Connected', value: childAgents.filter(c => c.connectedTo && c.connectedTo.length > 1).length.toString(), color: '#ff9800' },
    { label: 'Success Rate', value: '100%', color: '#4caf50' },
  ];

  // Bezier path calculation (inspired by board implementation)
  const getBezierPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dy = Math.abs(to.y - from.y) * 0.2;
    return `M${from.x},${from.y} C${from.x},${from.y + dy} ${to.x},${to.y - dy} ${to.x},${to.y}`;
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

  return (
    <div style={{ position: 'relative', minHeight: '800px', marginBottom: '20px' }}>
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
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
        marginBottom: '30px',
      }}>
        
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
                background: `linear-gradient(135deg, ${agent.color}, ${agent.color}dd)`,
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: `0 8px 24px ${agent.color}30`,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                animation: agent.status === 'active' ? 'agentPulse 3s infinite' : 
                          agent.status === 'busy' ? 'agentBusy 1.5s infinite' : 'none',
                transform: selectedAgent === `main-${index}` ? 'scale(1.05)' : 'scale(1)',
              }}
              onClick={() => setSelectedAgent(selectedAgent === `main-${index}` ? null : `main-${index}`)}
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
                animation: agent.status === 'active' ? 'statusPulse 2s infinite' : 'none',
              }} />

              {/* Enhanced Agent Details Tooltip */}
              {selectedAgent === `main-${index}` && (
                <div style={{
                  position: 'absolute',
                  top: '110px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
                  borderRadius: '20px',
                  padding: '0',
                  boxShadow: `0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px ${agent.color}20`,
                  zIndex: 20,
                  width: '420px',
                  overflow: 'hidden',
                  backdropFilter: 'blur(10px)',
                }}>
                  {/* Header */}
                  <div style={{
                    background: `linear-gradient(135deg, ${agent.color}, ${agent.color}dd)`,
                    padding: '20px',
                    color: 'white',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0' }}>
                        🤖 {agent.name}
                      </h3>
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        padding: '4px 10px',
                        borderRadius: '15px',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}>
                        {agent.version}
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', margin: '0', opacity: '0.9', lineHeight: '1.4' }}>
                      {agent.description}
                    </p>
                    <div style={{ marginTop: '12px', fontSize: '11px', opacity: '0.8' }}>
                      📅 Last updated: {agent.lastUpdate}
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ padding: '20px' }}>
                    
                    {/* Status Overview */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr 1fr', 
                      gap: '12px', 
                      marginBottom: '20px' 
                    }}>
                      <div style={{
                        textAlign: 'center',
                        padding: '12px',
                        background: `${agent.color}10`,
                        borderRadius: '12px',
                        border: `1px solid ${agent.color}20`,
                      }}>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: agent.color }}>
                          {agent.uptime}
                        </div>
                        <div style={{ fontSize: '10px', color: '#6c757d', fontWeight: '600' }}>
                          UPTIME
                        </div>
                      </div>
                      <div style={{
                        textAlign: 'center',
                        padding: '12px',
                        background: '#4caf5010',
                        borderRadius: '12px',
                        border: '1px solid #4caf5020',
                      }}>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#4caf50' }}>
                          {agent.successRate}%
                        </div>
                        <div style={{ fontSize: '10px', color: '#6c757d', fontWeight: '600' }}>
                          SUCCESS
                        </div>
                      </div>
                      <div style={{
                        textAlign: 'center',
                        padding: '12px',
                        background: '#ff980010',
                        borderRadius: '12px',
                        border: '1px solid #ff980020',
                      }}>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#ff9800' }}>
                          {agent.activeConnections}
                        </div>
                        <div style={{ fontSize: '10px', color: '#6c757d', fontWeight: '600' }}>
                          CONNECTIONS
                        </div>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ 
                        fontSize: '13px', 
                        fontWeight: '600', 
                        color: '#2c3e50', 
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        📊 Performance Metrics
                      </h4>
                      
                      {/* CPU Usage */}
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                          <span style={{ color: '#6c757d' }}>CPU Usage</span>
                          <span style={{ fontWeight: '600', color: '#2c3e50' }}>{agent.cpuUsage}%</span>
                        </div>
                        <div style={{ 
                          height: '6px', 
                          background: '#e9ecef', 
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}>
                          <div style={{ 
                            width: `${agent.cpuUsage}%`, 
                            height: '100%', 
                            background: agent.cpuUsage! > 80 ? '#ff4757' : agent.cpuUsage! > 60 ? '#ffa502' : '#2ed573',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                      </div>

                      {/* Memory Usage */}
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                          <span style={{ color: '#6c757d' }}>Memory Usage</span>
                          <span style={{ fontWeight: '600', color: '#2c3e50' }}>{agent.memoryUsage}%</span>
                        </div>
                        <div style={{ 
                          height: '6px', 
                          background: '#e9ecef', 
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}>
                          <div style={{ 
                            width: `${agent.memoryUsage}%`, 
                            height: '100%', 
                            background: agent.memoryUsage! > 85 ? '#ff4757' : agent.memoryUsage! > 70 ? '#ffa502' : '#5352ed',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                      </div>
                    </div>

                    {/* Statistics Grid */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '12px', 
                      marginBottom: '20px' 
                    }}>
                      <div style={{ 
                        background: '#f8fafc', 
                        padding: '12px', 
                        borderRadius: '10px',
                        border: '1px solid #e9ecef',
                      }}>
                        <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px' }}>Total Operations</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#2c3e50' }}>
                          {agent.totalOperations?.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '10px', color: '#4caf50', marginTop: '2px' }}>
                          ↗️ {agent.throughput}
                        </div>
                      </div>
                      
                      <div style={{ 
                        background: '#f8fafc', 
                        padding: '12px', 
                        borderRadius: '10px',
                        border: '1px solid #e9ecef',
                      }}>
                        <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px' }}>API Calls (24h)</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#2c3e50' }}>
                          {agent.apiCalls?.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '10px', color: '#667eea', marginTop: '2px' }}>
                          📡 Avg: {agent.avgResponseTime}
                        </div>
                      </div>

                      <div style={{ 
                        background: '#f8fafc', 
                        padding: '12px', 
                        borderRadius: '10px',
                        border: '1px solid #e9ecef',
                      }}>
                        <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px' }}>Data Processed</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#2c3e50' }}>
                          {agent.dataProcessed}
                        </div>
                        <div style={{ fontSize: '10px', color: '#17a2b8', marginTop: '2px' }}>
                          📊 Peak: {agent.peakResponseTime}
                        </div>
                      </div>

                      <div style={{ 
                        background: '#f8fafc', 
                        padding: '12px', 
                        borderRadius: '10px',
                        border: '1px solid #e9ecef',
                      }}>
                        <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px' }}>Queue Size</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#2c3e50' }}>
                          {agent.queueSize}
                        </div>
                        <div style={{ fontSize: '10px', color: '#ff9800', marginTop: '2px' }}>
                          ⚡ Security: {agent.securityLevel}
                        </div>
                      </div>
                    </div>

                    {/* Alerts Section */}
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ 
                        fontSize: '13px', 
                        fontWeight: '600', 
                        color: '#2c3e50', 
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        🚨 Alerts & Monitoring
                      </h4>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{
                          flex: 1,
                          padding: '8px 12px',
                          background: agent.errors24h! > 10 ? '#ff475710' : '#4caf5010',
                          borderRadius: '8px',
                          border: `1px solid ${agent.errors24h! > 10 ? '#ff4757' : '#4caf50'}20`,
                          textAlign: 'center',
                        }}>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: agent.errors24h! > 10 ? '#ff4757' : '#4caf50' }}>
                            {agent.errors24h}
                          </div>
                          <div style={{ fontSize: '10px', color: '#6c757d' }}>Errors (24h)</div>
                        </div>
                        <div style={{
                          flex: 1,
                          padding: '8px 12px',
                          background: agent.warnings24h! > 15 ? '#ffa50210' : '#17a2b810',
                          borderRadius: '8px',
                          border: `1px solid ${agent.warnings24h! > 15 ? '#ffa502' : '#17a2b8'}20`,
                          textAlign: 'center',
                        }}>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: agent.warnings24h! > 15 ? '#ffa502' : '#17a2b8' }}>
                            {agent.warnings24h}
                          </div>
                          <div style={{ fontSize: '10px', color: '#6c757d' }}>Warnings (24h)</div>
                        </div>
                      </div>
                    </div>

                    {/* Technical Details */}
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ 
                        fontSize: '13px', 
                        fontWeight: '600', 
                        color: '#2c3e50', 
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        🔧 Technical Details
                      </h4>
                      
                      {/* Permissions */}
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px' }}>Permissions:</div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {agent.permissions?.map((perm, i) => (
                            <span key={i} style={{
                              fontSize: '10px',
                              padding: '2px 8px',
                              background: `${agent.color}15`,
                              color: agent.color,
                              borderRadius: '10px',
                              fontWeight: '600',
                            }}>
                              {perm}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Protocols */}
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px' }}>Protocols:</div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {agent.protocols?.map((protocol, i) => (
                            <span key={i} style={{
                              fontSize: '10px',
                              padding: '2px 8px',
                              background: '#17a2b815',
                              color: '#17a2b8',
                              borderRadius: '10px',
                              fontWeight: '600',
                            }}>
                              {protocol}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Dependencies */}
                      <div>
                        <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px' }}>Dependencies:</div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {agent.dependencies?.map((dep, i) => (
                            <span key={i} style={{
                              fontSize: '10px',
                              padding: '2px 8px',
                              background: '#6f42c115',
                              color: '#6f42c1',
                              borderRadius: '10px',
                              fontWeight: '600',
                            }}>
                              {dep}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Maintenance Schedule */}
                    <div style={{
                      background: 'linear-gradient(135deg, #f8fafc, #e9ecef)',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid #dee2e6',
                    }}>
                      <h4 style={{ 
                        fontSize: '12px', 
                        fontWeight: '600', 
                        color: '#2c3e50', 
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}>
                        🔧 Maintenance Schedule
                      </h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                        <div>
                          <div style={{ color: '#6c757d' }}>Last:</div>
                          <div style={{ fontWeight: '600', color: '#2c3e50' }}>{agent.lastMaintenance}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: '#6c757d' }}>Next:</div>
                          <div style={{ fontWeight: '600', color: '#ff9800' }}>{agent.nextMaintenance}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Connection Lines - Enhanced with Board-style */}
        <svg 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 5,
            pointerEvents: 'none',
          }}
          viewBox="0 0 900 500"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Arrowhead markers for different connection types */}
            <marker id="arrowhead-active" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto" markerUnits="strokeWidth">
              <polygon points="0 0, 8 4, 0 8" fill="currentColor" />
            </marker>
            <marker id="arrowhead-inactive" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
              <polygon points="0 0, 6 3, 0 6" fill="currentColor" opacity="0.6" />
            </marker>
          </defs>
          
          {connections.map((connection, index) => (
            <g key={index}>
              {/* Main Connection Path - Bezier curve like board */}
              <path
                d={getBezierPath(connection.from, connection.to)}
                fill="none"
                stroke={connection.color}
                strokeWidth={connection.active ? "3" : "2"}
                opacity={connection.active ? "0.9" : "0.4"}
                strokeDasharray={connection.active ? "none" : "6,3"}
                strokeLinecap="round"
                markerEnd={connection.active ? "url(#arrowhead-active)" : "url(#arrowhead-inactive)"}
                style={{ 
                  color: connection.color,
                  filter: hoveredConnection === index ? `drop-shadow(0 0 8px ${connection.color}88)` : 'none',
                  pointerEvents: 'auto',
                  cursor: 'pointer'
                }}
                onMouseEnter={() => setHoveredConnection(index)}
                onMouseLeave={() => setHoveredConnection(null)}
              />
              
              {/* Glow Effect for Active Connections */}
              {connection.active && (
                <path
                  d={getBezierPath(connection.from, connection.to)}
                  fill="none"
                  stroke={connection.color}
                  strokeWidth="6"
                  opacity="0.3"
                  strokeLinecap="round"
                  filter="blur(2px)"
                  style={{ pointerEvents: 'none' }}
                />
              )}
              
              {/* Data Flow Animation - Moving dots */}
              {connection.active && (
                <>
                  <circle r="3" fill={connection.color} opacity="0.8">
                    <animateMotion
                      dur={`${3 + index * 0.3}s`}
                      repeatCount="indefinite"
                      path={getBezierPath(connection.from, connection.to)}
                    />
                  </circle>
                  <circle r="2" fill={connection.color} opacity="0.6">
                    <animateMotion
                      dur={`${3 + index * 0.3}s`}
                      repeatCount="indefinite"
                      begin={`${1.5}s`}
                      path={getBezierPath(connection.from, connection.to)}
                    />
                  </circle>
                </>
              )}

              {/* Connection Label on Hover */}
              {hoveredConnection === index && (
                <foreignObject 
                  x={connection.from.x + (connection.to.x - connection.from.x) / 2 - 50} 
                  y={connection.from.y + (connection.to.y - connection.from.y) / 2 - 20} 
                  width="100" 
                  height="40"
                  style={{ pointerEvents: 'none' }}
                >
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}>
                    {connection.name}
                  </div>
                </foreignObject>
              )}
            </g>
          ))}
        </svg>

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
                  ? `linear-gradient(135deg, ${child.color}, ${child.color}dd)`
                  : 'linear-gradient(135deg, #e9ecef, #dee2e6)',
                borderRadius: '15px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: child.status === 'active' ? 'white' : '#6c757d',
                boxShadow: child.status === 'active' 
                  ? `0 6px 16px ${child.color}25`
                  : '0 4px 12px rgba(0, 0, 0, 0.1)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                transform: selectedAgent === `child-${index}` ? 'scale(1.1)' : 'scale(1)',
              }}
              onClick={() => setSelectedAgent(selectedAgent === `child-${index}` ? null : `child-${index}`)}
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
                  animation: 'workingPulse 1.5s infinite',
                }} />
              )}

              {/* Enhanced Child Agent Details Tooltip */}
              {selectedAgent === `child-${index}` && (
                <div style={{
                  position: 'absolute',
                  bottom: '90px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
                  borderRadius: '16px',
                  padding: '0',
                  boxShadow: `0 16px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px ${child.color}20`,
                  zIndex: 20,
                  width: '320px',
                  overflow: 'hidden',
                  backdropFilter: 'blur(8px)',
                }}>
                  {/* Header */}
                  <div style={{
                    background: `linear-gradient(135deg, ${child.color}, ${child.color}dd)`,
                    padding: '16px',
                    color: 'white',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {child.type === 'trainer' ? '🎓' :
                         child.type === 'executor' ? '⚡' :
                         child.type === 'specialist' ? '🎯' :
                         child.type === 'monitor' ? '👁️' : '🤖'} {child.name}
                      </h3>
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                      }}>
                        {child.type}
                      </div>
                    </div>
                    <p style={{ fontSize: '12px', margin: '0', opacity: '0.9', lineHeight: '1.3' }}>
                      {child.description}
                    </p>
                  </div>

                  {/* Content */}
                  <div style={{ padding: '16px' }}>
                    
                    {/* Status Overview */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '10px', 
                      marginBottom: '16px' 
                    }}>
                      <div style={{
                        textAlign: 'center',
                        padding: '10px',
                        background: `${child.color}10`,
                        borderRadius: '10px',
                        border: `1px solid ${child.color}20`,
                      }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: child.color }}>
                          {child.performance}
                        </div>
                        <div style={{ fontSize: '9px', color: '#6c757d', fontWeight: '600' }}>
                          PERFORMANCE
                        </div>
                      </div>
                      <div style={{
                        textAlign: 'center',
                        padding: '10px',
                        background: child.status === 'active' ? '#4caf5010' : '#ff980010',
                        borderRadius: '10px',
                        border: `1px solid ${child.status === 'active' ? '#4caf50' : '#ff9800'}20`,
                      }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: child.status === 'active' ? '#4caf50' : '#ff9800' }}>
                          {child.status.toUpperCase()}
                        </div>
                        <div style={{ fontSize: '9px', color: '#6c757d', fontWeight: '600' }}>
                          STATUS
                        </div>
                      </div>
                    </div>

                    {/* Current Task */}
                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ 
                        fontSize: '12px', 
                        fontWeight: '600', 
                        color: '#2c3e50', 
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}>
                        ⚡ Current Task
                      </h4>
                      <div style={{
                        background: '#f8fafc',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #e9ecef',
                        fontSize: '11px',
                        color: '#2c3e50',
                        fontWeight: '500',
                      }}>
                        {child.currentTask}
                      </div>
                    </div>

                    {/* Connection Details */}
                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ 
                        fontSize: '12px', 
                        fontWeight: '600', 
                        color: '#2c3e50', 
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}>
                        🔗 Connected Main Agents
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {child.connectedTo?.map((mainIndex, i) => (
                          <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px',
                            background: `${mainAgents[mainIndex].color}10`,
                            borderRadius: '8px',
                            border: `1px solid ${mainAgents[mainIndex].color}20`,
                          }}>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: mainAgents[mainIndex].color,
                            }} />
                            <div style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              color: '#2c3e50',
                              flex: 1,
                            }}>
                              {mainAgents[mainIndex].name}
                            </div>
                            <div style={{
                              fontSize: '9px',
                              padding: '2px 6px',
                              background: mainAgents[mainIndex].color,
                              color: 'white',
                              borderRadius: '6px',
                              fontWeight: '600',
                            }}>
                              {mainAgents[mainIndex].status.toUpperCase()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Agent Type Info */}
                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ 
                        fontSize: '12px', 
                        fontWeight: '600', 
                        color: '#2c3e50', 
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}>
                        🎯 Agent Type Information
                      </h4>
                      <div style={{
                        padding: '10px',
                        background: 'linear-gradient(135deg, #f8fafc, #e9ecef)',
                        borderRadius: '8px',
                        border: '1px solid #dee2e6',
                      }}>
                        <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '4px' }}>
                          {child.type === 'trainer' ? '🎓 Trainer Agent' :
                           child.type === 'executor' ? '⚡ Executor Agent' :
                           child.type === 'specialist' ? '🎯 Specialist Agent' :
                           child.type === 'monitor' ? '👁️ Monitor Agent' : '🤖 Generic Agent'}
                        </div>
                        <div style={{ fontSize: '10px', color: '#2c3e50', fontWeight: '500' }}>
                          {child.type === 'trainer' ? 'Specialized in training and learning tasks with adaptive capabilities' :
                           child.type === 'executor' ? 'High-performance execution engine for processing intensive operations' :
                           child.type === 'specialist' ? 'Domain-specific agent with specialized knowledge and skills' :
                           child.type === 'monitor' ? 'Real-time monitoring and alerting system with continuous oversight' : 
                           'Multi-purpose agent with general capabilities'}
                        </div>
                      </div>
                    </div>

                    {/* Multi-Connection Badge */}
                    {child.connectedTo && child.connectedTo.length > 1 && (
                      <div style={{
                        background: 'linear-gradient(135deg, #ff9800, #ff980085)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        textAlign: 'center',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}>
                        🔗 Multi-Connected Agent ({child.connectedTo.length} connections)
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.3)',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 'bold',
                        }}>
                          {child.connectedTo.length}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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
      }}>
        
        {/* Live Activity */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '15px',
          padding: '20px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
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
              }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%',
                  background: activity.color,
                  animation: index < 2 ? 'activityPulse 2s infinite' : 'none',
                  flexShrink: 0,
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
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
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
  );
};

export default NetworkViewTab; 