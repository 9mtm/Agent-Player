import React, { useState } from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import { useDashboardConfig } from './hooks/useDashboardConfig';
import {
  LoadingScreen,
  ErrorScreen,
  OverviewTab,
  AnalyticsTab,
  NetworkViewTab,
  SettingsTab,
} from './components';
import { Toolbar } from '../../components/Layout/Toolbar';
import type { ActiveTab } from './types';

const DashboardPage: React.FC = () => {
  // Custom hooks for data and configuration
  const {
    user,
    loading,
    error,
    isRetrying,
    connectionStatus,
    stats,
    handleRetry,
    handleWorkOffline,
  } = useDashboardData();

  const { config, updateConfig } = useDashboardConfig();

  // Local state for active tab and sidebar
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Container styles
  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingTop: '60px', // Space for fixed toolbar
  };

  const contentStyle = {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '30px 20px',
  };

  // Loading state
  if (loading) {
    return <LoadingScreen connectionStatus={connectionStatus} />;
  }

  // Error state (when no user and has error)
  if (error && !user) {
    return (
      <ErrorScreen
        error={error}
        connectionStatus={connectionStatus}
        isRetrying={isRetrying}
        onRetry={handleRetry}
        onWorkOffline={handleWorkOffline}
      />
    );
  }

  // Main dashboard render
  return (
    <>
      <Toolbar
        user={user}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isChildAgentActive={stats?.system?.childAgentsActive > 0}
        unreadNotifications={stats?.notifications?.unread || 0}
      />
      
      <div style={containerStyle}>
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
              onClick={handleRetry}
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

        {/* Main Content */}
        <div style={contentStyle}>
          {/* Welcome Section */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          }}>
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
              margin: '8px 0 0 0',
              color: '#6c757d',
              fontSize: '16px',
              fontWeight: '500',
            }}>
              Welcome back, {user?.full_name || user?.username || 'User'}! 👋
            </p>
          </div>

          {/* Navigation Tabs */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '24px',
            flexWrap: 'wrap',
          }}>
            {['overview', 'analytics', 'network', 'settings'].map((tab) => (
              <button
                key={tab}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  background: activeTab === tab
                    ? 'linear-gradient(135deg, #667eea, #764ba2)'
                    : 'white',
                  color: activeTab === tab ? 'white' : '#495057',
                  boxShadow: activeTab === tab
                    ? '0 4px 12px rgba(102, 126, 234, 0.3)'
                    : '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
                onClick={() => setActiveTab(tab as ActiveTab)}
              >
                {tab === 'overview' && '📊 Overview'}
                {tab === 'analytics' && '📈 Analytics'}
                {tab === 'network' && '🔗 Network View'}
                {tab === 'settings' && '⚙️ Dashboard Settings'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <OverviewTab stats={stats} config={config} />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab />
          )}

          {activeTab === 'network' && (
            <NetworkViewTab />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              config={config}
              onConfigChange={updateConfig}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default DashboardPage; 