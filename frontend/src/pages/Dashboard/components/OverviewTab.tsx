import React from 'react';
import type { DashboardStats, DashboardConfig, QuickAction } from '../types';

interface OverviewTabProps {
  stats: DashboardStats;
  config: DashboardConfig;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ stats, config }) => {
  const statCardStyle = {
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    transition: 'all 0.3s ease',
  };

  const quickActions: QuickAction[] = [
    { icon: '🤖', label: 'Create Agent', color: '#667eea', path: '/agent' },
    { icon: '💬', label: 'New Chat', color: '#9c27b0', path: '/chat' },
    { icon: '📋', label: 'View Tasks', color: '#4caf50', path: '/tasks' },
    { icon: '🏗️', label: 'Build Workflow', color: '#ff9800', path: '/board' },
    { icon: '📊', label: 'Analytics', color: '#2196f3', path: '/analytics' },
    { icon: '⚙️', label: 'Settings', color: '#607d8b', path: '/settings' },
  ];

  const recentActivities = [
    { time: '2 min ago', action: 'Agent "Sales Assistant" completed task', type: 'success', icon: '✅' },
    { time: '15 min ago', action: 'New chat started with "Customer Support"', type: 'info', icon: '💬' },
    { time: '1 hour ago', action: 'Workflow "Data Processing" paused', type: 'warning', icon: '⏸️' },
    { time: '2 hours ago', action: 'System performance optimized', type: 'success', icon: '🚀' },
  ];

  return (
    <>
      {/* Quick Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '30px',
      }}>
        {/* Agents Stats */}
        <div style={statCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}>
              🤖
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#2c3e50' }}>
              AI Agents
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(102, 126, 234, 0.1)', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#667eea' }}>{stats.agents.total}</div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>Total Agents</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(40, 167, 69, 0.1)', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#28a745' }}>{stats.agents.active}</div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>Active</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '13px', color: '#6c757d' }}>
            <span>Main: {stats.agents.mainAgents}</span>
            <span>Child: {stats.agents.childAgents}</span>
          </div>
        </div>

        {/* Tasks Stats */}
        <div style={statCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}>
              ⚡
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#2c3e50' }}>
              Tasks & Workflows
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(40, 167, 69, 0.1)', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#28a745' }}>{stats.tasks.completed}</div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>Completed</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(255, 193, 7, 0.1)', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#ffc107' }}>{stats.tasks.pending}</div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>Pending</div>
            </div>
          </div>
          <div style={{ 
            marginTop: '12px', 
            padding: '8px 12px', 
            background: 'rgba(76, 175, 80, 0.1)', 
            borderRadius: '6px',
            textAlign: 'center',
            fontSize: '13px',
            color: '#4caf50',
            fontWeight: '600',
          }}>
            Success Rate: {Math.round((stats.tasks.completed / stats.tasks.total) * 100)}%
          </div>
        </div>

        {/* Chat Stats */}
        <div style={statCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #fa709a, #fee140)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}>
              💬
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#2c3e50' }}>
              Conversations
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(156, 39, 176, 0.1)', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#9c27b0' }}>{stats.chats.today}</div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>Today</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(233, 30, 99, 0.1)', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#e91e63' }}>{stats.chats.thisWeek}</div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>This Week</div>
            </div>
          </div>
          <div style={{ 
            marginTop: '12px',
            fontSize: '13px',
            color: '#6c757d',
            textAlign: 'center',
          }}>
            Total: {stats.chats.total.toLocaleString()} conversations
          </div>
        </div>

        {/* System Performance */}
        <div style={statCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #ff9a9e, #fecfef)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}>
              🖥️
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#2c3e50' }}>
              System Performance
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                <span>CPU Usage</span>
                <span>{Math.round(stats.system.cpuUsage)}%</span>
              </div>
              <div style={{ 
                height: '6px', 
                background: '#e9ecef', 
                borderRadius: '3px',
                overflow: 'hidden',
              }}>
                <div style={{ 
                  height: '100%', 
                  width: `${stats.system.cpuUsage}%`,
                  background: stats.system.cpuUsage > 80 ? '#dc3545' : stats.system.cpuUsage > 60 ? '#ffc107' : '#28a745',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '13px' }}>
                <span>Memory</span>
                <span>{Math.round(stats.system.memoryUsage)}%</span>
              </div>
              <div style={{ 
                height: '6px', 
                background: '#e9ecef', 
                borderRadius: '3px',
                overflow: 'hidden',
              }}>
                <div style={{ 
                  height: '100%', 
                  width: `${stats.system.memoryUsage}%`,
                  background: stats.system.memoryUsage > 80 ? '#dc3545' : stats.system.memoryUsage > 60 ? '#ffc107' : '#28a745',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          </div>
          <div style={{ 
            marginTop: '12px',
            fontSize: '13px',
            color: '#6c757d',
            textAlign: 'center',
          }}>
            API Calls: {stats.system.apiCalls.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {config.showQuickActions && (
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ 
            fontSize: '22px', 
            fontWeight: '700', 
            color: '#2c3e50', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span>⚡</span>
            Quick Actions
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}>
            {quickActions.map((action, index) => (
              <div
                key={index}
                style={{
                  ...statCardStyle,
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderLeft: `4px solid ${action.color}`,
                }}
                onClick={() => window.location.href = action.path}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.1)';
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>{action.icon}</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: action.color }}>
                  {action.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {config.showRecentActivity && (
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ 
            fontSize: '22px', 
            fontWeight: '700', 
            color: '#2c3e50', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span>📈</span>
            Recent Activity
          </h2>
          <div style={statCardStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {recentActivities.map((activity, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: activity.type === 'success' ? 'rgba(40, 167, 69, 0.05)' :
                             activity.type === 'warning' ? 'rgba(255, 193, 7, 0.05)' :
                             'rgba(102, 126, 234, 0.05)',
                }}>
                  <div style={{ fontSize: '20px' }}>{activity.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#2c3e50' }}>
                      {activity.action}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                      {activity.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OverviewTab; 