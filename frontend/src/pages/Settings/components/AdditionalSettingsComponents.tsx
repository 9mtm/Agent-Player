import React, { useState, useEffect } from 'react';
import config from '../../../config';
import api from '../../../services/api';

// Privacy Controls Component
export const PrivacyControlsComponent: React.FC = () => {
  const [privacyData, setPrivacyData] = useState({
    data_collection: true,
    analytics_tracking: false,
    third_party_sharing: false,
    marketing_emails: true,
    data_retention_days: 365,
    cookie_consent: true,
    gdpr_compliance: true
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${config.api.baseURL}/settings/privacy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(privacyData)
      });
      if (response.ok) {
        setMessage('✅ Privacy settings saved successfully!');
      } else {
        setMessage('❌ Failed to save settings');
      }
    } catch {
      setMessage('❌ Error saving settings');
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const fetchPrivacySettings = async () => {
    try {
      const response = await api.get('/user/privacy');
      setPrivacyData(response.data);
    } catch (error) {
      console.error('Error fetching privacy settings:', error);
      // Handle error appropriately
    }
  };

  const updatePrivacySettings = async (data: any) => {
    try {
      await api.put('/user/privacy', data);
      // Handle success
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      // Handle error appropriately
    }
  };

  return (
    <div>
      {message && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '24px',
          background: message.includes('✅') ? '#d4edda' : '#f8d7da',
          color: message.includes('✅') ? '#155724' : '#721c24',
          borderRadius: '8px',
        }}>
          {message}
        </div>
      )}

      <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          🔒 Privacy Controls
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { key: 'data_collection', label: 'Allow data collection for service improvement' },
            { key: 'analytics_tracking', label: 'Enable analytics tracking' },
            { key: 'third_party_sharing', label: 'Allow third-party data sharing' },
            { key: 'marketing_emails', label: 'Receive marketing emails' },
            { key: 'cookie_consent', label: 'Accept cookies for better experience' },
            { key: 'gdpr_compliance', label: 'GDPR compliance mode' }
          ].map(item => (
            <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={privacyData[item.key as keyof typeof privacyData] as boolean}
                onChange={(e) => setPrivacyData(prev => ({ ...prev, [item.key]: e.target.checked }))}
                style={{ transform: 'scale(1.2)' }}
              />
              <span style={{ fontWeight: '500', color: '#2c3e50' }}>{item.label}</span>
            </label>
          ))}

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Data Retention Period (days)
            </label>
            <input
              type="number"
              value={privacyData.data_retention_days}
              onChange={(e) => setPrivacyData(prev => ({ ...prev, data_retention_days: parseInt(e.target.value) }))}
              min="30"
              max="3650"
              style={{
                width: '200px',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            padding: '12px 32px',
            background: loading ? '#95a5a6' : 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '⏳ Saving...' : '💾 Save Privacy Settings'}
        </button>
      </div>
    </div>
  );
};

