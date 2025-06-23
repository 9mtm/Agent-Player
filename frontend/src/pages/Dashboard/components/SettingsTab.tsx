import React from 'react';
import type { DashboardConfig } from '../types';

interface SettingsTabProps {
  config: DashboardConfig;
  onConfigChange: (key: keyof DashboardConfig, value: boolean | string) => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ config, onConfigChange }) => {
  const statCardStyle = {
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    transition: 'all 0.3s ease',
  };

  const configOptions = [
    { key: 'showQuickActions', label: 'Show Quick Actions', desc: 'Display shortcut buttons for common tasks' },
    { key: 'showSystemStats', label: 'Show System Statistics', desc: 'Display performance metrics and system info' },
    { key: 'showRecentActivity', label: 'Show Recent Activity', desc: 'Display latest system activities and events' },
    { key: 'showPerformanceMetrics', label: 'Show Performance Metrics', desc: 'Display detailed performance charts' },
  ];

  return (
    <div>
      <h2 style={{ 
        fontSize: '24px', 
        fontWeight: '700', 
        color: '#2c3e50', 
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span>⚙️</span>
        Dashboard Customization
      </h2>
      
      <div style={statCardStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Display Options */}
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50', marginBottom: '16px' }}>
              Display Options
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {configOptions.map((option) => (
                <div key={option.key} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: 'rgba(102, 126, 234, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(102, 126, 234, 0.1)',
                }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>
                      {option.label}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                      {option.desc}
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={config[option.key as keyof DashboardConfig] as boolean}
                      onChange={(e) => onConfigChange(option.key as keyof DashboardConfig, e.target.checked)}
                      style={{
                        width: '18px',
                        height: '18px',
                        accentColor: '#667eea',
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Default View */}
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#2c3e50', marginBottom: '16px' }}>
              Default View
            </h3>
            <select
              value={config.defaultView}
              onChange={(e) => onConfigChange('defaultView', e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid rgba(102, 126, 234, 0.2)',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white',
                color: '#2c3e50',
              }}
            >
              <option value="overview">📊 Overview Dashboard</option>
              <option value="agents">🤖 Agents Management</option>
              <option value="tasks">📋 Tasks & Workflows</option>
              <option value="analytics">📈 Analytics & Reports</option>
              <option value="network">📈 Network View</option>
            </select>
          </div>

          {/* Success Message */}
          <div style={{
            padding: '16px',
            background: 'rgba(40, 167, 69, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(40, 167, 69, 0.2)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#28a745', marginBottom: '4px' }}>
              ✅ Settings Saved Automatically
            </div>
            <div style={{ fontSize: '12px', color: '#6c757d' }}>
              Your preferences are saved to your browser and will persist across sessions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab; 