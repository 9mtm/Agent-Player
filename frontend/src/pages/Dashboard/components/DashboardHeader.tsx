import React from 'react';
import type { User } from '../../../services/auth';
import type { ConnectionStatus, ActiveTab, DashboardStats } from '../types';

interface DashboardHeaderProps {
  user: User | null;
  connectionStatus: ConnectionStatus;
  stats: DashboardStats;
  activeTab: ActiveTab;
  error: string | null;
  isRetrying: boolean;
  onRetry: () => void;
  onTabChange: (tab: ActiveTab) => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  connectionStatus,
  stats,
  activeTab,
  error,
  isRetrying,
  onRetry,
  onTabChange,
}) => {
  const headerStyle = {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    padding: '20px 0',
    borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    background: isActive 
      ? 'linear-gradient(135deg, #667eea, #764ba2)'
      : 'rgba(255, 255, 255, 0.8)',
    color: isActive ? 'white' : '#495057',
    boxShadow: isActive 
      ? '0 4px 12px rgba(102, 126, 234, 0.3)'
      : '0 2px 8px rgba(0, 0, 0, 0.1)',
  });

  return (
    <>
      {/* Error Banner */}
      {error && user && (
        <div style={{
          background: 'linear-gradient(135deg, #ff9800, #f57c00)',
          color: 'white',
          padding: '12px 20px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
        }}>
          <span>⚠️</span>
          <span>{error}</span>
          <button
            onClick={onRetry}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '4px',
              color: 'white',
              padding: '4px 12px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>
      )}

      {/* Header */}
      <div style={headerStyle}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
              }}>
                📊
              </div>
              <div>
                <h1 style={{
                  margin: 0,
                  fontSize: '28px',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  AI Agent Dashboard
                </h1>
                <p style={{
                  margin: '4px 0 0 0',
                  color: '#6c757d',
                  fontSize: '14px',
                  fontWeight: '500',
                }}>
                  Welcome back, {user?.full_name || user?.username || 'User'}! 👋
                </p>
              </div>
            </div>

            {/* System Status */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '12px 20px',
              background: connectionStatus === 'online' ? 'rgba(40, 167, 69, 0.1)' : 
                         connectionStatus === 'checking' ? 'rgba(255, 193, 7, 0.1)' : 'rgba(220, 53, 69, 0.1)',
              borderRadius: '12px',
              border: connectionStatus === 'online' ? '1px solid rgba(40, 167, 69, 0.2)' : 
                     connectionStatus === 'checking' ? '1px solid rgba(255, 193, 7, 0.2)' : '1px solid rgba(220, 53, 69, 0.2)',
            }}>
              <div style={{ 
                color: connectionStatus === 'online' ? '#28a745' : 
                       connectionStatus === 'checking' ? '#ffc107' : '#dc3545', 
                fontSize: '16px' 
              }}>
                {connectionStatus === 'online' ? '🟢' : 
                 connectionStatus === 'checking' ? '🟡' : '🔴'}
              </div>
              <div>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: connectionStatus === 'online' ? '#28a745' : 
                         connectionStatus === 'checking' ? '#ffc107' : '#dc3545'
                }}>
                  {connectionStatus === 'online' ? 'System Online' : 
                   connectionStatus === 'checking' ? 'Checking...' : 'Offline Mode'}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                  {connectionStatus === 'online' ? `Uptime: ${stats.system.uptime}` : 
                   connectionStatus === 'checking' ? 'Reconnecting...' : 'Limited functionality'}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '20px',
            flexWrap: 'wrap',
          }}>
            <button
              style={tabStyle(activeTab === 'overview')}
              onClick={() => onTabChange('overview')}
            >
              📊 Overview
            </button>
            <button
              style={tabStyle(activeTab === 'analytics')}
              onClick={() => onTabChange('analytics')}
            >
              📈 Analytics
            </button>
            <button
              style={tabStyle(activeTab === 'network')}
              onClick={() => onTabChange('network')}
            >
              🔗 Network View
            </button>
            <button
              style={tabStyle(activeTab === 'settings')}
              onClick={() => onTabChange('settings')}
            >
              ⚙️ Dashboard Settings
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardHeader; 