// Layout Settings Component
export const LayoutSettingsComponent: React.FC = () => {
  const [layoutData, setLayoutData] = useState({
    sidebar_position: 'left',
    sidebar_width: 280,
    header_height: 60,
    content_padding: 20,
    border_radius: 8,
    animation_speed: 'medium',
    compact_mode: false
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${config.api.baseURL}/settings/layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(layoutData)
      });
      if (response.ok) {
        setMessage('✅ Layout settings saved successfully!');
      } else {
        setMessage('❌ Failed to save settings');
      }
    } catch {
      setMessage('❌ Error saving settings');
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const fetchLayoutSettings = async () => {
    try {
      const response = await api.get('/user/layout');
      setLayoutData(response.data);
    } catch (error) {
      console.error('Error fetching layout settings:', error);
      // Handle error appropriately
    }
  };

  const updateLayoutSettings = async (data: any) => {
    try {
      await api.put('/user/layout', data);
      // Handle success
    } catch (error) {
      console.error('Error updating layout settings:', error);
      // Handle error appropriately
    }
  };

  return (
    <div>
      {message && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '24px',
          background: message.includes('✅') ? '#d4edda' : '#f8d7da',
          color: message.includes('✅') ? '#155724' : '#721c24',
          borderRadius: '8px',
        }}>
          {message}
        </div>
      )}

      <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          📐 Layout Settings
        </h3>
        
        <div style={{ display: 'grid', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Sidebar Position
              </label>
              <select
                value={layoutData.sidebar_position}
                onChange={(e) => setLayoutData(prev => ({ ...prev, sidebar_position: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="top">Top</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Animation Speed
              </label>
              <select
                value={layoutData.animation_speed}
                onChange={(e) => setLayoutData(prev => ({ ...prev, animation_speed: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              >
                <option value="slow">Slow</option>
                <option value="medium">Medium</option>
                <option value="fast">Fast</option>
                <option value="none">No Animation</option>
              </select>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={layoutData.compact_mode}
              onChange={(e) => setLayoutData(prev => ({ ...prev, compact_mode: e.target.checked }))}
              style={{ transform: 'scale(1.2)' }}
            />
            <span style={{ fontWeight: '600', color: '#2c3e50' }}>Enable compact mode</span>
          </label>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            padding: '12px 32px',
            background: loading ? '#95a5a6' : 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '⏳ Saving...' : '💾 Save Layout Settings'}
        </button>
      </div>
    </div>
  );
};

// Typography Component
export const TypographyComponent: React.FC = () => {
  const [typography, setTypography] = useState({
    font_family: 'Inter',
    font_size: 14,
    line_height: 1.5,
    letter_spacing: 0,
    heading_font: 'Inter',
    code_font: 'Fira Code'
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${config.api.baseURL}/settings/typography`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(typography)
      });
      if (response.ok) {
        setMessage('✅ Typography settings saved successfully!');
      } else {
        setMessage('❌ Failed to save settings');
      }
    } catch {
      setMessage('❌ Error saving settings');
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const fetchTypographySettings = async () => {
    try {
      const response = await api.get('/user/typography');
      setTypography(response.data);
    } catch (error) {
      console.error('Error fetching typography settings:', error);
      // Handle error appropriately
    }
  };

  const updateTypographySettings = async (data: any) => {
    try {
      await api.put('/user/typography', data);
      // Handle success
    } catch (error) {
      console.error('Error updating typography settings:', error);
      // Handle error appropriately
    }
  };

  return (
    <div>
      {message && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '24px',
          background: message.includes('✅') ? '#d4edda' : '#f8d7da',
          color: message.includes('✅') ? '#155724' : '#721c24',
          borderRadius: '8px',
        }}>
          {message}
        </div>
      )}

      <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          🔤 Typography Settings
        </h3>
        
        <div style={{ display: 'grid', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Primary Font
              </label>
              <select
                value={typography.font_family}
                onChange={(e) => setTypography(prev => ({ ...prev, font_family: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              >
                <option value="Inter">Inter</option>
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Georgia">Georgia</option>
                <option value="Roboto">Roboto</option>
                <option value="Open Sans">Open Sans</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Heading Font
              </label>
              <select
                value={typography.heading_font}
                onChange={(e) => setTypography(prev => ({ ...prev, heading_font: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              >
                <option value="Inter">Inter</option>
                <option value="Poppins">Poppins</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Playfair Display">Playfair Display</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Code Font
              </label>
              <select
                value={typography.code_font}
                onChange={(e) => setTypography(prev => ({ ...prev, code_font: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              >
                <option value="Fira Code">Fira Code</option>
                <option value="Monaco">Monaco</option>
                <option value="Consolas">Consolas</option>
                <option value="Courier New">Courier New</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Font Size (px)
              </label>
              <input
                type="number"
                value={typography.font_size}
                onChange={(e) => setTypography(prev => ({ ...prev, font_size: parseInt(e.target.value) }))}
                min="10"
                max="24"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Line Height
              </label>
              <input
                type="number"
                step="0.1"
                value={typography.line_height}
                onChange={(e) => setTypography(prev => ({ ...prev, line_height: parseFloat(e.target.value) }))}
                min="1"
                max="3"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Letter Spacing (px)
              </label>
              <input
                type="number"
                step="0.1"
                value={typography.letter_spacing}
                onChange={(e) => setTypography(prev => ({ ...prev, letter_spacing: parseFloat(e.target.value) }))}
                min="-2"
                max="5"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          {/* Preview */}
          <div style={{
            background: 'white',
            border: '2px solid #e1e5e9',
            borderRadius: '8px',
            padding: '20px',
            marginTop: '20px'
          }}>
            <h4 style={{
              fontFamily: typography.heading_font,
              fontSize: '20px',
              margin: '0 0 12px 0',
              color: '#2c3e50'
            }}>
              Preview Heading
            </h4>
            <p style={{
              fontFamily: typography.font_family,
              fontSize: `${typography.font_size}px`,
              lineHeight: typography.line_height,
              letterSpacing: `${typography.letter_spacing}px`,
              margin: '0 0 12px 0',
              color: '#2c3e50'
            }}>
              This is how your text will look with the current typography settings. 
              You can adjust the font family, size, line height, and letter spacing above.
            </p>
            <code style={{
              fontFamily: typography.code_font,
              background: '#f8f9fa',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '13px'
            }}>
              console.log('Code preview');
            </code>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            padding: '12px 32px',
            background: loading ? '#95a5a6' : 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '⏳ Saving...' : '💾 Save Typography Settings'}
        </button>
      </div>
    </div>
  );
};

// Simplified components for remaining sections
export const PromptTemplatesComponent: React.FC = () => {
  return (
    <div>
      <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          📝 Prompt Templates
        </h3>
        <p style={{ color: '#7f8c8d' }}>Manage your AI prompt templates and create reusable prompts for different scenarios.</p>
      </div>
    </div>
  );
};

export const ModelTrainingComponent: React.FC = () => {
  return (
    <div>
      <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          🧠 Model Training
        </h3>
        <p style={{ color: '#7f8c8d' }}>Configure AI model training parameters and fine-tuning settings.</p>
      </div>
    </div>
  );
};

export const APISettingsComponent: React.FC = () => {
  return (
    <div>
      <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          🔗 API Settings
        </h3>
        <p style={{ color: '#7f8c8d' }}>Manage API configurations, rate limits, and access controls.</p>
      </div>
    </div>
  );
};

export const WebhooksComponent: React.FC = () => {
  return (
    <div>
      <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          🪝 Webhooks
        </h3>
        <p style={{ color: '#7f8c8d' }}>Configure webhook endpoints and event notifications.</p>
      </div>
    </div>
  );
};

export const DataImportComponent: React.FC = () => {
  return (
    <div>
      <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          📥 Data Import
        </h3>
        <p style={{ color: '#7f8c8d' }}>Import data from various sources and formats.</p>
      </div>
    </div>
  );
};

export const EmailSettingsComponent: React.FC = () => {
  return (
    <div>
      <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          📧 Email Settings
        </h3>
        <p style={{ color: '#7f8c8d' }}>Configure email notification preferences and SMTP settings.</p>
      </div>
    </div>
  );
};

export const MobileAlertsComponent: React.FC = () => {
  return (
    <div>
      <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          📱 Mobile Alerts
        </h3>
        <p style={{ color: '#7f8c8d' }}>Manage mobile push notifications and alert settings.</p>
      </div>
    </div>
  );
};

export const DeveloperToolsComponent: React.FC = () => {
  return (
    <div>
      <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          👨‍💻 Developer Tools
        </h3>
        <p style={{ color: '#7f8c8d' }}>Access development tools, API keys, and debugging features.</p>
      </div>
    </div>
  );
};

export const BackupRestoreComponent: React.FC = () => {
  return (
    <div>
      <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          💾 Backup & Restore
        </h3>
        <p style={{ color: '#7f8c8d' }}>Create and manage system backups and restoration points.</p>
      </div>
    </div>
  );
}; 