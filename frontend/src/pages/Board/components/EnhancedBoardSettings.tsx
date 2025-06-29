import React, { useState, useEffect } from 'react';
import { ConnectionType } from './WorkflowBoard';
import api from '../../../services/api';

interface EnhancedBoardSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  boardName: string;
  setBoardName: (name: string) => void;
  connectionType: ConnectionType;
  onConnectionTypeChange: (type: ConnectionType) => void;
  agentId?: string;
}

interface BoardEndpoint {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: Record<string, string>;
  isActive: boolean;
}

interface BoardPermissions {
  canEdit: boolean;
  canShare: boolean;
  canExport: boolean;
  canDelete: boolean;
  visibility: 'private' | 'team' | 'public';
}

export const EnhancedBoardSettings: React.FC<EnhancedBoardSettingsProps> = ({
  isOpen,
  onClose,
  boardName,
  setBoardName,
  connectionType,
  onConnectionTypeChange,
  agentId
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'endpoints' | 'permissions' | 'automation' | 'publish' | 'memory' | 'advanced'>('general');
  const [tempBoardName, setTempBoardName] = useState(boardName);
  const [boardId] = useState(`BOARD-${Date.now().toString().slice(-6)}`);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishSettings, setPublishSettings] = useState({
    isPublished: false,
    publishType: 'free' as 'free' | 'paid',
    price: '',
    currency: 'USD',
    category: 'automation',
    description: '',
    tags: '',
    features: [''],
    requirements: ''
  });
  const [endpoints, setEndpoints] = useState<BoardEndpoint[]>([
    {
      id: 'ep-1',
      name: 'Webhook Trigger',
      url: `/boards/${boardId}/webhook`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      isActive: true
    },
    {
      id: 'ep-2', 
      name: 'Execute Workflow',
      url: `/boards/${boardId}/execute`,
      method: 'POST',
      headers: { 'Authorization': 'Bearer <token>' },
      isActive: true
    }
  ]);
  
  const [permissions, setPermissions] = useState<BoardPermissions>({
    canEdit: true,
    canShare: true,
    canExport: true,
    canDelete: true,
    visibility: 'private'
  });

  const [automationSettings, setAutomationSettings] = useState({
    autoSave: true,
    autoRun: false,
    scheduleEnabled: false,
    scheduleInterval: '1h',
    retryOnError: true,
    maxRetries: 3,
    notifyOnComplete: true,
    notifyOnError: true
  });

  // Memory settings state
  const [memorySettings, setMemorySettings] = useState({
    enableMemory: true,
    dataRetention: 'forever' as 'forever' | 'custom',
    customRetentionValue: 3,
    customRetentionUnit: 'months' as 'days' | 'months' | 'years',
    autoDeleteOperations: false,
    operationRetentionValue: 6,
    operationRetentionUnit: 'months' as 'days' | 'months' | 'years',
    memoryOptimization: true,
    compressionEnabled: true
  });

  const boardEndpoints = {
    webhook: (boardId: string) => `/boards/${boardId}/webhook`,
    execute: (boardId: string) => `/boards/${boardId}/execute`,
    custom: (boardId: string) => `/boards/${boardId}/custom`,
  };

  const handleWebhookUpdate = async (boardId: string, data: any) => {
    try {
      await api.put(boardEndpoints.webhook(boardId), data);
      // Handle success
    } catch (error) {
      console.error('Error updating webhook:', error);
      // Handle error
    }
  };

  const handleExecute = async (boardId: string, data: any) => {
    try {
      await api.post(boardEndpoints.execute(boardId), data);
      // Handle success
    } catch (error) {
      console.error('Error executing board:', error);
      // Handle error
    }
  };

  const handleCustomUpdate = async (boardId: string, data: any) => {
    try {
      await api.put(boardEndpoints.custom(boardId), data);
      // Handle success
    } catch (error) {
      console.error('Error updating custom settings:', error);
      // Handle error
    }
  };

  useEffect(() => {
    setTempBoardName(boardName);
  }, [boardName, isOpen]);

  const handleSave = () => {
    setBoardName(tempBoardName);
    onClose();
  };

  const handleAddEndpoint = () => {
    const newEndpoint: BoardEndpoint = {
      id: `ep-${Date.now()}`,
      name: 'New Endpoint',
      url: `/boards/${boardId}/custom`,
      method: 'POST',
      headers: {},
      isActive: true
    };
    setEndpoints([...endpoints, newEndpoint]);
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'general', label: 'General', icon: 'fas fa-cog' },
    { id: 'endpoints', label: 'Endpoints', icon: 'fas fa-link' },
    { id: 'permissions', label: 'Permissions', icon: 'fas fa-shield-alt' },
    { id: 'automation', label: 'Automation', icon: 'fas fa-robot' },
    { id: 'publish', label: 'Publish', icon: 'fas fa-upload' },
    { id: 'memory', label: 'Memory', icon: 'fas fa-memory' },
    { id: 'advanced', label: 'Advanced', icon: 'fas fa-tools' }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      backdropFilter: 'blur(5px)'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '900px',
        maxHeight: '80vh',
        overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '600' }}>
              <i className="fas fa-cogs" style={{ marginRight: '10px' }}></i>
              Board Settings
            </h2>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
              Configure your workflow board settings and preferences
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              padding: '8px 10px',
              fontSize: '16px'
            }}
          >
            <i className="fas fa-times" />
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1 }}>
          {/* Tab Navigation */}
          <div style={{
            width: '200px',
            background: '#f8f9fa',
            borderRight: '1px solid #e9ecef',
            padding: '20px 0'
          }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  border: 'none',
                  background: activeTab === tab.id ? '#667eea' : 'transparent',
                  color: activeTab === tab.id ? 'white' : '#6c757d',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <i className={tab.icon}></i>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
            
            {/* General Tab */}
            {activeTab === 'general' && (
              <div>
                <h3 style={{ marginTop: 0, color: '#333', fontSize: '18px' }}>General Settings</h3>
                
                {/* Board Info */}
                <div style={{ marginBottom: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#495057' }}>Board Information</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
                        Board ID
                      </label>
                      <input
                        type="text"
                        value={boardId}
                        readOnly
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          background: '#e9ecef',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
                        Agent ID
                      </label>
                      <input
                        type="text"
                        value={agentId || 'Not Connected'}
                        readOnly
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          background: '#e9ecef',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                    Board Name
                  </label>
                  <input
                    type="text"
                    value={tempBoardName}
                    onChange={(e) => setTempBoardName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e9ecef',
                      borderRadius: '8px',
                      fontSize: '16px',
                      transition: 'border-color 0.2s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                    Default Connection Type
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {(['curved', 'straight', 'stepped'] as ConnectionType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => onConnectionTypeChange(type)}
                        style={{
                          padding: '10px 16px',
                          border: `2px solid ${connectionType === type ? '#667eea' : '#e9ecef'}`,
                          borderRadius: '8px',
                          background: connectionType === type ? '#667eea' : 'white',
                          color: connectionType === type ? 'white' : '#333',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          textTransform: 'capitalize',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Endpoints Tab */}
            {activeTab === 'endpoints' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, color: '#333', fontSize: '18px' }}>API Endpoints</h3>
                  <button
                    onClick={handleAddEndpoint}
                    style={{
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    <i className="fas fa-plus" style={{ marginRight: '6px' }}></i>
                    Add Endpoint
                  </button>
                </div>

                {endpoints.map((endpoint) => (
                  <div key={endpoint.id} style={{
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '16px',
                    background: endpoint.isActive ? 'white' : '#f8f9fa'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          value={endpoint.name}
                          onChange={(e) => {
                            const updated = endpoints.map(ep => 
                              ep.id === endpoint.id ? { ...ep, name: e.target.value } : ep
                            );
                            setEndpoints(updated);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '16px',
                            fontWeight: '600'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                        <span style={{
                          background: endpoint.method === 'GET' ? '#28a745' : '#007bff',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {endpoint.method}
                        </span>
                        <button
                          onClick={() => {
                            const updated = endpoints.map(ep => 
                              ep.id === endpoint.id ? { ...ep, isActive: !ep.isActive } : ep
                            );
                            setEndpoints(updated);
                          }}
                          style={{
                            background: endpoint.isActive ? '#dc3545' : '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          {endpoint.isActive ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: '#666' }}>
                        URL
                      </label>
                      <input
                        type="text"
                        value={endpoint.url}
                        readOnly
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          background: '#f8f9fa',
                          fontSize: '14px',
                          fontFamily: 'monospace'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Permissions Tab */}
            {activeTab === 'permissions' && (
              <div>
                <h3 style={{ marginTop: 0, color: '#333', fontSize: '18px' }}>Access & Permissions</h3>
                
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 16px 0', color: '#495057' }}>Board Visibility</h4>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {[
                      { key: 'private', label: 'Private', icon: 'fas fa-lock', color: '#dc3545' },
                      { key: 'team', label: 'Team', icon: 'fas fa-users', color: '#ffc107' },
                      { key: 'public', label: 'Public', icon: 'fas fa-globe', color: '#28a745' }
                    ].map((vis) => (
                      <button
                        key={vis.key}
                        onClick={() => setPermissions({ ...permissions, visibility: vis.key as any })}
                        style={{
                          padding: '12px 16px',
                          border: `2px solid ${permissions.visibility === vis.key ? vis.color : '#e9ecef'}`,
                          borderRadius: '8px',
                          background: permissions.visibility === vis.key ? vis.color : 'white',
                          color: permissions.visibility === vis.key ? 'white' : '#333',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <i className={vis.icon}></i>
                        {vis.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 16px 0', color: '#495057' }}>User Permissions</h4>
                  {Object.entries(permissions).filter(([key]) => key !== 'visibility').map(([key, value]) => (
                    <div key={key} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: '1px solid #e9ecef'
                    }}>
                      <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>
                        {key.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <button
                        onClick={() => setPermissions({ ...permissions, [key]: !value })}
                        style={{
                          background: value ? '#28a745' : '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '20px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}
                      >
                        {value ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Automation Tab */}
            {activeTab === 'automation' && (
              <div>
                <h3 style={{ marginTop: 0, color: '#333', fontSize: '18px' }}>Automation Settings</h3>
                
                {Object.entries(automationSettings).map(([key, value]) => (
                  <div key={key} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 0',
                    borderBottom: '1px solid #e9ecef'
                  }}>
                    <div>
                      <span style={{ fontWeight: '500', textTransform: 'capitalize', display: 'block' }}>
                        {key.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <span style={{ fontSize: '12px', color: '#6c757d' }}>
                        {key === 'autoSave' && 'Automatically save board changes'}
                        {key === 'autoRun' && 'Run workflow automatically when triggered'}
                        {key === 'scheduleEnabled' && 'Enable scheduled workflow execution'}
                        {key === 'retryOnError' && 'Retry workflow execution on failure'}
                        {key === 'notifyOnComplete' && 'Send notification when workflow completes'}
                        {key === 'notifyOnError' && 'Send notification when workflow fails'}
                      </span>
                    </div>
                    {typeof value === 'boolean' ? (
                      <button
                        onClick={() => setAutomationSettings({ ...automationSettings, [key]: !value })}
                        style={{
                          background: value ? '#28a745' : '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '20px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}
                      >
                        {value ? 'Enabled' : 'Disabled'}
                      </button>
                    ) : (
                      <input
                        type={typeof value === 'number' ? 'number' : 'text'}
                        value={value}
                        onChange={(e) => setAutomationSettings({ 
                          ...automationSettings, 
                          [key]: typeof value === 'number' ? parseInt(e.target.value) : e.target.value 
                        })}
                        style={{
                          width: '120px',
                          padding: '6px 10px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Publish Tab */}
            {activeTab === 'publish' && (
              <div>
                <h3 style={{ marginTop: 0, color: '#333', fontSize: '18px' }}>Publish Settings</h3>
                
                {Object.entries(publishSettings).map(([key, value]) => (
                  <div key={key} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 0',
                    borderBottom: '1px solid #e9ecef'
                  }}>
                    <div>
                      <span style={{ fontWeight: '500', textTransform: 'capitalize', display: 'block' }}>
                        {key.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <span style={{ fontSize: '12px', color: '#6c757d' }}>
                        {key === 'isPublished' && 'Is the board published'}
                        {key === 'publishType' && 'Publish type'}
                        {key === 'price' && 'Price'}
                        {key === 'currency' && 'Currency'}
                        {key === 'category' && 'Category'}
                        {key === 'description' && 'Description'}
                        {key === 'tags' && 'Tags'}
                        {key === 'features' && 'Features'}
                        {key === 'requirements' && 'Requirements'}
                      </span>
                    </div>
                    {typeof value === 'boolean' ? (
                      <button
                        onClick={() => setPublishSettings({ ...publishSettings, [key]: !value })}
                        style={{
                          background: value ? '#28a745' : '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '20px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}
                      >
                        {value ? 'Enabled' : 'Disabled'}
                      </button>
                    ) : (
                      <input
                        type={typeof value === 'number' ? 'number' : 'text'}
                        value={value}
                        onChange={(e) => setPublishSettings({ 
                          ...publishSettings, 
                          [key]: typeof value === 'number' ? parseInt(e.target.value) : e.target.value 
                        })}
                        style={{
                          width: '120px',
                          padding: '6px 10px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Memory Tab */}
            {activeTab === 'memory' && (
              <div>
                <h3 style={{ marginTop: 0, color: '#333', fontSize: '18px' }}>Memory & Data Management</h3>
                
                {/* Enable Memory */}
                <div style={{ marginBottom: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#495057' }}>Memory Status</h4>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontWeight: '500', display: 'block' }}>Enable Memory System</span>
                      <span style={{ fontSize: '12px', color: '#6c757d' }}>
                        Turn on/off the memory system for storing workflow data and operations
                      </span>
                    </div>
                    <button
                      onClick={() => setMemorySettings({ ...memorySettings, enableMemory: !memorySettings.enableMemory })}
                      style={{
                        background: memorySettings.enableMemory ? '#28a745' : '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      {memorySettings.enableMemory ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>

                {/* Data Retention Settings */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 16px 0', color: '#495057' }}>Data Retention Policy</h4>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                      Keep Data & Memory:
                    </label>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                      <button
                        onClick={() => setMemorySettings({ ...memorySettings, dataRetention: 'forever' })}
                        style={{
                          padding: '10px 16px',
                          border: `2px solid ${memorySettings.dataRetention === 'forever' ? '#28a745' : '#e9ecef'}`,
                          borderRadius: '8px',
                          background: memorySettings.dataRetention === 'forever' ? '#28a745' : 'white',
                          color: memorySettings.dataRetention === 'forever' ? 'white' : '#333',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        🌟 Forever (Never Delete)
                      </button>
                      <button
                        onClick={() => setMemorySettings({ ...memorySettings, dataRetention: 'custom' })}
                        style={{
                          padding: '10px 16px',
                          border: `2px solid ${memorySettings.dataRetention === 'custom' ? '#667eea' : '#e9ecef'}`,
                          borderRadius: '8px',
                          background: memorySettings.dataRetention === 'custom' ? '#667eea' : 'white',
                          color: memorySettings.dataRetention === 'custom' ? 'white' : '#333',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        ⏰ Custom Duration
                      </button>
                    </div>

                    {/* Custom Retention Settings */}
                    {memorySettings.dataRetention === 'custom' && (
                      <div style={{ 
                        padding: '16px', 
                        background: '#e3f2fd', 
                        borderRadius: '8px',
                        border: '1px solid #bbdefb'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                          <span style={{ fontWeight: '500' }}>Delete data after:</span>
                          <input
                            type="number"
                            min="1"
                            max="999"
                            value={memorySettings.customRetentionValue}
                            onChange={(e) => setMemorySettings({ 
                              ...memorySettings, 
                              customRetentionValue: parseInt(e.target.value) 
                            })}
                            style={{
                              width: '80px',
                              padding: '6px 10px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '14px',
                              textAlign: 'center'
                            }}
                          />
                          <select
                            value={memorySettings.customRetentionUnit}
                            onChange={(e) => setMemorySettings({ 
                              ...memorySettings, 
                              customRetentionUnit: e.target.value as 'days' | 'months' | 'years'
                            })}
                            style={{
                              padding: '6px 10px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '14px'
                            }}
                          >
                            <option value="days">Days</option>
                            <option value="months">Months</option>
                            <option value="years">Years</option>
                          </select>
                        </div>
                        <div style={{ fontSize: '12px', color: '#1976d2' }}>
                          📅 Data will be automatically deleted after {memorySettings.customRetentionValue} {memorySettings.customRetentionUnit}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Operations Retention */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 16px 0', color: '#495057' }}>Operations & Workflow History</h4>
                  
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                    padding: '12px 0',
                    borderBottom: '1px solid #e9ecef'
                  }}>
                    <div>
                      <span style={{ fontWeight: '500', display: 'block' }}>Auto-Delete Operations</span>
                      <span style={{ fontSize: '12px', color: '#6c757d' }}>
                        Automatically remove old workflow execution logs
                      </span>
                    </div>
                    <button
                      onClick={() => setMemorySettings({ ...memorySettings, autoDeleteOperations: !memorySettings.autoDeleteOperations })}
                      style={{
                        background: memorySettings.autoDeleteOperations ? '#ffc107' : '#dc3545',
                        color: memorySettings.autoDeleteOperations ? '#212529' : 'white',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}
                    >
                      {memorySettings.autoDeleteOperations ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {/* Operations Retention Duration */}
                  {memorySettings.autoDeleteOperations && (
                    <div style={{ 
                      padding: '16px', 
                      background: '#fff3cd', 
                      borderRadius: '8px',
                      border: '1px solid #ffeaa7'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <span style={{ fontWeight: '500' }}>Delete operations after:</span>
                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={memorySettings.operationRetentionValue}
                          onChange={(e) => setMemorySettings({ 
                            ...memorySettings, 
                            operationRetentionValue: parseInt(e.target.value) 
                          })}
                          style={{
                            width: '80px',
                            padding: '6px 10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px',
                            textAlign: 'center'
                          }}
                        />
                        <select
                          value={memorySettings.operationRetentionUnit}
                          onChange={(e) => setMemorySettings({ 
                            ...memorySettings, 
                            operationRetentionUnit: e.target.value as 'days' | 'months' | 'years'
                          })}
                          style={{
                            padding: '6px 10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px'
                          }}
                        >
                          <option value="days">Days</option>
                          <option value="months">Months</option>
                          <option value="years">Years</option>
                        </select>
                      </div>
                      <div style={{ fontSize: '12px', color: '#856404' }}>
                        🗂️ Operation logs will be deleted after {memorySettings.operationRetentionValue} {memorySettings.operationRetentionUnit}
                      </div>
                    </div>
                  )}
                </div>

                {/* Memory Optimization */}
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 16px 0', color: '#495057' }}>Performance Optimization</h4>
                  
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '12px 0',
                    borderBottom: '1px solid #e9ecef'
                  }}>
                    <div>
                      <span style={{ fontWeight: '500', display: 'block' }}>Memory Optimization</span>
                      <span style={{ fontSize: '12px', color: '#6c757d' }}>
                        Optimize memory usage by cleaning unused data
                      </span>
                    </div>
                    <button
                      onClick={() => setMemorySettings({ ...memorySettings, memoryOptimization: !memorySettings.memoryOptimization })}
                      style={{
                        background: memorySettings.memoryOptimization ? '#28a745' : '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}
                    >
                      {memorySettings.memoryOptimization ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '12px 0'
                  }}>
                    <div>
                      <span style={{ fontWeight: '500', display: 'block' }}>Data Compression</span>
                      <span style={{ fontSize: '12px', color: '#6c757d' }}>
                        Compress stored data to save space
                      </span>
                    </div>
                    <button
                      onClick={() => setMemorySettings({ ...memorySettings, compressionEnabled: !memorySettings.compressionEnabled })}
                      style={{
                        background: memorySettings.compressionEnabled ? '#28a745' : '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}
                    >
                      {memorySettings.compressionEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <div>
                <h3 style={{ marginTop: 0, color: '#333', fontSize: '18px' }}>Advanced Settings</h3>
                
                <div style={{ padding: '20px', background: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '8px', marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: '#856404' }}>
                    <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                    Danger Zone
                  </h4>
                  <p style={{ margin: '0 0 16px 0', color: '#856404', fontSize: '14px' }}>
                    These actions cannot be undone. Please proceed with caution.
                  </p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button style={{
                      background: '#ffc107',
                      color: '#212529',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      Reset Board
                    </button>
                    <button style={{
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      Delete Board
                    </button>
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 16px 0', color: '#495057' }}>Export & Import</h4>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button style={{
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 16px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      <i className="fas fa-download" style={{ marginRight: '8px' }}></i>
                      Export Board
                    </button>
                    <button style={{
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 16px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      <i className="fas fa-upload" style={{ marginRight: '8px' }}></i>
                      Import Board
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 24px',
          background: '#f8f9fa',
          borderTop: '1px solid #e9ecef',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}; 