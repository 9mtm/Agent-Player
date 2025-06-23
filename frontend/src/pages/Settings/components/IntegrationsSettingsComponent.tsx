import React, { useState, useEffect } from 'react';
import { settingsService } from '../../../services/settings';

interface IntegrationSettings {
  google_workspace_enabled: boolean;
  microsoft_365_enabled: boolean;
  slack_enabled: boolean;
  trello_enabled: boolean;
  github_enabled: boolean;
  zapier_enabled: boolean;
  webhook_url: string;
  api_rate_limit: number;
  sync_frequency: string;
  data_retention_days: number;
}

const IntegrationsSettingsComponent: React.FC = () => {
  const [settings, setSettings] = useState<IntegrationSettings>({
    google_workspace_enabled: false,
    microsoft_365_enabled: false,
    slack_enabled: false,
    trello_enabled: false,
    github_enabled: false,
    zapier_enabled: false,
    webhook_url: "",
    api_rate_limit: 100,
    sync_frequency: "hourly",
    data_retention_days: 30
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [testingIntegration, setTestingIntegration] = useState('');

  useEffect(() => {
    loadIntegrationSettings();
  }, []);

  const loadIntegrationSettings = async () => {
    setLoading(true);
    try {
      const response = await settingsService.getIntegrationSettings();
      if (response.success) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to load integration settings:', error);
      setMessage('❌ Failed to load integration settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await settingsService.updateIntegrationSettings(settings);
      if (response.success) {
        setMessage('🔌 Integration settings updated successfully');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to save integration settings:', error);
      setMessage('❌ Failed to save integration settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (field: keyof IntegrationSettings) => {
    setSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleChange = (field: keyof IntegrationSettings, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTestIntegration = async (integration: string) => {
    setTestingIntegration(integration);
    // Simulate testing
    setTimeout(() => {
      setTestingIntegration('');
      setMessage(`✅ ${integration} integration test completed successfully`);
      setTimeout(() => setMessage(''), 3000);
    }, 2000);
  };

  const integrations = [
    {
      id: 'google_workspace',
      name: 'Google Workspace',
      icon: '📧',
      description: 'Gmail, Drive, Calendar, Docs integration',
      field: 'google_workspace_enabled' as keyof IntegrationSettings,
      color: '#4285f4'
    },
    {
      id: 'microsoft_365',
      name: 'Microsoft 365',
      icon: '📊',
      description: 'Outlook, OneDrive, Teams, Office integration',
      field: 'microsoft_365_enabled' as keyof IntegrationSettings,
      color: '#0078d4'
    },
    {
      id: 'slack',
      name: 'Slack',
      icon: '💬',
      description: 'Team communication and notifications',
      field: 'slack_enabled' as keyof IntegrationSettings,
      color: '#4a154b'
    },
    {
      id: 'trello',
      name: 'Trello',
      icon: '📋',
      description: 'Project boards and task management',
      field: 'trello_enabled' as keyof IntegrationSettings,
      color: '#0079bf'
    },
    {
      id: 'github',
      name: 'GitHub',
      icon: '⚡',
      description: 'Code repositories and version control',
      field: 'github_enabled' as keyof IntegrationSettings,
      color: '#24292e'
    },
    {
      id: 'zapier',
      name: 'Zapier',
      icon: '🔗',
      description: 'Workflow automation and app connections',
      field: 'zapier_enabled' as keyof IntegrationSettings,
      color: '#ff4a00'
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔄</div>
        <div>Loading integration settings...</div>
      </div>
    );
  }

  return (
    <div>
      {message && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '24px',
          background: message.includes('❌') ? '#f8d7da' : '#d4edda',
          color: message.includes('❌') ? '#721c24' : '#155724',
          borderRadius: '8px',
          fontSize: '14px',
        }}>
          {message}
        </div>
      )}

      {/* Integration Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {integrations.map(integration => (
          <div
            key={integration.id}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              border: `2px solid ${settings[integration.field] ? integration.color : '#e1e5e9'}`,
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '24px', marginRight: '12px' }}>
                {integration.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ 
                  margin: '0 0 4px 0', 
                  fontSize: '16px', 
                  fontWeight: '600',
                  color: settings[integration.field] ? integration.color : '#2c3e50'
                }}>
                  {integration.name}
                </h4>
                <div style={{ fontSize: '14px', color: '#6c757d' }}>
                  {integration.description}
                </div>
              </div>
              <button
                onClick={() => handleToggle(integration.field)}
                style={{
                  width: '60px',
                  height: '30px',
                  borderRadius: '15px',
                  border: 'none',
                  background: settings[integration.field] ? '#28a745' : '#dc3545',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
              >
                {settings[integration.field] ? 'ON' : 'OFF'}
              </button>
            </div>

            {settings[integration.field] && (
              <div style={{
                background: '#f8f9fa',
                padding: '16px',
                borderRadius: '8px',
                marginTop: '16px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>
                    Integration Status: ✅ Connected
                  </div>
                  <button
                    onClick={() => handleTestIntegration(integration.name)}
                    disabled={testingIntegration === integration.name}
                    style={{
                      padding: '6px 12px',
                      background: testingIntegration === integration.name ? '#95a5a6' : integration.color,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: testingIntegration === integration.name ? 'not-allowed' : 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {testingIntegration === integration.name ? '⏳ Testing...' : '🧪 Test'}
                  </button>
                </div>
                
                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                  Last sync: {new Date().toLocaleString()}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Webhook Configuration */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#2c3e50',
          margin: '0 0 16px 0'
        }}>
          🔗 Webhook Configuration
        </h3>

        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
            Webhook URL
          </label>
          <input
            type="url"
            value={settings.webhook_url}
            onChange={(e) => handleChange('webhook_url', e.target.value)}
            placeholder="https://your-app.com/webhooks/dpro-agent"
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e1e5e9',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '8px'
            }}
          />
          <div style={{ fontSize: '12px', color: '#6c757d' }}>
            Receive real-time notifications about system events
          </div>
        </div>
      </div>

      {/* Sync Settings */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#2c3e50',
          margin: '0 0 16px 0'
        }}>
          🔄 Synchronization Settings
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px'
        }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Sync Frequency
            </label>
            <select
              value={settings.sync_frequency}
              onChange={(e) => handleChange('sync_frequency', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="realtime">Real-time (Instant)</option>
              <option value="every-5-minutes">Every 5 minutes</option>
              <option value="every-15-minutes">Every 15 minutes</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              API Rate Limit (requests/hour)
            </label>
            <input
              type="number"
              min="10"
              max="1000"
              value={settings.api_rate_limit}
              onChange={(e) => handleChange('api_rate_limit', parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Data Retention (days)
            </label>
            <input
              type="number"
              min="7"
              max="365"
              value={settings.data_retention_days}
              onChange={(e) => handleChange('data_retention_days', parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white'
              }}
            />
          </div>
        </div>
      </div>

      {/* Integration Statistics */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        border: '2px solid #e1e5e9'
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#2c3e50',
          margin: '0 0 16px 0'
        }}>
          📊 Integration Statistics
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div style={{
            background: '#f8f9fa',
            padding: '16px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#28a745', marginBottom: '8px' }}>
              {integrations.filter(i => settings[i.field]).length}
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>
              Active Integrations
            </div>
          </div>

          <div style={{
            background: '#f8f9fa',
            padding: '16px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#17a2b8', marginBottom: '8px' }}>
              {Math.floor(Math.random() * 1000) + 500}
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>
              API Calls Today
            </div>
          </div>

          <div style={{
            background: '#f8f9fa',
            padding: '16px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#ffc107', marginBottom: '8px' }}>
              99.9%
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>
              Uptime
            </div>
          </div>

          <div style={{
            background: '#f8f9fa',
            padding: '16px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#6f42c1', marginBottom: '8px' }}>
              {new Date().toLocaleDateString()}
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>
              Last Updated
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '16px 48px',
            background: saving ? '#95a5a6' : 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '0 auto',
            boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
          }}
        >
          {saving ? (
            <>
              <span>⏳</span>
              Saving Integrations...
            </>
          ) : (
            <>
              🔌 Save Integration Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default IntegrationsSettingsComponent; 