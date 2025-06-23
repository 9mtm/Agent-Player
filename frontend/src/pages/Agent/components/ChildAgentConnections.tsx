import React, { useState } from 'react';
import { useNotificationContext } from '../../../context/NotificationContext';

interface LLMConnection {
  name: string;
  status: 'connected' | 'disconnected' | 'syncing';
  type: 'primary' | 'backup' | 'specialized';
  lastSync: string;
  responseTime: string;
}

interface ChildAgentConnectionsProps {
  isOpen: boolean;
  onClose: () => void;
  agentName: string;
  connections: string[];
}

export const ChildAgentConnections: React.FC<ChildAgentConnectionsProps> = ({
  isOpen,
  onClose,
  agentName,
  connections,
}) => {
  const { showInfo, showSuccess } = useNotificationContext();
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);

  // Mock detailed connection data
  const connectionDetails: Record<string, LLMConnection> = {
    'GPT-4': {
      name: 'GPT-4',
      status: 'connected',
      type: 'primary',
      lastSync: '2 minutes ago',
      responseTime: '0.8s',
    },
    'Claude 3': {
      name: 'Claude 3 Sonnet',
      status: 'connected',
      type: 'backup',
      lastSync: '5 minutes ago',
      responseTime: '1.2s',
    },
    'GPT-4o': {
      name: 'GPT-4o',
      status: 'syncing',
      type: 'specialized',
      lastSync: '1 minute ago',
      responseTime: '0.6s',
    },
    'Gemini Pro': {
      name: 'Gemini Pro',
      status: 'connected',
      type: 'specialized',
      lastSync: '3 minutes ago',
      responseTime: '1.1s',
    },
    'Claude 3 Haiku': {
      name: 'Claude 3 Haiku',
      status: 'disconnected',
      type: 'backup',
      lastSync: '15 minutes ago',
      responseTime: '-',
    },
  };

  const styles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '16px',
      width: '90%',
      maxWidth: '700px',
      maxHeight: '80vh',
      overflow: 'auto',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
    },
    header: {
      padding: '24px',
      borderBottom: '1px solid #e9ecef',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      borderRadius: '16px 16px 0 0',
    },
    title: {
      fontSize: '20px',
      fontWeight: 'bold',
      marginBottom: '8px',
    },
    subtitle: {
      fontSize: '14px',
      opacity: 0.9,
    },
    content: {
      padding: '24px',
    },
    connectionGrid: {
      display: 'grid',
      gap: '16px',
    },
    connectionCard: {
      border: '2px solid #e9ecef',
      borderRadius: '12px',
      padding: '16px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    connectionCardSelected: {
      borderColor: '#667eea',
      backgroundColor: '#f8f9ff',
    },
    connectionHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px',
    },
    connectionName: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#2c3e50',
    },
    connectionType: {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '600',
      textTransform: 'uppercase' as const,
    },
    primaryType: {
      backgroundColor: '#e3f2fd',
      color: '#1976d2',
    },
    backupType: {
      backgroundColor: '#fff3e0',
      color: '#f57c00',
    },
    specializedType: {
      backgroundColor: '#e8f5e8',
      color: '#388e3c',
    },
    connectionStatus: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '8px',
    },
    statusIndicator: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
    },
    connectedStatus: {
      backgroundColor: '#4caf50',
    },
    disconnectedStatus: {
      backgroundColor: '#f44336',
    },
    syncingStatus: {
      backgroundColor: '#ff9800',
      animation: 'pulse 2s infinite',
    },
    connectionDetails: {
      fontSize: '12px',
      color: '#666',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '8px',
    },
    addConnectionButton: {
      width: '100%',
      padding: '12px',
      border: '2px dashed #ccc',
      borderRadius: '12px',
      backgroundColor: 'transparent',
      color: '#666',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s ease',
      marginTop: '16px',
    },
    actions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      paddingTop: '16px',
      borderTop: '1px solid #e9ecef',
      marginTop: '24px',
    },
    button: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s ease',
    },
    primaryButton: {
      backgroundColor: '#667eea',
      color: 'white',
    },
    secondaryButton: {
      backgroundColor: '#e9ecef',
      color: '#495057',
    },
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return styles.connectedStatus;
      case 'disconnected': return styles.disconnectedStatus;
      case 'syncing': return styles.syncingStatus;
      default: return styles.disconnectedStatus;
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'primary': return styles.primaryType;
      case 'backup': return styles.backupType;
      case 'specialized': return styles.specializedType;
      default: return styles.primaryType;
    }
  };

  const handleAddConnection = () => {
    showInfo('Feature Coming Soon', 'Add new LLM connection feature will be available in the next update!');
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            🔗 LLM Connections - {agentName}
          </h2>
          <p style={styles.subtitle}>
            Manage external LLM connections for this child agent
          </p>
        </div>

        <div style={styles.content}>
          <div style={styles.connectionGrid}>
            {connections.map((connectionName) => {
              const connection = connectionDetails[connectionName];
              if (!connection) return null;

              const isSelected = selectedConnection === connectionName;

              return (
                <div
                  key={connectionName}
                  style={{
                    ...styles.connectionCard,
                    ...(isSelected ? styles.connectionCardSelected : {}),
                  }}
                  onClick={() => setSelectedConnection(
                    isSelected ? null : connectionName
                  )}
                >
                  <div style={styles.connectionHeader}>
                    <div style={styles.connectionName}>
                      {connection.name}
                    </div>
                    <div
                      style={{
                        ...styles.connectionType,
                        ...getTypeStyle(connection.type),
                      }}
                    >
                      {connection.type}
                    </div>
                  </div>

                  <div style={styles.connectionStatus}>
                    <div
                      style={{
                        ...styles.statusIndicator,
                        ...getStatusColor(connection.status),
                      }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>
                      {connection.status.charAt(0).toUpperCase() + connection.status.slice(1)}
                    </span>
                  </div>

                  <div style={styles.connectionDetails}>
                    <div>⏱️ Last Sync: {connection.lastSync}</div>
                    <div>🚀 Response: {connection.responseTime}</div>
                  </div>

                  {isSelected && (
                    <div style={{ marginTop: '12px', fontSize: '12px', color: '#888' }}>
                      <div>🎯 This LLM serves as the {connection.type} model for specific tasks</div>
                      <div>📊 Handles approximately 1,200 requests per hour</div>
                      <div>🔄 Auto-switches to backup if response time {'>'}{'3s'}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            style={styles.addConnectionButton}
            onClick={handleAddConnection}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#667eea';
              e.currentTarget.style.color = '#667eea';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#ccc';
              e.currentTarget.style.color = '#666';
            }}
          >
            ➕ Add New LLM Connection
          </button>

          <div style={styles.actions}>
            <button
              style={{ ...styles.button, ...styles.secondaryButton }}
              onClick={onClose}
            >
              Close
            </button>
            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={() => showSuccess('Settings Saved', 'Connection settings have been saved successfully!')}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 