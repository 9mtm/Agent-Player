import React, { useState } from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import { useDashboardConfig } from './hooks/useDashboardConfig';
import {
  LoadingScreen,
  ErrorScreen,
  DashboardHeader,
  OverviewTab,
  AnalyticsTab,
  NetworkViewTab,
  SettingsTab,
} from './components';
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

  // Local state for active tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Container styles
  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
    <div style={containerStyle}>
      {/* Header with navigation */}
      <DashboardHeader
        user={user}
        connectionStatus={connectionStatus}
        stats={stats}
        activeTab={activeTab}
        error={error}
        isRetrying={isRetrying}
        onRetry={handleRetry}
        onTabChange={setActiveTab}
      />

      {/* Content based on active tab */}
      <div style={contentStyle}>
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
  );
};

export default DashboardPage; 