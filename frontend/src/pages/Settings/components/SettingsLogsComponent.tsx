import React, { useState, useEffect } from 'react';
import { settingsService } from '../../../services/settings';

interface LogEntry {
  timestamp: string;
  operation: string;
  user: string;
  details: Record<string, unknown>;
  status: string;
}

const SettingsLogsComponent: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    let interval: number;
    if (autoRefresh) {
      interval = setInterval(loadLogs, 5000); // Refresh every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await settingsService.getSettingsLogs();
      if (response.success) {
        setLogs(response.data.logs);
      }
    } catch (error) {
      console.error('Failed to load settings logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getOperationIcon = (operation: string) => {
    const icons: Record<string, string> = {
      'update_profile_settings': '👤',
      'update_theme_settings': '🎨',
      'update_security_settings': '🔐',
      'update_notification_settings': '🔔',
      'update_ai_model_settings': '🤖',
      'update_integration_settings': '🔌',
      'update_advanced_settings': '⚙️',
      'export_settings': '📤',
      'import_settings': '📥',
      'get_settings_logs': '📊',
      'get_profile_settings': '👁️',
      'get_theme_settings': '👁️',
    };
    return icons[operation] || '📝';
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success': return '#27ae60';
      case 'error': return '#e74c3c';
      case 'warning': return '#f39c12';
      default: return '#7f8c8d';
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.operation.includes(filter);
  });

  return (
    <div>
      {/* Header Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', margin: '0 0 8px 0', color: '#2c3e50' }}>
            📊 Settings Activity Logs
          </h2>
          <p style={{ color: '#7f8c8d', margin: 0 }}>
            Monitor all settings operations and changes in real-time
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '2px solid #e1e5e9',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="all">All Operations</option>
            <option value="update">Updates</option>
            <option value="get">Views</option>
            <option value="export">Export/Import</option>
          </select>

          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Auto Refresh
          </label>

          <button
            onClick={loadLogs}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: loading ? '#95a5a6' : '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '🔄' : '🔄'} Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          borderRadius: '12px',
          padding: '20px',
          color: 'white',
          textAlign: 'center' as const
        }}>
          <div style={{ fontSize: '24px', fontWeight: '600' }}>{logs.length}</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Operations</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #2ecc71, #27ae60)',
          borderRadius: '12px',
          padding: '20px',
          color: 'white',
          textAlign: 'center' as const
        }}>
          <div style={{ fontSize: '24px', fontWeight: '600' }}>
            {logs.filter(log => log.status === 'success').length}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Successful</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
          borderRadius: '12px',
          padding: '20px',
          color: 'white',
          textAlign: 'center' as const
        }}>
          <div style={{ fontSize: '24px', fontWeight: '600' }}>
            {logs.filter(log => log.operation.includes('update')).length}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Updates</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #f39c12, #e67e22)',
          borderRadius: '12px',
          padding: '20px',
          color: 'white',
          textAlign: 'center' as const
        }}>
          <div style={{ fontSize: '24px', fontWeight: '600' }}>
            {autoRefresh ? '🟢' : '🔴'}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Auto Refresh</div>
        </div>
      </div>

      {/* Logs Table */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        {filteredLogs.length === 0 ? (
          <div style={{
            textAlign: 'center' as const,
            padding: '40px',
            color: '#7f8c8d'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
              No Logs Found
            </div>
            <div style={{ fontSize: '14px' }}>
              {filter === 'all' ? 'No activity recorded yet' : `No ${filter} operations found`}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8f9fa' }}>
                <tr>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>
                    Operation
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>
                    User
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>
                    Details
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>
                    Status
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#2c3e50' }}>
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, index) => (
                  <tr key={index} style={{
                    borderBottom: '1px solid #e1e5e9',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (e.currentTarget instanceof HTMLElement) {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (e.currentTarget instanceof HTMLElement) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  >
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>{getOperationIcon(log.operation)}</span>
                        <div>
                          <div style={{ fontWeight: '600', color: '#2c3e50' }}>
                            {log.operation.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: '#7f8c8d' }}>
                      {log.user}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#7f8c8d', maxWidth: '200px' }}>
                        {JSON.stringify(log.details, null, 0).substring(0, 100)}
                        {JSON.stringify(log.details).length > 100 && '...'}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'white',
                        backgroundColor: getStatusColor(log.status)
                      }}>
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: '#7f8c8d', fontSize: '14px' }}>
                      {formatTimestamp(log.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.8)',
        borderRadius: '8px',
        textAlign: 'center' as const,
        fontSize: '14px',
        color: '#7f8c8d'
      }}>
        📊 Logs are updated in real-time • 
        {autoRefresh && ' Auto-refreshing every 5 seconds • '}
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default SettingsLogsComponent; 