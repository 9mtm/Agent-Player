import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import config from '../../../config';

const AccountSecurityComponent: React.FC = () => {
  const [securitySettings, setSecuritySettings] = useState({});

  const [securityData, setSecurityData] = useState({
    password_policy: 'medium',
    login_attempts: 5,
    session_timeout: 30,
    password_history: 3,
    account_lockout_duration: 15,
    require_email_verification: true,
    allow_multiple_sessions: false,
    ip_whitelist: '',
    trusted_devices: [],
    recent_activity: []
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchSecuritySettings = async () => {
    try {
      const response = await api.get('/user/security');
      setSecuritySettings(response.data);
      setSecurityData(response.data);
    } catch (error) {
      console.error('Error fetching security settings:', error);
      // Handle error appropriately
    }
  };

  const updateSecuritySettings = async (data: any) => {
    try {
      await api.put('/user/security', data);
      // Handle success
    } catch (error) {
      console.error('Error updating security settings:', error);
      // Handle error appropriately
    }
  };

  useEffect(() => {
    fetchSecuritySettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      await updateSecuritySettings(securityData);
      setMessage('✅ Account security settings saved successfully!');
    } catch (error) {
      setMessage('❌ Error saving settings');
      console.error('Error:', error);
    }
    
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleInputChange = (field: string, value: any) => {
    setSecurityData(prev => ({ ...prev, [field]: value }));
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
          fontSize: '14px',
        }}>
          {message}
        </div>
      )}

      {/* Password Policy */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          🔐 Password Policy
        </h3>

        <div style={{ display: 'grid', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
              Password Strength Requirements
            </label>
            <select
              value={securityData.password_policy}
              onChange={(e) => handleInputChange('password_policy', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            >
              <option value="low">Low - 6+ characters</option>
              <option value="medium">Medium - 8+ chars, mixed case, numbers</option>
              <option value="high">High - 12+ chars, mixed case, numbers, symbols</option>
              <option value="enterprise">Enterprise - 16+ chars, all requirements</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Password History (previous passwords to remember)
              </label>
              <input
                type="number"
                value={securityData.password_history}
                onChange={(e) => handleInputChange('password_history', parseInt(e.target.value))}
                min="1"
                max="24"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Max Failed Login Attempts
              </label>
              <input
                type="number"
                value={securityData.login_attempts}
                onChange={(e) => handleInputChange('login_attempts', parseInt(e.target.value))}
                min="1"
                max="10"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Session Management */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          ⏱️ Session Management
        </h3>

        <div style={{ display: 'grid', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={securityData.session_timeout}
                onChange={(e) => handleInputChange('session_timeout', parseInt(e.target.value))}
                min="5"
                max="480"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                Account Lockout Duration (minutes)
              </label>
              <input
                type="number"
                value={securityData.account_lockout_duration}
                onChange={(e) => handleInputChange('account_lockout_duration', parseInt(e.target.value))}
                min="1"
                max="60"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={securityData.allow_multiple_sessions}
                onChange={(e) => handleInputChange('allow_multiple_sessions', e.target.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
              <span style={{ fontWeight: '600', color: '#2c3e50' }}>
                Allow multiple simultaneous sessions
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={securityData.require_email_verification}
                onChange={(e) => handleInputChange('require_email_verification', e.target.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
              <span style={{ fontWeight: '600', color: '#2c3e50' }}>
                Require email verification for password changes
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* IP Security */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          🌐 IP Security
        </h3>

        <div>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
            IP Whitelist (one per line, leave empty to allow all)
          </label>
          <textarea
            value={securityData.ip_whitelist}
            onChange={(e) => handleInputChange('ip_whitelist', e.target.value)}
            rows={4}
            placeholder="192.168.1.0/24&#10;10.0.0.0/8&#10;172.16.0.0/12"
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e1e5e9',
              borderRadius: '8px',
              fontSize: '14px',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Recent Security Events */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#2c3e50' }}>
          📋 Recent Security Events
        </h3>

        <div style={{ 
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #e1e5e9',
          overflow: 'hidden'
        }}>
          {[
            { event: 'Password changed', ip: '192.168.1.100', time: '2 hours ago', status: 'success' },
            { event: 'Failed login attempt', ip: '45.76.123.45', time: '1 day ago', status: 'warning' },
            { event: 'Account locked', ip: '45.76.123.45', time: '1 day ago', status: 'danger' },
            { event: 'Successful login', ip: '192.168.1.100', time: '2 days ago', status: 'success' }
          ].map((event, index) => (
            <div key={index} style={{
              padding: '12px 16px',
              borderBottom: index < 3 ? '1px solid #e1e5e9' : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: event.status === 'success' ? '#27ae60' : 
                             event.status === 'warning' ? '#f39c12' : '#e74c3c'
                }}></span>
                <span style={{ fontWeight: '600', color: '#2c3e50' }}>{event.event}</span>
                <span style={{ color: '#7f8c8d', fontSize: '14px' }}>from {event.ip}</span>
              </div>
              <span style={{ color: '#95a5a6', fontSize: '14px' }}>{event.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div style={{ textAlign: 'center', marginTop: '32px' }}>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            padding: '16px 48px',
            background: loading ? '#95a5a6' : 'linear-gradient(135deg, #667eea, #764ba2)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '0 auto',
            boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
          }}
        >
          {loading ? '⏳ Saving...' : '💾 Save Security Settings'}
        </button>
      </div>
    </div>
  );
};

export default AccountSecurityComponent; 