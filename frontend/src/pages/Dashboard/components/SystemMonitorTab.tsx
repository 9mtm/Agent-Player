import React from 'react';
import { SystemMonitor } from '../../../components/Dashboard/SystemMonitor';

const SystemMonitorTab: React.FC = () => {
  const [isEnabled, setIsEnabled] = React.useState(false);

  const handleLoadMetrics = () => {
    setIsEnabled(true);
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
      minHeight: '500px',
    }}>
      <h2 style={{
        margin: '0 0 24px 0',
        fontSize: '24px',
        fontWeight: '700',
        color: '#2c3e50',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span>🖥️</span>
        System Monitor
      </h2>
      
      {!isEnabled ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '48px',
          textAlign: 'center',
        }}>
          <button 
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onClick={handleLoadMetrics}
          >
            🔄 Load System Metrics
          </button>
          <div style={{
            fontSize: '14px',
            color: '#666',
            maxWidth: '400px',
          }}>
            <p style={{ margin: 0 }}>
              Click to load current system metrics and monitor your system's performance
            </p>
          </div>
        </div>
      ) : (
        <SystemMonitor enabled={true} />
      )}
    </div>
  );
};

export default SystemMonitorTab; 